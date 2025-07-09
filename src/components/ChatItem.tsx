import { Component, createSignal, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import type { Chat } from '../types/index.js'
import IconButton from './ui/IconButton'
import ConfirmModal from './ConfirmModal'
import { classnames } from '../utils'

interface ChatItemProps {
  chat: Chat
  isSelected: boolean
  onSelect: () => void
  isArchived?: boolean
}

const ChatItem: Component<ChatItemProps> = (props) => {
  const store = useAppStore()
  const [showActions, setShowActions] = createSignal(false)
  const [isEditing, setIsEditing] = createSignal(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false)
  let editableRef: HTMLDivElement | undefined

  const handleContentEdit = () => {
    if (editableRef) {
      editableRef.contentEditable = 'true'
      editableRef.focus()
      // Select all text for easy editing
      const range = document.createRange()
      range.selectNodeContents(editableRef)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      setIsEditing(true)
    }
  }

  const handleContentSave = () => {
    if (editableRef) {
      const newTitle = editableRef.textContent?.trim() || ''
      if (newTitle && newTitle !== props.chat.title) {
        store.updateChat(props.chat.id, { title: newTitle })
      }
      editableRef.contentEditable = 'false'
      setIsEditing(false)
    }
  }

  const handleContentCancel = () => {
    if (editableRef) {
      editableRef.textContent = props.chat.title
      editableRef.contentEditable = 'false'
      setIsEditing(false)
    }
  }

  const handleContentKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleContentSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleContentCancel()
    }
  }

  const handleContentBlur = () => {
    // Auto-save on blur
    handleContentSave()
  }

  const handleArchive = () => {
    store.updateChat(props.chat.id, { isArchived: true })
    setShowActions(false)
  }

  const handleUnarchive = () => {
    store.updateChat(props.chat.id, { isArchived: false })
    setShowActions(false)
  }

  const handleDelete = () => {
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
    <>
      <div
        class={classnames(
          'mb-2 rounded-lg cursor-pointer transition-all duration-200 group relative',
          props.isSelected
            ? 'bg-primary dark:bg-primary-dark text-white shadow-md'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white hover:shadow-sm',
        )}
        onClick={() => props.onSelect()}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div class="p-3">
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div
                ref={editableRef}
                class={classnames(
                  'font-medium truncate transition-all duration-200 cursor-text',
                  isEditing()
                    ? 'bg-white/10 rounded px-2 py-1 -mx-2 -my-1 ring-1 ring-primary/30'
                    : 'hover:bg-white/5 rounded px-2 py-1 -mx-2 -my-1',
                )}
                onDblClick={handleContentEdit}
                onKeyDown={handleContentKeyDown}
                onBlur={handleContentBlur}
                title="Double-click to edit"
              >
                {props.chat.title}
              </div>
              <div class="text-sm opacity-70 mt-1">{formatDate(props.chat.updatedAt)}</div>
            </div>
            <Show when={showActions()}>
              <div class="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <IconButton
                  icon="edit"
                  variant="ghost"
                  onClick={handleContentEdit}
                  stopPropagation
                  title="Edit title (or double-click)"
                />
                <Show
                  when={!props.isArchived}
                  fallback={
                    <IconButton
                      icon="archive"
                      variant="ghost"
                      onClick={handleUnarchive}
                      stopPropagation
                      title="Unarchive chat"
                      class="transform rotate-180"
                    />
                  }
                >
                  <IconButton
                    icon="archive"
                    variant="ghost"
                    onClick={handleArchive}
                    stopPropagation
                    title="Archive chat"
                  />
                </Show>
                <IconButton
                  icon="delete"
                  variant="danger"
                  onClick={handleDelete}
                  stopPropagation
                  title="Delete chat"
                />
              </div>
            </Show>
          </div>
        </div>
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
    </>
  )
}

export default ChatItem
