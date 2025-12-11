import { createProviderApiService } from '../services/ProviderApiService'
import { createMessageService } from '../services/MessageService'
import { createTitleService } from '../services/TitleService'
import { createChatOperations } from './ChatOperations'
import { createMessageOperations } from './MessageOperations'
import { createStreamingOperations } from './StreamingOperations'
import type { AppStoreOperationsDeps } from './AppStore'

export function createAppStoreOperations(
  deps: AppStoreOperationsDeps,
) {
  const getApiService = () => {
    const state = deps.getState()
    return createProviderApiService(state.settings.api.providers)
  }
  // Initialize operation modules
  const chatOps = createChatOperations(deps)
  const messageOps = createMessageOperations(deps)
  const streamingOps = createStreamingOperations(deps)

  // Initialize services
  const messageService = createMessageService({
    getApiService,
    addMessage: messageOps.addMessage,
    updateMessage: messageOps.updateMessage,
    startStreaming: streamingOps.startStreaming,
    stopStreaming: streamingOps.stopStreaming,
    appendStreamingContent: streamingOps.appendStreamingContent,
    getStreamingContent: streamingOps.getStreamingContent,
    getVisibleMessages: messageOps.getVisibleMessages,
  })

  const titleService = createTitleService({
    getApiService,
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
    generateAssistantResponse: messageService.generateAssistantResponse,
    regenerateMessage: messageService.regenerateMessage,
    generateChatTitle: titleService.generateChatTitle,
  }
}

// Export the composed type
export type AppStoreOperations = ReturnType<typeof createAppStoreOperations>
