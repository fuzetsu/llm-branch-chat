import type { MessageNode } from '../types/index.js'
import { getRootChildren } from './messageTree.js'

const ESTIMATED_CHARS_PER_TOKEN = 4

export function estimateTokens(text: string): number {
  return !text ? 0 : Math.max(1, Math.ceil(text.length / ESTIMATED_CHARS_PER_TOKEN))
}

/**
 * Calculate token statistics for a chat conversation
 */
export interface TokenStats {
  totalInputTokens: number
  totalCachedInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  estimatedCost: number
  messageCount: number
  userMessageCount: number
  assistantMessageCount: number
  systemMessageCount: number
  averageTokensPerMessage: number
  totalBranches: number
  maxBranchesPerNode: number
  modelBreakdown: ModelTokenStats[]
}

export interface ModelTokenStats {
  model: string
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  messageCount: number
}

/**
 * Calculate comprehensive token statistics for ALL conversation paths in the chat
 * This includes all branches and alternative conversation paths
 */
export function getTokenStats(nodes: Map<string, MessageNode>): TokenStats {
  return getAllPathsTokenStats(nodes)
}

function getAllPathsTokenStats(nodes: Map<string, MessageNode>): TokenStats {
  const rootMessages = Array.from(nodes.values()).filter((node) => node.parentId === null)

  let totalInputTokens = 0
  let totalCachedInputTokens = 0
  let totalOutputTokens = 0
  let userMessageCount = 0
  let assistantMessageCount = 0
  let systemMessageCount = 0

  // Track model-specific statistics
  const modelStats = new Map<
    string,
    { inputTokens: number; outputTokens: number; messageCount: number; cachedInputTokens: number }
  >()

  // Calculate statistics for each root conversation path with per-message model costs
  rootMessages.forEach((rootMessage) => {
    const pathStats = calculatePathTokenStatsWithModelCosts(nodes, rootMessage.id, modelStats)
    totalInputTokens += pathStats.totalInputTokens
    totalCachedInputTokens += pathStats.totalCachedInputTokens
    totalOutputTokens += pathStats.totalOutputTokens
    userMessageCount += pathStats.userMessageCount
    assistantMessageCount += pathStats.assistantMessageCount
    systemMessageCount += pathStats.systemMessageCount
  })

  const totalTokens = totalInputTokens + totalOutputTokens + totalCachedInputTokens
  const messageCount = userMessageCount + assistantMessageCount + systemMessageCount
  const averageTokensPerMessage = messageCount > 0 ? Math.round(totalTokens / messageCount) : 0

  // Calculate branch statistics
  const branchStats = calculateBranchStatistics(nodes)

  // Calculate model breakdown
  const modelBreakdown: ModelTokenStats[] = []
  let totalEstimatedCost = 0

  for (const [modelName, stats] of modelStats.entries()) {
    const modelCost = estimateCost(
      stats.inputTokens,
      stats.outputTokens,
      modelName,
      stats.cachedInputTokens,
    )
    totalEstimatedCost += modelCost

    modelBreakdown.push({
      model: modelName,
      inputTokens: stats.inputTokens,
      outputTokens: stats.outputTokens,
      cachedInputTokens: stats.cachedInputTokens,
      totalTokens: stats.inputTokens + stats.outputTokens + stats.cachedInputTokens,
      estimatedCost: modelCost,
      messageCount: stats.messageCount,
    })
  }

  // Sort model breakdown by total tokens (descending)
  modelBreakdown.sort((a, b) => b.totalTokens - a.totalTokens)

  return {
    totalInputTokens,
    totalCachedInputTokens,
    totalOutputTokens,
    totalTokens,
    estimatedCost: totalEstimatedCost,
    messageCount,
    userMessageCount,
    assistantMessageCount,
    systemMessageCount,
    averageTokensPerMessage,
    totalBranches: branchStats.totalBranches,
    maxBranchesPerNode: branchStats.maxBranchesPerNode,
    modelBreakdown,
  }
}

