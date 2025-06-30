import { Component, createSignal, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import type { Chat } from '../types/index.js'
import Icon from './Icon'
import ConfirmModal from './ConfirmModal'

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
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false)

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
    setShowDeleteConfirm(true)
    setShowActions(false)
  }

  const confirmDelete = () => {
    store.deleteChat(props.chat.id)
    if (props.isSelected) {
      store.setCurrentChatId(null)
    }
    setShowDeleteConfirm(false)
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
      onClick={() => props.onSelect()}
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
                <Icon name="plus" size="sm" />
              </button>
              <button
                onClick={handleCancelEdit}
                class="p-1 text-red-600 hover:text-red-700 transition-colors"
                title="Cancel"
              >
                <Icon name="close" size="sm" />
              </button>
            </div>
          }
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">{props.chat.title}</div>
              <div class="text-sm opacity-70 mt-1">{formatDate(props.chat.updatedAt)}</div>
            </div>
            <Show when={showActions()}>
              <div class="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleEdit}
                  class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Edit title"
                >
                  <Icon name="edit" size="sm" class="text-gray-500 dark:text-gray-400" />
                </button>
                <button
                  onClick={handleArchive}
                  class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Archive chat"
                >
                  <Icon name="archive" size="sm" class="text-gray-500 dark:text-gray-400" />
                </button>
                <button
                  onClick={handleDelete}
                  class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                  title="Delete chat"
                >
                  <Icon name="delete" size="sm" class="text-red-500 dark:text-red-400" />
                </button>
              </div>
            </Show>
          </div>
        </Show>
      </div>
      <ConfirmModal
        isOpen={showDeleteConfirm()}
        title="Delete Chat"
        message={`Are you sure you want to delete "${props.chat.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

export default ChatItem
