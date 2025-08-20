import type { Chat, MessageNode } from '../types/index.js'
import {
  createMessageNode,
  addNodeToPool,
  updateNodeInPool,
  getVisibleMessages,
  findNodeById,
  switchToBranch,
  getBranchInfo,
} from '../utils/messageTree.js'
import type { AppStoreOperationsDeps } from './AppStore'

export type MessageOperationsDeps = AppStoreOperationsDeps

export const createMessageOperations = ({ setState, getState }: MessageOperationsDeps) => {
  return {
    addMessage: (chatId: string, message: MessageNode, parentId: string | null) => {
      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        const chat = newChats.get(chatId)
        if (chat) {
          const { nodes: newNodes, activeBranches: newBranches } = addNodeToPool(
            chat.nodes,
            chat.activeBranches,
            chat.rootNodeId,
            message,
            parentId,
          )

          newChats.set(chatId, {
            ...chat,
            nodes: newNodes,
            activeBranches: newBranches,
            updatedAt: Date.now(),
          })
        }
        return newChats
      })
    },

    updateMessage: (chatId: string, messageId: string, updates: Partial<MessageNode>) => {
      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        const chat = newChats.get(chatId)
        if (chat) {
          const node = findNodeById(chat.nodes, messageId)
          if (node) {
            const newNodes = updateNodeInPool(chat.nodes, messageId, updates)
            newChats.set(chatId, {
              ...chat,
              nodes: newNodes,
              updatedAt: Date.now(),
            })
            return newChats
          }
        }
        return chats
      })
    },

    createMessageBranch: (
      chatId: string,
      parentId: string | null,
      content: string,
      role: 'user' | 'assistant' | 'system',
      model: string,
    ): string => {
      // Determine branch index
      const state = getState()
      const chat = state.chats.get(chatId)
      let branchIndex = 0

      if (chat) {
        if (parentId === null) {
          // Root level - count existing root children
          branchIndex = Array.from(chat.nodes.values()).filter(
            (node) => node.parentId === null,
          ).length
        } else {
          // Regular node - count parent's children
          const parent = chat.nodes.get(parentId)
          branchIndex = parent?.childIds.length || 0
        }
      }

      const newMessage = createMessageNode(role, content, model, parentId, branchIndex)

      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        const chat = newChats.get(chatId)
        if (chat) {
          const { nodes: newNodes, activeBranches: newBranches } = addNodeToPool(
            chat.nodes,
            chat.activeBranches,
            chat.rootNodeId,
            newMessage,
            parentId,
          )
          newChats.set(chatId, {
            ...chat,
            nodes: newNodes,
            activeBranches: newBranches,
            updatedAt: Date.now(),
          })
        }
        return newChats
      })

      return newMessage.id
    },

    switchMessageBranch: (chatId: string, messageId: string, branchIndex: number) => {
      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        const chat = newChats.get(chatId)
        if (chat) {
          const newBranches = switchToBranch(
            chat.activeBranches,
            chat.nodes,
            chat.rootNodeId,
            messageId,
            branchIndex,
          )
          newChats.set(chatId, {
            ...chat,
            activeBranches: newBranches,
          })
          return newChats
        }
        return chats
      })
    },

    getVisibleMessages: (chatId: string): MessageNode[] => {
      const state = getState()
      const chat = state.chats.get(chatId)
      if (!chat) return []

      return getVisibleMessages(chat.nodes, chat.rootNodeId, chat.activeBranches)
    },

    getBranchInfo: (chatId: string, messageId: string) => {
      const state = getState()
      const chat = state.chats.get(chatId)
      if (!chat) return null

      return getBranchInfo(chat.nodes, chat.rootNodeId, messageId)
    },

    switchMessageBranchWithFlash: (
      chatId: string,
      messageId: string,
      branchIndex: number,
      setFlashingMessage: (id: string | null) => void,
    ): void => {
      const state = getState()
      const chat = state.chats.get(chatId)
      if (!chat) return

      const targetNode = chat.nodes.get(messageId)
      if (!targetNode) return

      // Find siblings and target message
      let siblings: string[]
      if (targetNode.parentId === null) {
        // Root level - get all nodes with null parentId
        siblings = Array.from(chat.nodes.values())
          .filter((n) => n.parentId === null)
          .sort((a, b) => a.branchIndex - b.branchIndex)
          .map((n) => n.id)
      } else {
        // Regular node - get parent's children
        const parent = chat.nodes.get(targetNode.parentId)
        siblings = parent?.childIds || []
      }

      const targetMessageId = siblings[branchIndex]

      // Perform the branch switch
      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        const chat = newChats.get(chatId)
        if (chat) {
          const newBranches = switchToBranch(
            chat.activeBranches,
            chat.nodes,
            chat.rootNodeId,
            messageId,
            branchIndex,
          )
          newChats.set(chatId, {
            ...chat,
            activeBranches: newBranches,
          })
          return newChats
        }
        return chats
      })

      // Flash the target message
      if (targetMessageId) {
        setFlashingMessage(targetMessageId)
        setTimeout(() => setFlashingMessage(null), 1000)
      }
    },
  }
}
