# LLM Chat App - Technical Design & Requirements

## 1. High-Level Architecture

### Core Components
- **Single HTML File**: Self-contained with embedded CSS and JavaScript
- **Client-Side Only**: No backend dependencies, pure frontend implementation
- **Modular JavaScript**: Component-based architecture using vanilla JS
- **Responsive Design**: Mobile-first approach with desktop enhancements

### State Management
```javascript
// Global state structure
const AppState = {
  chats: Map<chatId, ChatObject>,
  currentChatId: string | null,
  settings: SettingsObject,
  ui: UIState
}
```

## 2. Data Models

### Chat Object
```javascript
{
  id: string,                    // UUID
  title: string,                 // Auto-generated or user-set
  messages: Message[],           // Conversation history
  branches: Map<messageId, Message[]>, // For message regeneration
  createdAt: timestamp,
  updatedAt: timestamp,
  isGeneratingTitle: boolean,
  isArchived: boolean           // For archive functionality
}
```

### Message Object
```javascript
{
  id: string,                    // UUID
  role: 'user' | 'assistant',
  content: string,
  timestamp: timestamp,
  isStreaming: boolean,
  isEditing: boolean,
  parentId: string | null,       // For branching
  children: string[]             // Child message IDs
}
```

### Settings Object
```javascript
{
  autoGenerateTitle: boolean,
  titleGenerationTrigger: number,  // After N messages
  titleModel: string,              // Separate model for title generation
  api: {
    baseUrl: string,               // OpenAI compatible endpoint
    apiKey: string,
    availableModels: string[]      // User-configurable model list
  },
  chat: {
    model: string,
    temperature: number,
    maxTokens: number
  },
  theme: 'light' | 'dark' | 'auto'
}
```

## 3. Core Features & Implementation

### 3.1 Chat Management
- **Create New Chat**: Initialize empty chat with temporary title
- **Delete Chat**: Permanently remove from state with confirmation
- **Archive Chat**: Move to archived section, maintains in storage
- **Restore Chat**: Move archived chat back to active list
- **Switch Chat**: Load selected chat into main view
- **Auto-save**: Persist state changes immediately to localStorage

### 3.2 Message Handling
- **Send Message**: Add user message, trigger assistant response
- **Stream Response**: Real-time token streaming with typing indicator
- **Edit Messages**: In-place editing for both user and assistant messages
- **Regenerate Response**: Create new branch from selected message
- **Message Threading**: Support for conversation branching

### 3.3 Title Generation & Editing
- **Trigger Conditions**: After first assistant response (configurable)
- **Auto-generation Toggle**: User-configurable enable/disable in settings
- **Separate Model**: Uses dedicated titleModel setting for generation
- **Generation Process**: Send conversation context to title-specific model
- **Fallback**: Use first user message if generation fails
- **Inline Title Editing**: Click title in header to edit, Enter to save, Escape to cancel
- **Real-time Updates**: Title changes persist immediately to localStorage

### 3.4 Navigation & UI
- **Sidebar**: Collapsible chat list with active/archived sections
- **Chat Ordering**: Most recently active at top, archived collapsed at bottom
- **Archive Management**: Toggle archived section visibility
- **Visual Indicators**: Active states, typing indicators, archived styling
- **Keyboard Shortcuts**: Common actions (Ctrl+N, Ctrl+K, etc.)

## 4. Technical Implementation Details

### 4.1 API Communication
```javascript
class APIService {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  
  async streamResponse(messages, model, onToken, onComplete) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        messages,
        model,
        stream: true,
        temperature: settings.chat.temperature,
        max_tokens: settings.chat.maxTokens
      })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.choices?.[0]?.delta?.content) {
            onToken(data.choices[0].delta.content);
          }
        }
      }
    }
    
    onComplete();
  }
  
  async generateTitle(messages) {
    const titlePrompt = [{
      role: 'user',
      content: `Generate a concise title (4-6 words) for this conversation:\n\n${
        messages.slice(0, 4).map(m => `${m.role}: ${m.content}`).join('\n')
      }`
    }];
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        messages: titlePrompt,
        model: settings.titleModel,
        max_tokens: 20,
        temperature: 0.3
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
}
```

