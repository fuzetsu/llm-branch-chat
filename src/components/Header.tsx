import { Component, createSignal, For } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Icon from './Icon'
import SettingsModal from './SettingsModal'

const Header: Component = () => {
  const store = useAppStore()

  const handleNewChat = () => {
    store.createNewChat()
  }

  const [showSettings, setShowSettings] = createSignal(false)

  const handleSettings = () => {
    setShowSettings(true)
  }

  const toggleSidebar = () => {
    store.setUI({ sidebarCollapsed: !store.state.ui.sidebarCollapsed })
  }

  const currentChat = () => store.getCurrentChat()

  return (
    <header class="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border shadow-sm">
      <div class="flex items-center justify-between h-16 px-4">
        <div class="flex items-center space-x-4">
          <button
            class="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={toggleSidebar}
          >
            <Icon name="menu" size="lg" class="text-gray-600 dark:text-gray-300" />
          </button>
          <div class="flex items-center space-x-3">
            <div class="relative flex items-center min-w-[120px]">
              <h1 class="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-xs cursor-pointer hover:text-primary dark:hover:text-primary-dark transition-colors">
                {currentChat()?.title || 'New Chat'}
              </h1>
            </div>
            <div class="hidden sm:block">
              <select
                class="px-3 py-2 text-sm bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                value={currentChat()?.model || store.state.settings.chat.model}
                onChange={(e) => {
                  const selectedModel = e.currentTarget.value
                  const chat = currentChat()
                  if (chat) {
                    store.updateChat(chat.id, { model: selectedModel })
                  } else {
                    store.setSettings({
                      chat: { ...store.state.settings.chat, model: selectedModel },
                    })
                  }
                }}
              >
                <For each={store.state.settings.chat.availableModels}>{(model) => (
                  <option value={model}>{model}</option>
                )}</For>
              </select>
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button
            class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={handleSettings}
            title="Settings"
          >
            <Icon name="settings" class="text-gray-600 dark:text-gray-300" />
          </button>
          <button
            class="p-2 rounded-md bg-primary hover:bg-blue-600 dark:bg-primary-dark dark:hover:bg-primary-darker text-white transition-colors"
            onClick={handleNewChat}
            title="New Chat"
          >
            <Icon name="plus" />
          </button>
        </div>
      </div>
      <SettingsModal isOpen={showSettings()} onClose={() => setShowSettings(false)} />
    </header>
  )
}

export default Header