function calculatePathTokenStatsWithModelCosts(
  nodes: Map<string, MessageNode>,
  startNodeId: string,
  modelStats: Map<
    string,
    { inputTokens: number; outputTokens: number; messageCount: number; cachedInputTokens: number }
  >,
): {
  totalInputTokens: number
  totalCachedInputTokens: number
  totalOutputTokens: number
  userMessageCount: number
  assistantMessageCount: number
  systemMessageCount: number
} {
  const messagesInPath: MessageNode[] = []

  // Collect all messages in this conversation path
  function collectPathMessages(nodeId: string) {
    const node = nodes.get(nodeId)
    if (!node) return

    messagesInPath.push(node)

    // Follow all child branches (we need to account for all possible continuations)
    node.childIds.forEach((childId) => {
      collectPathMessages(childId)
    })
  }

  collectPathMessages(startNodeId)

  // Sort by timestamp to maintain conversation order
  messagesInPath.sort((a, b) => a.timestamp - b.timestamp)

  let pathInputTokens = 0
  let pathCachedInputTokens = 0
  let pathOutputTokens = 0
  let pathUserCount = 0
  let pathAssistantCount = 0
  let pathSystemCount = 0

  // Track which messages have been processed as new (first time)
  const processedMessageIds = new Set<string>()

  // Calculate cumulative input tokens for this path with per-message model costs
  messagesInPath.forEach((message, index) => {
    if (message.role === 'assistant') {
      // For each assistant response, we need to count:
      // 1. The user message that triggered this response (full price input)
      // 2. This assistant response (full price output)
      // 3. All previous messages in context (cached price input)

      const contextMessages = messagesInPath.slice(0, index + 1)

      let newInputTokens = 0
      let cachedInputTokens = 0
      let outputTokens = 0

      contextMessages.forEach((m) => {
        const tokens = estimateTokens(m.content)
        if (m.role === 'user' && !processedMessageIds.has(m.id)) {
          // User message being processed for the first time - full price input
          newInputTokens += tokens
          processedMessageIds.add(m.id)
        } else if (m.role === 'assistant' && !processedMessageIds.has(m.id)) {
          // Assistant message being processed for the first time - full price output
          outputTokens += tokens
          processedMessageIds.add(m.id)
        } else {
          // All other messages (already processed or system messages) - cached price input
          cachedInputTokens += tokens
        }
      })

      pathInputTokens += newInputTokens
      pathCachedInputTokens += cachedInputTokens
      pathOutputTokens += outputTokens
      pathAssistantCount++

      // Update model-specific statistics
      const model = message.model || 'unknown'
      const currentStats = modelStats.get(model) || {
        inputTokens: 0,
        outputTokens: 0,
        messageCount: 0,
        cachedInputTokens: 0,
      }
      modelStats.set(model, {
        inputTokens: currentStats.inputTokens + newInputTokens,
        outputTokens: currentStats.outputTokens + outputTokens,
        messageCount: currentStats.messageCount + 1,
        cachedInputTokens: currentStats.cachedInputTokens + cachedInputTokens,
      })
    } else {
      if (message.role === 'user') pathUserCount++
      if (message.role === 'system') pathSystemCount++
    }
  })

  return {
    totalInputTokens: pathInputTokens,
    totalCachedInputTokens: pathCachedInputTokens,
    totalOutputTokens: pathOutputTokens,
    userMessageCount: pathUserCount,
    assistantMessageCount: pathAssistantCount,
    systemMessageCount: pathSystemCount,
  }
}

/**
 * Cost estimation with separate input/output pricing and optional cached token pricing
 */
interface ModelPricing {
  inputCostPer1K: number
  outputCostPer1K: number
  cachedInputCostPer1K?: number // Optional: lower price for cached tokens
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'x-ai: grok-4-1-fast-non-reasoning': {
    inputCostPer1K: 0.0002, // $0.20/1M input tokens
    outputCostPer1K: 0.0005, // $0.50/1M output tokens
    cachedInputCostPer1K: 0.00002, // $0.02/1M cached input tokens (90% discount)
  },
  'x-ai: grok-4-1-fast-reasoning': {
    inputCostPer1K: 0.0002, // $0.20/1M input tokens
    outputCostPer1K: 0.0005, // $0.50/1M output tokens
    cachedInputCostPer1K: 0.00002, // $0.02/1M cached input tokens (90% discount)
  },
  'deepseek: deepseek-chat': {
    inputCostPer1K: 0.00028, // $0.28/1M input tokens
    outputCostPer1K: 0.00042, // $0.42/1M output tokens
    cachedInputCostPer1K: 0.000028, // $0.14/1M cached input tokens (90% discount)
  },
  'deepseek: deepseek-reasoner': {
    inputCostPer1K: 0.00028, // $0.28/1M input tokens
    outputCostPer1K: 0.00042, // $0.42/1M output tokens
    cachedInputCostPer1K: 0.000028, // $0.028/1M cached input tokens (90% discount)
  },
}

function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
  cachedInputTokens: number = 0,
): number {
  const pricing = MODEL_PRICING[model] || {
    inputCostPer1K: 0,
    outputCostPer1K: 0,
  }

  const { inputCostPer1K, outputCostPer1K, cachedInputCostPer1K } = pricing

  // Calculate input cost based on cached pricing availability
  // inputTokens = total input tokens (new + cached)
  // cachedInputTokens = portion that should be charged at cached rate if available
  // If no cached pricing is available, all input tokens are charged at full rate
  const inputCost =
    cachedInputCostPer1K !== undefined
      ? (inputTokens / 1000) * inputCostPer1K + (cachedInputTokens / 1000) * cachedInputCostPer1K
      : ((inputTokens + cachedInputTokens) / 1000) * inputCostPer1K

  const outputCost = (outputTokens / 1000) * outputCostPer1K

  return inputCost + outputCost
}

/**
 * Estimate cost for sending a new message with current context
 * @param visibleMessages Currently visible messages in the active conversation path
 * @param model Model to use for cost estimation
 * @param newUserMessageTokens Tokens for the new user message (default: 500)
 * @param expectedResponseTokens Tokens for expected response (default: 1000)
 */
export function estimateNewMessageCost(
  visibleMessages: MessageNode[],
  model: string,
  newUserMessageTokens: number = 500,
  expectedResponseTokens: number = 1000,
): number {
  const cachedInputTokens = countCumulativeInputTokens(visibleMessages)
  return estimateCost(newUserMessageTokens, expectedResponseTokens, model, cachedInputTokens)
}

export function countCumulativeInputTokens(visibleMessages: MessageNode[]) {
  // Calculate cumulative input tokens from ALL previous messages in visible path
  return visibleMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0)
}

/**
 * Calculate branch statistics for the conversation tree
 */
function calculateBranchStatistics(nodes: Map<string, MessageNode>): {
  totalBranches: number
  maxBranchesPerNode: number
} {
  let totalBranches = 0
  let maxBranchesPerNode = 0
  const saveCount = (count: number) => {
    if (count < 2) return
    totalBranches += count
    maxBranchesPerNode = Math.max(maxBranchesPerNode, count)
  }

  saveCount(getRootChildren(nodes).length)
  for (const node of nodes.values()) saveCount(node.childIds.length)

  return { totalBranches, maxBranchesPerNode }
}

/**
 * Get token breakdown by role for visualization
 */
export interface TokenBreakdown {
  role: 'user' | 'assistant' | 'system'
  tokens: number
  percentage: number
  messageCount: number
}

export function getTokenBreakdown(nodes: Map<string, MessageNode>): TokenBreakdown[] {
  const messages = Array.from(nodes.values())
  const breakdown: TokenBreakdown[] = []

  const roleTokens = { user: 0, assistant: 0, system: 0 }
  const roleCounts = { user: 0, assistant: 0, system: 0 }

  messages.forEach((message) => {
    const tokens = estimateTokens(message.content)
    roleTokens[message.role] += tokens
    roleCounts[message.role]++
  })

  const totalTokens = Object.values(roleTokens).reduce((sum, tokens) => sum + tokens, 0)

  if (roleTokens.user > 0) {
    breakdown.push({
      role: 'user',
      tokens: roleTokens.user,
      percentage: Math.round((roleTokens.user / totalTokens) * 100),
      messageCount: roleCounts.user,
    })
  }

  if (roleTokens.assistant > 0) {
    breakdown.push({
      role: 'assistant',
      tokens: roleTokens.assistant,
      percentage: Math.round((roleTokens.assistant / totalTokens) * 100),
      messageCount: roleCounts.assistant,
    })
  }

  if (roleTokens.system > 0) {
    breakdown.push({
      role: 'system',
      tokens: roleTokens.system,
      percentage: Math.round((roleTokens.system / totalTokens) * 100),
      messageCount: roleCounts.system,
    })
  }

  return breakdown
}
