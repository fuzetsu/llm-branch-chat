import type { MessageNode } from '../types/index.js'
import { generateMessageId } from './index.js'

export function createMessageNode(
  role: 'user' | 'assistant' | 'system',
  content: string,
  model: string,
  parentId: string | null = null,
): MessageNode {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: Date.now(),
    isStreaming: false,
    isEditing: false,
    parentId,
    children: [],
    model,
    activeChildIndex: 0,
  }
}

export function findNodeById(tree: MessageNode | null, nodeId: string): MessageNode | null {
  if (!tree) return null
  if (tree.id === nodeId) return tree

  for (const child of tree.children) {
    const found = findNodeById(child, nodeId)
    if (found) return found
  }

  return null
}

export function addChildToNode(
  tree: MessageNode | null,
  parentId: string,
  child: MessageNode,
): MessageNode | null {
  if (!tree) return child.parentId === null ? child : null

  if (tree.id === parentId) {
    const newTree = { ...tree }
    newTree.children = [...tree.children, child]
    newTree.activeChildIndex = newTree.children.length - 1
    return newTree
  }

  const newChildren = tree.children.map((childNode) => {
    const updated = addChildToNode(childNode, parentId, child)
    return updated || childNode
  })

  return { ...tree, children: newChildren }
}

export function updateNodeContent(
  tree: MessageNode | null,
  nodeId: string,
  content: string,
): MessageNode | null {
  if (!tree) return null

  if (tree.id === nodeId) {
    return { ...tree, content, timestamp: Date.now() }
  }

  const newChildren = tree.children.map(
    (child) => updateNodeContent(child, nodeId, content) || child,
  )
  return { ...tree, children: newChildren }
}

export function setActiveChild(
  tree: MessageNode | null,
  nodeId: string,
  childIndex: number,
): MessageNode | null {
  if (!tree) return null

  if (tree.id === nodeId) {
    return {
      ...tree,
      activeChildIndex: Math.max(0, Math.min(childIndex, tree.children.length - 1)),
    }
  }

  const newChildren = tree.children.map(
    (child) => setActiveChild(child, nodeId, childIndex) || child,
  )
  return { ...tree, children: newChildren }
}

export function getConversationPath(
  tree: MessageNode | null,
  includeInactive = false,
): MessageNode[] {
  if (!tree) return []

  const path = [tree]

  if (tree.children.length === 0) return path

  if (includeInactive) {
    // Return all branches - this would be for a more complex UI
    return path
  }

  // Follow the active branch
  const activeChild = tree.children[tree.activeChildIndex]
  if (activeChild) {
    path.push(...getConversationPath(activeChild, includeInactive))
  }

  return path
}

export function getVisibleMessages(tree: MessageNode | null): MessageNode[] {
  return getConversationPath(tree, false)
}

export function getBranchInfo(
  tree: MessageNode | null,
  nodeId: string,
): { total: number; current: number; hasPrevious: boolean; hasNext: boolean } | null {
  const node = findNodeById(tree, nodeId)
  if (!node || !node.parentId) return null

  const parent = findNodeById(tree, node.parentId)
  if (!parent) return null

  const currentIndex = parent.children.findIndex((child) => child.id === nodeId)
  if (currentIndex === -1) return null

  return {
    total: parent.children.length,
    current: currentIndex + 1,
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < parent.children.length - 1,
  }
}

export function switchToBranch(
  tree: MessageNode | null,
  nodeId: string,
  branchIndex: number,
): MessageNode | null {
  const node = findNodeById(tree, nodeId)
  if (!node || !node.parentId) return tree

  const parent = findNodeById(tree, node.parentId)
  if (!parent) return tree

  return setActiveChild(tree, node.parentId, branchIndex)
}

export function getNodeChildren(tree: MessageNode | null, nodeId: string): MessageNode[] {
  const node = findNodeById(tree, nodeId)
  return node ? node.children : []
}
