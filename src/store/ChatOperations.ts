import type { Chat } from '../types/index.js'
import { generateChatId } from '../utils/index.js'
import { createEmptyChat } from '../utils/messageTree.js'
import type { AppStoreOperationsDeps } from './AppStore'

export type ChatOperationsDeps = AppStoreOperationsDeps

export const createChatOperations = ({ setState, getState }: ChatOperationsDeps) => {
  const operations = {
    addChat: (chat: Chat) => {
      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        newChats.set(chat.id, chat)
        return newChats
      })
    },

    ensureCurrentChat: () => {
      const chat = operations.getCurrentChat()
      if (chat) return chat.id
      return operations.createNewChat()
    },

    setCurrentChatId: (chatId: string) => {
      setState('currentChatId', chatId)
    },

    updateChat: (chatId: string, updates: Partial<Chat>) => {
      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        const existingChat = newChats.get(chatId)
        if (existingChat) {
          newChats.set(chatId, { ...existingChat, ...updates })
        }
        return newChats
      })
    },

    deleteChat: (chatId: string) => {
      setState('chats', (chats: Map<string, Chat>) => {
        const newChats = new Map(chats)
        newChats.delete(chatId)
        return newChats
      })
    },

    createNewChat: (): string => {
      const state = getState()
      const chatId = generateChatId()
      const newChat = createEmptyChat(
        chatId,
        'New Chat',
        state.settings.chat.model,
        null, // inherit default system prompt on new chats until overriden
      )

      const addChat = createChatOperations({ setState, getState }).addChat
      addChat(newChat)
      operations.setCurrentChatId(newChat.id)
      return newChat.id
    },

    getCurrentChat: (): Chat | null => {
      const state = getState()
      return state.currentChatId ? (state.chats.get(state.currentChatId) ?? null) : null
    },

    getActiveChats: (): Chat[] => {
      return Array.from(getState().chats.values())
        .filter((chat) => !chat.isArchived)
        .sort((a, b) => b.updatedAt - a.updatedAt)
    },

    getArchivedChats: (): Chat[] => {
      return Array.from(getState().chats.values())
        .filter((chat) => chat.isArchived)
        .sort((a, b) => b.updatedAt - a.updatedAt)
    },
  }

  return operations
}
