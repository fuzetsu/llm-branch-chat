import { SolidApiService } from './ApiService'
import { createMessageNode, findNodeById } from '../utils/messageTree.js'
import type { AppSettings, Chat, MessageNode, ApiMessage } from '../types/index.js'

export interface MessageServiceDeps {
  apiService: SolidApiService
  addMessage: (chatId: string, message: MessageNode, parentId?: string) => void
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
}: MessageServiceDeps) => ({
  async sendMessage(content: string, currentChat: Chat, settings: AppSettings): Promise<void> {
    // Find the last message in the conversation to use as parent
    const visibleMessages = getVisibleMessages(currentChat.id)
    const lastMessage = visibleMessages[visibleMessages.length - 1]
    const parentId = lastMessage?.id || null

    // Add user message
    const userMessage = createMessageNode('user', content.trim(), 'user', parentId)
    addMessage(currentChat.id, userMessage, parentId || undefined)

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
      // Convert messages to API format
      const updatedVisibleMessages = getVisibleMessages(currentChat.id)
      const apiMessages: ApiMessage[] = updatedVisibleMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Stream response
      await apiService.streamToSignals(
        apiMessages,
        assistantMessage.model || settings.chat.model,
        {
          onToken: (token: string) => {
            appendStreamingContent(token)
          },
          onComplete: () => {
            // Save the current streaming content before stopping
            const finalContent = getStreamingContent()
            stopStreaming()

            // Update final message with complete content
            updateMessage(currentChat.id, assistantMessage.id, {
              content: finalContent,
              timestamp: Date.now(),
            })
          },
          onError: (error: Error) => {
            console.error('Streaming error:', error)
            updateMessage(currentChat.id, assistantMessage.id, {
              content: `Error: ${error.message}`,
              timestamp: Date.now(),
            })
            stopStreaming()
          },
        },
        settings.chat.temperature,
        settings.chat.maxTokens,
      )
    } catch (error) {
      console.error('Failed to send message:', error)
      updateMessage(currentChat.id, assistantMessage.id, {
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      })
      stopStreaming()
    }
  },

  async regenerateMessage(
    chatId: string,
    messageId: string,
    chat: Chat,
    settings: AppSettings,
  ): Promise<void> {
    if (!chat.messageTree) return

    const message = findNodeById(chat.messageTree, messageId)
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

      // Convert conversation history to API format
      const apiMessages: ApiMessage[] = conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Stream the regenerated response with entropy to prevent caching
      await apiService.streamToSignals(
        apiMessages,
        newBranchMessage.model || settings.chat.model,
        {
          onToken: (token: string) => {
            appendStreamingContent(token)
          },
          onComplete: () => {
            // Update the new branch with the complete content
            const finalContent = getStreamingContent()
            updateMessage(chatId, newBranchMessage.id, {
              content: finalContent,
              timestamp: Date.now(),
            })
            stopStreaming()
          },
          onError: (error: Error) => {
            console.error('Regeneration error:', error)
            updateMessage(chatId, newBranchMessage.id, {
              content: `Error: ${error.message}`,
              timestamp: Date.now(),
            })
            stopStreaming()
          },
        },
        settings.chat.temperature,
        settings.chat.maxTokens,
        true, // Enable entropy to prevent API caching
      )
    } catch (error) {
      console.error('Failed to regenerate message:', error)
      stopStreaming()
    }
  },
})
