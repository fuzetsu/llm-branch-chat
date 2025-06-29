import { Component, Show, Index } from 'solid-js'
import { Chat } from '../types/index.js'
import { useAppStore } from '../store/AppStore'

interface MessageBranchingProps {
  messageId: string
  chat: Chat
}

const MessageBranching: Component<MessageBranchingProps> = (props) => {
  const store = useAppStore()

  const branchInfo = () => store.getBranchInfo(props.chat.id, props.messageId)
  const hasBranches = () => {
    const info = branchInfo()
    return info && info.total > 1
  }

  const handleBranchSwitch = (branchIndex: number) => {
    store.switchMessageBranch(props.chat.id, props.messageId, branchIndex)
  }

  return (
    <Show when={hasBranches()}>
      <div class="flex items-center space-x-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>Branch:</span>
        <div class="flex items-center space-x-1">
          <Show when={branchInfo()}>
            {(info) => (
              <>
                <Index each={Array.from({ length: info().total }, (_, i) => i)}>
                  {(index) => (
                    <button
                      class={`px-2 py-1 rounded text-xs transition-colors ${
                        index() === info().current - 1
                          ? 'bg-primary text-white dark:bg-primary-dark'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => handleBranchSwitch(index())}
                    >
                      {index() + 1}
                    </button>
                  )}
                </Index>
                <span class="text-gray-400">
                  ({info().current} of {info().total})
                </span>
              </>
            )}
          </Show>
        </div>
      </div>
    </Show>
  )
}

export default MessageBranching
