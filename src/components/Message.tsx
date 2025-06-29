import { Component, createSignal, Show } from 'solid-js'
import { Message as MessageType, Chat } from '../types/index.js'
import { useAppStore } from '../store/AppStore'
import MessageBranching from './MessageBranching'
import Icon from './Icon'

interface MessageProps {
  message: MessageType
  chat: Chat
  isStreaming?: boolean
  streamingContent?: string | null
}

const Message: Component<MessageProps> = (props) => {
  const store = useAppStore()
  const [isEditing, setIsEditing] = createSignal(false)
  const [editContent, setEditContent] = createSignal('')
  const [isHovered, setIsHovered] = createSignal(false)

  const isUser = () => props.message.role === 'user'
  const isAssistant = () => props.message.role === 'assistant'

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  const startEdit = () => {
    setEditContent(props.message.content)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }

  const saveEdit = () => {
    const newContent = editContent().trim()
    if (newContent && newContent !== props.message.content) {
      store.updateMessage(props.chat.id, props.message.id, {
        content: newContent,
        timestamp: Date.now(),
      })
    }
    setIsEditing(false)
    setEditContent('')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const handleRegenerate = () => {
    // TODO: Implement regeneration with API
    console.log('Regenerating message:', props.message.id)
  }

  const renderMessageActions = () => {
    if (!isHovered() || isEditing() || props.isStreaming) return null

    return (
      <div class="absolute top-1 right-1 flex items-center space-x-1 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-600 px-1">
        <button
          class="p-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          onClick={startEdit}
          title="Edit message"
        >
          <Icon name="edit" size="sm" />
        </button>
        <Show when={isAssistant()}>
          <button
            class="p-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            onClick={handleRegenerate}
            title="Regenerate response"
          >
            <Icon name="regenerate" size="sm" />
          </button>
        </Show>
      </div>
    )
  }

  return (
    <div class={`flex ${isUser() ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        class={`relative max-w-3xl px-4 py-3 rounded-lg transition-all ${
          isUser()
            ? 'bg-primary dark:bg-primary-dark text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
        } ${props.isStreaming ? 'animate-pulse' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {renderMessageActions()}

        <Show
          when={!isEditing()}
          fallback={
            <div class="space-y-2">
              <textarea
                class="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                value={editContent()}
                onInput={(e) => setEditContent((e.target as HTMLTextAreaElement).value)}
                onKeyDown={handleKeyDown}
                rows={Math.max(2, editContent().split('\n').length)}
                autofocus
              />
              <div class="flex justify-end space-x-2">
                <button
                  class="px-2 py-1 text-xs bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 rounded transition-colors"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
                <button
                  class="px-2 py-1 text-xs bg-primary hover:bg-blue-600 dark:bg-primary-dark dark:hover:bg-primary-darker text-white rounded transition-colors"
                  onClick={saveEdit}
                >
                  Save
                </button>
              </div>
            </div>
          }
        >
          <div class="message-content whitespace-pre-wrap">
            {props.streamingContent || props.message.content}
            <Show when={props.isStreaming}>
              <span class="animate-pulse">▋</span>
            </Show>
          </div>
        </Show>

        <div
          class={`text-xs mt-2 ${isUser() ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}
        >
          {formatTimestamp(props.message.timestamp)}
          {props.message.model && <span class="ml-2">• {props.message.model}</span>}
          <Show when={props.isStreaming}>
            <span class="ml-2 animate-pulse">• generating...</span>
          </Show>
        </div>

        <Show when={isAssistant() && !isEditing() && !props.isStreaming}>
          <MessageBranching messageId={props.message.id} chat={props.chat} />
        </Show>
      </div>
    </div>
  )
}

export default Message
