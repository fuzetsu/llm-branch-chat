import type { Chat, BranchInfo } from '../types/index.js'
import type { AppState } from '../state/AppState.js'
import type { ChatManager } from '../features/ChatManager.js'
import type { MessageManager } from '../features/MessageManager.js'
import { getElementById, formatTime, renderMarkdown } from '../utils/index.js'

export class UIManager {
  constructor(
    private readonly appState: AppState,
    private readonly chatManager: ChatManager,
    private readonly messageManager: MessageManager,
  ) {}

  public updateAll(): void {
    this.updateChatList()
    this.updateChatDisplay()
    this.updateHeader()
    this.updateInputState()
  }

  public updateChatList(): void {
    const chatList = getElementById('chatList')
    chatList.innerHTML = ''

    const activeChats = this.chatManager.getActiveChats()
    const archivedChats = this.chatManager.getArchivedChats()

    // Active chats section
    if (activeChats.length > 0) {
      const activeSection = this.createActiveChatSection(activeChats)
      chatList.appendChild(activeSection)
    }

    // Archive section
    if (archivedChats.length > 0) {
      const archiveSection = this.createArchiveChatSection(archivedChats)
      chatList.appendChild(archiveSection)
    }
  }

  private createActiveChatSection(activeChats: Chat[]): HTMLElement {
    const activeSection = document.createElement('div')
    activeSection.className = 'mb-6'
    activeSection.innerHTML = `
      <div class="mb-3">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          Recent Chats
        </h3>
      </div>
      <div class="space-y-2" id="activeChats"></div>
    `

    const activeChatContainer = activeSection.querySelector('#activeChats')!
    activeChats.forEach((chat) => {
      const chatItem = this.createChatItem(chat, false)
      activeChatContainer.appendChild(chatItem)
    })

    return activeSection
  }

  private createArchiveChatSection(archivedChats: Chat[]): HTMLElement {
    const savedState = localStorage.getItem('archiveSectionCollapsed')
    const isCollapsed = savedState !== 'false'

    const archiveSection = document.createElement('div')
    archiveSection.className = 'mb-6'
    archiveSection.innerHTML = `
      <div class="mb-3">
        <button class="flex items-center justify-between w-full text-left" data-action="toggle-archive">
          <div class="flex items-center space-x-2">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Archived Chats</h3>
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">${archivedChats.length}</span>
          </div>
          <svg class="w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </div>
      <div class="space-y-2 ${isCollapsed ? 'hidden' : ''}" id="archivedChats"></div>
    `

    const archivedChatContainer = archiveSection.querySelector('#archivedChats')!
    archivedChats.forEach((chat) => {
      const chatItem = this.createChatItem(chat, true)
      archivedChatContainer.appendChild(chatItem)
    })

    // Add event listener for archive section toggle
    const toggleButton = archiveSection.querySelector('[data-action="toggle-archive"]')!
    toggleButton.addEventListener('click', () => this.toggleArchiveSection())

    return archiveSection
  }

