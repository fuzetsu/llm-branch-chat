import { STORE_VERSION } from '../store/AppStore'
import type { AppSettings, AppStateStore, Chat, ProviderConfig, StreamingState } from '../types'

const STORAGE_KEY = 'llm-chat-state-tree-v1'

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

function deserializeChat(chat: Chat, settings: AppSettings): Chat {
  return {
    ...chat,
    nodes: maybeEntriesToObject(chat.nodes, {}),
    activeBranches: maybeEntriesToObject(chat.activeBranches, {}),
    model: chat.model || settings.chat.model,
    systemPromptId: chat.systemPromptId || null,
  }
}

export function exportStateToJson(state: AppStateStore, pretty = false): string {
  const stateToSave: StateToSave = {
    version: state.version,
    chats: state.chats,
    currentChatId: state.currentChatId,
    settings: state.settings,
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
