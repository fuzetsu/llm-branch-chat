import { Component, createMemo, Show, For } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Button from './ui/Button'
import Modal from './ui/Modal'
import {
  getTokenStats,
  getTokenBreakdown,
  type TokenStats,
  estimateNewMessageCost,
  countCumulativeInputTokens,
} from '../utils/tokenCounter'
import { classnames } from '../utils'

const formatNumber = (num: number) => num.toLocaleString()
const formatCost = (cost: number) => `$${cost.toFixed(4)}`

interface ChatStatsModalProps {
  isOpen: boolean
  onClose: () => void
}

const ChatStatsModal: Component<ChatStatsModalProps> = (props) => {
  const store = useAppStore()

  const currentChat = () => store.getCurrentChat()
  const chatModel = () => currentChat()?.model || store.state.settings.chat.model

  // Note: We don't check props.isOpen here because:
  // 1. Memos are lazy - they only compute when read
  // 2. During exit animation, we want to retain the last values
  // 3. When unmounted, nothing reads these so they won't recompute
  const stats = createMemo<TokenStats | null>(() => {
    const chat = currentChat()
    if (!chat) return null
    return getTokenStats(chat.nodes)
  })

  const tokenBreakdown = createMemo(() => {
    const chat = currentChat()
    return chat ? getTokenBreakdown(chat.nodes) : []
  })

  const estimatedNewMessageCost = createMemo(() => {
    const chat = currentChat()
    if (!chat) return 0
    const visibleMessages = store.getVisibleMessages(chat.id)
    return estimateNewMessageCost(visibleMessages, chatModel())
  })

  const nextMessageInputTokens = createMemo(() => {
    const chat = currentChat()
    if (!chat) return 0
    const visibleMessages = store.getVisibleMessages(chat.id)
    return countCumulativeInputTokens(visibleMessages)
  })

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Chat Statistics"
      size="md"
      footer={
        <Button variant="primary" onClick={props.onClose}>
          Close
        </Button>
      }
    >
      <Show when={stats()} fallback={<p class="text-text-muted">No chat selected</p>}>
        {(currentStats) => (
          <div class="space-y-5">
            {/* Summary Section */}
            <div class="grid grid-cols-2 gap-2">
              <SummaryCard
                label="Total Messages"
                value={currentStats().messageCount}
                colorClass="text-text"
              />
              <SummaryCard
                label="Input Tokens"
                value={currentStats().totalInputTokens}
                colorClass="text-primary"
              />
              <SummaryCard
                label="Cached Input Tokens"
                value={currentStats().totalCachedInputTokens}
                colorClass="text-primary"
              />
              <SummaryCard
                label="Output Tokens"
                value={currentStats().totalOutputTokens}
                colorClass="text-success"
              />
            </div>

            {/* Token Breakdown */}
            <div>
              <h4 class="text-sm font-medium text-text mb-2">Token Breakdown</h4>
              <div class="space-y-2">
                <For each={tokenBreakdown()}>
                  {(item) => (
                    <TokenBreakdownItem
                      role={item.role}
                      messageCount={item.messageCount}
                      tokens={item.tokens}
                      percentage={item.percentage}
                    />
                  )}
                </For>
              </div>
            </div>

            {/* Detailed Stats */}
            <div class="grid grid-cols-1 gap-2 text-sm">
              <StatRow label="Total Tokens" value={formatNumber(currentStats().totalTokens)} />
              <StatRow
                label="Average per Message"
                value={`${formatNumber(currentStats().averageTokensPerMessage)} tokens`}
              />
              <StatRow label="Estimated Cost" value={formatCost(currentStats().estimatedCost)} />
              <StatRow label="Next Message Cost" value={formatCost(estimatedNewMessageCost())} />
              <StatRow
                label="Next Message Input (Current Branch)"
                value={`${formatNumber(nextMessageInputTokens())} tokens`}
              />
              <StatRow label="Current Model" value={chatModel()} />
            </div>

            {/* Branch Statistics */}
            <div>
              <h4 class="text-sm font-medium text-text mb-2">Branch Statistics</h4>
              <div class="grid grid-cols-1 gap-2 text-sm">
                <StatRow
                  label="Total Branches"
                  value={formatNumber(currentStats().totalBranches)}
                />
                <StatRow
                  label="Max Branches per Node"
                  value={formatNumber(currentStats().maxBranchesPerNode)}
                />
              </div>
            </div>

            {/* Model Breakdown */}
            <Show when={currentStats().modelBreakdown.length > 0}>
              <div>
                <h4 class="text-sm font-medium text-text mb-2">Model Breakdown</h4>
                <div class="space-y-2">
                  <For each={currentStats().modelBreakdown}>
                    {(modelStat) => (
                      <ModelBreakdownItem
                        model={modelStat.model}
                        messageCount={modelStat.messageCount}
                        inputTokens={modelStat.inputTokens}
                        cachedInputTokens={modelStat.cachedInputTokens}
                        outputTokens={modelStat.outputTokens}
                        totalTokens={modelStat.totalTokens}
                        estimatedCost={modelStat.estimatedCost}
                        percentage={(modelStat.totalTokens / currentStats().totalTokens) * 100}
                      />
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Scope and Cost Disclaimer */}
            <div class="text-xs text-text-muted bg-surface-secondary p-3 rounded-lg">
              Statistics include all conversation branches. Cost estimates are approximate and vary
              by provider. Costs calculated using per-message model pricing.
            </div>
          </div>
        )}
      </Show>
    </Modal>
  )
}

