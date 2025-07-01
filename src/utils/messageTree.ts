import type { MessageNode, MessageRole } from '../types/index.js'
import { generateMessageId } from './index.js'

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

export function createEmptyChat(id: string, title: string, model: string) {
  const rootNodeId = generateMessageId()
  return {
    id,
    title,
    nodes: new Map<string, MessageNode>(),
    rootNodeId,
    activeBranches: new Map<string, number>(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isGeneratingTitle: false,
    isArchived: false,
    model,
  }
}

export function findNodeById(nodes: Map<string, MessageNode>, nodeId: string): MessageNode | null {
  return nodes.get(nodeId) || null
}

export function addNodeToPool(
  nodes: Map<string, MessageNode>,
  activeBranches: Map<string, number>,
  newNode: MessageNode,
  parentId: string | null,
): { nodes: Map<string, MessageNode>; activeBranches: Map<string, number> } {
  const newNodes = new Map(nodes)
  const newBranches = new Map(activeBranches)

  // Add the new node to the pool
  newNodes.set(newNode.id, newNode)

  // Update parent's childIds if it has a parent
  if (parentId) {
    const parent = newNodes.get(parentId)
    if (parent) {
      const updatedParent = {
        ...parent,
        childIds: [...parent.childIds, newNode.id],
      }
      newNodes.set(parentId, updatedParent)

      // Set this as the active branch (most recent child)
      newBranches.set(parentId, parent.childIds.length)
    }
  } else {
    // Root level node - update root's active branch
    const rootChildren = Array.from(newNodes.values()).filter(
      (node) => node.parentId === null,
    ).length
    newBranches.set(newNode.parentId || 'root', rootChildren - 1)
  }

  return { nodes: newNodes, activeBranches: newBranches }
}

export function updateNodeInPool(
  nodes: Map<string, MessageNode>,
  nodeId: string,
  updates: Partial<MessageNode>,
): Map<string, MessageNode> {
  const newNodes = new Map(nodes)
  const existingNode = newNodes.get(nodeId)

  if (existingNode) {
    const updatedNode = { ...existingNode, ...updates }
    if (updates.content) {
      updatedNode.timestamp = Date.now()
    }
    newNodes.set(nodeId, updatedNode)
  }

  return newNodes
}

export function setActiveBranch(
  activeBranches: Map<string, number>,
  parentId: string,
  childIndex: number,
  maxChildren: number,
): Map<string, number> {
  const newBranches = new Map(activeBranches)
  const clampedIndex = Math.max(0, Math.min(childIndex, maxChildren - 1))
  newBranches.set(parentId, clampedIndex)
  return newBranches
}

export function getVisibleNodes(
  nodes: Map<string, MessageNode>,
  rootNodeId: string,
  activeBranches: Map<string, number>,
): MessageNode[] {
  const visibleNodes: MessageNode[] = []

  // Get root children (nodes with parentId === null)
  const rootChildren = Array.from(nodes.values())
    .filter((node) => node.parentId === null)
    .sort((a, b) => a.branchIndex - b.branchIndex)

  if (rootChildren.length === 0) return []

  // Start with the active root child
  const activeRootIndex = activeBranches.get(rootNodeId) || 0
  const activeRootChild = rootChildren[activeRootIndex]

  if (!activeRootChild) return []

  // Traverse the active path
  function traverseActivePath(nodeId: string) {
    const node = nodes.get(nodeId)
    if (!node) return

    visibleNodes.push(node)

    // If this node has children, follow the active branch
    if (node.childIds.length > 0) {
      const activeChildIndex = activeBranches.get(nodeId) || 0
      const activeChildId = node.childIds[activeChildIndex]
      if (activeChildId) {
        traverseActivePath(activeChildId)
      }
    }
  }

  traverseActivePath(activeRootChild.id)
  return visibleNodes
}

export function getVisibleMessages(
  nodes: Map<string, MessageNode>,
  rootNodeId: string,
  activeBranches: Map<string, number>,
): MessageNode[] {
  return getVisibleNodes(nodes, rootNodeId, activeBranches)
}

export function getBranchInfo(
  nodes: Map<string, MessageNode>,
  rootNodeId: string,
  nodeId: string,
): { total: number; current: number; hasPrevious: boolean; hasNext: boolean } | null {
  const node = nodes.get(nodeId)
  if (!node) return null

  let siblings: MessageNode[]
  let currentIndex: number

  if (node.parentId === null) {
    // Root level node
    siblings = Array.from(nodes.values())
      .filter((n) => n.parentId === null)
      .sort((a, b) => a.branchIndex - b.branchIndex)
    currentIndex = node.branchIndex
  } else {
    // Regular node - find siblings
    const parent = nodes.get(node.parentId)
    if (!parent) return null

    siblings = parent.childIds
      .map((id) => nodes.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.branchIndex - b.branchIndex)

    currentIndex = siblings.findIndex((sibling) => sibling.id === nodeId)
    if (currentIndex === -1) return null
  }

  return {
    total: siblings.length,
    current: currentIndex + 1,
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < siblings.length - 1,
  }
}

export function switchToBranch(
  activeBranches: Map<string, number>,
  nodes: Map<string, MessageNode>,
  rootNodeId: string,
  nodeId: string,
  branchIndex: number,
): Map<string, number> {
  const node = nodes.get(nodeId)
  if (!node) return activeBranches

  const parentId = node.parentId || rootNodeId

  // Get the number of siblings to validate the branch index
  let siblingCount: number
  if (node.parentId === null) {
    // Root level - count nodes with null parentId
    siblingCount = Array.from(nodes.values()).filter((n) => n.parentId === null).length
  } else {
    // Regular node - count parent's children
    const parent = nodes.get(node.parentId)
    siblingCount = parent?.childIds.length || 0
  }

  return setActiveBranch(activeBranches, parentId, branchIndex, siblingCount)
}

export function getNodeChildren(nodes: Map<string, MessageNode>, nodeId: string): MessageNode[] {
  const node = nodes.get(nodeId)
  if (!node) return []

  return node.childIds
    .map((id) => nodes.get(id)!)
    .filter(Boolean)
    .sort((a, b) => a.branchIndex - b.branchIndex)
}

export function isNonRootMessage(message: MessageNode | null): message is MessageNode {
  return Boolean(message)
}

export function getSwitchedBranchMessage(
  nodes: Map<string, MessageNode>,
  rootNodeId: string,
  messageId: string,
  branchIndex: number,
): MessageNode | null {
  const currentNode = nodes.get(messageId)
  if (!currentNode) return null

  let siblings: MessageNode[]

  if (currentNode.parentId === null) {
    // Root level node
    siblings = Array.from(nodes.values())
      .filter((n) => n.parentId === null)
      .sort((a, b) => a.branchIndex - b.branchIndex)
  } else {
    // Regular node
    const parent = nodes.get(currentNode.parentId)
    if (!parent) return null

    siblings = parent.childIds
      .map((id) => nodes.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.branchIndex - b.branchIndex)
  }

  return siblings[branchIndex] || null
}
