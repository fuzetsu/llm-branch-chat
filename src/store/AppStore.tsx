import { createContext, createEffect, useContext, ParentComponent } from 'solid-js'
import { createStore } from 'solid-js/store'
import type {
  AppSettings,
  Chat,
  UISettings,
  SerializableAppState,
  SerializableChat,
  Message,
  ApiMessage,
  MessageBranch,
} from '../types/index.js'
import { generateChatId, generateMessageId } from '../utils/index.js'
import { SolidApiService } from '../services/ApiService'

interface AppStateStore {
  chats: Map<string, Chat>
  currentChatId: string | null
  settings: AppSettings
  ui: UISettings
  streaming: {
    isStreaming: boolean
    currentMessageId: string | null
    currentContent: string
  }
}

interface AppStoreContextType {
  state: AppStateStore
  setChats: (chats: Map<string, Chat>) => void
  setCurrentChatId: (id: string | null) => void
  setSettings: (settings: Partial<AppSettings>) => void
  setUI: (ui: Partial<UISettings>) => void
  addChat: (chat: Chat) => void
  updateChat: (chatId: string, updates: Partial<Chat>) => void
  deleteChat: (chatId: string) => void
  createNewChat: () => string
  getCurrentChat: () => Chat | null
  getActiveChats: () => Chat[]
  getArchivedChats: () => Chat[]
  // Message operations
  addMessage: (chatId: string, message: Message) => void
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void
  addMessageBranch: (chatId: string, messageId: string, branch: MessageBranch) => void
  switchMessageBranch: (chatId: string, messageId: string, branchIndex: number) => void
  getVisibleMessages: (chatId: string) => Message[]
  // Streaming operations
  startStreaming: (messageId: string) => void
  updateStreamingContent: (content: string) => void
  appendStreamingContent: (content: string) => void
  stopStreaming: () => void
  // Message sending
  sendMessage: (content: string) => Promise<void>
  generateChatTitle: (chatId: string) => Promise<void>
}

const AppStoreContext = createContext<AppStoreContextType>()

const STORAGE_KEY = 'llm-chat-state'

function createDefaultSettings(): AppSettings {
  return {
    autoGenerateTitle: true,
    titleGenerationTrigger: 2,
    titleModel: 'evil',
    api: {
      baseUrl: 'https://text.pollinations.ai',
      apiKey: 'dummym',
      availableModels: ['evil', 'openai', 'openai-large', 'llama'],
    },
    chat: {
      model: 'openai',
      temperature: 0.7,
      maxTokens: 2048,
    },
    theme: 'dark',
  }
}

function createDefaultUISettings(): UISettings {
  return {
    sidebarCollapsed: false,
    isGenerating: false,
    editTextareaSize: {
      width: '100%',
      height: '120px',
    },
  }
}

function createDefaultStreamingState() {
  return {
    isStreaming: false,
    currentMessageId: null,
    currentContent: '',
  }
}

function serializeChat(chat: Chat): SerializableChat {
  return {
    ...chat,
    messageBranches: Array.from(chat.messageBranches.entries()),
    currentBranches: Array.from(chat.currentBranches.entries()),
  }
}

function deserializeChat(chat: SerializableChat, settings: AppSettings): Chat {
  const messageBranches = new Map(chat.messageBranches || [])

  // Migration: Add timestamp and model to existing branches
  messageBranches.forEach((branches, messageId) => {
    const message = (chat.messages || []).find((m) => m.id === messageId)
    messageBranches.set(
      messageId,
      branches.map((branch) => {
        const migratedBranch: any = {
          ...branch,
          timestamp: branch.timestamp || message?.timestamp || Date.now(),
        }
        const branchModel =
          branch.model ||
          message?.model ||
          (message?.role === 'assistant' ? settings.chat.model : undefined)
        if (branchModel) {
          migratedBranch.model = branchModel
        }
        return migratedBranch
      }),
    )
  })

  return {
    ...chat,
    messageBranches,
    currentBranches: new Map(chat.currentBranches || []),
    // Migration: Add model property to existing chats
    model: chat.model || settings.chat.model,
    // Migration: Add model property to existing messages
    messages: (chat.messages || []).map((msg) => {
      const model = msg.model || (msg.role === 'assistant' ? settings.chat.model : undefined)
      return {
        ...msg,
        ...(model && { model }),
      }
    }),
  }
}

