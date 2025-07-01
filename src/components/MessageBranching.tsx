import { Component, Show, Index } from 'solid-js'
import { Chat } from '../types/index.js'
import { useAppStore } from '../store/AppStore'
import { classnames } from '../utils'

interface MessageBranchingProps {
  messageId: string
  chat: Chat
  isUserMessage?: boolean
}

const MessageBranching: Component<MessageBranchingProps> = (props) => {
  const store = useAppStore()

  const getBranches = () => {
    const info = store.getBranchInfo(props.chat.id, props.messageId)
    return info && info.total > 1 ? info : null
  }

  const handleBranchSwitch = (branchIndex: number) => {
    store.switchMessageBranchWithFlash(props.chat.id, props.messageId, branchIndex)
  }

  return (
    <Show when={getBranches()}>
      {(info) => (
        <div
          class={classnames(
            'flex items-center space-x-2 mt-2 text-xs',
            props.isUserMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400',
          )}
        >
          <span>Branch</span>
          <div class="flex items-center space-x-1">
            <Index each={Array.from({ length: info().total }, (_, i) => i)}>
              {(index) => (
                <button
                  class={classnames(
                    'px-2 py-1 rounded text-xs transition-colors cursor-pointer',
                    index() === info().current - 1
                      ? props.isUserMessage
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'bg-primary text-white dark:bg-primary-dark'
                      : props.isUserMessage
                        ? 'text-blue-100 dark:text-blue-200'
                        : 'text-gray-900 dark:text-gray-300',
                  )}
                  // bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white
                  onClick={() => handleBranchSwitch(index())}
                >
                  {index() + 1}
                </button>
              )}
            </Index>
          </div>
        </div>
      )}
    </Show>
  )
}

export default MessageBranching
