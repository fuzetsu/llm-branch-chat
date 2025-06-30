import type { Chat } from '../types/index.js'
import { generateChatId } from '../utils/index.js'
import type { AppStoreOperationsDeps } from './AppStore'

export type ChatOperationsDeps = AppStoreOperationsDeps

export const createChatOperations = ({ setState, getState }: ChatOperationsDeps) => ({
  addChat: (chat: Chat) => {
    setState('chats', (chats: Map<string, Chat>) => {
      const newChats = new Map(chats)
      newChats.set(chat.id, chat)
      return newChats
    })
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

  createNewChat: (setCurrentChatId: (id: string) => void): string => {
    const state = getState()
    const newChat: Chat = {
      id: generateChatId(),
      title: 'New Chat',
      messageTree: null,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isGeneratingTitle: false,
      model: state.settings.chat.model,
    }

    const addChat = createChatOperations({ setState, getState }).addChat
    addChat(newChat)
    setCurrentChatId(newChat.id)
    return newChat.id
  },

  getCurrentChat: (currentChatId: string | null, chats: Map<string, Chat>): Chat | null => {
    return currentChatId ? chats.get(currentChatId) || null : null
  },

  getActiveChats: (chats: Map<string, Chat>): Chat[] => {
    return Array.from(chats.values())
      .filter((chat) => !chat.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },

  getArchivedChats: (chats: Map<string, Chat>): Chat[] => {
    return Array.from(chats.values())
      .filter((chat) => chat.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }
})