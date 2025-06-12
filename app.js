// Global state management
class AppState {
  constructor() {
    this.chats = new Map()
    this.currentChatId = null
    this.settings = {
      autoGenerateTitle: true,
      titleGenerationTrigger: 1,
      titleModel: 'gpt-3.5-turbo',
      api: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        availableModels: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet'],
      },
      chat: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2048,
      },
      theme: 'light',
    }
    this.ui = {
      sidebarCollapsed: false,
      isGenerating: false,
    }
  }

  save() {
    const stateToSave = {
      chats: Array.from(this.chats.entries()).map(([id, chat]) => [
        id,
        {
          ...chat,
          messageBranches: Array.from(chat.messageBranches?.entries() || []),
          currentBranches: Array.from(chat.currentBranches?.entries() || []),
        },
      ]),
      currentChatId: this.currentChatId,
      settings: this.settings,
      ui: this.ui,
    }
    localStorage.setItem('llm-chat-state', JSON.stringify(stateToSave))
  }

  load() {
    try {
      const saved = localStorage.getItem('llm-chat-state')
      if (saved) {
        const state = JSON.parse(saved)
        this.chats = new Map(
          (state.chats || []).map(([id, chat]) => [
            id,
            {
              ...chat,
              messageBranches: new Map(chat.messageBranches || []),
              currentBranches: new Map(chat.currentBranches || []),
              // Migration: Add model property to existing chats
              model: chat.model || this.settings.chat.model,
              modelHistory: chat.modelHistory || [{ model: chat.model || this.settings.chat.model, timestamp: chat.createdAt || Date.now() }],
              // Migration: Add model property to existing messages
              messages: (chat.messages || []).map(msg => ({
                ...msg,
                model: msg.model || (msg.role === 'assistant' ? this.settings.chat.model : undefined)
              }))
            },
          ]),
        )
        this.currentChatId = state.currentChatId
        this.settings = { ...this.settings, ...state.settings }
        this.ui = { ...this.ui, ...state.ui }
      }
    } catch (error) {
      console.error('Failed to load state:', error)
    }
  }
}

// API Service
class APIService {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  async streamResponse(messages, model, onToken, onComplete, onError, entropy) {
    try {
      const response = await fetch(
        this.baseUrl + (entropy ? '?rand=' + Date.now() + Math.random().toString(32).slice(2) : ''),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            messages: messages,
            model: model,
            stream: true,
            temperature: appState.settings.chat.temperature,
            max_tokens: appState.settings.chat.maxTokens,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const prefix = 'data: '
          if (line.startsWith(prefix)) {
            const data = line.slice(prefix.length).trim()
            if (data === '[DONE]') {
              onComplete()
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.choices?.[0]?.delta?.content) {
                onToken(parsed.choices[0].delta.content)
              }
            } catch (e) {
              // Ignore parse errors for malformed chunks
            }
          }
        }
      }

      onComplete()
    } catch (error) {
      onError(error)
    }
  }

  async generateTitle(messages) {
    const titlePrompt = [
      {
        role: 'user',
        content: `Generate a concise title (4-6 words) for this conversation:\n\n${messages
          .slice(0, 4)
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n')}`,
      },
    ]

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages: titlePrompt,
          model: appState.settings.titleModel,
          max_tokens: 20,
          temperature: 0.3,
        }),
      })

      if (!response.ok) {
        throw new Error('Title generation failed')
      }

      const data = await response.json()
      return data.choices[0].message.content.trim().replace(/['"]/g, '')
    } catch (error) {
      console.error('Title generation failed:', error)
      return null
    }
  }
}

// Utility functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// Chat management
function createNewChat() {
  const chatId = generateId()
  const chat = {
    id: chatId,
    title: 'New Chat',
    messages: [],
    messageBranches: new Map(), // messageId -> array of branch objects {content, children: []}
    currentBranches: new Map(), // messageId -> current branch index
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isGeneratingTitle: false,
    isArchived: false,
    model: appState.settings.chat.model, // Current model for this chat
    modelHistory: [{ model: appState.settings.chat.model, timestamp: Date.now() }], // Track model changes
  }

  appState.chats.set(chatId, chat)
  appState.currentChatId = chatId
  appState.save()

  updateUI()
  return chatId
}

