import { createContext, createEffect, createSignal, useContext, ParentComponent } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { AppSettings, Chat, UISettings, SerializableAppState, SerializableChat, MessageBranch } from '../types/index.js';

interface AppStateStore {
  chats: Map<string, Chat>;
  currentChatId: string | null;
  settings: AppSettings;
  ui: UISettings;
}

interface AppStoreContextType {
  state: AppStateStore;
  setChats: (chats: Map<string, Chat>) => void;
  setCurrentChatId: (id: string | null) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  setUI: (ui: Partial<UISettings>) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  deleteChat: (chatId: string) => void;
  getCurrentChat: () => Chat | null;
  getActiveChats: () => Chat[];
  getArchivedChats: () => Chat[];
}

const AppStoreContext = createContext<AppStoreContextType>();

const STORAGE_KEY = 'llm-chat-state';

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
  };
}

function createDefaultUISettings(): UISettings {
  return {
    sidebarCollapsed: false,
    isGenerating: false,
    editTextareaSize: {
      width: '100%',
      height: '120px',
    },
  };
}

function serializeChat(chat: Chat): SerializableChat {
  return {
    ...chat,
    messageBranches: Array.from(chat.messageBranches.entries()),
    currentBranches: Array.from(chat.currentBranches.entries()),
  };
}

function deserializeChat(chat: SerializableChat, settings: AppSettings): Chat {
  const messageBranches = new Map(chat.messageBranches || []);
  
  // Migration: Add timestamp and model to existing branches
  messageBranches.forEach((branches, messageId) => {
    const message = (chat.messages || []).find(m => m.id === messageId);
    messageBranches.set(messageId, branches.map(branch => {
      const migratedBranch: any = {
        ...branch,
        timestamp: branch.timestamp || message?.timestamp || Date.now(),
      };
      const branchModel = branch.model || message?.model || (message?.role === 'assistant' ? settings.chat.model : undefined);
      if (branchModel) {
        migratedBranch.model = branchModel;
      }
      return migratedBranch;
    }));
  });

  return {
    ...chat,
    messageBranches,
    currentBranches: new Map(chat.currentBranches || []),
    // Migration: Add model property to existing chats
    model: chat.model || settings.chat.model,
    // Migration: Add model property to existing messages
    messages: (chat.messages || []).map((msg) => {
      const model = msg.model || (msg.role === 'assistant' ? settings.chat.model : undefined);
      return {
        ...msg,
        ...(model && { model }),
      };
    }),
  };
}

function loadStateFromStorage(): AppStateStore {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return {
        chats: new Map(),
        currentChatId: null,
        settings: createDefaultSettings(),
        ui: createDefaultUISettings(),
      };
    }

    const state: SerializableAppState = JSON.parse(saved);
    const settings = { ...createDefaultSettings(), ...state.settings };

    return {
      chats: new Map(
        (state.chats || []).map(([id, chat]) => [id, deserializeChat(chat, settings)])
      ),
      currentChatId: state.currentChatId,
      settings,
      ui: { ...createDefaultUISettings(), ...state.ui },
    };
  } catch (error) {
    console.error('Failed to load state:', error);
    return {
      chats: new Map(),
      currentChatId: null,
      settings: createDefaultSettings(),
      ui: createDefaultUISettings(),
    };
  }
}

function saveStateToStorage(state: AppStateStore) {
  const stateToSave: SerializableAppState = {
    chats: Array.from(state.chats.entries()).map(([id, chat]) => [id, serializeChat(chat)]),
    currentChatId: state.currentChatId,
    settings: state.settings,
    ui: state.ui,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

export const AppStoreProvider: ParentComponent = (props) => {
  const initialState = loadStateFromStorage();
  const [state, setState] = createStore<AppStateStore>(initialState);

  // Save to localStorage whenever state changes
  createEffect(() => {
    saveStateToStorage(state);
  });

  const setChats = (chats: Map<string, Chat>) => {
    setState('chats', chats);
  };

  const setCurrentChatId = (id: string | null) => {
    setState('currentChatId', id);
  };

  const setSettings = (newSettings: Partial<AppSettings>) => {
    setState('settings', settings => ({ ...settings, ...newSettings }));
  };

  const setUI = (newUI: Partial<UISettings>) => {
    setState('ui', ui => ({ ...ui, ...newUI }));
  };

  const addChat = (chat: Chat) => {
    setState('chats', chats => {
      const newChats = new Map(chats);
      newChats.set(chat.id, chat);
      return newChats;
    });
  };

  const updateChat = (chatId: string, updates: Partial<Chat>) => {
    setState('chats', chats => {
      const newChats = new Map(chats);
      const existingChat = newChats.get(chatId);
      if (existingChat) {
        newChats.set(chatId, { ...existingChat, ...updates });
      }
      return newChats;
    });
  };

  const deleteChat = (chatId: string) => {
    setState('chats', chats => {
      const newChats = new Map(chats);
      newChats.delete(chatId);
      return newChats;
    });
  };

  const getCurrentChat = (): Chat | null => {
    return state.currentChatId ? state.chats.get(state.currentChatId) || null : null;
  };

  const getActiveChats = (): Chat[] => {
    return Array.from(state.chats.values())
      .filter((chat) => !chat.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const getArchivedChats = (): Chat[] => {
    return Array.from(state.chats.values())
      .filter((chat) => chat.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const storeValue: AppStoreContextType = {
    state,
    setChats,
    setCurrentChatId,
    setSettings,
    setUI,
    addChat,
    updateChat,
    deleteChat,
    getCurrentChat,
    getActiveChats,
    getArchivedChats,
  };

  return (
    <AppStoreContext.Provider value={storeValue}>
      {props.children}
    </AppStoreContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within AppStoreProvider');
  }
  return context;
};