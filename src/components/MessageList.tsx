import { Component, For, createEffect, Show, onCleanup, createMemo } from 'solid-js'
import { Chat } from '../types'
import { useAppStore } from '../store/AppStore'
import Message from './Message'
import { querySelector, throttle } from '../utils'
import { createKeyedSignal } from '../utils/keyedSignal'

interface MessageListProps {
  chat: Chat
}

export const scrollMessageListToBottom = () => querySelector('#message-list-end')?.scrollIntoView()
const throttledScrollToEnd = throttle(scrollMessageListToBottom, 100)

export const isMessageListScrolledToBottom = () => {
  const messageList = querySelector('#message-list')
  if (!messageList) return true
  const { scrollTop, scrollHeight, clientHeight } = messageList
  const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50
  return isAtBottom
}

const MessageList: Component<MessageListProps> = (props) => {
  const store = useAppStore()

  const chatId = createMemo(() => props.chat.id)

  const [shouldAutoScroll, setShouldAutoScroll] = createKeyedSignal(true, () => chatId())

  // Get visible messages using store method to handle branching
  const visibleMessages = () => store.getVisibleMessages(props.chat.id)

  // Auto-scroll to bottom when new messages arrive or streaming updates
  let messagesContainer!: HTMLDivElement
  createEffect(() => {
    chatId() // scroll to to bottom when chatId changes
    let firstRenderSettled = false
    let settledId = -1
    const observer = new ResizeObserver(() => {
      if (!firstRenderSettled) {
        clearTimeout(settledId)
        settledId = setTimeout(() => (firstRenderSettled = true), 1000)
      }
      const shouldScroll = shouldAutoScroll() || !firstRenderSettled
      if (shouldScroll && !store.state.flashingMessageId) throttledScrollToEnd()
    })
    observer.observe(messagesContainer)
    onCleanup(() => observer.disconnect())
  })

  // Handle scroll to detect if user has scrolled up
  const handleScroll = () => setShouldAutoScroll(isMessageListScrolledToBottom())

  return (
    <div id="message-list" class="flex-1 overflow-y-auto px-2 py-2" onScroll={handleScroll}>
      <div ref={messagesContainer} class="flex-1 flex flex-col gap-2">
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
        <div class="flex items-center justify-center h-full text-text-muted">
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
