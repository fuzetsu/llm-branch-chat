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
  updateSettings: (settings: AppSettings) => void
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
  regenerateMessage: (chatId: string, messageId: string) => Promise<void>
  generateChatTitle: (chatId: string) => Promise<void>
}

const AppStoreContext = createContext<AppStoreContextType>()

const STORAGE_KEY = 'llm-chat-state-2'

function createDefaultSettings(): AppSettings {
  return {
    api: {
      baseUrl: 'https://text.pollinations.ai',
      key: 'dummym',
      availableModels: ['llama', 'openai', 'openai-large', 'evil'],
    },
    chat: {
      model: 'llama',
      temperature: 0.7,
      maxTokens: 2048,
      availableModels: ['llama', 'openai', 'openai-large', 'evil'],
      autoGenerateTitle: true,
      titleGenerationTrigger: 2,
      titleModel: 'llama',
    },
    ui: {
      sidebarCollapsed: false,
      theme: 'dark' as const,
      isGenerating: false,
      editTextareaSize: {
        width: '100%',
        height: '120px',
      },
    },
  }
}

function createDefaultUISettings(): UISettings {
  return {
    sidebarCollapsed: false,
    theme: 'dark' as const,
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

  // Apply theme changes to document
  createEffect(() => {
    const theme = state.settings.ui.theme
    const isDark =
      theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
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

  const updateSettings = (newSettings: AppSettings) => {
    setState('settings', newSettings)
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
          const currentMessage = updatedMessages[messageIndex]
          if (currentMessage) {
            updatedMessages[messageIndex] = {
              ...currentMessage,
              ...updates,
              // Ensure model is defined if provided in updates
              model: updates.model !== undefined ? updates.model : currentMessage.model,
            }
          }
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
          model: branch.model || message.model,
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
      model: 'user',
      isStreaming: false,
      isEditing: false,
      parentId: null,
      children: [],
      branchId: null,
    }

    addMessage(currentChat.id, userMessage)

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: currentChat.model || state.settings.chat.model,
      isStreaming: false,
      isEditing: false,
      parentId: null,
      children: [],
      branchId: null,
    }

    addMessage(currentChat.id, assistantMessage)
    startStreaming(assistantMessage.id)

    try {
      // Initialize API service
      const apiService = new SolidApiService(state.settings.api.baseUrl, state.settings.api.key)

      // Convert messages to API format
      const apiMessages: ApiMessage[] = [...currentChat.messages, userMessage].map((msg) => ({
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
            // Save the current streaming content before stopping
            const finalContent = state.streaming.currentContent
            stopStreaming()

            // Update final message with complete content
            updateMessage(currentChat.id, assistantMessage.id, {
              content: finalContent,
              timestamp: Date.now(),
            })

            // Auto-generate title if this is the first exchange
            if (
              currentChat.messages.length === state.settings.chat.titleGenerationTrigger &&
              state.settings.chat.autoGenerateTitle
            ) {
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
        state.settings.chat.maxTokens,
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

  // Regenerate message with API
  const regenerateMessage = async (chatId: string, messageId: string) => {
    const chat = state.chats.get(chatId)
    if (!chat) return

    const messageIndex = chat.messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    const message = chat.messages[messageIndex]
    if (!message || message.role !== 'assistant') return

    // Get all messages up to (but not including) the current message
    const conversationHistory = chat.messages.slice(0, messageIndex)

    try {
      // Check if this message already has branches
      const existingBranches = chat.messageBranches.get(messageId) || []

      // If this is the first regeneration, create initial branch from current content
      if (existingBranches.length === 0) {
        const initialBranch: MessageBranch = {
          content: message.content,
          children: [],
          timestamp: message.timestamp,
          model: message.model || chat.model || state.settings.chat.model,
        }
        addMessageBranch(chatId, messageId, initialBranch)
      }

      // Create new branch for regenerated content
      const newBranch: MessageBranch = {
        content: '',
        children: [],
        timestamp: Date.now(),
        model: message.model || chat.model || state.settings.chat.model,
      }

      // Add the new branch and switch to it
      addMessageBranch(chatId, messageId, newBranch)

      // Start streaming for regeneration
      startStreaming(messageId)

      // Initialize API service
      const apiService = new SolidApiService(state.settings.api.baseUrl, state.settings.api.key)

      // Convert conversation history to API format
      const apiMessages: ApiMessage[] = conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Stream the regenerated response with entropy to prevent caching
      await apiService.streamToSignals(
        apiMessages,
        newBranch.model || state.settings.chat.model,
        {
          onToken: (token: string) => {
            appendStreamingContent(token)
          },
          onComplete: () => {
            // Update the new branch with the complete content
            const finalContent = state.streaming.currentContent
            const currentChat = state.chats.get(chatId)
            if (currentChat) {
              const branches = currentChat.messageBranches.get(messageId)
              if (branches && branches.length > 0) {
                const lastBranchIndex = branches.length - 1
                const updatedBranches = [...branches]
                updatedBranches[lastBranchIndex] = {
                  ...updatedBranches[lastBranchIndex],
                  content: finalContent,
                  timestamp: Date.now(),
                  children: [],
                }

                // Update the chat with the new branch content
                updateChat(chatId, {
                  messageBranches: new Map(currentChat.messageBranches).set(
                    messageId,
                    updatedBranches,
                  ),
                  updatedAt: Date.now(),
                })
              }
            }
            stopStreaming()
          },
          onError: (error: Error) => {
            console.error('Regeneration error:', error)
            // Update the new branch with error message
            const currentChat = state.chats.get(chatId)
            if (currentChat) {
              const branches = currentChat.messageBranches.get(messageId)
              if (branches && branches.length > 0) {
                const lastBranchIndex = branches.length - 1
                const updatedBranches = [...branches]
                updatedBranches[lastBranchIndex] = {
                  ...updatedBranches[lastBranchIndex],
                  content: `Error: ${error.message}`,
                  timestamp: Date.now(),
                  children: [],
                }

                updateChat(chatId, {
                  messageBranches: new Map(currentChat.messageBranches).set(
                    messageId,
                    updatedBranches,
                  ),
                  updatedAt: Date.now(),
                })
              }
            }
            stopStreaming()
          },
        },
        state.settings.chat.temperature,
        state.settings.chat.maxTokens,
        true, // Enable entropy to prevent API caching
      )
    } catch (error) {
      console.error('Failed to regenerate message:', error)
      stopStreaming()
    }
  }

  // Auto-generate chat title
  const generateChatTitle = async (chatId: string) => {
    const chat = state.chats.get(chatId)
    if (!chat || chat.messages.length < 2 || chat.isGeneratingTitle) return

    try {
      updateChat(chatId, { isGeneratingTitle: true })

      const apiService = new SolidApiService(state.settings.api.baseUrl, state.settings.api.key)

      const title = await apiService.generateTitle(chat.messages, state.settings.chat.titleModel)

      if (title) {
        updateChat(chatId, {
          title,
          isGeneratingTitle: false,
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
    updateSettings,
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
    regenerateMessage,
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
