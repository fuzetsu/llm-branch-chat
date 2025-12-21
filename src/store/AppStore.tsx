import {
  createContext,
  createEffect,
  useContext,
  ParentComponent,
  createSignal,
  untrack,
} from 'solid-js'
import { createStore, SetStoreFunction } from 'solid-js/store'
import type {
  AppSettings,
  Chat,
  UISettings,
  SerializableAppState,
  SerializableChat,
  SerializableApiSettings,
  SerializableSystemPrompt,
  ProviderConfig,
  SystemPrompt,
} from '../types/index.js'
import { createAppStoreOperations, type AppStoreOperations } from './AppStoreOperations'
import { STREAM_END } from '../services/MessageService.js'

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
  flashingMessageId: string | null
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
  | 'ensureCurrentChat'
  | 'cancelStreaming'
>

interface AppStoreContextType extends BaseOperations {
  state: AppStateStore
  setCurrentChatId: (id: string | null) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  setUI: (ui: Partial<UISettings>) => void
  replaceState: (newState: AppStateStore) => void
  // Chat operations with wrapped signatures
  createNewChat: () => void
  getCurrentChat: () => Chat | null
  getActiveChats: () => Chat[]
  getArchivedChats: () => Chat[]
  // Message flash operations
  setFlashingMessage: (messageId: string | null) => void
  switchMessageBranchWithFlash: (chatId: string, messageId: string, branchIndex: number) => void
  // Simplified high-level operations
  sendMessage: (content: string) => Promise<void>
  generateAssistantResponse: () => Promise<void>
  regenerateMessage: (chatId: string, messageId: string) => Promise<void>
  generateChatTitle: (chatId: string) => Promise<void>
}

const AppStoreContext = createContext<AppStoreContextType>()

const STORAGE_KEY = 'llm-chat-state-tree-v1'

