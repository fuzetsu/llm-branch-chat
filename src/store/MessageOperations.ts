import type { Chat, MessageNode } from '../types/index.js'
import {
  createMessageNode,
  addChildToNode,
  getVisibleMessages as getVisibleMessagesFromTree,
  findNodeById,
  switchToBranch,
  getBranchInfo,
} from '../utils/messageTree.js'
import type { AppStoreOperationsDeps } from './AppStore'

export type MessageOperationsDeps = AppStoreOperationsDeps

export const createMessageOperations = ({ setState, getState }: MessageOperationsDeps) => {
  const updateNodeInTree = (
    tree: MessageNode | null,
    nodeId: string,
    updates: Partial<MessageNode>,
  ): MessageNode | null => {
    if (!tree) return null

    if (tree.id === nodeId) {
      return { ...tree, ...updates }
    }

    const newChildren = tree.children.map(
      (child) => updateNodeInTree(child, nodeId, updates) || child,
    )
    return { ...tree, children: newChildren }
  }

  return {
    addMessage: (chatId: string, message: MessageNode, parentId?: string) => {
      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        const chat = newChats.get(chatId)
        if (chat) {
          let newTree = chat.messageTree
          if (!newTree && !parentId) {
            // First message in conversation
            newTree = message
          } else if (parentId) {
            // Add as child to existing node
            newTree = addChildToNode(newTree, parentId, message)
          }

          newChats.set(chatId, {
            ...chat,
            messageTree: newTree,
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
        if (chat && chat.messageTree) {
          const node = findNodeById(chat.messageTree, messageId)
          if (node) {
            const updatedTree = updateNodeInTree(chat.messageTree, messageId, updates)
            newChats.set(chatId, {
              ...chat,
              messageTree: updatedTree,
              updatedAt: Date.now(),
            })
          }
        }
        return newChats
      })
    },

    createMessageBranch: (
      chatId: string,
      parentId: string,
      content: string,
      role: 'user' | 'assistant' | 'system',
      model: string,
    ): string => {
      const newMessage = createMessageNode(role, content, model, parentId)
      const operations = createMessageOperations({ setState, getState })
      operations.addMessage(chatId, newMessage, parentId)
      return newMessage.id
    },

    switchMessageBranch: (chatId: string, messageId: string, branchIndex: number) => {
      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        const chat = newChats.get(chatId)
        if (chat && chat.messageTree) {
          const newTree = switchToBranch(chat.messageTree, messageId, branchIndex)
          newChats.set(chatId, {
            ...chat,
            messageTree: newTree,
          })
        }
        return newChats
      })
    },

    getVisibleMessages: (chatId: string): MessageNode[] => {
      const state = getState()
      const chat = state.chats.get(chatId)
      if (!chat) return []

      return getVisibleMessagesFromTree(chat.messageTree)
    },

    getBranchInfo: (chatId: string, messageId: string) => {
      const state = getState()
      const chat = state.chats.get(chatId)
      if (!chat) return null

      return getBranchInfo(chat.messageTree, messageId)
    },
  }
}
