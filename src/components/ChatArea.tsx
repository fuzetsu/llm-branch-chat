import { Component, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import EmptyState from './ui/EmptyState'

const ChatArea: Component = () => {
  const store = useAppStore()

  const currentChat = () => store.getCurrentChat()

  return (
    <main class="fixed lg:left-80 top-13 left-0 right-0 bottom-0 flex flex-col">
      <Show
        when={currentChat()}
        fallback={
          <div class="flex-1 flex flex-col">
            <EmptyState
              class="self-center p-10 mt-15"
              title="Start a conversation"
              description="Send a message to get started"
            />
          </div>
        }
      >
        {(chat) => <MessageList chat={chat()} />}
      </Show>

      <div class="shrink-0 border-t border-border bg-surface p-2">
        <div class="max-w-4xl mx-auto">
          <MessageInput />
        </div>
      </div>
    </main>
  )
}

export default ChatArea