function switchToChat(chatId) {
  if (appState.chats.has(chatId)) {
    appState.currentChatId = chatId
    appState.save()
    updateUI()
  }
}

function deleteChat(chatId) {
  showConfirmModal(
    'Delete Chat',
    'Are you sure you want to delete this chat? This action cannot be undone.',
    () => {
      appState.chats.delete(chatId)
      if (appState.currentChatId === chatId) {
        const remainingChats = Array.from(appState.chats.values()).filter(
          (chat) => !chat.isArchived,
        )
        appState.currentChatId = remainingChats.length > 0 ? remainingChats[0].id : null
      }
      appState.save()
      updateUI()
    },
  )
}

function archiveChat(chatId) {
  const chat = appState.chats.get(chatId)
  if (!chat) return

  chat.isArchived = true
  chat.updatedAt = Date.now()

  // If this was the current chat, switch to another active chat
  if (appState.currentChatId === chatId) {
    const activeChats = Array.from(appState.chats.values())
      .filter((c) => !c.isArchived && c.id !== chatId)
      .sort((a, b) => b.updatedAt - a.updatedAt)

    appState.currentChatId = activeChats.length > 0 ? activeChats[0].id : null
  }

  appState.save()
  updateUI()
}

function restoreChat(chatId) {
  const chat = appState.chats.get(chatId)
  if (!chat) return

  chat.isArchived = false
  chat.updatedAt = Date.now()
  appState.save()
  updateUI()
}

function getCurrentChat() {
  return appState.currentChatId ? appState.chats.get(appState.currentChatId) : null
}

function getEffectiveModel(chatId = null) {
  const targetChatId = chatId || appState.currentChatId
  const chat = targetChatId ? appState.chats.get(targetChatId) : null
  return chat?.model || appState.settings.chat.model
}

function updateChatModel(chatId, newModel) {
  const chat = appState.chats.get(chatId)
  if (!chat || chat.model === newModel) return

  chat.model = newModel
  chat.modelHistory.push({ model: newModel, timestamp: Date.now() })
  chat.updatedAt = Date.now()
  appState.save()
}

// Message editing functions
function editMessage(messageId) {
  const chat = getCurrentChat()
  if (!chat) return

  const message = chat.messages.find((m) => m.id === messageId)
  if (!message) return

  message.isEditing = true
  appState.save()
  updateChatDisplay()

  // Focus the textarea
  setTimeout(() => {
    const textarea = document.querySelector(
      `[data-message-id="${messageId}"] .message-edit-textarea`,
    )
    if (textarea) {
      textarea.focus()
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    }
  }, 10)
}

function saveMessageEdit(messageId) {
  const chat = getCurrentChat()
  if (!chat) return

  const message = chat.messages.find((m) => m.id === messageId)
  if (!message) return

  const textarea = document.querySelector(`[data-message-id="${messageId}"] .message-edit-textarea`)
  if (!textarea) return

  const newContent = textarea.value.trim()
  if (!newContent) {
    alert('Message cannot be empty')
    return
  }

  message.content = newContent
  message.isEditing = false
  chat.updatedAt = Date.now()
  appState.save()
  updateChatDisplay()
}

function cancelMessageEdit(messageId) {
  const chat = getCurrentChat()
  if (!chat) return

  const message = chat.messages.find((m) => m.id === messageId)
  if (!message) return

  message.isEditing = false
  appState.save()
  updateChatDisplay()
}

