import { Component, createEffect, createSignal, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Icon from './ui/Icon'

const MessageInput: Component = () => {
  const store = useAppStore()
  const [inputValue, setInputValue] = createSignal('')

  const isDisabled = () => {
    return store.state.streaming.isStreaming
  }

  const isStreaming = () => store.state.streaming.isStreaming

  const handleSend = async () => {
    if (isDisabled()) {
      store.cancelStreaming()
      return
    }
    const message = inputValue().trim()
    if (!message) return

    // Clear input immediately for better UX
    setInputValue('')

    // Send message through store
    try {
      await store.sendMessage(message)
    } catch (error) {
      console.error('Failed to send message:', error)
      // Restore message if sending failed
      setInputValue(message)
    }
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement
    setInputValue(target.value)

    // Auto-resize textarea
    target.style.height = 'auto'
    target.style.height = Math.min(target.scrollHeight, window.innerHeight / 2) + 'px'
  }

  const [getInput, setInput] = createSignal<HTMLTextAreaElement | null>(null)

  createEffect(() => {
    if (store.state.streaming.isStreaming) {
      const input = getInput()
      if (input) input.style.height = ''
    } else {
      getInput()?.focus()
    }
  })

  return (
    <div class="bg-white dark:bg-dark-surface">
      <div class="flex space-x-3">
        <textarea
          ref={setInput}
          class="flex-1 resize-none border border-gray-300 dark:border-dark-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
          placeholder={isStreaming() ? 'Waiting for response...' : 'Type your message...'}
          rows="1"
          value={inputValue()}
          onInput={handleInput}
          onKeyPress={handleKeyPress}
          disabled={isDisabled()}
        />
        <button
          class="px-6 py-3 bg-primary hover:bg-blue-600 dark:bg-primary-dark dark:hover:bg-primary-darker disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2 cursor-pointer"
          onClick={handleSend}
          disabled={!isStreaming() && !inputValue().trim()}
        >
          <Show when={isStreaming()} fallback={<Icon name="send" size="sm" />}>
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span class="ml-2">Stop</span>
          </Show>
        </button>
      </div>
    </div>
  )
}

export default MessageInput
