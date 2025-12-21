import { Component, createEffect, createMemo, createSignal, onCleanup, Show } from 'solid-js'
import { MessageNode as MessageType, Chat } from '../types/index.js'
import { useAppStore } from '../store/AppStore'
import MessageBranching from './MessageBranching'
import IconButton from './ui/IconButton'
import { relativeTimestamp, throttle, classnames, isMobileBrowser } from '../utils/index.js'
import { renderMarkdown } from '../utils/markdown.js'
import Button from './ui/Button.jsx'

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

  const handleCopy = () =>
    navigator.clipboard
      .writeText(props.message.content)
      .catch((e) => alert('Failed to copy message content: ' + e))

  const startEdit = () => {
    setEditContent(props.message.content)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }

  const saveEdit = async (inPlace = false) => {
    const newContent = editContent().trim()
    if (newContent !== props.message.content) {
      if (inPlace) {
        store.updateMessage(props.chat.id, props.message.id, { content: newContent })
      } else {
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
    }
    setIsEditing(false)
    setEditContent('')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobileBrowser()) {
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
      messageRef?.scrollIntoView({ block: 'center' })
      setTimeout(() => setIsFlashing(false), 1000)
    }
  })

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

  const streamingClassName = createMemo(() =>
    props.isStreaming && store.getStreamingContent().length <= 30 ? 'animate-pulse' : null,
  )

  const fullMessageDate = () => new Date(props.message.timestamp).toLocaleString()

  return (
    <div class={classnames('flex', isUser() ? 'justify-end' : 'justify-start')}>
      <div
        ref={messageRef}
        class={classnames(
          'relative w-full max-w-2xl px-4 py-3 rounded-lg transition-all duration-300',
          isUser()
            ? 'bg-primary dark:bg-primary-dark text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white',
          streamingClassName(),
          isFlashing() &&
            'ring-4 ring-yellow-400 dark:ring-yellow-500 ring-opacity-100 bg-yellow-100 dark:bg-yellow-900/40',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Show when={isHovered() && !isEditing() && !props.isStreaming}>
          <div class="absolute top-1 right-1 flex items-center space-x-1 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-600 px-1">
            <IconButton icon="copy" variant="compact" onClick={handleCopy} title="Copy message" />
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
        </Show>

        <Show
          when={isEditing()}
          fallback={
            <div class="message-content whitespace-pre-wrap">
              <Show when={html()} fallback={getRawContent()}>
                {/*eslint-disable-next-line solid/no-innerhtml*/}
                <div class="whitespace-normal" innerHTML={html()} />
              </Show>
              <Show when={props.isStreaming}>
                <span class="animate-pulse">▋</span>
              </Show>
            </div>
          }
        >
          <div class="space-y-2">
            <textarea
              class="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize max-w-full min-w-[30vw] min-h-40"
              value={editContent()}
              onInput={(e) => setEditContent((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleKeyDown}
              rows={Math.max(2, editContent().split('\n').length)}
              autofocus
            />
            <div class="flex justify-end space-x-2">
              <Button variant="secondary" size="micro" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button variant="secondary" size="micro" onClick={() => saveEdit(true)}>
                Save in place
              </Button>
              <Button variant="primary" size="micro" onClick={() => saveEdit()}>
                {isUser() ? 'Save & Send' : 'Save'}
              </Button>
            </div>
          </div>
        </Show>

        <div
          class={classnames(
            'text-xs mt-2',
            isUser() ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400',
          )}
        >
          <span title={fullMessageDate()}>{relativeTimestamp(props.message.timestamp)}</span>
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