function regenerateMessage(messageId) {
  const chat = getCurrentChat()
  if (!chat || appState.ui.isGenerating) return

  const messageIndex = chat.messages.findIndex((m) => m.id === messageId)
  if (messageIndex === -1) return

  const originalMessage = chat.messages[messageIndex]

  // Initialize branches for this message if they don't exist
  if (!chat.messageBranches.has(messageId)) {
    // Preserve existing children (messages after this one)
    const childrenAfterBranch = chat.messages.slice(messageIndex + 1).map((msg) => ({
      ...msg,
      id: generateId(), // Give each child a new ID for the branch
    }))

    chat.messageBranches.set(messageId, [
      {
        content: originalMessage.content,
        children: childrenAfterBranch,
      },
    ])
    chat.currentBranches.set(messageId, 0)
  }

  // Preserve the current conversation path as a new branch before regenerating
  const currentBranches = chat.messageBranches.get(messageId)
  const currentBranchIndex = chat.currentBranches.get(messageId) || 0
  const currentBranch = currentBranches[currentBranchIndex]

  // If there are messages after this one, preserve them in the current branch
  if (chat.messages.length > messageIndex + 1) {
    const existingChildren = chat.messages.slice(messageIndex + 1).map((msg) => ({ ...msg }))
    currentBranch.children = existingChildren
  }

  // Create new assistant message for the new branch
  const currentModel = getEffectiveModel()
  const assistantMessage = {
    id: generateId(),
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    isStreaming: true,
    isEditing: false,
    parentId: null,
    children: [],
    branchId: null,
    model: currentModel, // Track generating model
  }

  // Temporarily add to display
  chat.messages = chat.messages.slice(0, messageIndex + 1)
  chat.messages.push(assistantMessage)
  chat.updatedAt = Date.now()
  appState.ui.isGenerating = true
  appState.save()
  updateUI()

  // Send to API
  const apiService = new APIService(appState.settings.api.baseUrl, appState.settings.api.apiKey)
  const messages = chat.messages
    .slice(0, messageIndex)
    .map((m) => ({ role: m.role, content: getCurrentMessageContent(m) }))

  apiService.streamResponse(
    messages,
    currentModel,
    (token) => {
      assistantMessage.content += token
      updateChatDisplay()
    },
    () => {
      assistantMessage.isStreaming = false

      // Add the new response as a branch with no children initially
      const branches = chat.messageBranches.get(messageId) || []
      branches.push({
        content: assistantMessage.content,
        children: [],
      })
      chat.messageBranches.set(messageId, branches)
      chat.currentBranches.set(messageId, branches.length - 1)

      // Update the original message and rebuild conversation path
      originalMessage.content = assistantMessage.content
      rebuildConversationFromBranches(messageId)

      chat.updatedAt = Date.now()
      appState.ui.isGenerating = false
      appState.save()
      updateUI()
    },
    (error) => {
      assistantMessage.content = `Error: ${error.message}`
      assistantMessage.isStreaming = false
      appState.ui.isGenerating = false
      appState.save()
      updateUI()
    },
    true,
  )
}

// Branch management functions
function getCurrentMessageContent(message) {
  const chat = getCurrentChat()
  if (!chat || !chat.messageBranches.has(message.id)) {
    return message.content
  }

  const branches = chat.messageBranches.get(message.id)
  const currentBranchIndex = chat.currentBranches.get(message.id) || 0
  const currentBranch = branches[currentBranchIndex]
  return currentBranch ? currentBranch.content : message.content
}

function switchToBranch(messageId, branchIndex) {
  const chat = getCurrentChat()
  if (!chat || !chat.messageBranches.has(messageId)) return

  const branches = chat.messageBranches.get(messageId)
  if (branchIndex < 0 || branchIndex >= branches.length) return

  // BUGFIX: Preserve current children before switching branches
  const messageIndex = chat.messages.findIndex((m) => m.id === messageId)
  if (messageIndex !== -1 && chat.messages.length > messageIndex + 1) {
    const currentBranchIndex = chat.currentBranches.get(messageId) || 0
    const currentBranch = branches[currentBranchIndex]
    if (currentBranch) {
      // Save any new messages that were added since this branch was created
      const existingChildren = chat.messages.slice(messageIndex + 1).map((msg) => ({ ...msg }))
      currentBranch.children = existingChildren
    }
  }

  chat.currentBranches.set(messageId, branchIndex)

  // Update the message content and rebuild conversation
  const message = chat.messages.find((m) => m.id === messageId)
  if (message) {
    message.content = branches[branchIndex].content
  }

  // Rebuild the entire conversation path from this branch point
  rebuildConversationFromBranches(messageId)

  chat.updatedAt = Date.now()
  appState.save()
  updateUI()
}

