import { Component, createEffect, createMemo, createSignal, onCleanup, Show } from 'solid-js'
import { MessageNode as MessageType, Chat } from '../types'
import { useAppStore } from '../store/AppStore'
import { useToast } from './ToastProvider'
import MessageBranching from './MessageBranching'
import IconButton from './ui/IconButton'
import Textarea from './ui/Textarea'
import Tooltip from './ui/Tooltip'
import { relativeTimestamp, throttle, classnames, isMobileBrowser } from '../utils'
import { renderMarkdown } from '../utils/markdown'
import Button from './ui/Button.jsx'

interface MessageProps {
  message: MessageType
  chat: Chat
  isStreaming?: boolean
  streamingContent?: string | null
}

const Message: Component<MessageProps> = (props) => {
  const store = useAppStore()
  const { showToast } = useToast()
  const [isEditing, setIsEditing] = createSignal(false)
  const [editContent, setEditContent] = createSignal('')
  const [isHovered, setIsHovered] = createSignal(false)
  const [isFlashing, setIsFlashing] = createSignal(false)
  let messageRef: HTMLDivElement | undefined

  const isUser = () => props.message.role === 'user'
  const isAssistant = () => props.message.role === 'assistant'

  const handleCopy = () => {
    navigator.clipboard
      .writeText(props.message.content)
      .then(() => showToast('Message copied to clipboard', 'success'))
      .catch((e) => showToast(`Failed to copy: ${e.message || e}`, 'error'))
  }

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
          'flex flex-col gap-2',
          isUser()
            ? 'bg-message-user text-message-user-text'
            : 'bg-message-assistant text-message-assistant-text',
          streamingClassName(),
          isFlashing() && 'ring-4 ring-accent ring-opacity-100',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Show when={isHovered() && !isEditing() && !props.isStreaming}>
          <div class="absolute top-1 right-1 flex items-center gap-1 bg-surface rounded shadow-sm border border-border px-1 animate-fade-in">
            <IconButton icon="copy" variant="compact" onClick={handleCopy} tooltip="Copy message" />
            <IconButton icon="edit" variant="compact" onClick={startEdit} tooltip="Edit message" />
            <Show when={isAssistant()}>
              <IconButton
                icon="regenerate"
                variant="compact"
                onClick={handleRegenerate}
                tooltip="Regenerate response"
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
          <div class="flex flex-col gap-2">
            <Textarea
              class="text-sm resize max-w-full min-w-[30vw] min-h-40 text-text"
              value={editContent()}
              onInput={(value) => setEditContent(value)}
              onKeyDown={handleKeyDown}
              rows={Math.max(2, editContent().split('\n').length)}
              autofocus
            />
            <div class="flex justify-end gap-2">
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

        <div class="flex gap-1 text-xs text-text-muted">
          <Tooltip content={fullMessageDate()}>
            {relativeTimestamp(props.message.timestamp)}
          </Tooltip>
          <Show when={props.message.model}>
            <span>•</span>
            <span>{props.message.model}</span>
          </Show>
          <Show when={props.isStreaming}>
            <span>•</span>
            <span class="animate-pulse">generating…</span>
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
