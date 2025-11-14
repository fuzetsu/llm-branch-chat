import { Component, For, createEffect, Show, onCleanup } from 'solid-js'
import { Chat } from '../types/index.js'
import { useAppStore } from '../store/AppStore'
import Message from './Message'
import { querySelector, throttle, touch } from '../utils/index.js'
import { createKeyedSignal } from '../utils/keyedSignal.js'

interface MessageListProps {
  chat: Chat
}

export const scrollMessageListToBottom = () => querySelector('#message-list-end').scrollIntoView()
const scrollToEnd = throttle(scrollMessageListToBottom, 100)

export const isMessageListScrolledToBottom = () => {
  const { scrollTop, scrollHeight, clientHeight } = querySelector('#message-list')
  const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50
  return isAtBottom
}

const MessageList: Component<MessageListProps> = (props) => {
  const store = useAppStore()
  const [shouldAutoScroll, setShouldAutoScroll] = createKeyedSignal(true, () => props.chat.id)

  // Get visible messages using store method to handle branching
  const visibleMessages = () => store.getVisibleMessages(props.chat.id)

  // Auto-scroll to bottom when new messages arrive or streaming updates
  let messagesContainer!: HTMLDivElement
  createEffect(() => {
    touch(props.chat.id)
    let firstRenderSettled = false
    let settledId = -1
    const observer = new ResizeObserver(() => {
      console.log('fired!')
      clearTimeout(settledId)
      settledId = setTimeout(() => (firstRenderSettled = true), 1000)
      const shouldScroll = shouldAutoScroll() || !firstRenderSettled
      if (shouldScroll && !store.state.flashingMessageId) scrollToEnd()
    })
    observer.observe(messagesContainer)
    onCleanup(() => observer.disconnect())
  })

  // Handle scroll to detect if user has scrolled up
  const handleScroll = () => setShouldAutoScroll(isMessageListScrolledToBottom())

  return (
    <div id="message-list" class="flex-1 overflow-y-auto px-4 py-6" onScroll={handleScroll}>
      <div ref={messagesContainer} class="flex-1">
        <For each={visibleMessages()}>
          {(message) => (
            <Message
              message={message}
              chat={props.chat}
              isStreaming={store.state.streaming.currentMessageId === message.id}
              streamingContent={
                store.state.streaming.isStreaming &&
                store.state.streaming.currentMessageId === message.id
                  ? store.state.streaming.currentContent
                  : null
              }
            />
          )}
        </For>
      </div>

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
      <div id="message-list-end" />
    </div>
  )
}

export default MessageList
