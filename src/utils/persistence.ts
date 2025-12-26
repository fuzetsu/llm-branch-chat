import type { AppSettings, AppStateStore, Chat, ProviderConfig, StreamingState } from '../types'

const STORAGE_KEY = 'llm-chat-state-tree-v1'

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
      isGenerating: false,
      editTextareaSize: {
        width: '100%',
        height: '120px',
      },
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
    nodes: Array.isArray(chat.nodes) ? Object.fromEntries(chat.nodes) : chat.nodes,
    activeBranches: Array.isArray(chat.activeBranches)
      ? Object.fromEntries(chat.activeBranches || [])
      : chat.activeBranches,
    model: chat.model || settings.chat.model,
    systemPromptId: chat.systemPromptId || null,
  }
}

export function exportStateToJson(state: AppStateStore, pretty = false): string {
  return pretty ? JSON.stringify(state, null, 2) : JSON.stringify(state)
}

export function importStateFromJson(jsonString: string): AppStateStore {
  try {
    const state: AppStateStore = JSON.parse(jsonString)
    const defaultSettings = createDefaultSettings()

    const settings: AppSettings = {
      api: {
        ...defaultSettings.api,
        ...(state.settings?.api || {}),
        providers: Array.isArray(state.settings?.api.providers)
          ? Object.fromEntries(state.settings.api.providers)
          : (state.settings?.api.providers ?? defaultSettings.api.providers),
      },
      chat: { ...defaultSettings.chat, ...(state.settings?.chat || {}) },
      ui: { ...defaultSettings.ui, ...(state.settings?.ui || {}) },
      systemPrompts: Array.isArray(state.settings.systemPrompts)
        ? Object.fromEntries(state.settings.systemPrompts)
        : state.settings?.systemPrompts || {},
    }

    console.log(state.settings, settings)

    return {
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
