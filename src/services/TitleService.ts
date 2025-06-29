import { SolidApiService } from './ApiService'
import type { MessageNode } from '../types/index.js'

export interface TitleServiceCallbacks {
  onUpdateChat: (chatId: string, updates: { title?: string; isGeneratingTitle?: boolean }) => void
  onGetVisibleMessages: (chatId: string) => MessageNode[]
}

export class TitleService {
  constructor(
    private apiService: SolidApiService,
    private callbacks: TitleServiceCallbacks
  ) {}

  async generateChatTitle(
    chatId: string,
    chat: { isGeneratingTitle?: boolean },
    titleModel: string
  ): Promise<void> {
    const visibleMessages = this.callbacks.onGetVisibleMessages(chatId)
    if (visibleMessages.length < 2 || chat.isGeneratingTitle) return

    try {
      this.callbacks.onUpdateChat(chatId, { isGeneratingTitle: true })

      const title = await this.apiService.generateTitle(visibleMessages, titleModel)

      if (title) {
        this.callbacks.onUpdateChat(chatId, {
          title,
          isGeneratingTitle: false,
        })
      }
    } catch (error) {
      console.error('Title generation failed:', error)
      this.callbacks.onUpdateChat(chatId, { isGeneratingTitle: false })
    }
  }
}