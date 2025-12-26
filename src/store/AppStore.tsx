import {
  createContext,
  createEffect,
  useContext,
  ParentComponent,
  createSignal,
  createMemo,
  untrack,
  batch,
} from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type {
  AppSettings,
  Chat,
  MessageNode,
  ApiMessage,
  AppStateStore,
  UISettings,
} from '../types'
import { createApiService } from './api'
import {
  loadStateFromStorage,
  saveStateToStorage,
  exportStateToJson,
  importStateFromJson,
} from '../utils/persistence'
import { generateChatId } from '../utils'
import {
  createEmptyChat,
  createMessageNode,
  addNodeToPool,
  getVisibleNodes,
  getBranchInfo as getBranchInfoFromTree,
  getSwitchBranchTarget,
} from '../utils/messageTree'

// Sentinel value for graceful stream end
export const STREAM_END = 'stream-end'

export const STORE_VERSION = 1

interface AppStoreContextType {
  state: AppStateStore
  // Settings
  setCurrentChatId: (id: string | null) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  replaceState: (newState: AppStateStore) => void
  updateUI: (partialUiSettings: Partial<UISettings>) => void
  // Chat operations
  addChat: (chat: Chat) => void
  updateChat: (chatId: string, updates: Partial<Chat>) => void
  deleteChat: (chatId: string) => void
  createNewChat: () => void
  getCurrentChat: () => Chat | null
  getActiveChats: () => Chat[]
  getArchivedChats: () => Chat[]
  ensureCurrentChat: () => string
  // Message operations
  addMessage: (chatId: string, message: MessageNode, parentId: string | null) => void
  updateMessage: (chatId: string, messageId: string, updates: Partial<MessageNode>) => void
  createMessageBranch: (
    chatId: string,
    parentId: string | null,
    content: string,
    role: 'user' | 'assistant' | 'system',
    model: string,
  ) => string
  switchMessageBranch: (chatId: string, messageId: string, branchIndex: number) => void
  getVisibleMessages: (chatId: string) => MessageNode[]
  getBranchInfo: (chatId: string, messageId: string) => { total: number; current: number } | null
  setFlashingMessage: (messageId: string | null) => void
  // Streaming operations
  startStreaming: (messageId: string) => void
  updateStreamingContent: (content: string) => void
  appendStreamingContent: (content: string) => void
  stopStreaming: () => void
  cancelStreaming: () => void
  getStreamingContent: () => string
  // High-level operations
  sendMessage: (content: string) => Promise<void>
  generateAssistantResponse: () => Promise<void>
  regenerateMessage: (chatId: string, messageId: string) => Promise<void>
  generateChatTitle: (chatId: string) => Promise<void>
}

const AppStoreContext = createContext<AppStoreContextType>()

// Re-export persistence functions for external use
export { exportStateToJson, importStateFromJson }

