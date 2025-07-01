// Core message and chat types - Node pool structure
export interface MessageNode {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isStreaming: boolean
  isEditing: boolean
  parentId: string | null // null for root children
  childIds: string[] // Changed from children array
  model: string
  branchIndex: number // Which branch this node represents among siblings
}

export interface Chat {
  id: string
  title: string
  nodes: Map<string, MessageNode> // Stable node pool
  rootNodeId: string // ID of the root node
  activeBranches: Map<string, number> // parentId -> active child index
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
  archivedSectionCollapsed: boolean
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
  nodes: Array<[string, MessageNode]> // Serialized node pool
  rootNodeId: string
  activeBranches: Array<[string, number]> // Serialized active branches
  createdAt: number
  updatedAt: number
  isGeneratingTitle: boolean
  isArchived: boolean
  model: string
}

// API types
export interface StreamCallbacks {
  onStart?: () => void
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
export type MessageRole = 'user' | 'assistant' | 'system' | 'root'
