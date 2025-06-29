import type { Message, MessageBranch, BranchInfo, ApiMessage } from '../types/index.js'
import type { AppState } from '../state/AppState.js'
import type { ApiService } from '../services/ApiService.js'
import { generateId, delay } from '../utils/index.js'
import { UIManager } from '../ui/UIManager.js'

export class MessageManager {
  private streamingThrottles: Map<string, number> = new Map()
  private streamingBuffers: Map<string, string> = new Map()

  constructor(
    private readonly appState: AppState,
    private readonly apiService: ApiService,
  ) {}

  private triggerUIUpdate(): void {
    // Access UIManager through global window object
    const uiManager = (window as any).uiManager
    if (uiManager && typeof uiManager.updateAll === 'function') {
      uiManager.updateAll()
    }
  }

  private getUIManager(): UIManager {
    const uiManager: UIManager | unknown = (window as any).uiManager
    if (uiManager && uiManager instanceof UIManager) {
      return uiManager
    }
    throw new Error('Critical error: UIManager was not on the window object')
  }

  private scrollChatToBottom(): void {
    this.getUIManager().scrollToBottom()
  }

  private shouldAutoScroll(): boolean {
    return this.getUIManager().isScrolledBottom()
  }

  private renderPartialMarkdown(content: string): string {
    let html = content
    
    // Escape HTML first
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Handle code blocks (be forgiving of incomplete ones)
    html = html.replace(/```(\w*)\n?([\s\S]*?)(?:```|$)/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || ''}">${code}</code></pre>`
    })
    
    // Handle inline code (be forgiving of incomplete backticks)
    html = html.replace(/`([^`]*)`/g, '<code>$1</code>')
    html = html.replace(/`([^`]*)$/g, '<code>$1</code>') // Incomplete inline code
    
    // Handle headers
    html = html.replace(/^(#{1,6})\s+(.*)$/gm, (match, hashes, text) => {
      const level = hashes.length
      return `<h${level}>${text}</h${level}>`
    })
    
    // Handle bold and italic (be forgiving of incomplete markup)
    html = html.replace(/\*\*([^*]*)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*\*([^*]*)$/g, '<strong>$1</strong>') // Incomplete bold
    html = html.replace(/\*([^*]*)\*/g, '<em>$1</em>')
    html = html.replace(/\*([^*]*)$/g, '<em>$1</em>') // Incomplete italic
    
    // Handle lists
    html = html.replace(/^[\s]*[-*+]\s+(.*)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    
    // Handle line breaks
    html = html.replace(/\n/g, '<br>')
    
    return html
  }

  private scheduleThrottledUpdate(messageId: string, content: string): void {
    // Always update the buffer with latest content
    this.streamingBuffers.set(messageId, content)

    // Check if we're within throttle window
    const lastUpdate = this.streamingThrottles.get(messageId) || 0
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdate

    if (timeSinceLastUpdate >= 500) {
      // Enough time has passed, update immediately
      this.performThrottledUpdate(messageId)
      this.streamingThrottles.set(messageId, now)
    }
  }

  private performThrottledUpdate(messageId: string): void {
    const content = this.streamingBuffers.get(messageId)
    if (!content) return

    const messageElement = document.querySelector(
      `[data-message-id="${messageId}"] .message-content`,
    )
    if (messageElement) {
      const renderedHTML = this.renderPartialMarkdown(content)
      if (messageElement.innerHTML !== renderedHTML) {
        messageElement.innerHTML = renderedHTML
      }
    }
  }

  private cleanupStreamingState(messageId: string): void {
    this.streamingThrottles.delete(messageId)
    this.streamingBuffers.delete(messageId)
  }

  private validateApiSettings(): void {
    if (!this.appState.settings.api.baseUrl) {
      throw new Error(
        'API Base URL not configured. Please go to Settings and configure your API endpoint.',
      )
    }
    if (!this.appState.settings.api.apiKey) {
      throw new Error('API Key not configured. Please go to Settings and add your API key.')
    }
  }

  private createStreamingCallbacks(
    message: Message,
    messageId: string,
    onCompleteExtra?: () => void,
  ) {
    return {
      onToken: (token: string) => {
        // Check if we should auto-scroll before making changes
        const shouldScroll = this.shouldAutoScroll()

        message.content += token

        // Update branch content to keep in sync
        const chat = this.appState.getCurrentChat()
        if (chat) {
          const branches = chat.messageBranches.get(messageId)
          const currentBranchIndex = chat.currentBranches.get(messageId)
          if (branches && currentBranchIndex !== undefined) {
            const currentBranch = branches[currentBranchIndex]
            if (currentBranch) {
              currentBranch.content = message.content
            }
          }
        }

        // Schedule throttled markdown update for streaming
        this.scheduleThrottledUpdate(message.id, message.content)

        // Auto-scroll if user was near bottom before the change
        if (shouldScroll) {
          this.scrollChatToBottom()
        }
      },
      onComplete: () => {
        message.isStreaming = false
        const chat = this.appState.getCurrentChat()
        if (chat) {
          chat.updatedAt = Date.now()
        }
        this.appState.updateUISettings({ isGenerating: false })
        this.appState.save()

        // Clean up throttling state and ensure final content is rendered
        this.cleanupStreamingState(messageId)
        
        // Force final update with any remaining buffered content
        this.performThrottledUpdate(messageId)
        
        // Render markdown for completed message (this will also update the message state)
        const uiManager = this.getUIManager()
        uiManager.renderMessageMarkdown(messageId)

        // Only trigger a selective UI update for the footer/actions, not the full message
        this.triggerUIUpdate()
        //uiManager.updateMessageActions(messageId)

        // Execute any additional completion logic
        if (onCompleteExtra) {
          onCompleteExtra()
        }
      },
      onError: (error: Error) => {
        message.isStreaming = false
        this.appState.updateUISettings({ isGenerating: false })
        this.appState.save()
        
        // Clean up throttling state on error
        this.cleanupStreamingState(messageId)
        
        throw error
      },
    }
  }

  public async sendMessage(content: string): Promise<void> {
    if (!content.trim() || this.appState.ui.isGenerating) return

    this.validateApiSettings()

    // Get or create chat
    let chat = this.appState.getCurrentChat()
    if (!chat || chat.isArchived) {
      // This should be handled by ChatManager
      throw new Error('No active chat available')
    }

    // Add user message
    const userMessage = this.createUserMessage(content)
    chat.messages.push(userMessage)
    chat.updatedAt = Date.now()

    // Set generating state
    this.appState.updateUISettings({ isGenerating: true })

    // Add assistant message placeholder
    const currentModel = chat.model || this.appState.settings.chat.model
    const assistantMessage = this.createAssistantMessage(currentModel)
    chat.messages.push(assistantMessage)

    this.appState.save()

    // Update UI to show assistant placeholder immediately
    this.triggerUIUpdate()
    this.scrollChatToBottom()

    try {
      // Send to API
      const messages = this.prepareMessagesForApi(chat.messages)

      await this.apiService.streamResponse(
        messages,
        currentModel,
        this.createStreamingCallbacks(assistantMessage, assistantMessage.id),
        this.appState.settings.chat.temperature,
        this.appState.settings.chat.maxTokens,
      )
    } catch (error) {
      console.error('Error generating response:', error)

      // Remove the failed assistant message
      const messageIndex = chat.messages.findIndex((m) => m.id === assistantMessage.id)
      if (messageIndex !== -1) {
        chat.messages.splice(messageIndex, 1)
      }

      this.appState.updateUISettings({ isGenerating: false })
      this.appState.save()

      throw error
    }
  }

  private createUserMessage(content: string): Message {
    return {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
      isStreaming: false,
      isEditing: false,
      parentId: null,
      children: [],
      branchId: null,
    }
  }

  private createAssistantMessage(model: string): Message {
    return {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      isEditing: false,
      parentId: null,
      children: [],
      branchId: null,
      model,
    }
  }

  private prepareMessagesForApi(messages: Message[]): ApiMessage[] {
    return messages
      .filter((m) => !m.isStreaming || m.content)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }))
  }

  public startEditMessage(messageId: string): void {
    const chat = this.appState.getCurrentChat()
    if (!chat) return

    const message = chat.messages.find((m) => m.id === messageId)
    if (!message) return

    message.isEditing = true
    this.appState.save()
    this.triggerUIUpdate()
  }

  public async saveMessageEdit(messageId: string, newContent: string): Promise<void> {
    const chat = this.appState.getCurrentChat()
    if (!chat) return

    const messageIndex = chat.messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    const message = chat.messages[messageIndex]
    if (!message) return

    if (!newContent.trim()) {
      throw new Error('Message cannot be empty')
    }

    // Don't create a branch if content hasn't changed
    if (message.content === newContent) {
      message.isEditing = false
      this.appState.save()
      return
    }

    // Initialize branches for this message if they don't exist
    if (!chat.messageBranches.has(messageId)) {
      const childrenAfterBranch = chat.messages.slice(messageIndex + 1).map((msg) => ({
        ...msg,
        id: generateId(),
      }))

      chat.messageBranches.set(messageId, [
        {
          content: message.content,
          children: childrenAfterBranch,
          timestamp: message.timestamp,
          ...(message.model && { model: message.model }),
        },
      ])
      chat.currentBranches.set(messageId, 0)
    }

    // Preserve the current conversation path as a branch before editing
    const currentBranches = chat.messageBranches.get(messageId)!
    const currentBranchIndex = chat.currentBranches.get(messageId) || 0
    const currentBranch = currentBranches[currentBranchIndex]!

    // If there are messages after this one, preserve them in the current branch
    if (chat.messages.length > messageIndex + 1) {
      const existingChildren = chat.messages.slice(messageIndex + 1).map((msg) => ({ ...msg }))
      currentBranch.children = existingChildren
    }

    // Create new branch with edited content
    const newBranch: MessageBranch = {
      content: newContent,
      children: [],
      timestamp: Date.now(),
      ...(message.model && { model: message.model }),
    }

    currentBranches.push(newBranch)
    const newBranchIndex = currentBranches.length - 1
    chat.currentBranches.set(messageId, newBranchIndex)

    // Update the message content and truncate conversation
    message.content = newContent
    message.isEditing = false

    // Truncate conversation at this point since we're starting a new branch
    chat.messages = chat.messages.slice(0, messageIndex + 1)
    chat.updatedAt = Date.now()
    this.appState.save()
    this.triggerUIUpdate()

    // If editing a user message, automatically generate assistant response
    if (message.role === 'user') {
      await delay(10)
      await this.generateAssistantResponseForEdit()
    }
  }

  public cancelMessageEdit(messageId: string): void {
    const chat = this.appState.getCurrentChat()
    if (!chat) return

    const message = chat.messages.find((m) => m.id === messageId)
    if (!message) return

    message.isEditing = false
    this.appState.save()
    this.triggerUIUpdate()
  }

  private async generateAssistantResponseForEdit(): Promise<void> {
    const chat = this.appState.getCurrentChat()
    if (!chat || this.appState.ui.isGenerating) return

    this.validateApiSettings()

    // Set generating state
    this.appState.updateUISettings({ isGenerating: true })

    // Add assistant message placeholder
    const currentModel = chat.model || this.appState.settings.chat.model
    const assistantMessage = this.createAssistantMessage(currentModel)
    chat.messages.push(assistantMessage)
    chat.updatedAt = Date.now()
    this.appState.save()
    this.triggerUIUpdate()

    try {
      const messages = this.prepareMessagesForApi(chat.messages)

      await this.apiService.streamResponse(
        messages,
        currentModel,
        this.createStreamingCallbacks(assistantMessage, assistantMessage.id),
        this.appState.settings.chat.temperature,
        this.appState.settings.chat.maxTokens,
      )
    } catch (error) {
      console.error('Error generating response:', error)

      // Remove the failed assistant message
      const messageIndex = chat.messages.findIndex((m) => m.id === assistantMessage.id)
      if (messageIndex !== -1) {
        chat.messages.splice(messageIndex, 1)
      }

      this.appState.updateUISettings({ isGenerating: false })
      this.appState.save()
      throw error
    }
  }

  public async regenerateMessage(messageId: string): Promise<void> {
    const chat = this.appState.getCurrentChat()
    if (!chat || this.appState.ui.isGenerating) return

    const messageIndex = chat.messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    const originalMessage = chat.messages[messageIndex]
    if (!originalMessage) return

    // Initialize branches for this message if they don't exist
    if (!chat.messageBranches.has(messageId)) {
      const childrenAfterBranch = chat.messages.slice(messageIndex + 1).map((msg) => ({
        ...msg,
        id: generateId(),
      }))

      chat.messageBranches.set(messageId, [
        {
          content: originalMessage.content,
          children: childrenAfterBranch,
          timestamp: originalMessage.timestamp,
          ...(originalMessage.model && { model: originalMessage.model }),
        },
      ])
      chat.currentBranches.set(messageId, 0)
    }

    // Preserve the current conversation path as a new branch before regenerating
    const currentBranches = chat.messageBranches.get(messageId)!
    const currentBranchIndex = chat.currentBranches.get(messageId) || 0
    const currentBranch = currentBranches[currentBranchIndex]!

    // If there are messages after this one, preserve them in the current branch
    if (chat.messages.length > messageIndex + 1) {
      const existingChildren = chat.messages.slice(messageIndex + 1).map((msg) => ({ ...msg }))
      currentBranch.children = existingChildren
    }

    // Set up for regeneration - we'll stream directly into the original message
    const currentModel = chat.model || this.appState.settings.chat.model

    // Create a new branch for the regenerated content
    currentBranches.push({
      content: '', // Will be filled during streaming
      children: [],
      timestamp: Date.now(),
      model: currentModel,
    })
    chat.currentBranches.set(messageId, currentBranches.length - 1)

    // Clear content and set streaming state on original message
    originalMessage.content = ''
    originalMessage.isStreaming = true
    originalMessage.model = currentModel

    // Truncate conversation at this point
    chat.messages = chat.messages.slice(0, messageIndex + 1)
    chat.updatedAt = Date.now()
    this.appState.updateUISettings({ isGenerating: true })
    this.appState.save()

    // Update UI to show regeneration state immediately
    this.triggerUIUpdate()

    try {
      // Send to API
      const messages = chat.messages.slice(0, messageIndex).map((m) => ({
        role: m.role,
        content: this.getCurrentMessageContent(m),
      }))

      await this.apiService.streamResponse(
        messages,
        currentModel,
        this.createStreamingCallbacks(originalMessage, messageId, () => {
          // Rebuild conversation from this point
          this.rebuildConversationFromBranches(messageId)
        }),
        this.appState.settings.chat.temperature,
        this.appState.settings.chat.maxTokens,
        true,
      )
    } catch (error) {
      console.error('Error regenerating message:', error)
      this.appState.updateUISettings({ isGenerating: false })
      this.appState.save()
      throw error
    }
  }

  public getCurrentMessageContent(message: Message): string {
    const chat = this.appState.getCurrentChat()
    if (!chat || !chat.messageBranches.has(message.id)) {
      return message.content
    }

    const branches = chat.messageBranches.get(message.id)!
    const currentBranchIndex = chat.currentBranches.get(message.id) || 0
    const currentBranch = branches[currentBranchIndex]
    return currentBranch ? currentBranch.content : message.content
  }

  public getCurrentMessageTimestamp(message: Message): number {
    const chat = this.appState.getCurrentChat()
    if (!chat || !chat.messageBranches.has(message.id)) {
      return message.timestamp
    }

    const branches = chat.messageBranches.get(message.id)!
    const currentBranchIndex = chat.currentBranches.get(message.id) || 0
    const currentBranch = branches[currentBranchIndex]
    return currentBranch ? currentBranch.timestamp : message.timestamp
  }

  public getCurrentMessageModel(message: Message): string | undefined {
    const chat = this.appState.getCurrentChat()
    if (!chat || !chat.messageBranches.has(message.id)) {
      return message.model
    }

    const branches = chat.messageBranches.get(message.id)!
    const currentBranchIndex = chat.currentBranches.get(message.id) || 0
    const currentBranch = branches[currentBranchIndex]
    return currentBranch ? currentBranch.model : message.model
  }

  public switchToBranch(messageId: string, branchIndex: number): void {
    const chat = this.appState.getCurrentChat()
    if (!chat || !chat.messageBranches.has(messageId)) return

    const branches = chat.messageBranches.get(messageId)!
    if (branchIndex < 0 || branchIndex >= branches.length) return

    // Store scroll position relative to the message being switched
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
    let scrollOffset = 0
    if (messageElement) {
      const chatArea = document.getElementById('chatArea')
      if (chatArea) {
        scrollOffset = chatArea.scrollTop
      }
    }

    // Preserve current children before switching branches
    const messageIndex = chat.messages.findIndex((m) => m.id === messageId)
    if (messageIndex !== -1 && chat.messages.length > messageIndex + 1) {
      const currentBranchIndex = chat.currentBranches.get(messageId) || 0
      const currentBranch = branches[currentBranchIndex]
      if (currentBranch) {
        // Save any new messages that were added since this branch was created
        const existingChildren = chat.messages.slice(messageIndex + 1).map((msg) => ({ ...msg }))
        currentBranch.children = existingChildren
      }
    }

    chat.currentBranches.set(messageId, branchIndex)

    // Update the message content and rebuild conversation
    const message = chat.messages.find((m) => m.id === messageId)
    if (message) {
      message.content = branches[branchIndex]!.content
    }

    // Rebuild the entire conversation path from this branch point
    this.rebuildConversationFromBranches(messageId)

    chat.updatedAt = Date.now()
    this.appState.save()
    this.triggerUIUpdate()

    // Restore scroll position to keep the message in view
    setTimeout(() => {
      const newMessageElement = document.querySelector(`[data-message-id="${messageId}"]`)
      if (newMessageElement) {
        const chatArea = document.getElementById('chatArea')
        if (chatArea) {
          chatArea.scrollTop = scrollOffset
        }
      }
    }, 10)

    // Render markdown for the switched branch content (if not streaming)
    const uiManager = this.getUIManager()
    if (message && !message.isStreaming) {
      uiManager.renderMessageMarkdown(messageId)
    }
  }

  private rebuildConversationFromBranches(messageId: string): void {
    const chat = this.appState.getCurrentChat()
    if (!chat) return

    const messageIndex = chat.messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    // Clear messages after this point
    chat.messages = chat.messages.slice(0, messageIndex + 1)

    // Add children from the current branch
    const branches = chat.messageBranches.get(messageId)
    const currentBranchIndex = chat.currentBranches.get(messageId) || 0
    const currentBranch = branches?.[currentBranchIndex]

    if (currentBranch?.children) {
      // Add children messages
      currentBranch.children.forEach((childMessage) => {
        const newMessage = { ...childMessage }

        // If this child has branches, update its content to match current branch
        if (chat.messageBranches.has(childMessage.id)) {
          const childBranches = chat.messageBranches.get(childMessage.id)!
          const childBranchIndex = chat.currentBranches.get(childMessage.id) || 0
          const childBranch = childBranches[childBranchIndex]
          if (childBranch) {
            newMessage.content = childBranch.content
          }
        }

        chat.messages.push(newMessage)
      })

      // Now recursively rebuild for each child that has branches
      currentBranch.children.forEach((childMessage) => {
        if (chat.messageBranches.has(childMessage.id)) {
          this.rebuildConversationFromBranches(childMessage.id)
        }
      })
    }
  }

  public getMessageBranchInfo(messageId: string): BranchInfo | null {
    const chat = this.appState.getCurrentChat()
    if (!chat || !chat.messageBranches.has(messageId)) {
      return null
    }

    const branches = chat.messageBranches.get(messageId)!
    const currentIndex = chat.currentBranches.get(messageId) || 0

    return {
      total: branches.length,
      current: currentIndex + 1,
      hasPrevious: currentIndex > 0,
      hasNext: currentIndex < branches.length - 1,
    }
  }
}