function rebuildConversationFromBranches(messageId) {
  const chat = getCurrentChat()
  if (!chat) return

  const messageIndex = chat.messages.findIndex((m) => m.id === messageId)
  if (messageIndex === -1) return

  // Clear messages after this point
  chat.messages = chat.messages.slice(0, messageIndex + 1)

  // Add children from the current branch
  const branches = chat.messageBranches.get(messageId)
  const currentBranchIndex = chat.currentBranches.get(messageId) || 0
  const currentBranch = branches[currentBranchIndex]

  if (currentBranch && currentBranch.children) {
    // Add children messages and recursively build their branches
    currentBranch.children.forEach((childMessage) => {
      chat.messages.push({ ...childMessage })

      // If this child has branches, apply the current branch selection
      if (chat.messageBranches.has(childMessage.id)) {
        rebuildConversationFromBranches(childMessage.id)
      }
    })
  }
}

function getMessageBranchInfo(messageId) {
  const chat = getCurrentChat()
  if (!chat || !chat.messageBranches.has(messageId)) {
    return null
  }

  const branches = chat.messageBranches.get(messageId)
  const currentIndex = chat.currentBranches.get(messageId) || 0

  return {
    total: branches.length,
    current: currentIndex + 1,
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < branches.length - 1,
  }
}

// Message handling
async function sendMessage() {
  const input = document.getElementById('messageInput')
  const content = input.value.trim()

  if (!content || appState.ui.isGenerating) return

  // Validate API settings
  if (!appState.settings.api.apiKey || !appState.settings.api.baseUrl) {
    alert('Please configure your API settings first.')
    showSettingsModal()
    return
  }

  // Create chat if none exists or current chat is archived
  let chat = getCurrentChat()
  if (!chat || chat.isArchived) {
    createNewChat()
    chat = getCurrentChat()
  }

  // Add user message
  const userMessage = {
    id: generateId(),
    role: 'user',
    content: content,
    timestamp: Date.now(),
    isStreaming: false,
    isEditing: false,
    parentId: null,
    children: [],
    branchId: null,
  }

  chat.messages.push(userMessage)
  chat.updatedAt = Date.now()

  // Clear input and update UI
  input.value = ''
  appState.ui.isGenerating = true
  appState.save()
  updateUI()

  // Add assistant message placeholder
  const currentModel = getEffectiveModel()
  const assistantMessage = {
    id: generateId(),
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    isStreaming: true,
    isEditing: false,
    parentId: null,
    children: [],
    branchId: null,
    model: currentModel, // Track generating model
  }

  chat.messages.push(assistantMessage)
  updateUI()

  // Send to API
  const apiService = new APIService(appState.settings.api.baseUrl, appState.settings.api.apiKey)
  const messages = chat.messages
    .filter((m) => !m.isStreaming || m.content)
    .map((m) => ({ role: m.role, content: m.content }))

  await apiService.streamResponse(
    messages,
    currentModel,
    (token) => {
      // On token received
      assistantMessage.content += token
      updateChatDisplay()
    },
    async () => {
      // On completion
      assistantMessage.isStreaming = false
      chat.updatedAt = Date.now()
      appState.ui.isGenerating = false
      appState.save()
      updateUI()

      // Generate title if needed (after enough total messages)
      if (
        appState.settings.autoGenerateTitle &&
        chat.messages.length >= appState.settings.titleGenerationTrigger &&
        chat.title === 'New Chat' &&
        !chat.isGeneratingTitle
      ) {
        chat.isGeneratingTitle = true
        try {
          const title = await apiService.generateTitle(chat.messages)
          if (title) {
            chat.title = title
            appState.save()
            updateUI()
          }
        } catch (error) {
          console.error('Title generation failed:', error)
        } finally {
          chat.isGeneratingTitle = false
        }
      }
    },
    (error) => {
      // On error
      assistantMessage.content = `Error: ${error.message}`
      assistantMessage.isStreaming = false
      appState.ui.isGenerating = false
      appState.save()
      updateUI()
    },
  )
}

// UI Update functions
function updateUI() {
  updateChatList()
  updateChatDisplay()
  updateHeader()
  updateInputState()
}

