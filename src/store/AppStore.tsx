import { createContext, createEffect, useContext, ParentComponent } from 'solid-js'
import { createStore } from 'solid-js/store'
import type {
  AppSettings,
  Chat,
  UISettings,
  SerializableAppState,
  SerializableChat,
  MessageNode,
  ApiMessage,
} from '../types/index.js'
import { generateChatId } from '../utils/index.js'
import {
  createMessageNode,
  addChildToNode,
  getVisibleMessages as getVisibleMessagesFromTree,
  findNodeById,
  switchToBranch,
  getBranchInfo,
} from '../utils/messageTree.js'
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
  addMessage: (chatId: string, message: MessageNode, parentId?: string) => void
  updateMessage: (chatId: string, messageId: string, updates: Partial<MessageNode>) => void
  createMessageBranch: (
    chatId: string,
    parentId: string,
    content: string,
    role: 'user' | 'assistant' | 'system',
    model: string,
  ) => string
  switchMessageBranch: (chatId: string, messageId: string, branchIndex: number) => void
  getVisibleMessages: (chatId: string) => MessageNode[]
  getBranchInfo: (
    chatId: string,
    messageId: string,
  ) => { total: number; current: number; hasPrevious: boolean; hasNext: boolean } | null
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

const STORAGE_KEY = 'llm-chat-state-tree-v1'

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
  }
}

function deserializeChat(chat: SerializableChat, settings: AppSettings): Chat {
  return {
    ...chat,
    model: chat.model || settings.chat.model,
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
      messageTree: null,
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
  const addMessage = (chatId: string, message: MessageNode, parentId?: string) => {
    setState('chats', (chats) => {
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
  }

  const updateMessage = (chatId: string, messageId: string, updates: Partial<MessageNode>) => {
    setState('chats', (chats) => {
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
  }

  function updateNodeInTree(
    tree: MessageNode | null,
    nodeId: string,
    updates: Partial<MessageNode>,
  ): MessageNode | null {
    if (!tree) return null

    if (tree.id === nodeId) {
      return { ...tree, ...updates }
    }

    const newChildren = tree.children.map(
      (child) => updateNodeInTree(child, nodeId, updates) || child,
    )
    return { ...tree, children: newChildren }
  }

  const createMessageBranch = (
    chatId: string,
    parentId: string,
    content: string,
    role: 'user' | 'assistant' | 'system',
    model: string,
  ): string => {
    const newMessage = createMessageNode(role, content, model, parentId)
    addMessage(chatId, newMessage, parentId)
    return newMessage.id
  }

  const switchMessageBranch = (chatId: string, messageId: string, branchIndex: number) => {
    setState('chats', (chats) => {
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
  }

  const getVisibleMessages = (chatId: string): MessageNode[] => {
    const chat = state.chats.get(chatId)
    if (!chat) return []

    return getVisibleMessagesFromTree(chat.messageTree)
  }

  const getBranchInfoForMessage = (chatId: string, messageId: string) => {
    const chat = state.chats.get(chatId)
    if (!chat) return null

    return getBranchInfo(chat.messageTree, messageId)
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

    // Find the last message in the conversation to use as parent
    const visibleMessages = getVisibleMessages(currentChat.id)
    const lastMessage = visibleMessages[visibleMessages.length - 1]
    const parentId = lastMessage?.id || null

    // Add user message
    const userMessage = createMessageNode('user', content.trim(), 'user', parentId)

    addMessage(currentChat.id, userMessage, parentId || undefined)

    // Create assistant message placeholder
    const assistantMessage = createMessageNode(
      'assistant',
      '',
      currentChat.model || state.settings.chat.model,
      userMessage.id,
    )

    addMessage(currentChat.id, assistantMessage, userMessage.id)
    startStreaming(assistantMessage.id)

    try {
      // Initialize API service
      const apiService = new SolidApiService(state.settings.api.baseUrl, state.settings.api.key)

      // Convert messages to API format
      const visibleMessages = getVisibleMessages(currentChat.id)
      const apiMessages: ApiMessage[] = visibleMessages.map((msg) => ({
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
            const messageCount = getVisibleMessages(currentChat.id).length
            if (
              messageCount === state.settings.chat.titleGenerationTrigger &&
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
    if (!chat || !chat.messageTree) return

    const message = findNodeById(chat.messageTree, messageId)
    if (!message || message.role !== 'assistant') return

    // Get conversation history up to this message
    const visibleMessages = getVisibleMessages(chatId)
    const messageIndex = visibleMessages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return

    const conversationHistory = visibleMessages.slice(0, messageIndex)

    try {
      // Create new branch (sibling) for regenerated content
      const newBranchMessage = createMessageNode(
        'assistant',
        '',
        message.model || chat.model || state.settings.chat.model,
        message.parentId,
      )

      // Add the new branch as a sibling
      if (message.parentId) {
        addMessage(chatId, newBranchMessage, message.parentId)
      }

      // Start streaming for regeneration
      startStreaming(newBranchMessage.id)

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
        newBranchMessage.model || state.settings.chat.model,
        {
          onToken: (token: string) => {
            appendStreamingContent(token)
          },
          onComplete: () => {
            // Update the new branch with the complete content
            const finalContent = state.streaming.currentContent
            updateMessage(chatId, newBranchMessage.id, {
              content: finalContent,
              timestamp: Date.now(),
            })
            stopStreaming()
          },
          onError: (error: Error) => {
            console.error('Regeneration error:', error)
            updateMessage(chatId, newBranchMessage.id, {
              content: `Error: ${error.message}`,
              timestamp: Date.now(),
            })
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
    const visibleMessages = getVisibleMessages(chatId)
    if (!chat || visibleMessages.length < 2 || chat.isGeneratingTitle) return

    try {
      updateChat(chatId, { isGeneratingTitle: true })

      const apiService = new SolidApiService(state.settings.api.baseUrl, state.settings.api.key)

      const title = await apiService.generateTitle(visibleMessages, state.settings.chat.titleModel)

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
    createMessageBranch,
    switchMessageBranch,
    getVisibleMessages,
    getBranchInfo: getBranchInfoForMessage,
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
