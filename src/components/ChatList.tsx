import { Component, For, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import ChatItem from './ChatItem'

const ChatList: Component = () => {
  const store = useAppStore()

  const activeChats = () => store.getActiveChats()

  return (
    <div class="flex-1 overflow-y-auto p-4">
      <For each={activeChats()}>
        {(chat) => (
          <ChatItem
            chat={chat}
            isSelected={store.state.currentChatId === chat.id}
            onSelect={() => store.setCurrentChatId(chat.id)}
          />
        )}
      </For>
      <Show when={activeChats().length === 0}>
        <div class="text-gray-500 dark:text-gray-400 text-center py-8">
          No chats yet. Start a new conversation!
        </div>
      </Show>
    </div>
  )
}

export default ChatList