### 4.2 Message Branching System
```javascript
class MessageTree {
  constructor(rootMessage) {
    this.root = rootMessage;
    this.branches = new Map();
  }
  
  addBranch(parentId, newMessage) {
    if (!this.branches.has(parentId)) {
      this.branches.set(parentId, []);
    }
    this.branches.get(parentId).push(newMessage);
  }
  
  getLinearPath(messageId) {
    // Return path from root to specified message
  }
}
```

### 4.3 State Persistence
```javascript
class StateManager {
  save() {
    localStorage.setItem('llm-chat-state', JSON.stringify({
      chats: Array.from(this.chats.entries()),
      settings: this.settings,
      currentChatId: this.currentChatId
    }));
  }
  
  load() {
    const saved = localStorage.getItem('llm-chat-state');
    if (saved) {
      const state = JSON.parse(saved);
      this.chats = new Map(state.chats);
      this.settings = { ...defaultSettings, ...state.settings };
      this.currentChatId = state.currentChatId;
    }
  }
}
```

## 5. UI/UX Design Specifications

### 5.1 Layout Structure
```
┌─────────────────────────────────────────┐
│ [≡] Chat Title                [⚙] [+]   │
├─────────┬───────────────────────────────┤
│ SIDEBAR │ MAIN CHAT AREA                │
│         │                               │
│ Active  │ ┌─────────────────────────┐   │
│ Chat 1  │ │ User message            │   │
│ Chat 2  │ └─────────────────────────┘   │
│ Chat 3  │                               │
│         │ ┌─────────────────────────┐   │
│ ───────│ │ Assistant response      │   │
│ Archive │ │ with streaming...       │   │
│ [v] (3) │ └─────────────────────────┘   │
│         │                               │
│         │ [Message Input Box]     [Send]│
└─────────┴───────────────────────────────┘
```

### 5.2 Design System
- **Colors**: Monochromatic with accent colors
- **Typography**: Clean, readable fonts (system fonts)
- **Spacing**: 8px grid system
- **Animations**: Subtle transitions (200-300ms)
- **Icons**: Minimal SVG icons

### 5.3 Responsive Breakpoints
- **Mobile**: < 768px (collapsible sidebar)
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px (full layout)

## 6. Settings Configuration

### 6.1 API Configuration
- **Base URL**: OpenAI compatible endpoint input
- **API Key**: Secure text input with visibility toggle
- **Available Models**: User-editable list of model names
- **Test Connection**: Button to validate API settings

### 6.2 Chat Settings
- **Default Model**: Dropdown from available models list
- **Temperature**: Slider (0-2)
- **Max Tokens**: Number input

### 6.3 Title Generation Settings
- **Auto-generate Titles**: Checkbox to enable/disable automatic title generation
- **Title Model**: Separate model selection for title generation

### 6.4 UI Settings
- **Theme**: Light/Dark/Auto selection
- **Sidebar Behavior**: Auto-collapse on mobile

### 6.5 Settings UI Design
- Clean modal overlay with single-page form
- Real-time validation and save indicators
- Export/import configuration as JSON

## 7. Core Implementation Phases

### Phase 1: Foundation
- Basic chat interface with sidebar
- Message sending/receiving with OpenAI API
- Local storage persistence
- Settings modal with API configuration

### Phase 2: Advanced Chat Features
- Message editing and regeneration
- Real-time streaming responses
- Conversation branching system
- Archive/delete chat functionality

### Phase 3: Polish & Optimization
- Automatic title generation with separate model
- Responsive design refinement
- Smooth animations and transitions
- Error handling and validation

## 8. Key Technical Considerations

### 8.1 Data Flow
```
User Input → Message Creation → API Call → Stream Handler → UI Update → State Save
```

### 8.2 Archive System
- Visual separation in sidebar
- Collapsed state with expand/collapse toggle
- Maintain full functionality for archived chats
- Clear visual indicators (grayed out, different styling)

### 8.3 Model Management
- Dynamic model list from user configuration
- Separate model selection for chat vs title generation
- Fallback handling for unavailable models