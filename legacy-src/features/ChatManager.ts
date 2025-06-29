import type { Chat, ConfirmModalOptions } from '../types/index.js'
import type { AppState } from '../state/AppState.js'
import { generateId } from '../utils/index.js'

export class ChatManager {
  constructor(private readonly appState: AppState) {}

  public createNewChat(): string {
    const chatId = generateId()
    const chat: Chat = {
      id: chatId,
      title: 'New Chat',
      messages: [],
      messageBranches: new Map(),
      currentBranches: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isGeneratingTitle: false,
      isArchived: false,
      model: this.appState.settings.chat.model,
    }

    this.appState.addChat(chat)
    this.appState.setCurrentChatId(chatId)

    return chatId
  }

  public switchToChat(chatId: string): boolean {
    if (this.appState.chats.has(chatId)) {
      this.appState.setCurrentChatId(chatId)
      return true
    }
    return false
  }

  public deleteChat(
    chatId: string,
    showConfirmModal: (options: ConfirmModalOptions) => void,
  ): void {
    showConfirmModal({
      title: 'Delete Chat',
      message: 'Are you sure you want to delete this chat? This action cannot be undone.',
      onConfirm: () => {
        this.performDeleteChat(chatId)
      },
    })
  }

  private performDeleteChat(chatId: string): void {
    this.appState.deleteChat(chatId)

    if (this.appState.currentChatId === chatId) {
      const remainingChats = this.appState.getActiveChats()
      this.appState.setCurrentChatId(remainingChats.length > 0 ? remainingChats[0]!.id : null)
    }
  }

  public archiveChat(chatId: string): void {
    const chat = this.appState.chats.get(chatId)
    if (!chat) return

    this.appState.updateChat(chatId, {
      isArchived: true,
      updatedAt: Date.now(),
    })

    // If this was the current chat, switch to another active chat
    if (this.appState.currentChatId === chatId) {
      const activeChats = this.appState.getActiveChats()
      this.appState.setCurrentChatId(activeChats.length > 0 ? activeChats[0]!.id : null)
    }
  }

  public restoreChat(chatId: string): void {
    const chat = this.appState.chats.get(chatId)
    if (!chat) return

    this.appState.updateChat(chatId, {
      isArchived: false,
      updatedAt: Date.now(),
    })
  }

  public getCurrentChat(): Chat | null {
    return this.appState.getCurrentChat()
  }

  public getEffectiveModel(chatId?: string): string {
    const targetChatId = chatId || this.appState.currentChatId
    const chat = targetChatId ? this.appState.chats.get(targetChatId) : null
    return chat?.model || this.appState.settings.chat.model
  }

  public updateChatModel(chatId: string, newModel: string): void {
    const chat = this.appState.chats.get(chatId)
    if (!chat || chat.model === newModel) return

    this.appState.updateChat(chatId, {
      model: newModel,
      updatedAt: Date.now(),
    })
  }

  public updateChatTitle(chatId: string, newTitle: string): void {
    const chat = this.appState.chats.get(chatId)
    if (!chat) return

    const MAX_TITLE_LENGTH = 50
    const truncatedTitle =
      newTitle.length > MAX_TITLE_LENGTH
        ? newTitle.substring(0, MAX_TITLE_LENGTH).trim() + '...'
        : newTitle

    this.appState.updateChat(chatId, {
      title: truncatedTitle,
      updatedAt: Date.now(),
    })
  }

  public setTitleGenerating(chatId: string, isGenerating: boolean): void {
    this.appState.updateChat(chatId, {
      isGeneratingTitle: isGenerating,
    })
  }

  public shouldGenerateTitle(chat: Chat): boolean {
    return (
      this.appState.settings.autoGenerateTitle &&
      chat.messages.length >= this.appState.settings.titleGenerationTrigger &&
      chat.title === 'New Chat' &&
      !chat.isGeneratingTitle
    )
  }

  public getActiveChats(): Chat[] {
    return this.appState.getActiveChats()
  }

  public getArchivedChats(): Chat[] {
    return this.appState.getArchivedChats()
  }
}
