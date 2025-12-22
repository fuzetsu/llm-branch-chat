import type {
  AppSettings,
  Chat,
  ChatSettings,
  ProviderConfig,
  SystemPrompt,
  UISettings,
} from '../types'

const STORAGE_KEY = 'llm-chat-state-tree-v1'

// Serializable versions of types that use Map
// Uses Omit + custom property to express "same as X but with Maps as arrays"
type SerializableChat = Omit<Chat, 'nodes' | 'activeBranches'> & {
  nodes: Array<[string, Chat['nodes'] extends Map<string, infer V> ? V : never]>
  activeBranches: Array<[string, number]>
}

type SerializableAppSettings = Omit<AppSettings, 'api' | 'systemPrompts'> & {
  api: { providers: Array<[string, ProviderConfig]> }
  systemPrompts: Array<[string, SystemPrompt]>
}

interface SerializableAppState {
  chats: Array<[string, SerializableChat]>
  currentChatId: string | null
  settings: SerializableAppSettings
  ui: UISettings
}

// Internal state shape (used by AppStore)
export interface AppStateStore {
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

export function createDefaultSettings(): AppSettings {
  const availableModels = ['openai', 'openai-fast', 'bidara', 'chickytutor', 'midijourney']
  const defaultProvider: ProviderConfig = {
    name: 'Pollinations',
    baseUrl: 'https://text.pollinations.ai/openai',
    key: 'dummy',
    availableModels,
  }

  const defaultModel = 'Pollinations: openai-fast'

  return {
    api: {
      providers: new Map([['Pollinations', defaultProvider]]),
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

export function createDefaultUISettings(): UISettings {
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

export function createDefaultStreamingState() {
  return {
    isStreaming: false,
    currentMessageId: null,
    currentContent: '',
  }
}

export function createDefaultState(): AppStateStore {
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

function deserializeChat(chat: SerializableChat, settings: AppSettings): Chat {
  return {
    ...chat,
    nodes: new Map(chat.nodes || []),
    activeBranches: new Map(chat.activeBranches || []),
    model: chat.model || settings.chat.model,
    systemPromptId: chat.systemPromptId || null,
  }
}

export function exportStateToJson(state: AppStateStore, pretty = false): string {
  const stateToExport: SerializableAppState = {
    chats: Array.from(state.chats.entries()).map(([id, chat]) => [id, serializeChat(chat)]),
    currentChatId: state.currentChatId,
    settings: {
      api: { providers: Array.from(state.settings.api.providers.entries()) },
      chat: state.settings.chat,
      ui: state.settings.ui,
      systemPrompts: Array.from(state.settings.systemPrompts.entries()),
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
      api: { providers: new Map(state.settings.api.providers || []) },
      chat: { ...defaultSettings.chat, ...(state.settings?.chat || {}) } as ChatSettings,
      ui: { ...defaultSettings.ui, ...(state.settings?.ui || {}) } as UISettings,
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

export function loadStateFromStorage(): AppStateStore {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return createDefaultState()
    return importStateFromJson(saved)
  } catch (error) {
    console.error('Failed to load state:', error)
    return createDefaultState()
  }
}

export function saveStateToStorage(state: AppStateStore) {
  try {
    localStorage.setItem(STORAGE_KEY, exportStateToJson(state))
  } catch (error) {
    console.error('Failed to save state:', error)
  }
}