function createDefaultSettings(): AppSettings {
  const availableModels = [
    'openai',
    'openai-fast',
    'qwen-coder',
    'mistral',
    'deepseek',
    'openai-reasoning',
    'gemini',
    'gemini-search',
    'evil',
  ]
  const defaultProvider: ProviderConfig = {
    name: 'Pollinations',
    baseUrl: 'https://text.pollinations.ai/openai',
    key: 'dummy',
    availableModels,
    isDefault: true,
  }

  const defaultModel = 'Pollinations: deepseek'

  return {
    api: {
      providers: new Map([['Pollinations', defaultProvider]]),
      defaultProvider: 'Pollinations',
    },
    chat: {
      model: defaultModel,
      temperature: 0.7,
      maxTokens: 2048,
      availableModels,
      autoGenerateTitle: true,
      titleGenerationTrigger: 2,
      titleModel: defaultModel,
      defaultSystemPromptId: null,
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
    systemPrompts: new Map(),
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

function createDefaultState() {
  return {
    chats: new Map(),
    currentChatId: null,
    settings: createDefaultSettings(),
    ui: createDefaultUISettings(),
    streaming: createDefaultStreamingState(),
    flashingMessageId: null,
  }
}

function serializeChat(chat: Chat): SerializableChat {
  return {
    ...chat,
    nodes: Array.from(chat.nodes.entries()),
    activeBranches: Array.from(chat.activeBranches.entries()),
  }
}

function serializeApiSettings(api: AppSettings['api']): SerializableApiSettings {
  return {
    providers: Array.from(api.providers.entries()),
    defaultProvider: api.defaultProvider,
  }
}

function deserializeChat(chat: SerializableChat, settings: AppSettings): Chat {
  return {
    ...chat,
    nodes: new Map(chat.nodes || []),
    activeBranches: new Map(chat.activeBranches || []),
    model: chat.model || settings.chat.model,
    systemPromptId: chat.systemPromptId || null,
  }
}

function deserializeApiSettings(serialized: SerializableApiSettings): AppSettings['api'] {
  return {
    providers: new Map(serialized.providers || []),
    defaultProvider: serialized.defaultProvider || 'Pollinations',
  }
}

function serializeSystemPrompts(
  systemPrompts: Map<string, SystemPrompt>,
): Array<[string, SerializableSystemPrompt]> {
  return Array.from(systemPrompts.entries())
}

export function exportStateToJson(state: AppStateStore, pretty = false): string {
  const stateToExport: SerializableAppState = {
    chats: Array.from(state.chats.entries()).map(([id, chat]) => [id, serializeChat(chat)]),
    currentChatId: state.currentChatId,
    settings: {
      api: serializeApiSettings(state.settings.api),
      chat: state.settings.chat,
      ui: state.settings.ui,
      systemPrompts: serializeSystemPrompts(state.settings.systemPrompts),
    },
    ui: state.ui,
  }
  return pretty ? JSON.stringify(stateToExport, null, 2) : JSON.stringify(stateToExport)
}

export function importStateFromJson(jsonString: string): AppStateStore {
  try {
    const state: SerializableAppState = JSON.parse(jsonString)
    const defaultSettings = createDefaultSettings()

    const settings: AppSettings = {
      api: deserializeApiSettings(state.settings.api),
      chat: { ...defaultSettings.chat, ...(state.settings?.chat || {}) },
      ui: { ...defaultSettings.ui, ...(state.settings?.ui || {}) },
      systemPrompts: new Map(state.settings?.systemPrompts || []),
    }

    return {
      chats: new Map(
        (state.chats || []).map(([id, chat]) => [id, deserializeChat(chat, settings)]),
      ),
      currentChatId: state.currentChatId,
      settings,
      ui: { ...createDefaultUISettings(), ...state.ui },
      streaming: createDefaultStreamingState(),
      flashingMessageId: null,
    }
  } catch (error) {
    console.error('Failed to import state:', error)
    throw new Error('Invalid JSON data or corrupted state file')
  }
}

function loadStateFromStorage(): AppStateStore {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return createDefaultState()
    return importStateFromJson(saved)
  } catch (error) {
    console.error('Failed to load state:', error)
    return createDefaultState()
  }
}

function saveStateToStorage(state: AppStateStore) {
  try {
    localStorage.setItem(STORAGE_KEY, exportStateToJson(state))
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
  const operations = createAppStoreOperations({ setState, getState: () => state })

  const newAbort = () => new AbortController()
  const [abortController, setAbortController] = createSignal(newAbort())
  createEffect(() => {
    if (!state.streaming.isStreaming) {
      untrack(abortController).abort(STREAM_END)
      setAbortController(newAbort())
    }
  })

  // High-level operations with business logic
  const sendMessage = async (content: string) => {
    const currentChat = operations.getCurrentChat()
    if (!currentChat) {
      operations.createNewChat()
      return sendMessage(content)
    }

    await operations.sendMessage(content, currentChat, state.settings, abortController().signal)

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

    await operations.regenerateMessage(
      chatId,
      messageId,
      chat,
      state.settings,
      abortController().signal,
    )
  }

  const generateAssistantResponse = async () => {
    const currentChat = operations.getCurrentChat()
    if (!currentChat) return

    await operations.generateAssistantResponse(
      currentChat,
      state.settings,
      abortController().signal,
    )
  }

  const generateChatTitle = async (chatId: string) => {
    const chat = state.chats.get(chatId)
    if (!chat) return

    await operations.generateChatTitle(chatId, chat, state.settings.chat.titleModel)
  }

  // Simplified operation wrappers
  const createNewChat = () => setCurrentChatId(null)

  // Message flash operations
  const setFlashingMessage = (messageId: string | null) => {
    setState('flashingMessageId', messageId)
  }

  const replaceState = (newState: AppStateStore) => {
    setState(newState)
  }

  const storeValue: AppStoreContextType = {
    state,
    setCurrentChatId,
    updateSettings,
    setUI,
    replaceState,
    // Chat operations
    addChat: operations.addChat,
    updateChat: operations.updateChat,
    deleteChat: operations.deleteChat,
    createNewChat,
    getCurrentChat: operations.getCurrentChat,
    getActiveChats: operations.getActiveChats,
    getArchivedChats: operations.getArchivedChats,
    ensureCurrentChat: operations.ensureCurrentChat,
    // Message flash operations
    setFlashingMessage,
    // Message operations
    addMessage: operations.addMessage,
    updateMessage: operations.updateMessage,
    createMessageBranch: operations.createMessageBranch,
    switchMessageBranch: operations.switchMessageBranch,
    switchMessageBranchWithFlash: (chatId: string, messageId: string, branchIndex: number) =>
      operations.switchMessageBranchWithFlash(chatId, messageId, branchIndex, setFlashingMessage),
    getVisibleMessages: operations.getVisibleMessages,
    getBranchInfo: operations.getBranchInfo,
    // Streaming operations
    startStreaming: operations.startStreaming,
    updateStreamingContent: operations.updateStreamingContent,
    appendStreamingContent: operations.appendStreamingContent,
    stopStreaming: operations.stopStreaming,
    cancelStreaming: operations.cancelStreaming,
    getStreamingContent: operations.getStreamingContent,
    // High-level operations with business logic
    sendMessage,
    generateAssistantResponse,
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
