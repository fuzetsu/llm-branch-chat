import type { Chat, BranchInfo } from '../types/index.js'
import type { AppState } from '../state/AppState.js'
import type { ChatManager } from '../features/ChatManager.js'
import type { MessageManager } from '../features/MessageManager.js'
import { getElementById, querySelector, formatTime } from '../utils/index.js'

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
    activeSection.className = 'chat-section active-section'
    activeSection.innerHTML = `
      <div class="chat-section-header">
        <div class="section-title">
          <span>Recent Chats</span>
        </div>
      </div>
      <div class="chat-section-content" id="activeChats"></div>
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
    archiveSection.className = `chat-section archive-section ${isCollapsed ? 'collapsed' : ''}`
    archiveSection.innerHTML = `
      <div class="chat-section-header" data-action="toggle-archive">
        <div class="section-title">
          <span>Archived Chats</span>
          <span class="chat-section-count">${archivedChats.length}</span>
        </div>
        <span class="chat-section-toggle">${isCollapsed ? '▶' : '▼'}</span>
      </div>
      <div class="chat-section-content" id="archivedChats"></div>
    `

    const archivedChatContainer = archiveSection.querySelector('#archivedChats')!
    archivedChats.forEach((chat) => {
      const chatItem = this.createChatItem(chat, true)
      archivedChatContainer.appendChild(chatItem)
    })

    // Add event listener for archive section toggle
    const header = archiveSection.querySelector('.chat-section-header')!
    header.addEventListener('click', () => this.toggleArchiveSection())

    return archiveSection
  }

  private createChatItem(chat: Chat, isArchived: boolean): HTMLElement {
    const chatItem = document.createElement('div')
    chatItem.className = `chat-item ${chat.id === this.appState.currentChatId ? 'active' : ''} ${isArchived ? 'archived' : ''}`
    chatItem.innerHTML = `
      <div class="chat-item-title">${chat.title}</div>
      <div class="chat-item-actions">
        ${
          isArchived
            ? `<button class="chat-action-btn" data-action="restore" data-chat-id="${chat.id}" title="Restore">📤</button>`
            : `<button class="chat-action-btn" data-action="archive" data-chat-id="${chat.id}" title="Archive">📁</button>`
        }
        <button class="chat-action-btn" data-action="delete" data-chat-id="${chat.id}" title="Delete">🗑️</button>
      </div>
    `

    chatItem.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('chat-action-btn')) {
        const action = target.dataset.action
        const chatId = target.dataset.chatId
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
    const archiveSection = querySelector('.archive-section')
    if (archiveSection) {
      archiveSection.classList.toggle('collapsed')

      // Update toggle arrow direction
      const toggle = archiveSection.querySelector('.chat-section-toggle')!
      const isCollapsed = archiveSection.classList.contains('collapsed')
      toggle.textContent = isCollapsed ? '▶' : '▼'

      // Save state to localStorage
      localStorage.setItem('archiveSectionCollapsed', isCollapsed.toString())
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
    emptyState.className = 'empty-state'
    emptyState.innerHTML = `
      <h2>Welcome to LLM Chat</h2>
      <p>Start a conversation by typing a message below.</p>
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
    modelChangeDiv.className = 'message system model-change'
    modelChangeDiv.innerHTML = `
      <div class="model-change-notification">
        <span class="model-change-icon">🔄</span>
        <span class="model-change-text">Switched from ${fromModel} to ${toModel}</span>
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
    messageDiv.className = `message ${message.role} ${message.isStreaming ? 'streaming' : ''} ${message.isEditing ? 'editing' : ''} ${hasBranches ? 'has-branches' : ''}`
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
    return `
      <div class="message-edit-form">
        <textarea class="message-edit-textarea" rows="4">${messageContent || ''}</textarea>
        <div class="message-edit-actions">
          <button class="message-edit-btn save" data-action="save-edit" data-message-id="${message.id}">Save</button>
          <button class="message-edit-btn cancel" data-action="cancel-edit" data-message-id="${message.id}">Cancel</button>
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

    return `
      <div class="message-content">${messageContent || (message.isStreaming ? '' : 'No response')}</div>
      <div class="message-timestamp" title="${new Date(currentTimestamp).toLocaleString()}">${timestamp}</div>
      ${
        showModelIndicator || hasBranches
          ? `
        <div class="message-meta">
          ${
            hasBranches && branchInfo
              ? `
            <div class="branch-navigation">
              <button class="branch-nav-btn" data-action="switch-branch" data-message-id="${message.id}" data-branch-index="${branchInfo.current - 2}" ${!branchInfo.hasPrevious ? 'disabled' : ''}>◀</button>
              <span class="branch-indicator">
                <span>🌿</span>
                <span>${branchInfo.current}/${branchInfo.total}</span>
              </span>
              <button class="branch-nav-btn" data-action="switch-branch" data-message-id="${message.id}" data-branch-index="${branchInfo.current}" ${!branchInfo.hasNext ? 'disabled' : ''}>▶</button>
            </div>
          `
              : '<div></div>'
          }
          ${showModelIndicator ? `<div class="message-model-indicator" title="Generated by ${currentModel}">${currentModel}</div>` : ''}
        </div>
      `
          : ''
      }
      ${
        !message.isStreaming
          ? `
        <div class="message-actions">
          <button class="message-action-btn" data-action="edit-message" data-message-id="${message.id}" title="Edit">✏️</button>
          ${message.role === 'assistant' ? `<button class="message-action-btn" data-action="regenerate-message" data-message-id="${message.id}" title="Regenerate">🔄</button>` : ''}
        </div>
      `
          : ''
      }
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
      const textareas = document.querySelectorAll('.message-edit-textarea')
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

  public cleanupTextareaObserver(messageId: string): void {
    const textarea = document.querySelector(
      `[data-message-id="${messageId}"] .message-edit-textarea`,
    ) as any
    if (textarea?._resizeObserver) {
      textarea._resizeObserver.disconnect()
    }
  }

  private handleMessageActions(e: Event): void {
    const target = e.target as HTMLElement
    const action = target.dataset.action
    const messageId = target.dataset.messageId

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
        const textarea = target
          .closest('.message-edit-form')
          ?.querySelector('.message-edit-textarea') as HTMLTextAreaElement
        if (textarea) {
          ;(window as any).app.handleMessageEdit(messageId, textarea.value)
        }
        break
      case 'cancel-edit':
        ;(window as any).app.handleCancelMessageEdit(messageId)
        break
      case 'switch-branch':
        const branchIndex = parseInt(target.dataset.branchIndex || '0')
        ;(window as any).app.handleSwitchToBranch(messageId, branchIndex)
        break
    }
  }
}
