import type { AppStoreOperationsDeps } from './AppStore'

export type StreamingOperationsDeps = AppStoreOperationsDeps

export const createStreamingOperations = ({ setState, getState }: StreamingOperationsDeps) => ({
  startStreaming: (messageId: string) => {
    setState('streaming', {
      isStreaming: true,
      currentMessageId: messageId,
      currentContent: '',
    })
  },

  updateStreamingContent: (content: string) => {
    setState('streaming', 'currentContent', content)
  },

  appendStreamingContent: (content: string) => {
    setState('streaming', 'currentContent', (prev: string) => prev + content)
  },

  stopStreaming: () => {
    setState('streaming', {
      isStreaming: false,
      currentMessageId: null,
      currentContent: '',
    })
  },

  getStreamingContent: (): string => {
    const state = getState()
    return state.streaming.currentContent
  },
})