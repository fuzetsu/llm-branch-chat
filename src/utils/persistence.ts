import type {
  AppSettings,
  AppStateStore,
  Chat,
  DraftStateStore,
  ProviderConfig,
  StreamingState,
} from '../types'

const STORAGE_KEY = 'llm-chat-state-tree-v1'
const DRAFT_STORAGE_KEY = `${STORAGE_KEY}-draft-msg`

export const STORE_VERSION = 1
export const DRAFT_STORE_VERSION = 1

export type StateToSave = Pick<AppStateStore, 'version' | 'chats' | 'currentChatId' | 'settings'>

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
      providers: { Pollinations: defaultProvider },
    },
    chat: {
      model: defaultModel,
      temperature: 0.7,
      maxTokens: 2048,
      autoGenerateTitle: true,
      titleGenerationTrigger: 2,
      titleModel: defaultModel,
      defaultSystemPromptId: null,
    },
    ui: {
      sidebarCollapsed: false,
      archivedSectionCollapsed: true,
      theme: 'dark' as const,
    },
    systemPrompts: {},
  }
}

export function createDefaultStreamingState(): StreamingState {
  return {
    isStreaming: false,
    currentMessageId: null,
    currentContent: '',
  }
}

export function createDefaultState(): AppStateStore {
  return {
    version: STORE_VERSION,
    chats: {},
    currentChatId: null,
    settings: createDefaultSettings(),
    streaming: createDefaultStreamingState(),
    flashingMessageId: null,
  }
}

export function createDefaultDraftState(): DraftStateStore {
  return { version: DRAFT_STORE_VERSION, drafts: {} }
}

function deserializeChat(chat: Chat, settings: AppSettings): Chat {
  return {
    ...chat,
    nodes: maybeEntriesToObject(chat.nodes, {}),
    activeBranches: maybeEntriesToObject(chat.activeBranches, {}),
    model: chat.model || settings.chat.model,
    systemPromptId: chat.systemPromptId || null,
  }
}

export function exportStateToJson(state: AppStateStore): string {
  const stateToSave: StateToSave = {
    version: state.version,
    chats: state.chats,
    currentChatId: state.currentChatId,
    settings: state.settings,
  }
  return JSON.stringify(stateToSave)
}

export function exportStateToJsonExternal(
  state: AppStateStore,
  draftState: DraftStateStore,
  pretty = false,
): string {
  const stateToSave: StateToSave & { draftState: DraftStateStore } = {
    version: state.version,
    chats: state.chats,
    currentChatId: state.currentChatId,
    settings: state.settings,
    draftState,
  }
  return pretty ? JSON.stringify(stateToSave, null, 2) : JSON.stringify(stateToSave)
}

function maybeEntriesToObject<T>(data: T, fallback: T) {
  return Array.isArray(data) ? Object.fromEntries(data) : (data ?? fallback)
}

export function importStateFromJson(jsonString: string): AppStateStore {
  try {
    const state: AppStateStore = JSON.parse(jsonString)
    const defaultSettings = createDefaultSettings()

    const settings: AppSettings = {
      api: {
        ...defaultSettings.api,
        ...(state.settings?.api || {}),
        providers: maybeEntriesToObject(
          state.settings.api.providers,
          defaultSettings.api.providers,
        ),
      },
      chat: { ...defaultSettings.chat, ...(state.settings?.chat || {}) },
      ui: { ...defaultSettings.ui, ...(state.settings?.ui || {}) },
      systemPrompts: maybeEntriesToObject(
        state.settings.systemPrompts,
        defaultSettings.systemPrompts,
      ),
    }

    return {
      version: STORE_VERSION,
      chats: Array.isArray(state.chats)
        ? Object.fromEntries(state.chats.map(([id, chat]) => [id, deserializeChat(chat, settings)]))
        : state.chats || {},
      currentChatId: state.currentChatId,
      settings,
      streaming: createDefaultStreamingState(),
      flashingMessageId: null,
    }
  } catch (error) {
    console.error('Failed to import state:', error, jsonString)
    throw new Error('Invalid JSON data or corrupted state file')
  }
}

export function importDraftStateFromExternalJson(jsonString: string): DraftStateStore {
  try {
    const { draftState } = JSON.parse(jsonString)
    if (!draftState) return createDefaultDraftState()
    const { version, drafts } = draftState
    if (typeof drafts !== 'object') throw new Error('draftState.drafts is not an object')
    return { version, drafts }
  } catch (error) {
    console.error('Failed to import draft state:', error, jsonString)
    throw new Error('Invalid JSON data or corrupted state file')
  }
}

export function loadDraftStateFromStorage(json?: string): DraftStateStore {
  try {
    const saved = json ?? localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!saved) return createDefaultDraftState()
    let data = JSON.parse(saved)
    if ('draftState' in data) data = data.draftState
    const { version, drafts } = JSON.parse(saved)
    if (typeof drafts !== 'object') throw new Error('drafts is not an object')
    return { version, drafts }
  } catch (error) {
    console.error('Failed to load state:', error, json)
    return createDefaultDraftState()
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

export function saveDraftStateToStorage(state: DraftStateStore) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save state:', error)
  }
}

export function saveStateToStorage(state: AppStateStore) {
  try {
    localStorage.setItem(STORAGE_KEY, exportStateToJson(state))
  } catch (error) {
    console.error('Failed to save state:', error)
  }
}
