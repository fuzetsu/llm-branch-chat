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
              'flex items-center gap-2 mt-2 text-xs',
              props.isUserMessage ? 'text-message-user-text opacity-80' : 'text-text-muted',
            )}
          >
            <span>Branch</span>
            <div class="flex flex-wrap items-center gap-1">
              <Index each={Array(info().total)}>
                {(_, index) => (
                  <button
                    disabled={isSelected(index)}
                    title={getBranchCount(index)}
                    onMouseEnter={() => changeHover(index)}
                    onMouseLeave={() => setHoverIndex(-1)}
                    class={classnames(
                      'px-2 py-1 rounded text-xs transition-colors cursor-pointer',
                      isSelected(index)
                        ? props.isUserMessage
                          ? 'bg-surface text-text'
                          : 'bg-primary text-white'
                        : props.isUserMessage
                          ? 'text-message-user-text opacity-80'
                          : 'text-text-secondary',
                    )}
                    onClick={() => handleBranchSwitch(index)}
                  >
                    {index + 1}
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
