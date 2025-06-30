type ApiService = ReturnType<typeof import('./ApiService').createApiService>
import type { MessageNode } from '../types/index.js'

export interface TitleServiceDeps {
  apiService: ApiService
  updateChat: (chatId: string, updates: { title?: string; isGeneratingTitle?: boolean }) => void
  getVisibleMessages: (chatId: string) => MessageNode[]
}

export const createTitleService = ({
  apiService,
  updateChat,
  getVisibleMessages,
}: TitleServiceDeps) => ({
  async generateChatTitle(
    chatId: string,
    chat: { isGeneratingTitle?: boolean },
    titleModel: string,
  ): Promise<void> {
    const visibleMessages = getVisibleMessages(chatId)
    if (visibleMessages.length < 2 || chat.isGeneratingTitle) return

    try {
      updateChat(chatId, { isGeneratingTitle: true })

      const title = await apiService.generateTitle(visibleMessages, titleModel)

      if (title) {
        updateChat(chatId, {
          title,
          isGeneratingTitle: false,
        })
      }
    } catch (error) {
      console.error('Title generation failed:', error)
      updateChat(chatId, { isGeneratingTitle: false })
    }
  },
})
