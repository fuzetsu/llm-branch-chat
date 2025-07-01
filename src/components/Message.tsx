import { Component, createEffect, createSignal, onCleanup, Show } from 'solid-js'
import { MessageNode as MessageType, Chat } from '../types/index.js'
import { useAppStore } from '../store/AppStore'
import MessageBranching from './MessageBranching'
import IconButton from './ui/IconButton'
import { formatTimestamp, renderMarkdown, throttle, classnames } from '../utils/index.js'

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
  const [isFlashing, setIsFlashing] = createSignal(false)
  let messageRef: HTMLDivElement | undefined

  const isUser = () => props.message.role === 'user'
  const isAssistant = () => props.message.role === 'assistant'

  const startEdit = () => {
    setEditContent(props.message.content)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }

  const saveEdit = async () => {
    const newContent = editContent().trim()
    if (newContent !== props.message.content && props.message.parentId) {
      store.createMessageBranch(
        props.chat.id,
        props.message.parentId,
        newContent,
        props.message.role,
        props.message.model || props.chat.model || store.state.settings.chat.model,
      )

      // If this is a user message, automatically generate assistant response
      if (isUser()) {
        await store.generateAssistantResponse()
      }
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
    if (!isAssistant() || props.isStreaming) return
    store.regenerateMessage(props.chat.id, props.message.id)
  }

  // Flash when this message is marked for flashing
  createEffect(() => {
    if (store.state.flashingMessageId === props.message.id) {
      setIsFlashing(true)
      messageRef?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setIsFlashing(false), 1000)
    }
  })

  const renderMessageActions = () => {
    if (!isHovered() || isEditing() || props.isStreaming) return null

    return (
      <div class="absolute top-1 right-1 flex items-center space-x-1 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-600 px-1">
        <IconButton icon="edit" variant="compact" onClick={startEdit} title="Edit message" />
        <Show when={isAssistant()}>
          <IconButton
            icon="regenerate"
            variant="compact"
            onClick={handleRegenerate}
            title="Regenerate response"
          />
        </Show>
      </div>
    )
  }

  const getRawContent = () => props.streamingContent || props.message.content

  const [html, setHtml] = createSignal('')
  const throttledRender = throttle(async (content: string, isMounted: () => boolean) => {
    if (!isMounted()) return
    const html = await renderMarkdown(content)
    if (isMounted()) setHtml(html)
  }, 300)
  createEffect(() => {
    let mounted = true
    throttledRender(getRawContent(), () => mounted)
    onCleanup(() => (mounted = false))
  })

  const renderMessageContent = () => {
    if (html()) {
      // eslint-disable-next-line solid/no-innerhtml
      return <div class="whitespace-normal" innerHTML={html()} />
    }
    return getRawContent()
  }

  return (
    <div class={classnames('flex mb-4', isUser() ? 'justify-end' : 'justify-start')}>
      <div
        ref={messageRef}
        class={classnames(
          'relative max-w-3xl px-4 py-3 rounded-lg transition-all duration-300',
          isUser()
            ? 'bg-primary dark:bg-primary-dark text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white',
          props.isStreaming && 'animate-pulse',
          isFlashing() &&
            'ring-4 ring-yellow-400 dark:ring-yellow-500 ring-opacity-100 bg-yellow-100 dark:bg-yellow-900/40',
        )}
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
                  class="px-2 py-1 text-xs bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 rounded transition-colors cursor-pointer"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
                <button
                  class="px-2 py-1 text-xs bg-primary hover:bg-blue-600 dark:bg-primary-dark dark:hover:bg-primary-darker text-white rounded transition-colors cursor-pointer"
                  onClick={saveEdit}
                >
                  {isUser() ? 'Save & Send' : 'Save'}
                </button>
              </div>
            </div>
          }
        >
          <div class="message-content whitespace-pre-wrap">
            {renderMessageContent()}
            <Show when={props.isStreaming}>
              <span class="animate-pulse">▋</span>
            </Show>
          </div>
        </Show>

        <div
          class={classnames(
            'text-xs mt-2',
            isUser() ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400',
          )}
        >
          {formatTimestamp(props.message.timestamp)}
          {props.message.model && <span class="ml-2">• {props.message.model}</span>}
          <Show when={props.isStreaming}>
            <span class="ml-2 animate-pulse">• generating...</span>
          </Show>
        </div>

        <Show when={!isEditing() && !props.isStreaming}>
          <MessageBranching
            messageId={props.message.id}
            chat={props.chat}
            isUserMessage={isUser()}
          />
        </Show>
      </div>
    </div>
  )
}

export default Message
