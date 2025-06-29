import { AppState } from './state/AppState.js'
import { ApiService } from './services/ApiService.js'
import { ChatManager } from './features/ChatManager.js'
import { MessageManager } from './features/MessageManager.js'
import { UIManager } from './ui/UIManager.js'
import { SettingsManager } from './ui/SettingsManager.js'
import { getElementById } from './utils/index.js'

export class App {
  private readonly appState: AppState
  private apiService: ApiService
  private readonly chatManager: ChatManager
  private readonly messageManager: MessageManager
  private readonly uiManager: UIManager
  private readonly settingsManager: SettingsManager

  constructor() {
    this.appState = new AppState()
    this.apiService = this.createApiService()
    this.chatManager = new ChatManager(this.appState)
    this.messageManager = new MessageManager(this.appState, this.apiService)
    this.uiManager = new UIManager(this.appState, this.chatManager, this.messageManager)
    this.settingsManager = new SettingsManager(this.appState)
  }

  private createApiService(): ApiService {
    const { baseUrl, apiKey } = this.appState.settings.api
    return new ApiService(baseUrl, apiKey)
  }

  public async initialize(): Promise<void> {
    this.appState.load()
    this.updateApiService()
    this.setupEventListeners()
    this.settingsManager.applyTheme()
    this.uiManager.updateAll()

    // Focus message input
    getElementById('messageInput').focus()

    // Expose managers to global scope for HTML event handlers
    this.exposeToGlobalScope()
  }

  private updateApiService(): void {
    const { baseUrl, apiKey } = this.appState.settings.api
    this.apiService = new ApiService(baseUrl, apiKey)
    // Update MessageManager with new ApiService
    ;(this.messageManager as any).apiService = this.apiService
  }

  private exposeToGlobalScope(): void {
    ;(window as any).chatManager = this.chatManager
    ;(window as any).messageManager = this.messageManager
    ;(window as any).uiManager = this.uiManager
    ;(window as any).settingsManager = this.settingsManager
    ;(window as any).app = this
  }

  private setupEventListeners(): void {
    this.setupCoreEventListeners()
    this.settingsManager.setupEventListeners()
  }

