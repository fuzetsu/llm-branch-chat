import { Component, createSignal, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import type { Chat } from '../types/index.js'

interface ChatItemProps {
  chat: Chat
  isSelected: boolean
  onSelect: () => void
}

const ChatItem: Component<ChatItemProps> = (props) => {
  const store = useAppStore()
  const [showActions, setShowActions] = createSignal(false)
  const [isEditing, setIsEditing] = createSignal(false)
  const [editTitle, setEditTitle] = createSignal('')

  const handleEdit = (e: Event) => {
    e.stopPropagation()
    setEditTitle(props.chat.title)
    setIsEditing(true)
  }

  const handleSaveEdit = (e: Event) => {
    e.stopPropagation()
    if (editTitle().trim()) {
      store.updateChat(props.chat.id, { title: editTitle().trim() })
    }
    setIsEditing(false)
  }

  const handleCancelEdit = (e: Event) => {
    e.stopPropagation()
    setIsEditing(false)
    setEditTitle('')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit(e)
    } else if (e.key === 'Escape') {
      handleCancelEdit(e)
    }
  }

  const handleArchive = (e: Event) => {
    e.stopPropagation()
    store.updateChat(props.chat.id, { isArchived: true })
    setShowActions(false)
  }

  const handleDelete = (e: Event) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this chat?')) {
      store.deleteChat(props.chat.id)
      if (props.isSelected) {
        store.setCurrentChatId(null)
      }
    }
    setShowActions(false)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      class={`mb-2 rounded-lg cursor-pointer transition-all duration-200 group relative ${
        props.isSelected
          ? 'bg-primary dark:bg-primary-dark text-white shadow-md'
          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white hover:shadow-sm'
      }`}
      onClick={props.onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div class="p-3">
        <Show
          when={!isEditing()}
          fallback={
            <div class="flex items-center space-x-2">
              <input
                type="text"
                value={editTitle()}
                onInput={(e) => setEditTitle(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                class="flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-primary"
                autofocus
              />
              <button
                onClick={handleSaveEdit}
                class="p-1 text-green-600 hover:text-green-700 transition-colors"
                title="Save"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </button>
              <button
                onClick={handleCancelEdit}
                class="p-1 text-red-600 hover:text-red-700 transition-colors"
                title="Cancel"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
          }
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">{props.chat.title}</div>
              <div class="text-sm opacity-70 mt-1">{formatDate(props.chat.updatedAt)}</div>
            </div>
            <Show when={showActions() && !props.isSelected}>
              <div class="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleEdit}
                  class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Edit title"
                >
                  <svg
                    class="w-4 h-4 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    ></path>
                  </svg>
                </button>
                <button
                  onClick={handleArchive}
                  class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Archive chat"
                >
                  <svg
                    class="w-4 h-4 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 8l4 4 4-4m0 0V4a1 1 0 011-1h4a1 1 0 011 1v4m-6 0a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h4a1 1 0 011 1v4z"
                    ></path>
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                  title="Delete chat"
                >
                  <svg
                    class="w-4 h-4 text-red-500 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>
                </button>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}

export default ChatItem

