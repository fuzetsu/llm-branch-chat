import { Component, For, createEffect, onCleanup, createMemo } from 'solid-js'
import { Chat } from '../types'
import { useAppStore } from '../store/AppStore'
import Message from './Message'
import { getElementById, throttle } from '../utils'
import { createKeyedSignal } from '../utils/keyedSignal'
import EmptyState from './ui/EmptyState'

interface MessageListProps {
  chat: Chat
}

export const getMessageList = () => getElementById('message-list') as HTMLDivElement | undefined

export const scrollMessageListToBottom = () => getElementById('message-list-end')?.scrollIntoView()
const throttledScrollToEnd = throttle(scrollMessageListToBottom, 100)

const CURSOR_INCREMENT = 20

const MessageList: Component<MessageListProps> = (props) => {
  const store = useAppStore()

  const chatId = createMemo(() => props.chat.id)

  const [shouldAutoScroll, setShouldAutoScroll] = createKeyedSignal(true, () => chatId())
  const [cursor, setCursor] = createKeyedSignal(CURSOR_INCREMENT, () => chatId())

  const visibleMessages = createMemo(() => store.getVisibleMessages(props.chat.id))
  const virtualizedMessages = createMemo(() => visibleMessages().slice(-cursor()))

  let messagesContainer!: HTMLDivElement
  let firstRenderSettled = false
  createEffect(() => {
    chatId() // scroll to to bottom when chatId changes
    firstRenderSettled = false
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

  const handleScroll = () => {
    const messageList = getMessageList()
    if (!messageList) return
    const { scrollTop, scrollHeight, clientHeight } = messageList
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const isAtBottom = distanceFromBottom <= 50
    setShouldAutoScroll(isAtBottom)
    if (
      firstRenderSettled &&
      scrollTop < clientHeight * 3 &&
      visibleMessages().length >= virtualizedMessages().length
    ) {
      setCursor((x) => x + CURSOR_INCREMENT)
    }
  }

  return (
    <div id="message-list" class="flex-1 overflow-y-auto px-2 py-2" onScroll={handleScroll}>
      <div ref={messagesContainer} class="flex flex-col gap-2">
        <For
          each={virtualizedMessages()}
          fallback={
            <EmptyState
              class="self-center p-10 mt-13"
              title="Start a conversation"
              description="Send a message to get started"
            />
          }
        >
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

      {/* Scroll anchor */}
      <div id="message-list-end" />
    </div>
  )
}

export default MessageList
