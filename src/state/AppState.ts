import type {
  AppStateData,
  AppSettings,
  Chat,
  SerializableAppState,
  SerializableChat,
  UISettings,
} from '../types/index.js'

export class AppState implements AppStateData {
  public chats: Map<string, Chat> = new Map()
  public currentChatId: string | null = null
  public settings: AppSettings
  public ui: UISettings

  private readonly STORAGE_KEY = 'llm-chat-state'

  constructor() {
    this.settings = this.createDefaultSettings()
    this.ui = this.createDefaultUISettings()
  }

  private createDefaultSettings(): AppSettings {
    return {
      autoGenerateTitle: true,
      titleGenerationTrigger: 2,
      titleModel: 'evil',
      api: {
        baseUrl: 'https://text.pollinations.ai',
        apiKey: 'dummym',
        availableModels: ['evil', 'openai', 'openai-large', 'llama'],
      },
      chat: {
        model: 'openai',
        temperature: 0.7,
        maxTokens: 2048,
      },
      theme: 'dark',
    }
  }

  private createDefaultUISettings(): UISettings {
    return {
      sidebarCollapsed: false,
      isGenerating: false,
      editTextareaSize: {
        width: '100%',
        height: '120px',
      },
    }
  }

  public save(): void {
    const stateToSave: SerializableAppState = {
      chats: Array.from(this.chats.entries()).map(([id, chat]) => [id, this.serializeChat(chat)]),
      currentChatId: this.currentChatId,
      settings: this.settings,
      ui: this.ui,
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToSave))
    } catch (error) {
      console.error('Failed to save state:', error)
    }
  }

  private serializeChat(chat: Chat): SerializableChat {
    return {
      ...chat,
      messageBranches: Array.from(chat.messageBranches.entries()),
      currentBranches: Array.from(chat.currentBranches.entries()),
    }
  }

  public load(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (!saved) return

      const state: SerializableAppState = JSON.parse(saved)

      this.chats = new Map(
        (state.chats || []).map(([id, chat]) => [id, this.deserializeChat(chat)]),
      )

      this.currentChatId = state.currentChatId
      this.settings = { ...this.settings, ...state.settings }
      this.ui = { ...this.ui, ...state.ui }
    } catch (error) {
      console.error('Failed to load state:', error)
    }
  }

  private deserializeChat(chat: SerializableChat): Chat {
    return {
      ...chat,
      messageBranches: new Map(chat.messageBranches || []),
      currentBranches: new Map(chat.currentBranches || []),
      // Migration: Add model property to existing chats
      model: chat.model || this.settings.chat.model,
      // Migration: Add model property to existing messages
      messages: (chat.messages || []).map((msg) => {
        const model = msg.model || (msg.role === 'assistant' ? this.settings.chat.model : undefined)
        return {
          ...msg,
          ...(model && { model }),
        }
      }),
    }
  }

  public updateSettings(newSettings: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.save()
  }

  public updateUISettings(newUISettings: Partial<UISettings>): void {
    this.ui = { ...this.ui, ...newUISettings }
    this.save()
  }

  public addChat(chat: Chat): void {
    this.chats.set(chat.id, chat)
    this.save()
  }

  public updateChat(chatId: string, updates: Partial<Chat>): void {
    const chat = this.chats.get(chatId)
    if (chat) {
      Object.assign(chat, updates)
      this.save()
    }
  }

  public deleteChat(chatId: string): void {
    this.chats.delete(chatId)
    this.save()
  }

  public getCurrentChat(): Chat | null {
    return this.currentChatId ? this.chats.get(this.currentChatId) || null : null
  }

  public setCurrentChatId(chatId: string | null): void {
    this.currentChatId = chatId
    this.save()
  }

  public getActiveChats(): Chat[] {
    return Array.from(this.chats.values())
      .filter((chat) => !chat.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  public getArchivedChats(): Chat[] {
    return Array.from(this.chats.values())
      .filter((chat) => chat.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }
}
