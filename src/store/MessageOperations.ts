import type { Chat, MessageNode, TreeNode } from '../types/index.js'
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
  const updateNodeInTree = <T extends TreeNode | MessageNode>(
    tree: T | null,
    nodeId: string,
    updates: Partial<MessageNode>,
  ): T | null => {
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
    addMessage: (chatId: string, message: MessageNode, parentId: string) => {
      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        const chat = newChats.get(chatId)
        if (chat) {
          // Add as child to existing node
          const newTree = addChildToNode(chat.messageTree, parentId, message)

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
            if (updatedTree) {
              newChats.set(chatId, {
                ...chat,
                messageTree: updatedTree,
                updatedAt: Date.now(),
              })
              return newChats
            }
          }
        }
        return chats
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

      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        const chat = newChats.get(chatId)
        if (chat && chat.messageTree) {
          const newTree = addChildToNode(chat.messageTree, parentId, newMessage)
          newChats.set(chatId, {
            ...chat,
            messageTree: newTree,
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
        if (chat && chat.messageTree) {
          const newTree = switchToBranch(chat.messageTree, messageId, branchIndex)
          if (newTree) {
            newChats.set(chatId, {
              ...chat,
              messageTree: newTree,
            })
            return newChats
          }
        }
        return chats
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