function updateChatList() {
  const chatList = document.getElementById('chatList')
  chatList.innerHTML = ''

  const activeChats = Array.from(appState.chats.values())
    .filter((chat) => !chat.isArchived)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const archivedChats = Array.from(appState.chats.values())
    .filter((chat) => chat.isArchived)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  // Active chats section
  if (activeChats.length > 0) {
    const activeSection = document.createElement('div')
    activeSection.className = 'chat-section active-section'
    activeSection.innerHTML = `
            <div class="chat-section-header">
              <div class="section-title">
                <span>Recent Chats</span>
              </div>
            </div>
            <div class="chat-section-content" id="activeChats"></div>
          `
    chatList.appendChild(activeSection)

    const activeChatContainer = activeSection.querySelector('#activeChats')
    activeChats.forEach((chat) => {
      const chatItem = createChatItem(chat, false)
      activeChatContainer.appendChild(chatItem)
    })
  }

  // Archive section
  if (archivedChats.length > 0) {
    const savedState = localStorage.getItem('archiveSectionCollapsed')
    const isCollapsed = savedState !== 'false' // Default to collapsed
    
    const archiveSection = document.createElement('div')
    archiveSection.className = `chat-section archive-section ${isCollapsed ? 'collapsed' : ''}`
    archiveSection.innerHTML = `
            <div class="chat-section-header" onclick="toggleArchiveSection()">
              <div class="section-title">
                <span>Archived Chats</span>
                <span class="chat-section-count">${archivedChats.length}</span>
              </div>
              <span class="chat-section-toggle">${isCollapsed ? '▶' : '▼'}</span>
            </div>
            <div class="chat-section-content" id="archivedChats"></div>
          `
    chatList.appendChild(archiveSection)

    const archivedChatContainer = archiveSection.querySelector('#archivedChats')
    archivedChats.forEach((chat) => {
      const chatItem = createChatItem(chat, true)
      archivedChatContainer.appendChild(chatItem)
    })
  }
}

function createChatItem(chat, isArchived) {
  const chatItem = document.createElement('div')
  chatItem.className = `chat-item ${chat.id === appState.currentChatId ? 'active' : ''} ${isArchived ? 'archived' : ''}`
  chatItem.innerHTML = `
          <div class="chat-item-title">${chat.title}</div>
          <div class="chat-item-actions">
            ${
              isArchived
                ? `<button class="chat-action-btn" onclick="restoreChat('${chat.id}')" title="Restore">📤</button>`
                : `<button class="chat-action-btn" onclick="archiveChat('${chat.id}')" title="Archive">📁</button>`
            }
            <button class="chat-action-btn" onclick="deleteChat('${chat.id}')" title="Delete">🗑️</button>
          </div>
        `
  chatItem.addEventListener('click', (e) => {
    if (!e.target.classList.contains('chat-action-btn')) {
      switchToChat(chat.id)
    }
  })
  return chatItem
}

function toggleArchiveSection() {
  const archiveSection = document.querySelector('.archive-section')
  if (archiveSection) {
    archiveSection.classList.toggle('collapsed')
    
    // Update toggle arrow direction
    const toggle = archiveSection.querySelector('.chat-section-toggle')
    const isCollapsed = archiveSection.classList.contains('collapsed')
    toggle.textContent = isCollapsed ? '▶' : '▼'
    
    // Save state to localStorage
    localStorage.setItem('archiveSectionCollapsed', isCollapsed.toString())
  }
}

