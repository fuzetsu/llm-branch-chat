import { Component, For, createEffect, createSignal, Show } from 'solid-js'
import { Chat, Message as MessageType } from '../types/index.js'
import { useAppStore } from '../store/AppStore'
import Message from './Message'

interface MessageListProps {
  chat: Chat
}

const MessageList: Component<MessageListProps> = (props) => {
  const store = useAppStore()
  let messagesEndRef: HTMLDivElement | undefined
  const [shouldAutoScroll, setShouldAutoScroll] = createSignal(true)

  // Get visible messages using store method to handle branching
  const visibleMessages = () => store.getVisibleMessages(props.chat.id)

  // Auto-scroll to bottom when new messages arrive or streaming updates
  createEffect(() => {
    const messages = visibleMessages()
    const isStreaming = store.state.streaming.isStreaming
    
    if ((messages.length > 0 || isStreaming) && shouldAutoScroll()) {
      messagesEndRef?.scrollIntoView({ behavior: 'smooth' })
    }
  })

  // Handle scroll to detect if user has scrolled up
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50
    setShouldAutoScroll(isAtBottom)
  }

  // Get streaming content for the current message
  const getStreamingContent = (messageId: string) => {
    if (store.state.streaming.isStreaming && store.state.streaming.currentMessageId === messageId) {
      return store.state.streaming.currentContent
    }
    return null
  }

  return (
    <div 
      class="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      onScroll={handleScroll}
    >
      <For each={visibleMessages()}>
        {(message) => {
          const streamingContent = getStreamingContent(message.id)
          const messageWithStreaming = streamingContent !== null 
            ? { ...message, content: streamingContent }
            : message
            
          return (
            <Message 
              message={messageWithStreaming} 
              chat={props.chat} 
              isStreaming={store.state.streaming.currentMessageId === message.id}
            />
          )
        }}
      </For>
      
      {/* Empty state */}
      <Show when={visibleMessages().length === 0 && !store.state.streaming.isStreaming}>
        <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <div class="text-center">
            <div class="text-lg mb-2">Start a conversation</div>
            <div class="text-sm">Send a message to get started</div>
          </div>
        </div>
      </Show>
      
      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default MessageList

