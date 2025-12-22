import { Component, createSignal, Show, createEffect, onCleanup, createMemo } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Icon from './ui/Icon'
import SettingsModal from './SettingsModal'
import ChatStatsModal from './ChatStatsModal'
import Button from './ui/Button'
import ModelSelector from './ModelSelector'
import SystemPromptSelector from './SystemPromptSelector'
import { classnames } from '../utils'

const Header: Component = () => {
  const store = useAppStore()

  const [showSettings, setShowSettings] = createSignal(false)
  const [showStats, setShowStats] = createSignal(false)
  const [showMoreMenu, setShowMoreMenu] = createSignal(false)

  const hasActiveChat = createMemo(() => Boolean(store.state.currentChatId))

  // Get current system prompt info
  const currentSystemPromptId = createMemo(() => {
    const chat = store.getCurrentChat()
    return chat?.systemPromptId ?? store.state.settings.chat.defaultSystemPromptId
  })

  const currentSystemPrompt = createMemo(() => {
    const promptId = currentSystemPromptId()
    if (!promptId) return null
    return store.state.settings.systemPrompts.get(promptId) ?? null
  })

  const hasSystemPrompt = createMemo(() => currentSystemPrompt() !== null)

  const handleSettings = () => {
    setShowSettings(true)
    setShowMoreMenu(false)
  }
  const handleStats = () => {
    setShowStats(true)
    setShowMoreMenu(false)
  }
  const toggleSidebar = () => store.setUI({ sidebarCollapsed: !store.state.ui.sidebarCollapsed })
  const currentChat = () => store.getCurrentChat()
  const handleNewChat = () => {
    store.createNewChat()
    setShowMoreMenu(false)
  }
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
    setShowMoreMenu(false)
  }

  // Close more menu when clicking outside
  createEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't close if clicking on the menu container or the system prompt indicator
      if (
        showMoreMenu() &&
        !target.closest('.more-menu-container') &&
        !target.closest('.system-prompt-indicator')
      ) {
        setShowMoreMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    onCleanup(() => document.removeEventListener('click', handleClickOutside))
  })

  const menuItemClass =
    'w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer flex items-center gap-2'

  return (
    <header class="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border shadow-sm">
      <div class="flex items-center justify-between px-2 py-2">
        {/* Left side: hamburger (mobile) + title */}
        <div class="flex items-center gap-1 flex-1 min-w-0">
          <Button variant="ghost" class="lg:hidden p-2 shrink-0" onClick={toggleSidebar}>
            <Icon name="menu" class="text-text-muted" />
          </Button>
          <div class="flex items-center flex-1 min-w-0">
            <h1 class="text-lg font-semibold text-text truncate lg:pl-4 tracking-tight">
              {currentChat()?.title || 'New Chat'}
            </h1>
          </div>
        </div>

        {/* Right side: controls */}
        <div class="flex items-center gap-1 shrink-0">
          {/* Model selector - visible on lg+ */}
          <div class="hidden lg:block">
            <ModelSelector class="w-50" />
          </div>

          {/* System prompt indicator - visible on lg+ */}
          <Button
            variant="ghost"
            class="hidden lg:flex system-prompt-indicator"
            onClick={() => setShowMoreMenu(!showMoreMenu())}
            title={
              hasSystemPrompt()
                ? `System prompt: ${currentSystemPrompt()!.title}`
                : 'No system prompt'
            }
          >
            <Icon
              name="file-text"
              class={classnames(hasSystemPrompt() ? 'text-primary' : 'text-text-muted/50')}
            />
          </Button>

          {/* Settings + New Chat - visible on md+ */}
          <div class="hidden md:flex items-center gap-1">
            <Button variant="ghost" onClick={handleSettings} title="Settings">
              <Icon name="settings" />
            </Button>
            <Button variant="ghost" onClick={handleNewChat} title="New chat">
              <Icon name="plus" />
            </Button>
          </div>

          {/* More menu - always visible */}
          <div class="relative more-menu-container">
            <Button
              variant="ghost"
              class="p-2"
              onClick={() => setShowMoreMenu(!showMoreMenu())}
              title="More actions"
            >
              <Icon name="more-vertical" class="text-text-muted" />
            </Button>

            <Show when={showMoreMenu()}>
              <div class="absolute right-0 mt-2 w-56 bg-surface rounded-lg shadow-lg py-1 z-50 border border-border">
                {/* Model selector - in menu on < lg */}
                <div class="lg:hidden">
                  <div class="px-4 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wide">
                    Model
                  </div>
                  <div class="px-2 py-1">
                    <ModelSelector class="w-full" />
                  </div>
                </div>

                {/* System Prompt selector - always in menu (indicator on desktop opens this) */}
                <div>
                  <div class="px-4 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wide">
                    System Prompt
                  </div>
                  <div class="px-2 py-1">
                    <SystemPromptSelector class="w-full" />
                  </div>
                </div>

                {/* Stats + Copy - when chat active */}
                <Show when={hasActiveChat()}>
                  <div class="border-t border-border my-1" />
                  <button class={menuItemClass} onClick={handleStats}>
                    <Icon name="bar-chart" size="sm" />
                    Chat Statistics
                  </button>
                  <button class={menuItemClass} onClick={handleCopyBranch}>
                    <Icon name="copy" size="sm" />
                    Copy branch messages
                  </button>
                </Show>

                {/* Settings + New Chat - in menu on < md */}
                <div class="md:hidden">
                  <div class="border-t border-border my-1" />
                  <button class={menuItemClass} onClick={handleSettings}>
                    <Icon name="settings" size="sm" />
                    Settings
                  </button>
                  <button class={menuItemClass} onClick={handleNewChat}>
                    <Icon name="plus" size="sm" />
                    New Chat
                  </button>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </div>
      <SettingsModal isOpen={showSettings()} onClose={() => setShowSettings(false)} />
      <ChatStatsModal isOpen={showStats()} onClose={() => setShowStats(false)} />
    </header>
  )
}

export default Header