function updateChatDisplay() {
  const chatArea = document.getElementById('chatArea')
  const chat = getCurrentChat()

  chatArea.innerHTML = ''

  if (!chat || chat.messages.length === 0) {
    // Create empty state element
    const emptyState = document.createElement('div')
    emptyState.className = 'empty-state'
    emptyState.innerHTML = `
                    <h2>Welcome to LLM Chat</h2>
                    <p>Start a conversation by typing a message below.</p>
                `
    chatArea.appendChild(emptyState)
    return
  }

  chat.messages.forEach((message) => {
    const messageDiv = document.createElement('div')
    const branchInfo = getMessageBranchInfo(message.id)
    const hasBranches = branchInfo && branchInfo.total > 1

    messageDiv.className = `message ${message.role} ${message.isStreaming ? 'streaming' : ''} ${message.isEditing ? 'editing' : ''} ${hasBranches ? 'has-branches' : ''}`
    messageDiv.dataset.messageId = message.id

    if (message.isEditing) {
      messageDiv.innerHTML = `
              <div class="message-edit-form">
                <textarea class="message-edit-textarea" rows="4">${getCurrentMessageContent(message) || ''}</textarea>
                <div class="message-edit-actions">
                  <button class="message-edit-btn save" onclick="saveMessageEdit('${message.id}')">Save</button>
                  <button class="message-edit-btn cancel" onclick="cancelMessageEdit('${message.id}')">Cancel</button>
                </div>
              </div>
            `
    } else {
      const messageContent = getCurrentMessageContent(message)
      const chat = getCurrentChat()
      const currentChatModel = chat?.model || appState.settings.chat.model
      const showModelIndicator = message.role === 'assistant' && message.model && message.model !== currentChatModel
      const isModelChangeNotification = message.isModelChange
      
      if (isModelChangeNotification) {
        messageDiv.className = `message system model-change`
        messageDiv.innerHTML = `
          <div class="model-change-notification">
            <span class="model-change-icon">🔄</span>
            <span class="model-change-text">${messageContent}</span>
          </div>
        `
      } else {
        messageDiv.innerHTML = `
              <div class="message-content">${messageContent || (message.isStreaming ? '' : 'No response')}</div>
              ${(showModelIndicator || hasBranches) ? `
                <div class="message-meta">
                  ${
                    hasBranches
                      ? `
                    <div class="branch-navigation">
                      <button class="branch-nav-btn" onclick="switchToBranch('${message.id}', ${branchInfo.current - 1 - 1})" ${!branchInfo.hasPrevious ? 'disabled' : ''}>◀</button>
                      <span class="branch-indicator">
                        <span>🌿</span>
                        <span>${branchInfo.current}/${branchInfo.total}</span>
                      </span>
                      <button class="branch-nav-btn" onclick="switchToBranch('${message.id}', ${branchInfo.current - 1 + 1})" ${!branchInfo.hasNext ? 'disabled' : ''}>▶</button>
                    </div>
                  `
                      : '<div></div>'
                  }
                  ${showModelIndicator ? `<div class="message-model-indicator" title="Generated by ${message.model}">${message.model}</div>` : ''}
                </div>
              ` : ''}
              ${
                !message.isStreaming
                  ? `
                <div class="message-actions">
                  <button class="message-action-btn" onclick="editMessage('${message.id}')" title="Edit">✏️</button>
                  ${message.role === 'assistant' ? `<button class="message-action-btn" onclick="regenerateMessage('${message.id}')" title="Regenerate">🔄</button>` : ''}
                </div>
              `
                  : ''
              }
            `
      }
    }
    chatArea.appendChild(messageDiv)
  })

  // Scroll to bottom
  chatArea.scrollTop = chatArea.scrollHeight
}

function updateHeader() {
  const chatTitle = document.getElementById('chatTitle')
  const chat = getCurrentChat()
  chatTitle.textContent = chat ? chat.title : 'New Chat'
  updateChatModelSelector()
}

function updateChatModelSelector() {
  const select = document.getElementById('chatModelSelect')
  const chat = getCurrentChat()
  
  // Clear existing options
  select.innerHTML = ''
  
  // Add available models
  appState.settings.api.availableModels.forEach((model) => {
    const option = document.createElement('option')
    option.value = model
    option.textContent = model
    select.appendChild(option)
  })
  
  // Set current value
  if (chat && chat.model) {
    select.value = chat.model
  } else {
    select.value = appState.settings.chat.model
  }
}

function handleModelChange(newModel) {
  const chat = getCurrentChat()
  if (!chat || !newModel) return
  
  const oldModel = chat.model || appState.settings.chat.model
  if (oldModel === newModel) return
  
  updateChatModel(chat.id, newModel)
  updateUI()
  
  // Add model change notification to chat
  addModelChangeNotification(chat.id, oldModel, newModel)
}

function addModelChangeNotification(chatId, fromModel, toModel) {
  const chat = appState.chats.get(chatId)
  if (!chat) return
  
  const notification = {
    id: generateId(),
    role: 'system',
    content: `Switched from ${fromModel} to ${toModel}`,
    timestamp: Date.now(),
    isStreaming: false,
    isEditing: false,
    parentId: null,
    children: [],
    branchId: null,
    isModelChange: true,
  }
  
  chat.messages.push(notification)
  chat.updatedAt = Date.now()
  appState.save()
}

