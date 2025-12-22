import {
  createContext,
  createEffect,
  useContext,
  ParentComponent,
  createSignal,
  createMemo,
  untrack,
} from 'solid-js'
import { createStore } from 'solid-js/store'
import type { AppSettings, Chat, UISettings, MessageNode, ApiMessage } from '../types'
import { createApiService } from './api'
import {
  type AppStateStore,
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
  updateNodeInPool,
  getVisibleMessages as getVisibleMessagesFromTree,
  findNodeById,
  switchToBranch,
  getBranchInfo as getBranchInfoFromTree,
  getRootChildren,
} from '../utils/messageTree'

// Sentinel value for graceful stream end
export const STREAM_END = 'stream-end'

interface AppStoreContextType {
  state: AppStateStore
  // Settings
  setCurrentChatId: (id: string | null) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  setUI: (ui: Partial<UISettings>) => void
  replaceState: (newState: AppStateStore) => void
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
  switchMessageBranchWithFlash: (chatId: string, messageId: string, branchIndex: number) => void
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

  // ===== SETTINGS OPERATIONS =====

  const setCurrentChatId = (id: string | null) => {
    setState('currentChatId', id)
  }

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setState('settings', newSettings)
  }

  const setUI = (newUI: Partial<UISettings>) => {
    setState('ui', (ui) => ({ ...ui, ...newUI }))
  }

  const replaceState = (newState: AppStateStore) => {
    setState(newState)
  }

  // ===== STREAMING OPERATIONS =====

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

  // ===== CHAT OPERATIONS =====

  const addChat = (chat: Chat) => {
    setState('chats', (chats: Map<string, Chat>) => {
      const newChats = new Map(chats)
      newChats.set(chat.id, chat)
      return newChats
    })
  }

  const updateChat = (chatId: string, updates: Partial<Chat>) => {
    setState('chats', (chats: Map<string, Chat>) => {
      const newChats = new Map(chats)
      const existingChat = newChats.get(chatId)
      if (existingChat) {
        newChats.set(chatId, { ...existingChat, ...updates })
      }
      return newChats
    })
  }

  const deleteChat = (chatId: string) => {
    setState('chats', (chats: Map<string, Chat>) => {
      const newChats = new Map(chats)
      newChats.delete(chatId)
      return newChats
    })
  }

  const getCurrentChat = (): Chat | null => {
    return state.currentChatId ? (state.chats.get(state.currentChatId) ?? null) : null
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

  const createNewChatInternal = (): string => {
    const chatId = generateChatId()
    const newChat = createEmptyChat(chatId, 'New Chat', state.settings.chat.model, null)
    addChat(newChat)
    setCurrentChatId(chatId)
    return chatId
  }

  const createNewChat = () => setCurrentChatId(null)

  const ensureCurrentChat = (): string => {
    const chat = getCurrentChat()
    if (chat) return chat.id
    return createNewChatInternal()
  }

  // ===== MESSAGE OPERATIONS =====

  const addMessage = (chatId: string, message: MessageNode, parentId: string | null) => {
    setState('chats', (chats: Map<string, Chat>) => {
      const newChats = new Map(chats)
      const chat = newChats.get(chatId)
      if (chat) {
        const { nodes: newNodes, activeBranches: newBranches } = addNodeToPool(
          chat.nodes,
          chat.activeBranches,
          chat.rootNodeId,
          message,
          parentId,
        )

        newChats.set(chatId, {
          ...chat,
          nodes: newNodes,
          activeBranches: newBranches,
          updatedAt: Date.now(),
        })
      }
      return newChats
    })
  }

  const updateMessage = (chatId: string, messageId: string, updates: Partial<MessageNode>) => {
    setState('chats', (chats: Map<string, Chat>) => {
      const newChats = new Map(chats)
      const chat = newChats.get(chatId)
      if (chat) {
        const node = findNodeById(chat.nodes, messageId)
        if (node) {
          const newNodes = updateNodeInPool(chat.nodes, messageId, updates)
          newChats.set(chatId, {
            ...chat,
            nodes: newNodes,
            updatedAt: Date.now(),
          })
          return newChats
        }
      }
      return chats
    })
  }

  const createMessageBranch = (
    chatId: string,
    parentId: string | null,
    content: string,
    role: 'user' | 'assistant' | 'system',
    model: string,
  ): string => {
    const chat = state.chats.get(chatId)
    if (!chat) throw new Error('createMessageBranch: chat not found')

    let branchIndex = 0
    if (parentId === null) {
      branchIndex = Array.from(chat.nodes.values()).filter((node) => node.parentId === null).length
    } else {
      const parent = chat.nodes.get(parentId)
      branchIndex = parent?.childIds.length || 0
    }

    const newMessage = createMessageNode(role, content, model, parentId, branchIndex)

    setState('chats', (chats: Map<string, Chat>) => {
      const newChats = new Map(chats)
      const { nodes: newNodes, activeBranches: newBranches } = addNodeToPool(
        chat.nodes,
        chat.activeBranches,
        chat.rootNodeId,
        newMessage,
        parentId,
      )
      newChats.set(chatId, {
        ...chat,
        nodes: newNodes,
        activeBranches: newBranches,
        updatedAt: Date.now(),
      })
      return newChats
    })

    return newMessage.id
  }

  const switchMessageBranch = (chatId: string, messageId: string, branchIndex: number) => {
    setState('chats', (chats: Map<string, Chat>) => {
      const newChats = new Map(chats)
      const chat = newChats.get(chatId)
      if (chat) {
        const newBranches = switchToBranch(
          chat.activeBranches,
          chat.nodes,
          chat.rootNodeId,
          messageId,
          branchIndex,
        )
        newChats.set(chatId, {
          ...chat,
          activeBranches: newBranches,
        })
        return newChats
      }
      return chats
    })
  }

  const getVisibleMessages = (chatId: string): MessageNode[] => {
    const chat = state.chats.get(chatId)
    if (!chat) return []
    return getVisibleMessagesFromTree(chat.nodes, chat.rootNodeId, chat.activeBranches)
  }

  const getBranchInfo = (
    chatId: string,
    messageId: string,
  ): { total: number; current: number } | null => {
    const chat = state.chats.get(chatId)
    if (!chat) return null
    return getBranchInfoFromTree(chat.nodes, chat.rootNodeId, messageId)
  }

  const setFlashingMessage = (messageId: string | null) => {
    setState('flashingMessageId', messageId)
  }

  const switchMessageBranchWithFlash = (
    chatId: string,
    messageId: string,
    branchIndex: number,
  ): void => {
    const chat = state.chats.get(chatId)
    if (!chat) return

    const targetNode = chat.nodes.get(messageId)
    if (!targetNode) return

    let siblings: string[]
    if (targetNode.parentId === null) {
      siblings = getRootChildren(chat.nodes).map((n: MessageNode) => n.id)
    } else {
      const parent = chat.nodes.get(targetNode.parentId)
      siblings = parent?.childIds || []
    }

    const targetMessageId = siblings[branchIndex]

    switchMessageBranch(chatId, messageId, branchIndex)

    // Flash the target message
    if (targetMessageId) {
      setFlashingMessage(targetMessageId)
      setTimeout(() => setFlashingMessage(null), 1000)
    }
  }

  // ===== HELPERS =====

  const convertToApiMessages = (
    messages: MessageNode[],
    chatSystemPromptId: string | null,
  ): ApiMessage[] => {
    const apiMessages: ApiMessage[] = []

    // Determine which system prompt to use: chat-specific or default
    const systemPromptId = chatSystemPromptId || state.settings.chat.defaultSystemPromptId

    // Add system prompt if specified and exists
    if (systemPromptId) {
      const systemPrompt = state.settings.systemPrompts.get(systemPromptId)
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

  // ===== HIGH-LEVEL OPERATIONS =====

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
    const chat = state.chats.get(chatId)
    if (!chat) return

    const message = findNodeById(chat.nodes, messageId)
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
    const chat = state.chats.get(chatId)
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

  // ===== CONTEXT VALUE =====

  const storeValue: AppStoreContextType = {
    state,
    // Settings
    setCurrentChatId,
    updateSettings,
    setUI,
    replaceState,
    // Chat operations
    addChat,
    updateChat,
    deleteChat,
    createNewChat,
    getCurrentChat,
    getActiveChats,
    getArchivedChats,
    ensureCurrentChat,
    // Message operations
    addMessage,
    updateMessage,
    createMessageBranch,
    switchMessageBranch,
    switchMessageBranchWithFlash,
    getVisibleMessages,
    getBranchInfo,
    setFlashingMessage,
    // Streaming operations
    startStreaming,
    updateStreamingContent,
    appendStreamingContent,
    stopStreaming,
    cancelStreaming,
    getStreamingContent,
    // High-level operations
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