export const AppStoreProvider: ParentComponent = (props) => {
  const initialState = loadStateFromStorage()
  const [state, setState] = createStore<AppStateStore>(initialState)

  // Reactive API service - automatically recreates when providers change
  const apiService = createMemo(() => createApiService(state.settings.api.providers))

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

  // Abort controller for streaming - resets when streaming stops
  const newAbort = () => new AbortController()
  const [abortController, setAbortController] = createSignal(newAbort())
  createEffect(() => {
    if (!state.streaming.isStreaming) {
      untrack(abortController).abort(STREAM_END)
      setAbortController(newAbort())
    }
  })

  const setCurrentChatId = (id: string | null) => {
    setState('currentChatId', id)
  }

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setState('settings', newSettings)
  }

  const updateUI: AppStoreContextType['updateUI'] = (partialUISettings) => {
    setState('settings', 'ui', partialUISettings)
  }

  const replaceState = (newState: AppStateStore) => {
    setState(newState)
  }

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
    setState('streaming', 'currentContent', (prev: string) => prev + content)
  }

  const cancelStreaming = () => setState('streaming', { isStreaming: false })

  const stopStreaming = () => {
    setState('streaming', {
      isStreaming: false,
      currentMessageId: null,
      currentContent: '',
    })
  }

  const getStreamingContent = (): string => state.streaming.currentContent

  const addChat = (chat: Chat) => {
    setState('chats', chat.id, chat)
  }

  const updateChat = (chatId: string, updates: Partial<Chat>) => {
    setState('chats', chatId, updates)
  }

  const deleteChat = (chatId: string) => {
    setState(
      'chats',
      produce((chats) => {
        delete chats[chatId]
      }),
    )
  }

  const getCurrentChat = (): Chat | null => {
    return state.currentChatId ? (state.chats[state.currentChatId] ?? null) : null
  }

  const getActiveChats = (): Chat[] => {
    return Object.values(state.chats)
      .filter((chat) => !chat.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  const getArchivedChats = (): Chat[] => {
    return Object.values(state.chats)
      .filter((chat) => chat.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  const createNewChatInternal = (): string => {
    const chatId = generateChatId()
    const newChat = createEmptyChat(chatId, 'New chat', state.settings.chat.model, null)
    batch(() => {
      addChat(newChat)
      setCurrentChatId(chatId)
    })
    return chatId
  }

  const createNewChat = () => setCurrentChatId(null)

  const ensureCurrentChat = (): string => {
    const chat = getCurrentChat()
    if (chat) return chat.id
    return createNewChatInternal()
  }

  const addMessage = (chatId: string, message: MessageNode, parentId: string | null) => {
    setState(
      'chats',
      chatId,
      produce((chat) => {
        addNodeToPool(chat, message, parentId)
        chat.updatedAt = Date.now()
      }),
    )
  }

  const updateMessage = (chatId: string, messageId: string, updates: Partial<MessageNode>) => {
    batch(() => {
      setState('chats', chatId, 'nodes', messageId, updates)
      setState('chats', chatId, 'updatedAt', Date.now())
    })
  }

  const createMessageBranch = (
    chatId: string,
    parentId: string | null,
    content: string,
    role: 'user' | 'assistant' | 'system',
    model: string,
  ): string => {
    const chat = state.chats[chatId]
    if (!chat) throw new Error('createMessageBranch: chat not found')

    let branchIndex = 0
    if (parentId === null) {
      branchIndex = Object.values(chat.nodes).filter((node) => node.parentId === null).length
    } else {
      const parent = chat.nodes[parentId]
      branchIndex = parent?.childIds.length || 0
    }

    const newMessage = createMessageNode(role, content, model, parentId, branchIndex)

    setState(
      'chats',
      chatId,
      produce((chat) => {
        addNodeToPool(chat, newMessage, parentId)
        chat.updatedAt = Date.now()
      }),
    )

    return newMessage.id
  }

  const getVisibleMessages = (chatId: string): MessageNode[] => {
    const chat = state.chats[chatId]
    return chat ? getVisibleNodes(chat) : []
  }

  const getBranchInfo = (
    chatId: string,
    messageId: string,
  ): { total: number; current: number } | null => {
    const chat = state.chats[chatId]
    return chat ? getBranchInfoFromTree(chat.nodes, messageId) : null
  }

  const setFlashingMessage = (messageId: string | null) => {
    setState('flashingMessageId', messageId)
  }

  const switchMessageBranch = (chatId: string, messageId: string, branchIndex: number): void => {
    const chat = state.chats[chatId]
    if (!chat) return

    const message = chat.nodes[messageId]
    if (!message) return

    const targetMessageId = getSwitchBranchTarget(chat, message, branchIndex)
    if (!targetMessageId) return

    setState('chats', chatId, 'activeBranches', message.parentId ?? chat.rootNodeId, branchIndex)

    // Flash the target message
    if (targetMessageId) {
      setFlashingMessage(targetMessageId)
      setTimeout(() => setFlashingMessage(null), 1000)
    }
  }

  const convertToApiMessages = (
    messages: MessageNode[],
    chatSystemPromptId: string | null,
  ): ApiMessage[] => {
    const apiMessages: ApiMessage[] = []

    // Determine which system prompt to use: chat-specific or default
    const systemPromptId = chatSystemPromptId || state.settings.chat.defaultSystemPromptId

    // Add system prompt if specified and exists
    if (systemPromptId) {
      const systemPrompt = state.settings.systemPrompts[systemPromptId]
      if (systemPrompt) {
        apiMessages.push({
          role: 'system',
          content: systemPrompt.content,
        })
      }
    }

    // Add conversation messages
    return apiMessages.concat(messages.map((msg) => ({ role: msg.role, content: msg.content })))
  }

  const endStream = (chatId: string, messageId: string) => {
    const finalContent = getStreamingContent()
    stopStreaming()
    updateMessage(chatId, messageId, {
      content: finalContent,
      timestamp: Date.now(),
    })
  }

  const handleStreamError = (chatId: string, messageId: string, error: unknown) => {
    if (error instanceof Error && error.message === STREAM_END) {
      endStream(chatId, messageId)
      return
    }
    console.error('Streaming error:', error)
    updateMessage(chatId, messageId, {
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: Date.now(),
    })
    stopStreaming()
  }

  const sendMessage = async (content: string) => {
    let currentChat = getCurrentChat()
    if (!currentChat) {
      createNewChatInternal()
      currentChat = getCurrentChat()
      if (!currentChat) return
    }

    const visibleMessages = getVisibleMessages(currentChat.id)
    const lastMessage = visibleMessages.at(-1)
    const parentId = lastMessage?.id || null

    // Add user message
    const userMessage = createMessageNode('user', content.trim(), 'user', parentId)
    addMessage(currentChat.id, userMessage, parentId)
    visibleMessages.push(userMessage)

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
      const apiMessages = convertToApiMessages(visibleMessages, currentChat.systemPromptId)

      await apiService().streamResponse(
        apiMessages,
        assistantMessage.model || state.settings.chat.model,
        {
          onToken: (token: string) => appendStreamingContent(token),
          onComplete: () => endStream(currentChat!.id, assistantMessage.id),
          onError: (error: Error) => handleStreamError(currentChat!.id, assistantMessage.id, error),
        },
        state.settings.chat.temperature,
        state.settings.chat.maxTokens,
        abortController().signal,
      )
    } catch (error) {
      handleStreamError(currentChat.id, assistantMessage.id, error)
    }

    // Auto-generate title if this is the first exchange
    const messageCount = getVisibleMessages(currentChat.id).length
    if (
      messageCount === state.settings.chat.titleGenerationTrigger &&
      state.settings.chat.autoGenerateTitle
    ) {
      generateChatTitle(currentChat.id)
    }
  }

  const generateAssistantResponse = async () => {
    const currentChat = getCurrentChat()
    if (!currentChat) return

    const visibleMessages = getVisibleMessages(currentChat.id)
    const lastMessage = visibleMessages.at(-1)

    // Only generate if the last message is from the user
    if (!lastMessage || lastMessage.role !== 'user') return

    // Create assistant message placeholder
    const assistantMessage = createMessageNode(
      'assistant',
      '',
      currentChat.model || state.settings.chat.model,
      lastMessage.id,
    )

    addMessage(currentChat.id, assistantMessage, lastMessage.id)
    startStreaming(assistantMessage.id)

    try {
      const apiMessages = convertToApiMessages(visibleMessages, currentChat.systemPromptId)

      await apiService().streamResponse(
        apiMessages,
        assistantMessage.model || state.settings.chat.model,
        {
          onToken: (token: string) => appendStreamingContent(token),
          onComplete: () => endStream(currentChat.id, assistantMessage.id),
          onError: (error: Error) => handleStreamError(currentChat.id, assistantMessage.id, error),
        },
        state.settings.chat.temperature,
        state.settings.chat.maxTokens,
        abortController().signal,
      )
    } catch (error) {
      handleStreamError(currentChat.id, assistantMessage.id, error)
    }
  }

  const regenerateMessage = async (chatId: string, messageId: string) => {
    const chat = state.chats[chatId]
    if (!chat) return

    const message = chat.nodes[messageId]
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
        chat.model || state.settings.chat.model,
        message.parentId,
      )

      // Add the new branch as a sibling
      if (message.parentId) {
        addMessage(chatId, newBranchMessage, message.parentId)
      }

      startStreaming(newBranchMessage.id)

      const apiMessages = convertToApiMessages(conversationHistory, chat.systemPromptId)

      await apiService().streamResponse(
        apiMessages,
        newBranchMessage.model || state.settings.chat.model,
        {
          onToken: (token: string) => appendStreamingContent(token),
          onComplete: () => endStream(chatId, newBranchMessage.id),
          onError: (error: Error) => handleStreamError(chatId, newBranchMessage.id, error),
        },
        state.settings.chat.temperature,
        state.settings.chat.maxTokens,
        abortController().signal,
        true, // Enable entropy to prevent API caching
      )
    } catch (error) {
      console.error('Failed to regenerate message:', error)
      stopStreaming()
    }
  }

  const generateChatTitle = async (chatId: string) => {
    const chat = state.chats[chatId]
    if (!chat) return

    const visibleMessages = getVisibleMessages(chatId)
    if (visibleMessages.length < 2 || chat.isGeneratingTitle) return

    try {
      updateChat(chatId, { isGeneratingTitle: true })

      const title = await apiService().generateTitle(
        visibleMessages,
        state.settings.chat.titleModel,
      )

      if (title) {
        updateChat(chatId, {
          title,
          isGeneratingTitle: false,
        })
      } else {
        updateChat(chatId, { isGeneratingTitle: false })
      }
    } catch (error) {
      console.error('Title generation failed:', error)
      updateChat(chatId, { isGeneratingTitle: false })
    }
  }

  const storeValue: AppStoreContextType = {
    state,
    addChat,
    setCurrentChatId,
    updateSettings,
    updateUI,
    replaceState,
    updateChat,
    deleteChat,
    createNewChat,
    getCurrentChat,
    getActiveChats,
    getArchivedChats,
    ensureCurrentChat,
    addMessage,
    updateMessage,
    createMessageBranch,
    switchMessageBranch,
    getVisibleMessages,
    getBranchInfo,
    setFlashingMessage,
    startStreaming,
    updateStreamingContent,
    appendStreamingContent,
    stopStreaming,
    cancelStreaming,
    getStreamingContent,
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
