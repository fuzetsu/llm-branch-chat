import { Component, createSignal, Show, createEffect, onCleanup, createMemo } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Icon from './ui/Icon'
import SettingsModal from './SettingsModal'
import ChatStatsModal from './ChatStatsModal'
import Button from './ui/Button'
import ModelSelector from './ModelSelector'
import SystemPromptSelector from './SystemPromptSelector'

const Header: Component = () => {
  const store = useAppStore()

  const [showSettings, setShowSettings] = createSignal(false)
  const [showStats, setShowStats] = createSignal(false)
  const [showMobileMenu, setShowMobileMenu] = createSignal(false)

  const hasActiveChat = createMemo(() => Boolean(store.state.currentChatId))

  const handleSettings = () => setShowSettings(true)
  const handleStats = () => setShowStats(true)
  const toggleSidebar = () => store.setUI({ sidebarCollapsed: !store.state.ui.sidebarCollapsed })
  const currentChat = () => store.getCurrentChat()
  const handleNewChat = () => store.createNewChat()
  const handleCopyBranch = () => {
    const chat = store.getCurrentChat()
    if (!chat) return
    const promptId = chat.systemPromptId ?? store.state.settings.chat.defaultSystemPromptId

    const systemMessage = promptId ? store.state.settings.systemPrompts.get(promptId) : null
    const systemText = systemMessage ? `[system]: ${systemMessage}` : ''
    const conversationLines = store
      .getVisibleMessages(chat.id)
      .map((message) => `[${message.role}]: ${message.content}`)
    const text = [systemText, ...conversationLines].join('\n\n')
    navigator.clipboard.writeText(text).catch((e) => alert('Copy operation failed: ' + e))
  }

  // Close mobile menu when clicking outside
  createEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showMobileMenu() && !target.closest('.mobile-menu-container')) {
        setShowMobileMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    onCleanup(() => document.removeEventListener('click', handleClickOutside))
  })

  const moreActionsButton =
    'w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors cursor-pointer'

  return (
    <header class="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border shadow-sm">
      <div class="flex items-center justify-between h-16 px-1">
        <div class="flex items-center space-x-1 flex-1 min-w-0">
          <Button variant="ghost" class="lg:hidden p-2 shrink-0" onClick={toggleSidebar}>
            <Icon name="menu" class="text-gray-600 dark:text-gray-300" />
          </Button>
          <div class="flex items-center flex-1 min-w-0">
            <h1 class="text-lg font-semibold text-gray-900 dark:text-white truncate lg:pl-4">
              {currentChat()?.title || 'New Chat'}
            </h1>
          </div>
        </div>
        <div class="flex items-center space-x-2 shrink-0">
          {/* Mobile menu button - visible only on small screens */}
          <div class="relative lg:hidden mobile-menu-container shrink-0">
            <Button
              variant="ghost"
              class="p-2"
              onClick={() => setShowMobileMenu(!showMobileMenu())}
            >
              <Icon name="more-vertical" class="text-gray-600 dark:text-gray-300" />
            </Button>

            {/* Mobile dropdown menu */}
            <Show when={showMobileMenu()}>
              <div class="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-surface rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-dark-border">
                <div class="px-2 py-1">
                  <ModelSelector class="w-full py-1" />
                </div>
                <div class="px-2 py-1">
                  <SystemPromptSelector class="w-full py-1" />
                </div>
                <Show when={hasActiveChat()}>
                  <button class={moreActionsButton} onClick={handleCopyBranch}>
                    <Icon name="copy" size="sm" class="inline mr-2" />
                    Copy branch messages
                  </button>
                  <button
                    class={moreActionsButton}
                    onClick={() => {
                      handleStats()
                      setShowMobileMenu(false)
                    }}
                  >
                    <Icon name="edit" size="sm" class="inline mr-2" />
                    Chat Statistics
                  </button>
                </Show>
                <button
                  class={moreActionsButton}
                  onClick={() => {
                    handleSettings()
                    setShowMobileMenu(false)
                  }}
                >
                  <Icon name="settings" size="sm" class="inline mr-2" />
                  Settings
                </button>
                <button
                  class={moreActionsButton}
                  onClick={() => {
                    handleNewChat()
                    setShowMobileMenu(false)
                  }}
                >
                  <Icon name="plus" size="sm" class="inline mr-2" />
                  New Chat
                </button>
              </div>
            </Show>
          </div>

          {/* Desktop controls - visible on medium screens and up */}
          <div class="hidden lg:flex items-center space-x-1 shrink-0">
            <ModelSelector class="w-50" />
            <SystemPromptSelector class="w-50" />
            <Show when={hasActiveChat()}>
              <Button variant="ghost" onClick={handleStats} title="View chat statistics">
                <Icon name="bar-chart" />
              </Button>

              <Button
                variant="ghost"
                onClick={handleCopyBranch}
                title="Copy current branch to clipboard"
              >
                <Icon name="copy" />
              </Button>
            </Show>

            <Button variant="ghost" onClick={handleSettings}>
              <Icon name="settings" />
            </Button>

            <Button variant="ghost" onClick={handleNewChat} title="New chat">
              <Icon name="plus" />
            </Button>
          </div>
        </div>
      </div>
      <SettingsModal isOpen={showSettings()} onClose={() => setShowSettings(false)} />
      <ChatStatsModal isOpen={showStats()} onClose={() => setShowStats(false)} />
    </header>
  )
}

export default Header
