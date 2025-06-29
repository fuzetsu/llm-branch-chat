# SolidJS Migration Plan

A focused implementation plan for porting the TypeScript chat application to SolidJS as a solo hobby project.

## Overview

Transform the current manager-based architecture with manual DOM manipulation into a reactive SolidJS application. The migration preserves all existing features while modernizing the codebase.

## Phase 1: Foundation & State

### Setup SolidJS Environment
- Install SolidJS, TypeScript, and Vite
- Configure Vite for SolidJS + TypeScript  
- Create basic `App.tsx` with routing

### Port State Management
- Replace proxy-based reactivity with SolidJS stores
- Port `AppState.ts` to use `createStore` for chats/settings
- Maintain localStorage persistence with effects
- Preserve message branching system with signals

**Key Implementation:**
```typescript
// New reactive state
const [chats, setChats] = createStore<Map<string, Chat>>(new Map())
const [settings, setSettings] = createStore<Settings>(defaultSettings)

// Persistence effect
createEffect(() => {
  localStorage.setItem('appState', JSON.stringify({
    chats: Array.from(chats.entries()),
    settings: settings
  }))
})
```

## Phase 2: Core Components

### Layout Components
- `App.tsx` - Root component with global state
- `Layout.tsx` - Header, sidebar, main content structure  
- `Sidebar.tsx` - Chat list with responsive mobile toggle
- `Header.tsx` - Navigation and settings access

### Chat Management
- `ChatList.tsx` - Reactive chat list using `<For>`
- `ChatItem.tsx` - Individual chat with actions
- Replace global `chatManager` calls with component event handlers

**Key Implementation:**
```tsx
// Replace global manager calls
const handleDeleteChat = (chatId: string) => {
  setChats(chats => {
    const newChats = new Map(chats)
    newChats.delete(chatId)
    return newChats
  })
}
```

## Phase 3: Message System

### Message Components
- `MessageList.tsx` - Scrollable message container
- `Message.tsx` - Individual message with branching UI
- `MessageInput.tsx` - User input with send functionality
- `MessageBranching.tsx` - Branch navigation controls

### Streaming Implementation
- Adapt `ApiService.ts` streaming to work with signals
- Use `createResource` for API calls
- Replace throttled DOM updates with reactive signals

**Key Implementation:**
```tsx
// Streaming message updates
const [messageContent, setMessageContent] = createSignal('')
const [isStreaming, setIsStreaming] = createSignal(false)

// In streaming handler
onChunk: (chunk) => {
  setMessageContent(prev => prev + chunk)
}
```

## Phase 4: Integration & Polish

### API Integration
- Port `ApiService.ts` to work with SolidJS resources
- Integrate with reactive state management
- Maintain all existing streaming functionality

### Settings & Modals
- `SettingsModal.tsx` - Reactive settings interface
- Connect settings changes to API service
- Modal system with portal rendering

### Final Cleanup
- Remove old manager classes and global window exposure
- Update build scripts to use Vite exclusively
- Migrate to CSS modules with component co-location

## Technical Implementation Notes

### State Architecture
```typescript
// Global app state
const AppStateProvider = (props) => {
  const [chats, setChats] = createStore(/* ... */)
  const [settings, setSettings] = createStore(/* ... */)
  const [ui, setUI] = createStore(/* ... */)
  
  return (
    <AppStateContext.Provider value={{chats, setChats, settings, setSettings, ui, setUI}}>
      {props.children}
    </AppStateContext.Provider>
  )
}
```

### Component Event Handling
Replace HTML onclick attributes calling global managers:
```html
<!-- Old -->
<button onclick="chatManager.deleteChat('123')">Delete</button>

<!-- New SolidJS -->
<button onClick={() => handleDeleteChat('123')}>Delete</button>
```

### Message Branching Preservation
```typescript
// Maintain complex branching logic
const [messageBranches, setMessageBranches] = createStore<Map<string, Branch[]>>(new Map())
const [currentBranches, setCurrentBranches] = createStore<Map<string, number>>(new Map())

// Branch navigation
const switchToBranch = (messageId: string, branchIndex: number) => {
  setCurrentBranches(messageId, branchIndex)
}
```

### Performance Considerations
- Use `<For>` for efficient list rendering
- Memo expensive computations (timestamp formatting)
- Lazy load large chat conversations
- Signal granularity for optimal updates

