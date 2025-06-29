// Core message and chat types
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isStreaming: boolean
  isEditing: boolean
  parentId: string | null
  children: string[]
  branchId: string | null
  model: string
}

export interface MessageBranch {
  content: string
  children: Message[]
  timestamp: number
  model?: string
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
  messageBranches: Map<string, MessageBranch[]>
  currentBranches: Map<string, number>
  createdAt: number
  updatedAt: number
  isGeneratingTitle: boolean
  isArchived: boolean
  model: string
}

// Settings types
export interface ApiSettings {
  baseUrl: string
  key: string
  availableModels: string[]
}

export interface ChatSettings {
  model: string
  temperature: number
  maxTokens: number
  availableModels: string[]
  autoGenerateTitle: boolean
  titleGenerationTrigger: number
  titleModel: string
}

export interface UISettings {
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'auto'
  isGenerating: boolean
  editTextareaSize: {
    width: string
    height: string
  }
}

export interface AppSettings {
  api: ApiSettings
  chat: ChatSettings
  ui: UISettings
}

// State types
export interface AppStateData {
  chats: Map<string, Chat>
  currentChatId: string | null
  settings: AppSettings
  ui: UISettings
}

export interface SerializableAppState {
  chats: Array<[string, SerializableChat]>
  currentChatId: string | null
  settings: AppSettings
  ui: UISettings
}

export interface SerializableChat {
  id: string
  title: string
  messages: Message[]
  messageBranches: Array<[string, MessageBranch[]]>
  currentBranches: Array<[string, number]>
  createdAt: number
  updatedAt: number
  isGeneratingTitle: boolean
  isArchived: boolean
  model: string
}

// API types
export interface StreamCallbacks {
  onToken: (token: string) => void
  onComplete: () => void
  onError: (error: Error) => void
}

export interface ApiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ApiRequestBody {
  messages: ApiMessage[]
  model: string
  stream: boolean
  temperature: number
  max_tokens: number
}

export interface ApiChoice {
  delta?: {
    content?: string
  }
  message?: {
    content: string
  }
}

export interface ApiResponse {
  choices: ApiChoice[]
}

// UI types
export interface BranchInfo {
  total: number
  current: number
  hasPrevious: boolean
  hasNext: boolean
}

export interface ConfirmModalOptions {
  title: string
  message: string
  onConfirm: () => void
}

// Utility types
export type Theme = 'light' | 'dark' | 'auto'
export type MessageRole = 'user' | 'assistant' | 'system'
