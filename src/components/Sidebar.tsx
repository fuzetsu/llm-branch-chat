import { Component } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import ChatList from './ChatList'
import Icon from './ui/Icon'
import { classnames } from '../utils'

const Sidebar: Component = () => {
  const store = useAppStore()

  const handleNewChat = () => {
    store.createNewChat()
    store.setUI({ sidebarCollapsed: true })
  }

  return (
    <aside
      class={classnames(
        'fixed inset-y-0 left-0 z-40 w-80 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-dark-border transition-transform duration-300 ease-in-out lg:translate-x-0',
        store.state.ui.sidebarCollapsed ? '-translate-x-full' : 'translate-x-0',
      )}
    >
      <div class="flex flex-col h-full pt-16">
        <div class="p-2 border-b border-gray-200 dark:border-dark-border">
          <button
            class={classnames(
              'w-full px-4 py-3 text-left hover:bg-blue-600 dark:hover:bg-primary-darker text-white rounded-lg transition-colors flex items-center space-x-2 cursor-pointer',
              store.state.currentChatId == null && 'bg-primary dark:bg-primary-dark',
            )}
            onClick={handleNewChat}
          >
            <Icon name="plus" />
            <span>New Chat</span>
          </button>
        </div>
        <ChatList />
      </div>
    </aside>
  )
}

export default Sidebar