  private setupCoreEventListeners(): void {
    // Header buttons
    getElementById('newChatBtn').addEventListener('click', () => this.handleNewChat())
    getElementById('newChatSidebar').addEventListener('click', () => this.handleNewChat())

    // Title editing
    getElementById('chatTitle').addEventListener('click', () => this.uiManager.startTitleEdit())

    const titleInput = getElementById<HTMLInputElement>('chatTitleInput')
    titleInput.addEventListener('keydown', (e) => this.handleTitleInputKeydown(e))
    titleInput.addEventListener('blur', () => this.uiManager.saveTitleEdit())

    // Sidebar toggle
    getElementById('sidebarToggle').addEventListener('click', () => this.toggleSidebar())

    // Message input
    const messageInput = getElementById<HTMLTextAreaElement>('messageInput')
    messageInput.addEventListener('keydown', (e) => this.handleMessageInputKeydown(e))
    messageInput.addEventListener('input', () => this.handleMessageInputResize())

    // Send button
    getElementById('sendBtn').addEventListener('click', () => this.handleSendMessage())

    // Chat model selector change
    getElementById('chatModelSelect').addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement
      this.handleModelChange(target.value)
    })

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => this.handleDocumentClick(e))

    // Handle settings updates
    this.appState.ui = new Proxy(this.appState.ui, {
      set: (target, property, value) => {
        ;(target as any)[property] = value
        this.uiManager.updateAll()
        return true
      },
    })
  }

  private handleNewChat(): void {
    this.chatManager.createNewChat()
    this.uiManager.updateAll()
    // Scroll to bottom for new empty chat
    setTimeout(() => {
      this.uiManager.scrollToBottom()
    }, 50)
  }

  private handleTitleInputKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      this.uiManager.saveTitleEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.uiManager.cancelTitleEdit()
    }
  }

  private toggleSidebar(): void {
    const sidebar = getElementById('sidebar')
    sidebar.classList.toggle('-translate-x-full')
  }

  private handleMessageInputKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      this.handleSendMessage()
    }
  }

  private handleMessageInputResize(): void {
    const messageInput = getElementById<HTMLTextAreaElement>('messageInput')
    // Auto-resize textarea
    messageInput.style.height = 'auto'
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px'
  }

  private async handleSendMessage(): Promise<void> {
    const input = getElementById<HTMLInputElement>('messageInput')
    const content = input.value.trim()

    if (!content || this.appState.ui.isGenerating) return

    try {
      // Create chat if none exists or current chat is archived
      let chat = this.chatManager.getCurrentChat()
      if (!chat || chat.isArchived) {
        this.chatManager.createNewChat()
      }

      // Clear input immediately
      input.value = ''
      this.handleMessageInputResize()

      await this.messageManager.sendMessage(content)
      // Final UI update after completion
      this.uiManager.updateAll()

      // Generate title if needed
      await this.handleTitleGeneration()
    } catch (error) {
      console.error('Error sending message:', error)
      if (error instanceof Error) {
        alert(error.message)
        // Show settings modal for API configuration errors
        if (error.message.includes('API') && error.message.includes('Settings')) {
          this.settingsManager.showSettingsModal()
        }
      }
    } finally {
      this.uiManager.updateAll()
    }
  }

  private async handleTitleGeneration(): Promise<void> {
    const chat = this.chatManager.getCurrentChat()
    if (!chat || !this.chatManager.shouldGenerateTitle(chat)) return

    this.chatManager.setTitleGenerating(chat.id, true)

    try {
      const title = await this.apiService.generateTitle(chat.messages, this.appState.settings.titleModel)
      if (title) {
        this.chatManager.updateChatTitle(chat.id, title)
        this.uiManager.updateAll()
      }
    } catch (error) {
      console.error('Title generation failed:', error)
    } finally {
      this.chatManager.setTitleGenerating(chat.id, false)
    }
  }

  private handleModelChange(newModel: string): void {
    const chat = this.chatManager.getCurrentChat()
    if (!chat || !newModel) return

    const oldModel = chat.model || this.appState.settings.chat.model
    if (oldModel === newModel) return

    this.chatManager.updateChatModel(chat.id, newModel)
    this.uiManager.updateAll()
  }

  private handleDocumentClick(e: Event): void {
    const target = e.target as HTMLElement
    const sidebar = getElementById('sidebar')
    const toggle = getElementById('sidebarToggle')

    if (
      window.innerWidth <= 1024 &&
      !sidebar.classList.contains('-translate-x-full') &&
      !sidebar.contains(target) &&
      !toggle.contains(target)
    ) {
      sidebar.classList.add('-translate-x-full')
    }
  }

  // Public methods for global access
  public async handleMessageEdit(messageId: string, newContent: string): Promise<void> {
    try {
      this.uiManager.cleanupTextareaObserver(messageId)
      await this.messageManager.saveMessageEdit(messageId, newContent)
    } catch (error) {
      console.error('Error editing message:', error)
      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }

  public handleStartMessageEdit(messageId: string): void {
    this.messageManager.startEditMessage(messageId)
    this.uiManager.setupTextareaResize()
  }

  public handleCancelMessageEdit(messageId: string): void {
    this.uiManager.cleanupTextareaObserver(messageId)
    this.messageManager.cancelMessageEdit(messageId)
  }

  public async handleRegenerateMessage(messageId: string): Promise<void> {
    try {
      await this.messageManager.regenerateMessage(messageId)
    } catch (error) {
      console.error('Error regenerating message:', error)
      alert('Error regenerating message. Please try again.')
      this.uiManager.updateAll()
    }
  }

  public handleSwitchToBranch(messageId: string, branchIndex: number): void {
    this.messageManager.switchToBranch(messageId, branchIndex)
  }

  public handleDeleteChat(chatId: string): void {
    this.chatManager.deleteChat(chatId, (options) => {
      // Override the onConfirm to include UI update
      const originalOnConfirm = options.onConfirm;
      options.onConfirm = () => {
        originalOnConfirm();
        this.uiManager.updateAll();
      };
      this.settingsManager.showConfirmModal(options);
    });
  }

  public handleArchiveChat(chatId: string): void {
    this.chatManager.archiveChat(chatId)
    this.uiManager.updateAll()
  }

  public handleRestoreChat(chatId: string): void {
    this.chatManager.restoreChat(chatId)
    this.uiManager.updateAll()
  }

  public handleSwitchToChat(chatId: string): void {
    this.chatManager.switchToChat(chatId)
    this.uiManager.updateAll()
    // Scroll to bottom to show latest message
    setTimeout(() => {
      this.uiManager.scrollToBottom()
    }, 50)
  }

  public onSettingsUpdated(): void {
    this.updateApiService()
    this.uiManager.updateAll()
  }
}

