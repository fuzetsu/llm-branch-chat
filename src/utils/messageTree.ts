import type { Chat, MessageNode, MessageRole } from '../types'
import { generateMessageId } from './index'

export function createMessageNode(
  role: Exclude<MessageRole, 'root'>,
  content: string,
  model: string,
  parentId: string | null = null,
  branchIndex: number = 0,
): MessageNode {
  return {
    id: generateMessageId(),
    role: role,
    content,
    timestamp: Date.now(),
    isStreaming: false,
    isEditing: false,
    parentId,
    childIds: [],
    model,
    branchIndex,
  }
}

export function createEmptyChat(
  id: string,
  title: string,
  model: string,
  systemPromptId: string | null = null,
): Chat {
  const rootNodeId = generateMessageId()
  return {
    id,
    title,
    nodes: {},
    rootNodeId,
    activeBranches: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isGeneratingTitle: false,
    isArchived: false,
    model,
    systemPromptId,
  }
}

export function addNodeToPool(chat: Chat, newNode: MessageNode, parentId: string | null): void {
  // Add the new node to the pool
  chat.nodes[newNode.id] = newNode

  // Update parent's childIds if it has a parent
  if (parentId) {
    const parent = chat.nodes[parentId]
    if (parent) {
      parent.childIds.push(newNode.id)
      // Set this as the active branch (most recent child)
      chat.activeBranches[parentId] = parent.childIds.length - 1
    }
  } else {
    // Root level node - update root's active branch
    const rootChildren = getRootChildren(chat.nodes).length
    chat.activeBranches[chat.rootNodeId] = rootChildren - 1
  }
}

export function getVisibleNodes(chat: Chat): MessageNode[] {
  const visibleNodes: MessageNode[] = []

  const rootChildren = getRootChildren(chat.nodes)
  if (rootChildren.length === 0) return []

  // Start with the active root child
  const activeRootIndex = chat.activeBranches[chat.rootNodeId] || 0
  const activeRootChild = rootChildren[activeRootIndex]

  if (!activeRootChild) return []

  // Traverse the active path
  function traverseActivePath(nodeId: string) {
    const node = chat.nodes[nodeId]
    if (!node) return

    visibleNodes.push(node)

    // If this node has children, follow the active branch
    if (node.childIds.length > 0) {
      const activeChildIndex = chat.activeBranches[nodeId] || 0
      const activeChildId = node.childIds[activeChildIndex]
      if (activeChildId) {
        traverseActivePath(activeChildId)
      }
    }
  }

  traverseActivePath(activeRootChild.id)
  return visibleNodes
}

export function getRootChildren(nodes: Record<string, MessageNode>): MessageNode[] {
  return Object.values(nodes)
    .filter((node) => node.parentId === null)
    .sort((a, b) => a.branchIndex - b.branchIndex)
}

export function countDescendants(nodes: Record<string, MessageNode>, nodeId: string | null) {
  const node = nodeId ? nodes[nodeId] : { childIds: getRootChildren(nodes).map((node) => node.id) }
  if (!node) return 0
  let count = node.childIds.length
  for (const id of node.childIds) {
    const node = nodes[id]
    if (node) count += countDescendants(nodes, node.id)
  }
  return count
}

export function getBranchInfo(
  nodes: Record<string, MessageNode>,
  nodeId: string,
): { total: number; current: number; hasPrevious: boolean; hasNext: boolean } | null {
  const node = nodes[nodeId]
  if (!node) return null

  const siblings =
    node.parentId === null ? getRootChildren(nodes) : getNodeChildren(nodes, node.parentId)
  const currentIndex = siblings.findIndex((sibling) => sibling.id === node.id)

  return {
    total: siblings.length,
    current: currentIndex + 1,
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < siblings.length - 1,
  }
}

export function getSwitchBranchTarget(
  chat: Chat,
  node: MessageNode,
  branchIndex: number,
): string | null {
  let siblings: string[]
  if (node.parentId === null) {
    siblings = getRootChildren(chat.nodes).map((n: MessageNode) => n.id)
  } else {
    const parent = chat.nodes[node.parentId]
    siblings = parent?.childIds || []
  }

  const targetMessageId = siblings[branchIndex]
  if (!targetMessageId) return null

  return targetMessageId
}

export function getNodeChildren(nodes: Record<string, MessageNode>, nodeId: string): MessageNode[] {
  const node = nodes[nodeId]
  if (!node) return []

  return node.childIds
    .map((id) => nodes[id])
    .filter((x) => x != null)
    .sort((a, b) => a.branchIndex - b.branchIndex)
}
