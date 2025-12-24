import { Component, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import ChatList from './ChatList'
import Button from './ui/Button'
import Icon from './ui/Icon'
import { classnames } from '../utils'

const Sidebar: Component = () => {
  const store = useAppStore()

  const handleNewChat = () => {
    store.createNewChat()
    store.setUI({ sidebarCollapsed: true })
  }

  const isNewChatActive = () => store.state.currentChatId == null

  const handleBackdropClick = () => {
    if (!store.state.ui.sidebarCollapsed) {
      store.setUI({ sidebarCollapsed: true })
    }
  }

  return (
    <>
      <aside
        class={classnames(
          'fixed inset-y-0 left-0 z-40 w-80 bg-surface border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0',
          store.state.ui.sidebarCollapsed ? '-translate-x-full' : 'translate-x-0',
        )}
      >
        <div class="flex flex-col h-full pt-15">
          <div class="p-2 border-b border-border">
            <Button
              variant={isNewChatActive() ? 'primary' : 'ghost'}
              class="w-full justify-start gap-2"
              onClick={handleNewChat}
            >
              <Icon name="plus" />
              <span>New Chat</span>
            </Button>
          </div>
          <ChatList />
        </div>
      </aside>
      {/* sidebar backdrop */}
      <Show when={!store.state.ui.sidebarCollapsed}>
        <div class="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={handleBackdropClick} />
      </Show>
    </>
  )
}

export default Sidebar