function loadStateFromStorage(): AppStateStore {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return {
        chats: new Map(),
        currentChatId: null,
        settings: createDefaultSettings(),
        ui: createDefaultUISettings(),
        streaming: createDefaultStreamingState(),
      }
    }

    const state: SerializableAppState = JSON.parse(saved)
    const settings = { ...createDefaultSettings(), ...state.settings }

    return {
      chats: new Map(
        (state.chats || []).map(([id, chat]) => [id, deserializeChat(chat, settings)]),
      ),
      currentChatId: state.currentChatId,
      settings,
      ui: { ...createDefaultUISettings(), ...state.ui },
      streaming: createDefaultStreamingState(),
    }
  } catch (error) {
    console.error('Failed to load state:', error)
    return {
      chats: new Map(),
      currentChatId: null,
      settings: createDefaultSettings(),
      ui: createDefaultUISettings(),
      streaming: createDefaultStreamingState(),
    }
  }
}

function saveStateToStorage(state: AppStateStore) {
  const stateToSave: SerializableAppState = {
    chats: Array.from(state.chats.entries()).map(([id, chat]) => [id, serializeChat(chat)]),
    currentChatId: state.currentChatId,
    settings: state.settings,
    ui: state.ui,
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
  } catch (error) {
    console.error('Failed to save state:', error)
  }
}