function updateInputState() {
  const sendBtn = document.getElementById('sendBtn')
  const messageInput = document.getElementById('messageInput')

  sendBtn.disabled = appState.ui.isGenerating
  sendBtn.textContent = appState.ui.isGenerating ? 'Sending...' : 'Send'
  messageInput.disabled = appState.ui.isGenerating
}

// Title editing functions
function startTitleEdit() {
  const chat = getCurrentChat()
  if (!chat) return

  const titleDiv = document.getElementById('chatTitle')
  const titleInput = document.getElementById('chatTitleInput')

  titleInput.value = chat.title
  titleDiv.classList.add('hidden')
  titleInput.classList.remove('hidden')
  titleInput.focus()
  titleInput.select()
}

function saveTitleEdit() {
  const chat = getCurrentChat()
  if (!chat) return

  const titleDiv = document.getElementById('chatTitle')
  const titleInput = document.getElementById('chatTitleInput')
  const newTitle = titleInput.value.trim()

  if (newTitle && newTitle !== chat.title) {
    chat.title = newTitle
    chat.updatedAt = Date.now()
    appState.save()
  }

  titleDiv.classList.remove('hidden')
  titleInput.classList.add('hidden')
  updateUI()
}

function cancelTitleEdit() {
  const titleDiv = document.getElementById('chatTitle')
  const titleInput = document.getElementById('chatTitleInput')

  titleDiv.classList.remove('hidden')
  titleInput.classList.add('hidden')
}

// Settings modal functions
function showSettingsModal() {
  const modal = document.getElementById('settingsModal')

  // Populate form with current settings
  document.getElementById('apiBaseUrl').value = appState.settings.api.baseUrl
  document.getElementById('apiKey').value = appState.settings.api.apiKey
  document.getElementById('availableModels').value =
    appState.settings.api.availableModels.join('\n')
  document.getElementById('temperature').value = appState.settings.chat.temperature
  document.getElementById('temperatureValue').textContent = appState.settings.chat.temperature
  document.getElementById('maxTokens').value = appState.settings.chat.maxTokens
  document.getElementById('autoGenerateTitle').checked = appState.settings.autoGenerateTitle
  document.getElementById('titleGenerationTrigger').value = appState.settings.titleGenerationTrigger
  document.getElementById('theme').value = appState.settings.theme

  // Update model dropdowns
  updateModelDropdown()
  updateTitleModelDropdown()
  document.getElementById('defaultModel').value = appState.settings.chat.model
  document.getElementById('titleModel').value = appState.settings.titleModel

  modal.classList.add('active')
}

function hideSettingsModal() {
  document.getElementById('settingsModal').classList.remove('active')
}

function updateModelDropdown() {
  const select = document.getElementById('defaultModel')
  const availableModels = document
    .getElementById('availableModels')
    .value.split('\n')
    .map((m) => m.trim())
    .filter((m) => m)

  select.innerHTML = '<option value="">Select a model</option>'
  availableModels.forEach((model) => {
    const option = document.createElement('option')
    option.value = model
    option.textContent = model
    select.appendChild(option)
  })
}

function updateTitleModelDropdown() {
  const select = document.getElementById('titleModel')
  const availableModels = document
    .getElementById('availableModels')
    .value.split('\n')
    .map((m) => m.trim())
    .filter((m) => m)

  select.innerHTML = '<option value="">Select a model</option>'
  availableModels.forEach((model) => {
    const option = document.createElement('option')
    option.value = model
    option.textContent = model
    select.appendChild(option)
  })
}

