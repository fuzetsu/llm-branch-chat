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
}

/**
 * Calculate comprehensive token statistics for ALL conversation paths in the chat
 * This includes all branches and alternative conversation paths
 */
export function getTokenStats(
  nodes: Map<string, MessageNode>,
  model: string = 'gpt-4.1',
): TokenStats {
  return getAllPathsTokenStats(nodes, model)
}

function getAllPathsTokenStats(nodes: Map<string, MessageNode>, model: string): TokenStats {
  const rootMessages = Array.from(nodes.values()).filter((node) => node.parentId === null)

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let userMessageCount = 0
  let assistantMessageCount = 0
  let systemMessageCount = 0

  // Calculate statistics for each root conversation path
  rootMessages.forEach((rootMessage) => {
    const pathStats = calculatePathTokenStats(nodes, rootMessage.id)
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

  return {
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    estimatedCost: estimateCost(totalInputTokens, totalOutputTokens, model),
    messageCount,
    userMessageCount,
    assistantMessageCount,
    systemMessageCount,
    averageTokensPerMessage,
    totalBranches: branchStats.totalBranches,
    maxBranchesPerNode: branchStats.maxBranchesPerNode,
  }
}

function calculatePathTokenStats(
  nodes: Map<string, MessageNode>,
  startNodeId: string,
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

  // Calculate cumulative input tokens for this path
  messagesInPath.forEach((message, index) => {
    const messageTokens = estimateTokens(message.content)

    if (message.role === 'assistant') {
      // Cumulative input tokens for this assistant response
      const contextMessages = messagesInPath.slice(0, index + 1)
      const cumulativeInputTokens = contextMessages
        .filter((m) => m.role !== 'assistant')
        .reduce((sum, m) => sum + estimateTokens(m.content), 0)

      pathInputTokens += cumulativeInputTokens
      pathOutputTokens += messageTokens
      pathAssistantCount++
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
    'gpt-4.1': 0.003, // $3.00/1M input tokens
    'gpt-4.1-mini': 0.0008, // $0.80/1M input tokens
  }

  const outputCostPer1K: Record<string, number> = {
    'gpt-4.1': 0.012, // $12.00/1M output tokens
    'gpt-4.1-mini': 0.0032, // $3.20/1M output tokens
  }

  const inputRate = inputCostPer1K[model] || 0.001
  const outputRate = outputCostPer1K[model] || 0.004

  return (inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate
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
