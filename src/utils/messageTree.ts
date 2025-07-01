import type { MessageNode, MessageRole, TreeNode } from '../types/index.js'
import { generateMessageId } from './index.js'

export function createMessageNode<
  T extends MessageRole,
  Ret = T extends 'root' ? TreeNode : MessageNode,
>(role: T, content: string, model: string, parentId: string | null = null): Ret {
  return {
    id: generateMessageId(),
    role: role,
    content,
    timestamp: Date.now(),
    isStreaming: false,
    isEditing: false,
    parentId,
    children: [],
    model,
    activeChildIndex: 0,
  } as Ret
}

export function createEmptyRootNode(): TreeNode {
  return {
    id: generateMessageId(),
    role: 'root',
    activeChildIndex: 0,
    children: [],
  }
}

export function findNodeById<
  T extends TreeNode | MessageNode,
  Ret = T extends TreeNode ? TreeNode | MessageNode : MessageNode,
>(tree: T | null, nodeId: string): Ret | null {
  if (!tree) return null
  if (tree.id === nodeId) return tree as unknown as Ret

  for (const child of tree.children) {
    const found = findNodeById(child, nodeId)
    if (found) return found as Ret
  }

  return null
}

export function addChildToNode<T extends TreeNode | MessageNode>(
  tree: T,
  parentId: string,
  child: MessageNode,
): T {
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

export function updateNodeContent(tree: MessageNode, nodeId: string, content: string): MessageNode {
  if (tree.id === nodeId) {
    return { ...tree, content, timestamp: Date.now() }
  }

  const newChildren = tree.children.map(
    (child) => updateNodeContent(child, nodeId, content) || child,
  )
  return { ...tree, children: newChildren }
}

export function setActiveChild<T extends TreeNode | MessageNode>(
  tree: T,
  nodeId: string,
  childIndex: number,
): T {
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
  tree: TreeNode | MessageNode,
  includeInactive = false,
): (MessageNode | TreeNode)[] {
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

export function getVisibleMessages(tree: TreeNode | MessageNode): MessageNode[] {
  const path = getConversationPath(tree, false)
  // Filter out root nodes from visible messages
  return path.filter(isNonRootMessage)
}

export function getBranchInfo(
  tree: TreeNode,
  nodeId: string,
): { total: number; current: number; hasPrevious: boolean; hasNext: boolean } | null {
  const node = findNodeById(tree, nodeId)
  if (!node || node.role === 'root') return null

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

export function switchToBranch(tree: TreeNode, nodeId: string, branchIndex: number): TreeNode {
  const node = findNodeById(tree, nodeId)
  if (!node || node.role === 'root') return tree

  const parent = findNodeById(tree, node.parentId)
  if (!parent) return tree

  return setActiveChild(tree, node.parentId, branchIndex)
}

export function getNodeChildren(tree: MessageNode | null, nodeId: string): MessageNode[] {
  const node = findNodeById(tree, nodeId)
  return node ? node.children : []
}

export function isNonRootMessage(message: TreeNode | MessageNode | null): message is MessageNode {
  return Boolean(message && message.role !== 'root')
}
