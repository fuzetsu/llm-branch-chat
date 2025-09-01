import { Component, createMemo, Show, For } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Icon from './ui/Icon'
import Button from './ui/Button'
import {
  getTokenStats,
  getTokenBreakdown,
  type TokenStats,
  estimateNewMessageCost,
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

  const stats = createMemo<TokenStats | null>(() => {
    const chat = currentChat()
    if (!chat || !props.isOpen) return null

    return getTokenStats(chat.nodes)
  })

  const tokenBreakdown = createMemo(() => {
    const chat = currentChat()
    return chat && props.isOpen ? getTokenBreakdown(chat.nodes) : []
  })

  const estimatedNewMessageCost = createMemo(() => {
    const chat = currentChat()
    if (!chat || !props.isOpen) return 0

    const visibleMessages = store.getVisibleMessages(chat.id)
    return estimateNewMessageCost(visibleMessages, chatModel())
  })

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300">
        {/* Backdrop */}
        <div
          class="fixed inset-0 bg-gray-500/75 transition-opacity"
          onClick={() => props.onClose()}
        />

        {/* Modal */}
        <div class="relative w-full max-w-md max-h-[90vh] overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-dark-surface shadow-xl rounded-2xl border dark:border-dark-border flex flex-col">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Chat Statistics
            </h3>
            <button
              class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => props.onClose()}
            >
              <Icon name="close" class="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-y-auto p-6">
            <Show
              when={stats()}
              fallback={<p class="text-gray-500 dark:text-gray-400">No chat selected</p>}
            >
              {(currentStats) => (
                <div class="space-y-6">
                  {/* Summary Section */}
                  <div class="grid grid-cols-3 gap-4">
                    <SummaryCard
                      label="Total Messages"
                      value={currentStats().messageCount}
                      colorClass="text-gray-900 dark:text-white"
                    />
                    <SummaryCard
                      label="Input Tokens"
                      value={currentStats().totalInputTokens}
                      colorClass="text-blue-600 dark:text-blue-400"
                    />
                    <SummaryCard
                      label="Output Tokens"
                      value={currentStats().totalOutputTokens}
                      colorClass="text-green-600 dark:text-green-400"
                    />
                  </div>

                  {/* Token Breakdown */}
                  <div>
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Token Breakdown
                    </h4>
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
                  <div class="grid grid-cols-1 gap-3 text-sm">
                    <StatRow
                      label="Total Tokens"
                      value={formatNumber(currentStats().totalTokens)}
                    />
                    <StatRow
                      label="Average per Message"
                      value={`${formatNumber(currentStats().averageTokensPerMessage)} tokens`}
                    />
                    <StatRow
                      label="Estimated Cost"
                      value={formatCost(currentStats().estimatedCost)}
                    />
                    <StatRow
                      label="Next Message Cost"
                      value={formatCost(estimatedNewMessageCost())}
                    />
                    <StatRow label="Current Model" value={chatModel()} />
                  </div>

                  {/* Branch Statistics */}
                  <div>
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Branch Statistics
                    </h4>
                    <div class="grid grid-cols-1 gap-3 text-sm">
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
                      <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Model Breakdown
                      </h4>
                      <div class="space-y-3">
                        <For each={currentStats().modelBreakdown}>
                          {(modelStat) => (
                            <ModelBreakdownItem
                              model={modelStat.model}
                              messageCount={modelStat.messageCount}
                              inputTokens={modelStat.inputTokens}
                              outputTokens={modelStat.outputTokens}
                              totalTokens={modelStat.totalTokens}
                              estimatedCost={modelStat.estimatedCost}
                              percentage={
                                (modelStat.totalTokens / currentStats().totalTokens) * 100
                              }
                            />
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>

                  {/* Scope and Cost Disclaimer */}
                  <div class="text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                    Statistics include all conversation branches. Cost estimates are approximate and
                    vary by provider. Costs calculated using per-message model pricing.
                  </div>
                </div>
              )}
            </Show>
          </div>

          {/* Footer */}
          <div class="flex justify-end p-6 border-t border-gray-200 dark:border-dark-border flex-shrink-0">
            <Button variant="primary" onClick={props.onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Show>
  )
}

// Component for summary cards
const SummaryCard: Component<{
  label: string
  value: number
  colorClass: string
}> = (props) => {
  return (
    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex flex-col justify-between">
      <div class="text-sm text-gray-600 dark:text-gray-400">{props.label}</div>
      <div class={classnames('text-2xl font-bold', props.colorClass)}>
        {formatNumber(props.value)}
      </div>
    </div>
  )
}

// Component for token breakdown items
const TokenBreakdownItem: Component<{
  role: string
  messageCount: number
  tokens: number
  percentage: number
}> = (props) => {
  return (
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <div
          class={classnames('w-3 h-3 rounded-full', {
            'bg-blue-500': props.role === 'user',
            'bg-green-500': props.role === 'assistant',
            'bg-purple-500': props.role !== 'user' && props.role !== 'assistant',
          })}
        />
        <span class="text-sm text-gray-700 dark:text-gray-300 capitalize">
          {props.role} ({props.messageCount} messages)
        </span>
      </div>
      <div class="text-sm text-gray-600 dark:text-gray-400">
        {formatNumber(props.tokens)} tokens ({props.percentage.toFixed(1)}%)
      </div>
    </div>
  )
}

// Component for stat rows
const StatRow: Component<{
  label: string
  value: string | number
}> = (props) => {
  return (
    <div class="flex justify-between">
      <span class="text-gray-600 dark:text-gray-400">{props.label}</span>
      <span class="text-gray-900 dark:text-white">{props.value}</span>
    </div>
  )
}

// Component for model breakdown items
const ModelBreakdownItem: Component<{
  model: string
  messageCount: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  percentage: number
}> = (props) => {
  return (
    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
      {/* Header with model name and usage percentage */}
      <div class="flex justify-between items-center mb-3">
        <span class="text-sm font-medium text-gray-900 dark:text-white">{props.model}</span>
        <span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
          {props.percentage.toFixed(1)}% of total
        </span>
      </div>

      {/* Message count */}
      <div class="flex justify-between items-center mb-3 text-sm">
        <span class="text-gray-600 dark:text-gray-400">Messages</span>
        <span class="text-gray-900 dark:text-white font-medium">
          {formatNumber(props.messageCount)}
        </span>
      </div>

      {/* Token breakdown */}
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="text-center">
          <div class="text-xs text-blue-600 dark:text-blue-400 mb-1">Input</div>
          <div class="text-sm font-medium text-gray-900 dark:text-white">
            {formatNumber(props.inputTokens)}
          </div>
        </div>
        <div class="text-center">
          <div class="text-xs text-green-600 dark:text-green-400 mb-1">Output</div>
          <div class="text-sm font-medium text-gray-900 dark:text-white">
            {formatNumber(props.outputTokens)}
          </div>
        </div>
      </div>

      {/* Total tokens and cost */}
      <div class="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
        <div>
          <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Tokens</div>
          <div class="text-sm font-medium text-gray-900 dark:text-white">
            {formatNumber(props.totalTokens)}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-purple-600 dark:text-purple-400 mb-1">Cost</div>
          <div class="text-sm font-medium text-purple-700 dark:text-purple-300">
            {formatCost(props.estimatedCost)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatStatsModal
