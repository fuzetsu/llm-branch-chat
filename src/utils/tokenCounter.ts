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
  let totalOutputTokens = 0
  let userMessageCount = 0
  let assistantMessageCount = 0
  let systemMessageCount = 0

  // Track model-specific statistics
  const modelStats = new Map<
    string,
    { inputTokens: number; outputTokens: number; messageCount: number }
  >()

  // Calculate statistics for each root conversation path with per-message model costs
  rootMessages.forEach((rootMessage) => {
    const pathStats = calculatePathTokenStatsWithModelCosts(nodes, rootMessage.id, modelStats)
    totalInputTokens += pathStats.totalInputTokens
    totalOutputTokens += pathStats.totalOutputTokens
    userMessageCount += pathStats.userMessageCount
    assistantMessageCount += pathStats.assistantMessageCount
    systemMessageCount += pathStats.systemMessageCount
  })

  const totalTokens = totalInputTokens + totalOutputTokens
  const messageCount = userMessageCount + assistantMessageCount + systemMessageCount
  const averageTokensPerMessage = messageCount > 0 ? Math.round(totalTokens / messageCount) : 0

  // Calculate branch statistics
  const branchStats = calculateBranchStatistics(nodes)

  // Calculate model breakdown
  const modelBreakdown: ModelTokenStats[] = []
  let totalEstimatedCost = 0

  for (const [modelName, stats] of modelStats.entries()) {
    const modelCost = estimateCost(stats.inputTokens, stats.outputTokens, modelName)
    totalEstimatedCost += modelCost

    modelBreakdown.push({
      model: modelName,
      inputTokens: stats.inputTokens,
      outputTokens: stats.outputTokens,
      totalTokens: stats.inputTokens + stats.outputTokens,
      estimatedCost: modelCost,
      messageCount: stats.messageCount,
    })
  }

  // Sort model breakdown by total tokens (descending)
  modelBreakdown.sort((a, b) => b.totalTokens - a.totalTokens)

  return {
    totalInputTokens,
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
  modelStats: Map<string, { inputTokens: number; outputTokens: number; messageCount: number }>,
): {
  totalInputTokens: number
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
  let pathOutputTokens = 0
  let pathUserCount = 0
  let pathAssistantCount = 0
  let pathSystemCount = 0

  // Calculate cumulative input tokens for this path with per-message model costs
  messagesInPath.forEach((message, index) => {
    const messageTokens = estimateTokens(message.content)

    if (message.role === 'assistant') {
      // Cumulative input tokens for this assistant response - ALL previous messages
      const contextMessages = messagesInPath.slice(0, index + 1)
      const cumulativeInputTokens = contextMessages.reduce(
        (sum, m) => sum + estimateTokens(m.content),
        0,
      )

      pathInputTokens += cumulativeInputTokens
      pathOutputTokens += messageTokens
      pathAssistantCount++

      // Update model-specific statistics
      const model = message.model || 'unknown'
      const currentStats = modelStats.get(model) || {
        inputTokens: 0,
        outputTokens: 0,
        messageCount: 0,
      }
      modelStats.set(model, {
        inputTokens: currentStats.inputTokens + cumulativeInputTokens,
        outputTokens: currentStats.outputTokens + messageTokens,
        messageCount: currentStats.messageCount + 1,
      })
    } else {
      if (message.role === 'user') pathUserCount++
      if (message.role === 'system') pathSystemCount++
    }
  })

  return {
    totalInputTokens: pathInputTokens,
    totalOutputTokens: pathOutputTokens,
    userMessageCount: pathUserCount,
    assistantMessageCount: pathAssistantCount,
    systemMessageCount: pathSystemCount,
  }
}

/**
 * Cost estimation with separate input/output pricing
 */
function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  const inputCostPer1K: Record<string, number> = {
    'x-ai/grok-4-fast': 0.0002, // $0.20/1M input tokens
    'deepseek-ai/deepseek-v3.2-exp': 0.00028, // $0.28/1M input tokens
    'deepseek-ai/deepseek-v3.2-exp-thinking': 0.00028, // $0.28/1M input tokens
  }

  const outputCostPer1K: Record<string, number> = {
    'x-ai/grok-4-fast': 0.0005, // $0.50/1M output tokens
    'deepseek-ai/deepseek-v3.2-exp': 0.00042, // $0.42/1M input tokens
    'deepseek-ai/deepseek-v3.2-exp-thinking': 0.00042, // $0.42/1M input tokens
  }

  const inputRate = inputCostPer1K[model] || 0
  const outputRate = outputCostPer1K[model] || 0

  return (inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate
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
  const totalInputTokens = countCumulativeInputTokens(visibleMessages) + newUserMessageTokens
  return estimateCost(totalInputTokens, expectedResponseTokens, model)
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
