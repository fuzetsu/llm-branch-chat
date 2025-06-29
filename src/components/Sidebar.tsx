import { Component } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import ChatList from './ChatList'

const Sidebar: Component = () => {
  const store = useAppStore()

  const handleNewChat = () => {
    store.createNewChat()
  }

  return (
    <aside
      class={`fixed inset-y-0 left-0 z-40 w-80 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-dark-border transition-transform duration-300 ease-in-out ${
        store.state.ui.sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
      } lg:translate-x-0`}
    >
      <div class="flex flex-col h-full pt-16">
        <div class="p-4 border-b border-gray-200 dark:border-dark-border">
          <button
            class="w-full px-4 py-3 text-left bg-primary hover:bg-blue-600 dark:bg-primary-dark dark:hover:bg-primary-darker text-white rounded-lg transition-colors flex items-center space-x-2"
            onClick={handleNewChat}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            <span>New Chat</span>
          </button>
        </div>
        <ChatList />
      </div>
    </aside>
  )
}

export default Sidebar

