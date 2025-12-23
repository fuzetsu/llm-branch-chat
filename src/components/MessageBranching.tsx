import { Component, Show, Index, createSignal } from 'solid-js'
import { Chat } from '../types'
import { useAppStore } from '../store/AppStore'
import { block, classnames, debounce } from '../utils'
import { countDescendants, getRootChildren } from '../utils/messageTree'
import Button from './ui/Button'
import Tooltip from './ui/Tooltip'

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
  const changeHover = debounce(setHoverIndex, 300)

  const getBranchTooltip = (index: number) => {
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

    if (!branchId) return 'Switch to this branch'

    const count = countDescendants(nodes, branchId)
    if (count === 0) return 'Empty branch'
    if (count === 1) return '1 message in this branch'
    return `${count} messages in this branch`
  }

  return (
    <Show when={getBranches()}>
      {(info) => {
        const isSelected = (index: number) => index === info().current - 1
        return (
          <div
            class={classnames(
              'flex items-center gap-2 text-xs',
              props.isUserMessage ? 'text-message-user-text opacity-80' : 'text-text-muted',
            )}
          >
            <span class="shrink-0">Branch</span>
            <div class="flex flex-wrap items-center gap-1">
              <Index each={Array(info().total)}>
                {(_, index) => (
                  <div
                    onMouseEnter={() => changeHover(index)}
                    onMouseLeave={() => setHoverIndex(-1)}
                  >
                    <Tooltip content={getBranchTooltip(index)}>
                      <Button
                        variant={isSelected(index) ? 'primary' : 'ghost'}
                        size="micro"
                        disabled={isSelected(index)}
                        onClick={() => handleBranchSwitch(index)}
                        class={classnames(
                          'px-1.5! py-0.5! min-w-6 justify-center',
                          props.isUserMessage &&
                            !isSelected(index) &&
                            'text-message-user-text! opacity-80',
                        )}
                      >
                        {index + 1}
                      </Button>
                    </Tooltip>
                  </div>
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
