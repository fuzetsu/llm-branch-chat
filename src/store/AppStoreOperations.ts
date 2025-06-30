import { SolidApiService } from '../services/ApiService'
import { createMessageService } from '../services/MessageService'
import { createTitleService } from '../services/TitleService'
import { createChatOperations } from './ChatOperations'
import { createMessageOperations } from './MessageOperations'
import { createStreamingOperations } from './StreamingOperations'
import type { AppStoreOperationsDeps } from './AppStore'

export function createAppStoreOperations(
  deps: AppStoreOperationsDeps,
  apiService: SolidApiService
) {
  // Initialize operation modules
  const chatOps = createChatOperations(deps)
  const messageOps = createMessageOperations(deps)
  const streamingOps = createStreamingOperations(deps)

  // Initialize services
  const messageService = createMessageService({
    apiService,
    addMessage: messageOps.addMessage,
    updateMessage: messageOps.updateMessage,
    startStreaming: streamingOps.startStreaming,
    stopStreaming: streamingOps.stopStreaming,
    appendStreamingContent: streamingOps.appendStreamingContent,
    getStreamingContent: streamingOps.getStreamingContent,
    getVisibleMessages: messageOps.getVisibleMessages,
  })

  const titleService = createTitleService({
    apiService,
    updateChat: chatOps.updateChat,
    getVisibleMessages: messageOps.getVisibleMessages,
  })

  return {
    // Chat operations
    ...chatOps,
    // Message operations
    ...messageOps,
    // Streaming operations
    ...streamingOps,
    // High-level services
    sendMessage: messageService.sendMessage,
    regenerateMessage: messageService.regenerateMessage,
    generateChatTitle: titleService.generateChatTitle,
  }
}

// Export the composed type
export type AppStoreOperations = ReturnType<typeof createAppStoreOperations>