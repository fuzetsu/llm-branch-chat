import { Component, Show, For } from 'solid-js'
import { Chat, MessageBranch } from '../types/index.js'
import { useAppStore } from '../store/AppStore'

interface MessageBranchingProps {
  messageId: string
  chat: Chat
}

const MessageBranching: Component<MessageBranchingProps> = (props) => {
  const store = useAppStore()

  const branches = () => props.chat.messageBranches.get(props.messageId) || []
  const currentBranchIndex = () => props.chat.currentBranches.get(props.messageId) || 0
  const hasBranches = () => branches().length > 1

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  const handleBranchSwitch = (branchIndex: number) => {
    store.switchMessageBranch(props.chat.id, props.messageId, branchIndex)
  }

  return (
    <Show when={hasBranches()}>
      <div class="flex items-center space-x-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>Branch:</span>
        <div class="flex items-center space-x-1">
          <For each={branches()}>
            {(branch, index) => (
              <button
                class={`px-2 py-1 rounded text-xs transition-colors ${
                  index() === currentBranchIndex()
                    ? 'bg-primary text-white dark:bg-primary-dark'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleBranchSwitch(index())}
                title={`Generated: ${formatTimestamp(branch.timestamp)}${
                  branch.model ? ` • ${branch.model}` : ''
                }`}
              >
                {index() + 1}
              </button>
            )}
          </For>
        </div>
        <span class="text-gray-400">
          ({currentBranchIndex() + 1} of {branches().length})
        </span>
      </div>
    </Show>
  )
}

export default MessageBranching
