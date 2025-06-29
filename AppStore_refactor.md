# AppStore Refactoring Plan

## Current State Analysis

The `AppStore.tsx` file has grown to 708+ lines and handles multiple responsibilities:
- State management and persistence
- Chat CRUD operations  
- Message operations and branching
- Streaming operations
- API integration (message sending and regeneration)
- Title generation

**Recent Addition:** Message regeneration logic was moved from the Message component to AppStore (80+ lines), further emphasizing the need for refactoring.

## Proposed Refactoring

### 1. Core Store Module (`store/AppStore.tsx`)
**Responsibilities:**
- Main store context and provider
- State management coordination
- localStorage persistence

**Size:** ~150 lines

### 2. Chat Operations Module (`store/ChatOperations.ts`)
**Responsibilities:**
- Chat CRUD (create, update, delete, archive)
- Chat filtering and sorting
- Chat metadata management

**Extracted methods:**
- `addChat`, `updateChat`, `deleteChat`
- `createNewChat`, `getCurrentChat`
- `getActiveChats`, `getArchivedChats`

### 3. Message Operations Module (`store/MessageOperations.ts`)
**Responsibilities:**
- Message CRUD operations
- Message branching system
- Message filtering and visibility

**Extracted methods:**
- `addMessage`, `updateMessage`
- `addMessageBranch`, `switchMessageBranch`
- `getVisibleMessages`

### 4. Streaming Operations Module (`store/StreamingOperations.ts`)
**Responsibilities:**
- Streaming state management
- Real-time content updates
- Streaming lifecycle management

**Extracted methods:**
- `startStreaming`, `stopStreaming`
- `updateStreamingContent`, `appendStreamingContent`

### 5. Message Service Module (`services/MessageService.ts`)
**Responsibilities:**
- Message sending logic
- API integration for conversations
- Message regeneration logic (currently in AppStore, needs extraction)

**Extracted methods:**
- `sendMessage` (from AppStore)
- `regenerateMessage` (from AppStore - recently moved from Message component)

### 6. Title Generation Service (`services/TitleService.ts`)
**Responsibilities:**
- Automatic title generation
- Title generation state management

**Extracted methods:**
- `generateChatTitle`

## Implementation Strategy

### Phase 1: Service Extraction
1. Create `MessageService.ts` with `sendMessage` and `regenerateMessage` (extracted from AppStore)
2. Create `TitleService.ts` with `generateChatTitle`
3. Update AppStore to use new services instead of inline implementations

### Phase 2: Operation Module Extraction
1. Create operation modules for chat, message, and streaming operations
2. Extract methods while maintaining interface compatibility
3. Update AppStore to use extracted modules

### Phase 3: Core Store Simplification
1. Reduce AppStore to core responsibilities
2. Implement composition pattern for operations
3. Maintain single context export for components

## Benefits

### Code Organization
- Single responsibility per module
- Easier to locate and modify specific functionality
- Better separation of concerns

### Maintainability
- Smaller, focused files are easier to understand
- Reduced cognitive load when making changes
- Better test isolation possibilities

### Performance
- Potential for lazy loading of non-critical operations
- Better tree-shaking opportunities
- Cleaner module dependencies

### Message Regeneration Improvement
- ✅ **Completed:** Moved regeneration logic from Message component to AppStore 
- **Next:** Extract regeneration logic from AppStore to MessageService
- Centralize all message API operations for consistency
- Improve reusability and testability

## File Structure After Refactoring

```
src/
├── store/
│   ├── AppStore.tsx              (~150 lines)
│   ├── ChatOperations.ts         (~100 lines)
│   ├── MessageOperations.ts      (~120 lines)
│   └── StreamingOperations.ts    (~80 lines)
├── services/
│   ├── ApiService.ts             (existing)
│   ├── MessageService.ts         (~200 lines - includes sendMessage & regenerateMessage)
│   └── TitleService.ts           (~80 lines)
```

## Migration Notes

- All changes will maintain backward compatibility
- No breaking changes to component interfaces
- Existing state persistence will be preserved
- All current functionality will be maintained

## Estimated Impact

- **Reduced complexity:** From 1 large file (708+ lines) to 6 focused modules
- **Improved testability:** Each module can be tested independently
- **Better maintainability:** Changes isolated to specific areas
- **Enhanced reusability:** Services can be used across components
- **Business logic separation:** Complex operations moved out of UI components

## Current Status

- ✅ **Message regeneration moved from component to store** (improving separation of concerns)
- 🔄 **Ready for service extraction phase** (AppStore now contains all business logic to be extracted)