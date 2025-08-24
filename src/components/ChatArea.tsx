import { Component, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

const ChatArea: Component = () => {
  const store = useAppStore()

  const currentChat = () => store.getCurrentChat()

  return (
    <>
      <Show
        when={currentChat()}
        fallback={
          <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div class="text-center">
              <h2 class="text-xl font-semibold mb-2">Welcome to LLM Chat</h2>
              <p>Select a chat from the sidebar or start a new conversation</p>
            </div>
          </div>
        }
      >
        <MessageList chat={currentChat()!} />
      </Show>

      <div class="flex-shrink-0 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4">
        <div class="max-w-4xl mx-auto">
          <MessageInput />
        </div>
      </div>
    </>
  )
}

export default ChatArea