## Migration Strategy

1. **Parallel Development**: Keep existing code working while building SolidJS version
2. **Feature Parity**: Ensure every existing feature works in new version
3. **Data Compatibility**: Maintain localStorage format compatibility
4. **CSS Module Migration**: Move existing CSS to component-colocated CSS modules

### CSS Module Approach
- Convert existing modular CSS files to CSS modules
- Co-locate styles with components (e.g., `Header.tsx` + `Header.module.css`)
- Maintain existing CSS content - just change organization
- Configure Vite for CSS module support
- Example structure:
  ```
  components/
    Header/
      Header.tsx
      Header.module.css
    Sidebar/
      Sidebar.tsx  
      Sidebar.module.css
  ```

## Key Challenges & Solutions

### Complex State Migration
- **Challenge**: Message branching system complexity
- **Solution**: Port logic incrementally, test each piece

### Streaming Updates
- **Challenge**: Adapting throttled DOM updates to reactive system
- **Solution**: Use signals with batch updates for performance

### Global Manager Removal
- **Challenge**: HTML event handlers rely on global managers
- **Solution**: Replace with proper SolidJS component event handling

This streamlined plan focuses on implementation essentials for a working SolidJS migration while preserving all functionality.

## Phase 1 Completion Report

### ✅ Completed Tasks

#### SolidJS Environment Setup
- ✅ **Dependencies Installed**: SolidJS (1.9.7), @solidjs/router (0.15.3), Vite (6.3.5), vite-plugin-solid (2.11.7)
- ✅ **Vite Configuration**: Created `vite.config.ts` with SolidJS plugin and port 8080
- ✅ **Package.json Scripts**: Updated to use Vite (`npm run dev`, `npm run build`, `npm run serve`)
- ✅ **Build System**: Successfully building to `dist/` directory

#### SolidJS State Management
- ✅ **AppStore Created**: `src/store/AppStore.tsx` with SolidJS stores replacing proxy-based reactivity
- ✅ **LocalStorage Persistence**: Implemented with `createEffect()` for automatic state saving
- ✅ **Message Branching Preserved**: Full Map-based branching system maintained with SolidJS stores
- ✅ **State Migration**: Backward compatibility for existing localStorage data maintained

#### Core Components Structure
- ✅ **App Component**: Root SolidJS component with AppStoreProvider
- ✅ **Layout Component**: Main layout structure with responsive design
- ✅ **Header Component**: Navigation with title display and settings/new chat buttons
- ✅ **Sidebar Component**: Chat list with responsive mobile toggle
- ✅ **ChatArea Component**: Main content area with conditional rendering
- ✅ **MessageList & Message**: Message display components with timestamp formatting
- ✅ **MessageInput**: Input component with auto-resize and send functionality

### 🏗️ Implementation Details

#### State Architecture
```typescript
// Successfully implemented reactive store
const [state, setState] = createStore<AppStateStore>({
  chats: Map<string, Chat>,
  currentChatId: string | null,
  settings: AppSettings,
  ui: UISettings
});

// Automatic persistence with effects
createEffect(() => {
  saveStateToStorage(state);
});
```

#### Component Structure
```
src/
├── App.tsx (Root component)
├── main.tsx (Entry point)
├── store/AppStore.tsx (Global state)
└── components/
    ├── Layout.tsx
    ├── Header.tsx
    ├── Sidebar.tsx
    ├── ChatArea.tsx
    ├── MessageList.tsx
    ├── Message.tsx
    └── MessageInput.tsx
```

### ✅ Verification
- **Build Success**: `npm run build` produces optimized bundle (37.26 kB)
- **Dev Server**: `npm run dev` successfully starts on http://localhost:8080
- **TypeScript**: Full type safety maintained with existing type definitions
- **Backward Compatibility**: Existing localStorage data structure preserved

### 🔄 Legacy Preservation
- **Original App.ts**: Renamed to `App.legacy.ts` for reference
- **Type Definitions**: Reused existing `src/types/index.ts` without changes
- **Utils Functions**: Existing `src/utils/index.ts` compatible with new architecture

Phase 1 is **COMPLETE** ✅ - SolidJS foundation is fully functional with state management, component architecture, and build system ready for Phase 2 implementation.