function saveSettings() {
  const newSettings = {
    ...appState.settings,
    autoGenerateTitle: document.getElementById('autoGenerateTitle').checked,
    titleGenerationTrigger: parseInt(document.getElementById('titleGenerationTrigger').value),
    titleModel: document.getElementById('titleModel').value,
    api: {
      baseUrl: document.getElementById('apiBaseUrl').value.trim(),
      apiKey: document.getElementById('apiKey').value.trim(),
      availableModels: document
        .getElementById('availableModels')
        .value.split('\n')
        .map((m) => m.trim())
        .filter((m) => m),
    },
    chat: {
      ...appState.settings.chat,
      model: document.getElementById('defaultModel').value,
      temperature: parseFloat(document.getElementById('temperature').value),
      maxTokens: parseInt(document.getElementById('maxTokens').value),
    },
    theme: document.getElementById('theme').value,
  }

  // Validation
  if (!newSettings.api.baseUrl) {
    alert('API Base URL is required')
    return
  }
  if (!newSettings.api.apiKey) {
    alert('API Key is required')
    return
  }
  if (!newSettings.chat.model) {
    alert('Please select a default model')
    return
  }
  if (newSettings.autoGenerateTitle && !newSettings.titleModel) {
    alert('Please select a title generation model or disable auto-generate titles')
    return
  }

  appState.settings = newSettings
  appState.save()
  applyTheme()
  hideSettingsModal()
}

function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirmTitle').textContent = title
  document.getElementById('confirmMessage').textContent = message
  document.getElementById('confirmModal').classList.add('active')

  const confirmBtn = document.getElementById('confirmAction')
  const newConfirmBtn = confirmBtn.cloneNode(true)
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn)

  newConfirmBtn.addEventListener('click', () => {
    hideConfirmModal()
    onConfirm()
  })
}

function hideConfirmModal() {
  document.getElementById('confirmModal').classList.remove('active')
}

// Theme management
function applyTheme() {
  const theme = appState.settings.theme
  const root = document.documentElement

  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else if (theme === 'light') {
    root.removeAttribute('data-theme')
  } else {
    // auto
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
    }
  }
}

// Event listeners
function setupEventListeners() {
  // Header buttons
  document.getElementById('settingsBtn').addEventListener('click', showSettingsModal)
  document.getElementById('newChatBtn').addEventListener('click', createNewChat)
  document.getElementById('newChatSidebar').addEventListener('click', createNewChat)

  // Title editing
  document.getElementById('chatTitle').addEventListener('click', startTitleEdit)
  document.getElementById('chatTitleInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveTitleEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelTitleEdit()
    }
  })
  document.getElementById('chatTitleInput').addEventListener('blur', saveTitleEdit)

  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar')
    sidebar.classList.toggle('open')
  })

  // Message input
  const messageInput = document.getElementById('messageInput')
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  messageInput.addEventListener('input', () => {
    // Auto-resize textarea
    messageInput.style.height = 'auto'
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px'
  })

  // Send button
  document.getElementById('sendBtn').addEventListener('click', sendMessage)

  // Settings modal
  document.getElementById('closeSettings').addEventListener('click', hideSettingsModal)
  document.getElementById('cancelSettings').addEventListener('click', hideSettingsModal)
  document.getElementById('saveSettings').addEventListener('click', saveSettings)

  // Temperature slider
  document.getElementById('temperature').addEventListener('input', (e) => {
    document.getElementById('temperatureValue').textContent = e.target.value
  })

  // Available models change
  document.getElementById('availableModels').addEventListener('input', () => {
    updateModelDropdown()
    updateTitleModelDropdown()
    updateChatModelSelector()
  })

  // Chat model selector change
  document.getElementById('chatModelSelect').addEventListener('change', (e) => {
    handleModelChange(e.target.value)
  })

  // Confirm modal
  document.getElementById('closeConfirm').addEventListener('click', hideConfirmModal)
  document.getElementById('cancelConfirm').addEventListener('click', hideConfirmModal)

  // Close modals on overlay click
  document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideSettingsModal()
  })
  document.getElementById('confirmModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideConfirmModal()
  })

  // Close sidebar on mobile when clicking outside
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar')
    const toggle = document.getElementById('sidebarToggle')

    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      sidebar.classList.remove('open')
    }
  })

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (appState.settings.theme === 'auto') {
      applyTheme()
    }
  })
}

// Initialize app
const appState = new AppState()

function initializeApp() {
  appState.load()
  setupEventListeners()
  applyTheme()
  updateUI()

  // Focus message input
  document.getElementById('messageInput').focus()
}


// Start the app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  initializeApp()
}