export const AppStoreProvider: ParentComponent = (props) => {
  const initialState = loadStateFromStorage()
  const [state, setState] = createStore<AppStateStore>(initialState)

  // Save to localStorage whenever state changes
  createEffect(() => {
    saveStateToStorage(state)
  })

  const setChats = (chats: Map<string, Chat>) => {
    setState('chats', chats)
  }

  const setCurrentChatId = (id: string | null) => {
    setState('currentChatId', id)
  }

  const setSettings = (newSettings: Partial<AppSettings>) => {
    setState('settings', (settings) => ({ ...settings, ...newSettings }))
  }

  const setUI = (newUI: Partial<UISettings>) => {
    setState('ui', (ui) => ({ ...ui, ...newUI }))
  }

  const addChat = (chat: Chat) => {
    setState('chats', (chats) => {
      const newChats = new Map(chats)
      newChats.set(chat.id, chat)
      return newChats
    })
  }

  const updateChat = (chatId: string, updates: Partial<Chat>) => {
    setState('chats', (chats) => {
      const newChats = new Map(chats)
      const existingChat = newChats.get(chatId)
      if (existingChat) {
        newChats.set(chatId, { ...existingChat, ...updates })
      }
      return newChats
    })
  }

  const deleteChat = (chatId: string) => {
    setState('chats', (chats) => {
      const newChats = new Map(chats)
      newChats.delete(chatId)
      return newChats
    })
  }

  const createNewChat = (): string => {
    const newChat: Chat = {
      id: generateChatId(),
      title: 'New Chat',
      messages: [],
      messageBranches: new Map(),
      currentBranches: new Map(),
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isGeneratingTitle: false,
      model: state.settings.chat.model,
    }

    addChat(newChat)
    setCurrentChatId(newChat.id)
    return newChat.id
  }

  const getCurrentChat = (): Chat | null => {
    return state.currentChatId ? state.chats.get(state.currentChatId) || null : null
  }

  const getActiveChats = (): Chat[] => {
    return Array.from(state.chats.values())
      .filter((chat) => !chat.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  const getArchivedChats = (): Chat[] => {
    return Array.from(state.chats.values())
      .filter((chat) => chat.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  // Message operations
  const addMessage = (chatId: string, message: Message) => {
    setState('chats', (chats) => {
      const newChats = new Map(chats)
      const chat = newChats.get(chatId)
      if (chat) {
        newChats.set(chatId, {
          ...chat,
          messages: [...chat.messages, message],
          updatedAt: Date.now(),
        })
      }
      return newChats
    })
  }

  const updateMessage = (chatId: string, messageId: string, updates: Partial<Message>) => {
    setState('chats', (chats) => {
      const newChats = new Map(chats)
      const chat = newChats.get(chatId)
      if (chat) {
        const messageIndex = chat.messages.findIndex((m) => m.id === messageId)
        if (messageIndex >= 0) {
          const updatedMessages = [...chat.messages]
          updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updates }
          newChats.set(chatId, {
            ...chat,
            messages: updatedMessages,
            updatedAt: Date.now(),
          })
        }
      }
      return newChats
    })
  }

  const addMessageBranch = (chatId: string, messageId: string, branch: MessageBranch) => {
    setState('chats', (chats) => {
      const newChats = new Map(chats)
      const chat = newChats.get(chatId)
      if (chat) {
        const newBranches = new Map(chat.messageBranches)
        const existingBranches = newBranches.get(messageId) || []
        newBranches.set(messageId, [...existingBranches, branch])
        
        const newCurrentBranches = new Map(chat.currentBranches)
        newCurrentBranches.set(messageId, existingBranches.length)
        
        newChats.set(chatId, {
          ...chat,
          messageBranches: newBranches,
          currentBranches: newCurrentBranches,
          updatedAt: Date.now(),
        })
      }
      return newChats
    })
  }

  const switchMessageBranch = (chatId: string, messageId: string, branchIndex: number) => {
    setState('chats', (chats) => {
      const newChats = new Map(chats)
      const chat = newChats.get(chatId)
      if (chat) {
        const newCurrentBranches = new Map(chat.currentBranches)
        newCurrentBranches.set(messageId, branchIndex)
        newChats.set(chatId, {
          ...chat,
          currentBranches: newCurrentBranches,
        })
      }
      return newChats
    })
  }

  const getVisibleMessages = (chatId: string): Message[] => {
    const chat = state.chats.get(chatId)
    if (!chat) return []

    return chat.messages.map((message) => {
      const branches = chat.messageBranches.get(message.id)
      const currentBranchIndex = chat.currentBranches.get(message.id) || 0
      
      if (branches && branches[currentBranchIndex]) {
        const branch = branches[currentBranchIndex]
        return {
          ...message,
          content: branch.content,
          timestamp: branch.timestamp,
          model: branch.model,
        }
      }
      
      return message
    })
  }

  // Streaming operations
  const startStreaming = (messageId: string) => {
    setState('streaming', {
      isStreaming: true,
      currentMessageId: messageId,
      currentContent: '',
    })
  }

  const updateStreamingContent = (content: string) => {
    setState('streaming', 'currentContent', content)
  }

  const appendStreamingContent = (content: string) => {
    setState('streaming', 'currentContent', (prev) => prev + content)
  }

  const stopStreaming = () => {
    setState('streaming', {
      isStreaming: false,
      currentMessageId: null,
      currentContent: '',
    })
  }

  // Message sending function with full API integration
  const sendMessage = async (content: string) => {
    const currentChat = getCurrentChat()
    if (!currentChat) return

    // Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }
    
    addMessage(currentChat.id, userMessage)

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: currentChat.model || state.settings.chat.model,
    }

    addMessage(currentChat.id, assistantMessage)
    startStreaming(assistantMessage.id)

    try {
      // Initialize API service
      const apiService = new SolidApiService(
        state.settings.api.baseUrl,
        state.settings.api.apiKey
      )

      // Convert messages to API format
      const apiMessages: ApiMessage[] = [...currentChat.messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      // Stream response
      await apiService.streamToSignals(
        apiMessages,
        assistantMessage.model || state.settings.chat.model,
        {
          onToken: (token: string) => {
            appendStreamingContent(token)
          },
          onComplete: () => {
            // Update final message with complete content
            updateMessage(currentChat.id, assistantMessage.id, {
              content: state.streaming.currentContent,
              timestamp: Date.now(),
            })
            stopStreaming()
            
            // Auto-generate title if this is the first exchange
            if (currentChat.messages.length === 0 && state.settings.autoGenerateTitle) {
              generateChatTitle(currentChat.id)
            }
          },
          onError: (error: Error) => {
            console.error('Streaming error:', error)
            updateMessage(currentChat.id, assistantMessage.id, {
              content: `Error: ${error.message}`,
              timestamp: Date.now(),
            })
            stopStreaming()
          },
        },
        state.settings.chat.temperature,
        state.settings.chat.maxTokens
      )
    } catch (error) {
      console.error('Failed to send message:', error)
      updateMessage(currentChat.id, assistantMessage.id, {
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      })
      stopStreaming()
    }
  }

  // Auto-generate chat title
  const generateChatTitle = async (chatId: string) => {
    const chat = state.chats.get(chatId)
    if (!chat || chat.messages.length < 2) return

    try {
      updateChat(chatId, { isGeneratingTitle: true })
      
      const apiService = new SolidApiService(
        state.settings.api.baseUrl,
        state.settings.api.apiKey
      )
      
      const title = await apiService.generateTitle(
        chat.messages,
        state.settings.titleModel
      )
      
      if (title) {
        updateChat(chatId, { 
          title,
          isGeneratingTitle: false 
        })
      }
    } catch (error) {
      console.error('Title generation failed:', error)
      updateChat(chatId, { isGeneratingTitle: false })
    }
  }

  const storeValue: AppStoreContextType = {
    state,
    setChats,
    setCurrentChatId,
    setSettings,
    setUI,
    addChat,
    updateChat,
    deleteChat,
    createNewChat,
    getCurrentChat,
    getActiveChats,
    getArchivedChats,
    addMessage,
    updateMessage,
    addMessageBranch,
    switchMessageBranch,
    getVisibleMessages,
    startStreaming,
    updateStreamingContent,
    appendStreamingContent,
    stopStreaming,
    sendMessage,
    generateChatTitle,
  }

  return <AppStoreContext.Provider value={storeValue}>{props.children}</AppStoreContext.Provider>
}

export const useAppStore = () => {
  const context = useContext(AppStoreContext)
  if (!context) {
    throw new Error('useAppStore must be used within AppStoreProvider')
  }
  return context
}