  private createChatItem(chat: Chat, isArchived: boolean): HTMLElement {
    const chatItem = document.createElement('div')
    const isActive = chat.id === this.appState.currentChatId
    chatItem.className = `group flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
      isActive ? 'bg-accent/10 dark:bg-accent/20 border border-accent/30' : ''
    }`
    chatItem.innerHTML = `
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900 dark:text-white truncate ${isActive ? 'text-accent' : ''}">${chat.title}</p>
      </div>
      <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        ${
          isArchived
            ? `<button class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" data-action="restore" data-chat-id="${chat.id}" title="Restore">
                 <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"></path>
                 </svg>
               </button>`
            : `<button class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" data-action="archive" data-chat-id="${chat.id}" title="Archive">
                 <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8l6 6 6-6"></path>
                 </svg>
               </button>`
        }
        <button class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-500 hover:text-red-600" data-action="delete" data-chat-id="${chat.id}" title="Delete">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    `

    chatItem.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.closest('button[data-action]')) {
        const actionButton = target.closest('button[data-action]') as HTMLElement
        const action = actionButton.dataset.action
        const chatId = actionButton.dataset.chatId
        if (!chatId) return

        switch (action) {
          case 'archive':
            ;(window as any).app.handleArchiveChat(chatId)
            break
          case 'restore':
            ;(window as any).app.handleRestoreChat(chatId)
            break
          case 'delete':
            ;(window as any).app.handleDeleteChat(chatId)
            break
        }
      } else {
        ;(window as any).app.handleSwitchToChat(chat.id)
      }
    })

    return chatItem
  }

  public toggleArchiveSection(): void {
    const archivedChats = document.querySelector('#archivedChats')
    const toggleIcon = document.querySelector('[data-action="toggle-archive"] svg')

    if (archivedChats && toggleIcon) {
      const isCollapsed = archivedChats.classList.contains('hidden')

      if (isCollapsed) {
        archivedChats.classList.remove('hidden')
        toggleIcon.classList.add('rotate-180')
      } else {
        archivedChats.classList.add('hidden')
        toggleIcon.classList.remove('rotate-180')
      }

      // Save state to localStorage
      localStorage.setItem('archiveSectionCollapsed', (!isCollapsed).toString())
    }
  }

  public updateChatDisplay(): void {
    const chatArea = getElementById('chatArea')
    const chat = this.chatManager.getCurrentChat()

    chatArea.innerHTML = ''

    if (!chat || chat.messages.length === 0) {
      this.showEmptyState(chatArea)
      return
    }

    this.renderMessages(chatArea, chat)
  }

  private showEmptyState(chatArea: HTMLElement): void {
    const emptyState = document.createElement('div')
    emptyState.className = 'flex flex-col items-center justify-center h-full text-center'
    emptyState.innerHTML = `
      <div class="max-w-md mx-auto">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Welcome to LLM Chat</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-8">Start a conversation by typing a message below.</p>
        <div class="grid grid-cols-1 gap-3 text-sm">
          <div class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
            </div>
            <span class="text-gray-700 dark:text-gray-300">Ask questions and get intelligent responses</span>
          </div>
          <div class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path>
              </svg>
            </div>
            <span class="text-gray-700 dark:text-gray-300">Multiple conversations with branching support</span>
          </div>
        </div>
      </div>
    `
    chatArea.appendChild(emptyState)
  }

  private renderMessages(chatArea: HTMLElement, chat: Chat): void {
    let previousAssistantModel: string | null = null

    chat.messages.forEach((message) => {
      const branchInfo = this.messageManager.getMessageBranchInfo(message.id)
      const hasBranches = Boolean(branchInfo && branchInfo.total > 1)

      // Check if we need to show a model change notification
      const showModelChangeNotification = this.shouldShowModelChangeNotification(
        message,
        previousAssistantModel,
      )

      // Add model change notification if needed
      if (showModelChangeNotification && previousAssistantModel) {
        const modelChangeDiv = this.createModelChangeNotification(
          previousAssistantModel,
          message.model!,
        )
        chatArea.appendChild(modelChangeDiv)
      }

      // Update previous assistant model for next iteration
      if (message.role === 'assistant' && message.model) {
        previousAssistantModel = message.model
      }

      const messageDiv = this.createMessageElement(message, hasBranches, branchInfo)
      chatArea.appendChild(messageDiv)

      // Render markdown for message content after DOM is added (but not for streaming messages)
      if (!message.isStreaming) {
        this.renderMessageMarkdown(message.id)
      }
    })
  }

  private shouldShowModelChangeNotification(
    message: any,
    previousAssistantModel: string | null,
  ): boolean {
    return (
      message.role === 'assistant' &&
      message.model &&
      previousAssistantModel &&
      message.model !== previousAssistantModel
    )
  }

  private createModelChangeNotification(fromModel: string, toModel: string): HTMLElement {
    const modelChangeDiv = document.createElement('div')
    modelChangeDiv.className = 'flex justify-center my-4'
    modelChangeDiv.innerHTML = `
      <div class="inline-flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span>Switched from ${fromModel} to ${toModel}</span>
      </div>
    `
    return modelChangeDiv
  }

  private createMessageElement(
    message: any,
    hasBranches: boolean,
    branchInfo: BranchInfo | null,
  ): HTMLElement {
    const messageDiv = document.createElement('div')
    const isUser = message.role === 'user'
    messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`
    messageDiv.dataset.messageId = message.id

    if (message.isEditing) {
      messageDiv.innerHTML = this.createEditingMessageContent(message)
    } else {
      messageDiv.innerHTML = this.createDisplayMessageContent(message, hasBranches, branchInfo)
    }

    // Add event delegation for message actions
    messageDiv.addEventListener('click', (e) => this.handleMessageActions(e))

    return messageDiv
  }

  private createEditingMessageContent(message: any): string {
    const messageContent = this.messageManager.getCurrentMessageContent(message)
    const isUser = message.role === 'user'
    return `
      <div class="max-w-3xl ${isUser ? 'ml-auto' : 'mr-auto'} w-full">
        <div class="${isUser ? 'bg-primary dark:bg-user-dark text-white' : 'bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-gray-100'} rounded-lg p-4">
          <textarea class="w-full min-h-[100px] p-3 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white resize-none" rows="4" data-original-content="${(messageContent || '').replace(/"/g, '&quot;')}">${messageContent || ''}</textarea>
          <div class="flex justify-end space-x-2 mt-3">
            <button class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors" data-action="cancel-edit" data-message-id="${message.id}">Cancel</button>
            <button class="px-4 py-2 text-sm bg-primary hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md transition-colors" data-action="save-edit" data-message-id="${message.id}" disabled title="No changes made">Save</button>
          </div>
        </div>
      </div>
    `
  }

  private createDisplayMessageContent(
    message: any,
    hasBranches: boolean,
    branchInfo: BranchInfo | null,
  ): string {
    const messageContent = this.messageManager.getCurrentMessageContent(message)
    const currentTimestamp = this.messageManager.getCurrentMessageTimestamp(message)
    const currentModel = this.messageManager.getCurrentMessageModel(message)
    const chat = this.chatManager.getCurrentChat()
    const currentChatModel = chat?.model || this.appState.settings.chat.model
    const showModelIndicator =
      message.role === 'assistant' && currentModel && currentModel !== currentChatModel
    const timestamp = formatTime(currentTimestamp)
    const isAnyMessageStreaming = chat?.messages.some((m) => m.isStreaming) || false
    const isUser = message.role === 'user'

    return `
      <div class="max-w-3xl ${isUser ? 'ml-auto' : 'mr-auto'} w-full group">
        <div class="${isUser ? 'bg-primary dark:bg-user-dark text-white' : 'bg-white dark:bg-assistant-dark border border-gray-200 dark:border-dark-border text-gray-900 dark:text-gray-100'} rounded-lg p-4 shadow-sm">
          <div class="prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'dark:prose-invert'} message-content" data-message-id="${message.id}">${messageContent || (message.isStreaming ? '<div class="animate-pulse">Thinking...</div>' : 'No response')}</div>
          
          <div class="flex items-center justify-between mt-3 pt-2 border-t ${isUser ? 'border-gray-300 dark:border-gray-500' : 'border-gray-200 dark:border-dark-border'} min-h-[32px]">
            <div class="flex items-center space-x-3">
              <span class="text-xs ${isUser ? 'text-gray-200' : 'text-gray-500 dark:text-gray-400'}" title="${new Date(currentTimestamp).toLocaleString()}">${timestamp}</span>
              ${showModelIndicator ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200" title="Generated by ${currentModel}">${currentModel}</span>` : ''}
              ${
                hasBranches && branchInfo && !isAnyMessageStreaming
                  ? `
                <div class="flex items-center space-x-1">
                  <button class="p-1 rounded ${isUser ? 'hover:bg-white/20' : 'hover:bg-gray-200 dark:hover:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed" data-action="switch-branch" data-message-id="${message.id}" data-branch-index="${branchInfo.current - 2}" ${!branchInfo.hasPrevious ? 'disabled' : ''}>
                    <svg class="w-4 h-4 ${isUser ? 'text-gray-200' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                  </button>
                  <span class="flex items-center space-x-1 text-xs ${isUser ? 'text-gray-200' : 'text-gray-500 dark:text-gray-400'}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21l3-3-3-3M14 21l3-3-3-3M4 3h16M4 9h16M4 15h16"></path>
                    </svg>
                    <span>${branchInfo.current}/${branchInfo.total}</span>
                  </span>
                  <button class="p-1 rounded ${isUser ? 'hover:bg-white/20' : 'hover:bg-gray-200 dark:hover:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed" data-action="switch-branch" data-message-id="${message.id}" data-branch-index="${branchInfo.current}" ${!branchInfo.hasNext ? 'disabled' : ''}>
                    <svg class="w-4 h-4 ${isUser ? 'text-gray-200' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </button>
                </div>
              `
                  : ''
              }
            </div>
            <div class="flex items-center space-x-1 ${!message.isStreaming && !isAnyMessageStreaming ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'} transition-opacity">
              <button class="p-1 rounded ${isUser ? 'hover:bg-white/20' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}" data-action="edit-message" data-message-id="${message.id}" title="Edit" ${message.isStreaming || isAnyMessageStreaming ? 'disabled style="pointer-events: none"' : ''}>
                <svg class="w-4 h-4 ${isUser ? 'text-gray-200' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              ${
                message.role === 'assistant'
                  ? `<button class="p-1 rounded ${isUser ? 'hover:bg-white/20' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}" data-action="regenerate-message" data-message-id="${message.id}" title="Regenerate" ${message.isStreaming || isAnyMessageStreaming ? 'disabled style="pointer-events: none"' : ''}>
                <svg class="w-4 h-4 ${isUser ? 'text-gray-200' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </button>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>
    `
  }

  public isScrolledBottom(chatArea?: HTMLElement): boolean {
    const area = chatArea || getElementById('chatArea')
    return area.scrollHeight - area.scrollTop - area.clientHeight <= 10
  }

  public scrollToBottom(chatArea?: HTMLElement): void {
    requestAnimationFrame(() => {
      const area = chatArea || getElementById('chatArea')
      area.scrollTop = area.scrollHeight
    })
  }

  public updateHeader(): void {
    const chatTitle = getElementById('chatTitle')
    const chat = this.chatManager.getCurrentChat()
    chatTitle.textContent = chat ? chat.title : 'New Chat'
    this.updateChatModelSelector()
  }

  private updateChatModelSelector(): void {
    const select = getElementById<HTMLSelectElement>('chatModelSelect')
    const chat = this.chatManager.getCurrentChat()

    // Clear existing options
    select.innerHTML = ''

    // Add available models
    this.appState.settings.api.availableModels.forEach((model) => {
      const option = document.createElement('option')
      option.value = model
      option.textContent = model
      select.appendChild(option)
    })

    // Set current value
    if (chat?.model) {
      select.value = chat.model
    } else {
      select.value = this.appState.settings.chat.model
    }
  }

  public updateInputState(): void {
    const sendBtn = getElementById<HTMLButtonElement>('sendBtn')
    const messageInput = getElementById<HTMLInputElement>('messageInput')

    sendBtn.disabled = this.appState.ui.isGenerating
    sendBtn.textContent = this.appState.ui.isGenerating ? 'Sending...' : 'Send'
    messageInput.disabled = this.appState.ui.isGenerating
  }

  public startTitleEdit(): void {
    const chat = this.chatManager.getCurrentChat()
    if (!chat) return

    const titleDiv = getElementById('chatTitle')
    const titleInput = getElementById<HTMLInputElement>('chatTitleInput')

    titleInput.value = chat.title
    titleDiv.classList.add('hidden')
    titleInput.classList.remove('hidden')
    titleInput.focus()
    titleInput.select()
  }

  public saveTitleEdit(): void {
    const chat = this.chatManager.getCurrentChat()
    if (!chat) return

    const titleDiv = getElementById('chatTitle')
    const titleInput = getElementById<HTMLInputElement>('chatTitleInput')
    const newTitle = titleInput.value.trim()

    if (newTitle && newTitle !== chat.title) {
      this.chatManager.updateChatTitle(chat.id, newTitle)
    }

    titleDiv.classList.remove('hidden')
    titleInput.classList.add('hidden')
    this.updateAll()
  }

  public cancelTitleEdit(): void {
    const titleDiv = getElementById('chatTitle')
    const titleInput = getElementById('chatTitleInput')

    titleDiv.classList.remove('hidden')
    titleInput.classList.add('hidden')
  }

  public setupTextareaResize(): void {
    // This will be called after message edit is started
    setTimeout(() => {
      const textareas = document.querySelectorAll('textarea[data-original-content]')
      textareas.forEach((textarea) => {
        const textareaElement = textarea as HTMLTextAreaElement

        // Apply saved size
        textareaElement.style.width = this.appState.ui.editTextareaSize.width
        textareaElement.style.height = this.appState.ui.editTextareaSize.height

        // Add resize listener to save size changes
        const resizeObserver = new ResizeObserver(() => {
          this.saveTextareaSize(textareaElement)
        })
        resizeObserver.observe(textareaElement)

        // Store observer for cleanup
        ;(textareaElement as any)._resizeObserver = resizeObserver

        // Add input listener to enable/disable save button
        const inputHandler = () => {
          this.updateSaveButtonState(textareaElement)
        }
        textareaElement.addEventListener('input', inputHandler)
        ;(textareaElement as any)._inputHandler = inputHandler

        textareaElement.focus()
        textareaElement.setSelectionRange(
          textareaElement.value.length,
          textareaElement.value.length,
        )
      })
    }, 10)
  }

  private saveTextareaSize(textarea: HTMLTextAreaElement): void {
    if (textarea.offsetWidth > 0 && textarea.offsetHeight > 0) {
      this.appState.updateUISettings({
        editTextareaSize: {
          width: textarea.style.width || `${textarea.offsetWidth}px`,
          height: textarea.style.height || `${textarea.offsetHeight}px`,
        },
      })
    }
  }

  private updateSaveButtonState(textarea: HTMLTextAreaElement): void {
    const originalContent = textarea.dataset.originalContent || ''
    const currentContent = textarea.value
    const saveButton = textarea
      .closest('div')
      ?.querySelector('button[data-action="save-edit"]') as HTMLButtonElement

    if (saveButton) {
      const hasChanges = currentContent !== originalContent
      saveButton.disabled = !hasChanges
      saveButton.title = hasChanges ? 'Save changes' : 'No changes made'
    }
  }

  public cleanupTextareaObserver(messageId: string): void {
    const textarea = document.querySelector(`[data-message-id="${messageId}"] textarea`) as any
    if (textarea?._resizeObserver) {
      textarea._resizeObserver.disconnect()
    }
    if (textarea?._inputHandler) {
      textarea.removeEventListener('input', textarea._inputHandler)
    }
  }

  private handleMessageActions(e: Event): void {
    const target = e.target as HTMLElement
    const button = target.closest('button[data-action]') as HTMLElement

    if (!button) return

    const action = button.dataset.action
    const messageId = button.dataset.messageId

    if (!action || !messageId) return

    e.preventDefault()
    e.stopPropagation()

    switch (action) {
      case 'edit-message':
        ;(window as any).app.handleStartMessageEdit(messageId)
        break
      case 'regenerate-message':
        ;(window as any).app.handleRegenerateMessage(messageId)
        break
      case 'save-edit':
        const textarea = document.querySelector<HTMLTextAreaElement>(
          `[data-message-id=${messageId}] textarea`,
        )
        if (textarea && messageId) {
          ;(window as any).app.handleMessageEdit(messageId, textarea.value)
        } else {
          console.error('Save edit failed: textarea or messageId missing', {
            textarea,
            messageId,
            target,
          })
        }
        break
      case 'cancel-edit':
        ;(window as any).app.handleCancelMessageEdit(messageId)
        break
      case 'switch-branch':
        const branchIndex = parseInt(button.dataset.branchIndex || '0')
        ;(window as any).app.handleSwitchToBranch(messageId, branchIndex)
        break
    }
  }

  public updateMessageActions(messageId: string): void {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
    if (!messageElement) return

    const message = this.chatManager.getCurrentChat()?.messages.find((m) => m.id === messageId)
    if (!message) return

    const isAnyMessageStreaming =
      this.chatManager.getCurrentChat()?.messages.some((m) => m.isStreaming) || false

    // Find the actions container (right side of footer)
    const actionsContainer = messageElement.querySelector('.flex.items-center.space-x-1')
    if (actionsContainer) {
      // Update opacity class based on streaming state
      const newOpacityClass =
        !message.isStreaming && !isAnyMessageStreaming
          ? 'opacity-0 group-hover:opacity-100'
          : 'opacity-0'

      // Only update if the class actually changed
      const currentClasses = actionsContainer.className
      if (!currentClasses.includes(newOpacityClass)) {
        actionsContainer.className = `flex items-center space-x-1 ${newOpacityClass} transition-opacity`

        // Update button disabled states
        const buttons = actionsContainer.querySelectorAll('button')
        buttons.forEach((button) => {
          if (message.isStreaming || isAnyMessageStreaming) {
            button.setAttribute('disabled', '')
            button.style.pointerEvents = 'none'
          } else {
            button.removeAttribute('disabled')
            button.style.pointerEvents = ''
          }
        })
      }
    }
  }

  public renderMessageMarkdown(messageId: string): void {
    const messageContentElement = document.querySelector(
      `[data-message-id="${messageId}"] .message-content`,
    ) as HTMLElement

    if (!messageContentElement) return

    // Get the plain text content (what was set during streaming)
    const content = messageContentElement.textContent || ''
    if (!content.trim()) return

    // Store current HTML to compare against new HTML
    const currentHTML = messageContentElement.innerHTML

    // Store scroll position to prevent twitch
    const chatArea = document.getElementById('chatArea')
    const scrollTop = chatArea?.scrollTop || 0
    const shouldPreserveScroll = this.isScrolledBottom()

    // Render markdown asynchronously
    renderMarkdown(content)
      .then((html) => {
        // Normalize whitespace for comparison to avoid false positives
        const normalizedCurrentHTML = currentHTML.replace(/\s+/g, ' ').trim()
        const normalizedNewHTML = html.replace(/\s+/g, ' ').trim()

        // Only update if content actually changed
        if (normalizedCurrentHTML !== normalizedNewHTML) {
          messageContentElement.innerHTML = html

          // Restore scroll position if user wasn't at bottom
          if (!shouldPreserveScroll && chatArea) {
            chatArea.scrollTop = scrollTop
          } else if (shouldPreserveScroll) {
            // If user was at bottom, scroll to new bottom
            this.scrollToBottom()
          }
        }
      })
      .catch((error) => {
        console.error('Error rendering markdown:', error)
        // Fallback to plain text if markdown rendering fails
        if (messageContentElement.textContent !== content) {
          messageContentElement.textContent = content
        }
      })
  }
}
