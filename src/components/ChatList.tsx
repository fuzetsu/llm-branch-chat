import { Component, For, Show, createEffect } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import ChatItem from './ChatItem'
import Icon from './ui/Icon'
import Button from './ui/Button'
import { classnames } from '../utils'

const ChatList: Component = () => {
  const store = useAppStore()
  let archivedSectionRef: HTMLDivElement | undefined

  const activeChats = () => store.getActiveChats()
  const archivedChats = () => store.getArchivedChats()
  const isArchivedSectionCollapsed = () => store.state.settings.ui.archivedSectionCollapsed

  const toggleArchivedSection = () => {
    store.updateUI({ archivedSectionCollapsed: !isArchivedSectionCollapsed() })
  }

  createEffect(() => {
    requestAnimationFrame(() => {
      const selectedElement = archivedSectionRef?.querySelector('[data-selected="true"]')
      selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  })

  const selectChat = (chatId: string) => {
    store.setCurrentChatId(chatId)
    store.updateUI({ sidebarCollapsed: true })
  }

  return (
    <div class="flex-1 overflow-y-auto p-2">
      <For each={activeChats()}>
        {(chat) => (
          <ChatItem
            chat={chat}
            isSelected={store.state.currentChatId === chat.id}
            onSelect={() => selectChat(chat.id)}
          />
        )}
      </For>
      <Show when={activeChats().length === 0 && archivedChats().length === 0}>
        <div class="text-text-muted text-center py-8">No chats yet. Start a new conversation!</div>
      </Show>

      <Show when={archivedChats().length > 0}>
        <div class="mt-4">
          <Button
            onClick={toggleArchivedSection}
            variant="ghost"
            class="w-full flex items-center justify-between p-2 text-text-muted hover:text-text"
          >
            <span class="text-sm font-medium">Archived ({archivedChats().length})</span>
            <Icon
              name="chevron"
              size="sm"
              class={classnames(
                'transform transition-transform',
                !isArchivedSectionCollapsed() && 'rotate-180',
              )}
            />
          </Button>

          <Show when={!isArchivedSectionCollapsed()}>
            <div ref={archivedSectionRef} class="mt-2 animate-fade-in">
              <For each={archivedChats()}>
                {(chat) => (
                  <div data-selected={store.state.currentChatId === chat.id}>
                    <ChatItem
                      chat={chat}
                      isSelected={store.state.currentChatId === chat.id}
                      onSelect={() => selectChat(chat.id)}
                      isArchived={true}
                    />
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}

export default ChatList
