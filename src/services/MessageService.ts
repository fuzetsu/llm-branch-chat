type ApiService = ReturnType<typeof import('./ApiService').createApiService>
import { createMessageNode, findNodeById } from '../utils/messageTree.js'
import type { AppSettings, Chat, MessageNode, ApiMessage } from '../types/index.js'

export interface MessageServiceDeps {
  apiService: ApiService
  addMessage: (chatId: string, message: MessageNode, parentId: string | null) => void
  updateMessage: (chatId: string, messageId: string, updates: Partial<MessageNode>) => void
  startStreaming: (messageId: string) => void
  stopStreaming: () => void
  appendStreamingContent: (content: string) => void
  getStreamingContent: () => string
  getVisibleMessages: (chatId: string) => MessageNode[]
}

export const createMessageService = ({
  apiService,
  addMessage,
  updateMessage,
  startStreaming,
  stopStreaming,
  appendStreamingContent,
  getStreamingContent,
  getVisibleMessages,
}: MessageServiceDeps) => {
  // Helper: Convert messages to API format
  const convertToApiMessages = (messages: MessageNode[]): ApiMessage[] =>
    messages.map((msg) => ({ role: msg.role, content: msg.content }))

  // Helper: Common streaming response handler
  const createStreamingHandler = (chatId: string, messageId: string) => ({
    onToken: (token: string) => {
      appendStreamingContent(token)
    },
    onComplete: () => {
      const finalContent = getStreamingContent()
      stopStreaming()
      updateMessage(chatId, messageId, {
        content: finalContent,
        timestamp: Date.now(),
      })
    },
    onError: (error: Error) => {
      console.error('Streaming error:', error)
      updateMessage(chatId, messageId, {
        content: `Error: ${error.message}`,
        timestamp: Date.now(),
      })
      stopStreaming()
    },
  })

  // Helper: Common error handling for streaming operations
  const handleStreamingError = (
    chatId: string,
    messageId: string,
    error: unknown,
    operation: string,
  ) => {
    console.error(`Failed to ${operation}:`, error)
    updateMessage(chatId, messageId, {
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: Date.now(),
    })
    stopStreaming()
  }

  return {
    async sendMessage(content: string, currentChat: Chat, settings: AppSettings): Promise<void> {
      // Find the last message in the conversation to use as parent
      const visibleMessages = getVisibleMessages(currentChat.id)
      const lastMessage = visibleMessages.at(-1)
      const parentId = lastMessage?.id || null

      // Add user message
      const userMessage = createMessageNode('user', content.trim(), 'user', parentId)
      addMessage(currentChat.id, userMessage, parentId)

      // Create assistant message placeholder
      const assistantMessage = createMessageNode(
        'assistant',
        '',
        currentChat.model || settings.chat.model,
        userMessage.id,
      )

      addMessage(currentChat.id, assistantMessage, userMessage.id)
      startStreaming(assistantMessage.id)

      try {
        const updatedVisibleMessages = getVisibleMessages(currentChat.id)
        const apiMessages = convertToApiMessages(updatedVisibleMessages)

        await apiService.streamResponse(
          apiMessages,
          assistantMessage.model || settings.chat.model,
          createStreamingHandler(currentChat.id, assistantMessage.id),
          settings.chat.temperature,
          settings.chat.maxTokens,
        )
      } catch (error) {
        handleStreamingError(currentChat.id, assistantMessage.id, error, 'send message')
      }
    },

    async generateAssistantResponse(currentChat: Chat, settings: AppSettings): Promise<void> {
      // Find the last message in the conversation to use as parent
      const visibleMessages = getVisibleMessages(currentChat.id)
      const lastMessage = visibleMessages.at(-1)

      // Only generate if the last message is from the user
      if (!lastMessage || lastMessage.role !== 'user') return

      // Create assistant message placeholder
      const assistantMessage = createMessageNode(
        'assistant',
        '',
        currentChat.model || settings.chat.model,
        lastMessage.id,
      )

      addMessage(currentChat.id, assistantMessage, lastMessage.id)
      startStreaming(assistantMessage.id)

      try {
        const apiMessages = convertToApiMessages(visibleMessages)

        await apiService.streamResponse(
          apiMessages,
          assistantMessage.model || settings.chat.model,
          createStreamingHandler(currentChat.id, assistantMessage.id),
          settings.chat.temperature,
          settings.chat.maxTokens,
        )
      } catch (error) {
        handleStreamingError(
          currentChat.id,
          assistantMessage.id,
          error,
          'generate assistant response',
        )
      }
    },

    async regenerateMessage(
      chatId: string,
      messageId: string,
      chat: Chat,
      settings: AppSettings,
    ): Promise<void> {
      const message = findNodeById(chat.nodes, messageId)
      if (!message || message.role !== 'assistant') return

      // Get conversation history up to this message
      const visibleMessages = getVisibleMessages(chatId)
      const messageIndex = visibleMessages.findIndex((m) => m.id === messageId)
      if (messageIndex === -1) return

      const conversationHistory = visibleMessages.slice(0, messageIndex)

      try {
        // Create new branch (sibling) for regenerated content
        const newBranchMessage = createMessageNode(
          'assistant',
          '',
          chat.model || settings.chat.model,
          message.parentId,
        )

        // Add the new branch as a sibling
        if (message.parentId) {
          addMessage(chatId, newBranchMessage, message.parentId)
        }

        // Start streaming for regeneration
        startStreaming(newBranchMessage.id)

        const apiMessages = convertToApiMessages(conversationHistory)

        await apiService.streamResponse(
          apiMessages,
          newBranchMessage.model || settings.chat.model,
          createStreamingHandler(chatId, newBranchMessage.id),
          settings.chat.temperature,
          settings.chat.maxTokens,
          true, // Enable entropy to prevent API caching
        )
      } catch (error) {
        console.error('Failed to regenerate message:', error)
        stopStreaming()
      }
    },
  }
}
