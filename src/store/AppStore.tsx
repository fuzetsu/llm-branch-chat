import { createContext, createEffect, useContext, ParentComponent } from 'solid-js'
import { createStore, SetStoreFunction } from 'solid-js/store'
import type {
  AppSettings,
  Chat,
  UISettings,
  SerializableAppState,
  SerializableChat,
} from '../types/index.js'
import { createAppStoreOperations, type AppStoreOperations } from './AppStoreOperations'

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

// Pick specific operations from the composed module
type BaseOperations = Pick<
  AppStoreOperations,
  | 'addChat'
  | 'updateChat'
  | 'deleteChat'
  | 'addMessage'
  | 'updateMessage'
  | 'createMessageBranch'
  | 'switchMessageBranch'
  | 'getVisibleMessages'
  | 'getBranchInfo'
  | 'startStreaming'
  | 'updateStreamingContent'
  | 'appendStreamingContent'
  | 'stopStreaming'
  | 'getStreamingContent'
>

interface AppStoreContextType extends BaseOperations {
  state: AppStateStore
  setCurrentChatId: (id: string | null) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  setUI: (ui: Partial<UISettings>) => void
  // Chat operations with wrapped signatures
  createNewChat: () => string
  getCurrentChat: () => Chat | null
  getActiveChats: () => Chat[]
  getArchivedChats: () => Chat[]
  // Simplified high-level operations
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
      archivedSectionCollapsed: true,
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
    archivedSectionCollapsed: true,
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

// Export types for operation modules
export type AppStoreState = AppStateStore
export type AppStoreSetState = SetStoreFunction<AppStateStore>
export type AppStoreGetState = () => AppStateStore

export interface AppStoreOperationsDeps {
  setState: AppStoreSetState
  getState: AppStoreGetState
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

  const setCurrentChatId = (id: string | null) => {
    setState('currentChatId', id)
  }

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setState('settings', newSettings)
  }

  const setUI = (newUI: Partial<UISettings>) => {
    setState('ui', (ui) => ({ ...ui, ...newUI }))
  }

  // Initialize composed operations
  const operations = createAppStoreOperations(
    { setState, getState: () => state },
    {
      baseUrl: initialState.settings.api.baseUrl,
      apiKey: initialState.settings.api.key,
    },
  )

  // High-level operations with business logic
  const sendMessage = async (content: string) => {
    const currentChat = operations.getCurrentChat(state.currentChatId, state.chats)
    if (!currentChat) return

    await operations.sendMessage(content, currentChat, state.settings)

    // Auto-generate title if this is the first exchange
    const messageCount = operations.getVisibleMessages(currentChat.id).length
    if (
      messageCount === state.settings.chat.titleGenerationTrigger &&
      state.settings.chat.autoGenerateTitle
    ) {
      generateChatTitle(currentChat.id)
    }
  }

  const regenerateMessage = async (chatId: string, messageId: string) => {
    const chat = state.chats.get(chatId)
    if (!chat) return

    await operations.regenerateMessage(chatId, messageId, chat, state.settings)
  }

  const generateChatTitle = async (chatId: string) => {
    const chat = state.chats.get(chatId)
    if (!chat) return

    await operations.generateChatTitle(chatId, chat, state.settings.chat.titleModel)
  }

  // Simplified operation wrappers
  const createNewChat = (): string => operations.createNewChat(setCurrentChatId)
  const getCurrentChat = (): Chat | null =>
    operations.getCurrentChat(state.currentChatId, state.chats)
  const getActiveChats = (): Chat[] => operations.getActiveChats(state.chats)
  const getArchivedChats = (): Chat[] => operations.getArchivedChats(state.chats)

  const storeValue: AppStoreContextType = {
    state,
    setCurrentChatId,
    updateSettings,
    setUI,
    // Chat operations
    addChat: operations.addChat,
    updateChat: operations.updateChat,
    deleteChat: operations.deleteChat,
    createNewChat,
    getCurrentChat,
    getActiveChats,
    getArchivedChats,
    // Message operations
    addMessage: operations.addMessage,
    updateMessage: operations.updateMessage,
    createMessageBranch: operations.createMessageBranch,
    switchMessageBranch: operations.switchMessageBranch,
    getVisibleMessages: operations.getVisibleMessages,
    getBranchInfo: operations.getBranchInfo,
    // Streaming operations
    startStreaming: operations.startStreaming,
    updateStreamingContent: operations.updateStreamingContent,
    appendStreamingContent: operations.appendStreamingContent,
    stopStreaming: operations.stopStreaming,
    getStreamingContent: operations.getStreamingContent,
    // High-level operations with business logic
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
