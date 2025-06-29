import { SolidApiService } from './ApiService'
import { createMessageNode, findNodeById } from '../utils/messageTree.js'
import type { AppSettings, Chat, MessageNode, ApiMessage } from '../types/index.js'

export interface MessageServiceCallbacks {
  onAddMessage: (chatId: string, message: MessageNode, parentId?: string) => void
  onUpdateMessage: (chatId: string, messageId: string, updates: Partial<MessageNode>) => void
  onStartStreaming: (messageId: string) => void
  onStopStreaming: () => void
  onAppendStreamingContent: (content: string) => void
  onGetStreamingContent: () => string
  onGetVisibleMessages: (chatId: string) => MessageNode[]
}

export class MessageService {
  constructor(
    private apiService: SolidApiService,
    private callbacks: MessageServiceCallbacks
  ) {}

  async sendMessage(
    content: string,
    currentChat: Chat,
    settings: AppSettings
  ): Promise<void> {
    // Find the last message in the conversation to use as parent
    const visibleMessages = this.callbacks.onGetVisibleMessages(currentChat.id)
    const lastMessage = visibleMessages[visibleMessages.length - 1]
    const parentId = lastMessage?.id || null

    // Add user message
    const userMessage = createMessageNode('user', content.trim(), 'user', parentId)
    this.callbacks.onAddMessage(currentChat.id, userMessage, parentId || undefined)

    // Create assistant message placeholder
    const assistantMessage = createMessageNode(
      'assistant',
      '',
      currentChat.model || settings.chat.model,
      userMessage.id,
    )

    this.callbacks.onAddMessage(currentChat.id, assistantMessage, userMessage.id)
    this.callbacks.onStartStreaming(assistantMessage.id)

    try {
      // Convert messages to API format
      const updatedVisibleMessages = this.callbacks.onGetVisibleMessages(currentChat.id)
      const apiMessages: ApiMessage[] = updatedVisibleMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Stream response
      await this.apiService.streamToSignals(
        apiMessages,
        assistantMessage.model || settings.chat.model,
        {
          onToken: (token: string) => {
            this.callbacks.onAppendStreamingContent(token)
          },
          onComplete: () => {
            // Save the current streaming content before stopping
            const finalContent = this.callbacks.onGetStreamingContent()
            this.callbacks.onStopStreaming()

            // Update final message with complete content
            this.callbacks.onUpdateMessage(currentChat.id, assistantMessage.id, {
              content: finalContent,
              timestamp: Date.now(),
            })
          },
          onError: (error: Error) => {
            console.error('Streaming error:', error)
            this.callbacks.onUpdateMessage(currentChat.id, assistantMessage.id, {
              content: `Error: ${error.message}`,
              timestamp: Date.now(),
            })
            this.callbacks.onStopStreaming()
          },
        },
        settings.chat.temperature,
        settings.chat.maxTokens,
      )
    } catch (error) {
      console.error('Failed to send message:', error)
      this.callbacks.onUpdateMessage(currentChat.id, assistantMessage.id, {
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      })
      this.callbacks.onStopStreaming()
    }
  }

  async regenerateMessage(
    chatId: string,
    messageId: string,
    chat: Chat,
    settings: AppSettings
  ): Promise<void> {
    if (!chat.messageTree) return

    const message = findNodeById(chat.messageTree, messageId)
    if (!message || message.role !== 'assistant') return

    // Get conversation history up to this message
    const visibleMessages = this.callbacks.onGetVisibleMessages(chatId)
    const messageIndex = visibleMessages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    const conversationHistory = visibleMessages.slice(0, messageIndex)

    try {
      // Create new branch (sibling) for regenerated content
      const newBranchMessage = createMessageNode(
        'assistant',
        '',
        message.model || chat.model || settings.chat.model,
        message.parentId,
      )

      // Add the new branch as a sibling
      if (message.parentId) {
        this.callbacks.onAddMessage(chatId, newBranchMessage, message.parentId)
      }

      // Start streaming for regeneration
      this.callbacks.onStartStreaming(newBranchMessage.id)

      // Convert conversation history to API format
      const apiMessages: ApiMessage[] = conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Stream the regenerated response with entropy to prevent caching
      await this.apiService.streamToSignals(
        apiMessages,
        newBranchMessage.model || settings.chat.model,
        {
          onToken: (token: string) => {
            this.callbacks.onAppendStreamingContent(token)
          },
          onComplete: () => {
            // Update the new branch with the complete content
            const finalContent = this.callbacks.onGetStreamingContent()
            this.callbacks.onUpdateMessage(chatId, newBranchMessage.id, {
              content: finalContent,
              timestamp: Date.now(),
            })
            this.callbacks.onStopStreaming()
          },
          onError: (error: Error) => {
            console.error('Regeneration error:', error)
            this.callbacks.onUpdateMessage(chatId, newBranchMessage.id, {
              content: `Error: ${error.message}`,
              timestamp: Date.now(),
            })
            this.callbacks.onStopStreaming()
          },
        },
        settings.chat.temperature,
        settings.chat.maxTokens,
        true, // Enable entropy to prevent API caching
      )
    } catch (error) {
      console.error('Failed to regenerate message:', error)
      this.callbacks.onStopStreaming()
    }
  }
}