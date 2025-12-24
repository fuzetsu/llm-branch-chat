import { Component, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

const ChatArea: Component = () => {
  const store = useAppStore()

  const currentChat = () => store.getCurrentChat()

  return (
    <main class="fixed lg:left-80 top-13 left-0 right-0 bottom-0 flex flex-col">
      <Show
        when={currentChat()}
        fallback={
          <div class="flex items-center justify-center h-full text-text-muted">
            <div class="text-center">
              <h2 class="text-xl font-semibold mb-2 tracking-tight">Welcome to LLM Chat</h2>
              <p>Select a chat from the sidebar or start a new conversation</p>
            </div>
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
