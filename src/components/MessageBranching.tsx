import { Component, Show, Index, createSignal } from 'solid-js'
import { Chat } from '../types/index.js'
import { useAppStore } from '../store/AppStore'
import { block, classnames, debounce } from '../utils'
import { countDescendants, getRootChildren } from '../utils/messageTree.js'

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

  const handleBranchSwitch = (branchIndex: number) =>
    store.switchMessageBranchWithFlash(props.chat.id, props.messageId, branchIndex)

  const [hoverIndex, setHoverIndex] = createSignal(-1)
  const changeHover = debounce(setHoverIndex, 500)
  const getBranchCount = (index: number) => {
    if (hoverIndex() !== index) return ''
    const { nodes } = props.chat
    const message = nodes.get(props.messageId)
    const parentId = message?.parentId
    const branchId = block(() => {
      if (parentId) {
        const parent = nodes.get(parentId)
        return parent?.childIds[index]
      }
      return getRootChildren(nodes)[index]?.id
    })
    return branchId ? String(countDescendants(nodes, branchId)) : ''
  }

  return (
    <Show when={getBranches()}>
      {(info) => {
        const isSelected = (index: number) => index === info().current - 1
        return (
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
                    disabled={isSelected(index())}
                    title={getBranchCount(index())}
                    onMouseEnter={() => changeHover(index())}
                    onMouseLeave={() => setHoverIndex(-1)}
                    class={classnames(
                      'px-2 py-1 rounded text-xs transition-colors cursor-pointer',
                      isSelected(index())
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
        )
      }}
    </Show>
  )
}

export default MessageBranching