const SummaryCard: Component<{
  label: string
  value: number
  colorClass: string
}> = (props) => {
  return (
    <div class="bg-surface-secondary p-2 rounded-lg flex flex-col justify-between">
      <div class="text-sm text-text-muted">{props.label}</div>
      <div class={classnames('text-2xl font-bold tracking-tight', props.colorClass)}>
        {formatNumber(props.value)}
      </div>
    </div>
  )
}

const TokenBreakdownItem: Component<{
  role: string
  messageCount: number
  tokens: number
  percentage: number
}> = (props) => {
  return (
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div
          class={classnames('w-3 h-3 rounded-full', {
            'bg-primary': props.role === 'user',
            'bg-success': props.role === 'assistant',
            'bg-accent': props.role !== 'user' && props.role !== 'assistant',
          })}
        />
        <span class="text-sm text-text-secondary capitalize">
          {props.role} ({props.messageCount} messages)
        </span>
      </div>
      <div class="text-sm text-text-muted">
        {formatNumber(props.tokens)} tokens ({props.percentage.toFixed(1)}%)
      </div>
    </div>
  )
}

const StatRow: Component<{
  label: string
  value: string | number
}> = (props) => {
  return (
    <div class="flex justify-between">
      <span class="text-text-muted">{props.label}</span>
      <span class="text-text">{props.value}</span>
    </div>
  )
}

const ModelBreakdownItem: Component<{
  model: string
  messageCount: number
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  percentage: number
}> = (props) => {
  return (
    <div class="bg-surface-secondary p-2 rounded-lg">
      {/* Header with model name and usage percentage */}
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-medium text-text">{props.model}</span>
        <span class="text-xs text-text-muted bg-surface-active px-2 py-0.5 rounded-full">
          {props.percentage.toFixed(1)}% of total
        </span>
      </div>

      {/* Message count */}
      <div class="flex justify-between items-center mb-2 text-sm">
        <span class="text-text-muted">Messages</span>
        <span class="text-text font-medium">{formatNumber(props.messageCount)}</span>
      </div>

      {/* Token breakdown */}
      <div class="grid grid-cols-3 gap-2 mb-2">
        <div class="text-center">
          <div class="text-xs text-primary mb-0.5">Input</div>
          <div class="text-sm font-medium text-text">{formatNumber(props.inputTokens)}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-primary mb-0.5">Cached</div>
          <div class="text-sm font-medium text-text">{formatNumber(props.cachedInputTokens)}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-success mb-0.5">Output</div>
          <div class="text-sm font-medium text-text">{formatNumber(props.outputTokens)}</div>
        </div>
      </div>

      {/* Total tokens and cost */}
      <div class="flex justify-between items-center pt-2 border-t border-border">
        <div>
          <div class="text-xs text-text-muted mb-0.5">Total Tokens</div>
          <div class="text-sm font-medium text-text">{formatNumber(props.totalTokens)}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-accent mb-0.5">Cost</div>
          <div class="text-sm font-medium text-accent">{formatCost(props.estimatedCost)}</div>
        </div>
      </div>
    </div>
  )
}

export default ChatStatsModal
