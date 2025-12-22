# State Management

## Store Architecture

The app uses a single store provided via SolidJS Context. Components access it through `useAppStore()`.

```
AppStoreProvider (creates store + context)
    ↓
useAppStore() hook (returns store + operations)
    ↓
Components read state, call operations
```

## Store Shape

```typescript
{
  chats: Map<string, Chat> // All conversations keyed by ID
  currentChatId: string | null // Active chat selection
  settings: AppSettings // API config, UI prefs, defaults
  streaming: {
    isStreaming: boolean // Lock for concurrent requests
    currentMessageId: string // Message being streamed into
    currentContent: string // Accumulated stream content
  }
}
```

## Operations Composition

Store operations are organized by domain and composed together:

- **ChatOperations** - CRUD for chats (add, update, delete, archive, filter)
- **MessageOperations** - Message tree manipulation (add, update, branch, switch)
- **StreamingOperations** - Streaming state control (start, update content, finish)

These are combined in `AppStoreOperations` which also injects services.

## Reactivity Pattern

Components subscribe to specific store paths. SolidJS tracks dependencies automatically:

```tsx
// Fine-grained: only re-runs when currentChatId or that chat changes
const currentChat = () => store.chats.get(store.currentChatId)

// Derived values use createMemo for caching
const visibleMessages = createMemo(() => getVisibleMessages(currentChat()))
```

## Persistence

- **Storage key**: `llm-chat-state-tree-v1`
- **Trigger**: `createEffect` watches store, debounced saves
- **Serialization**: Maps converted to arrays for JSON compatibility
- **Recovery**: Corrupted data falls back to defaults

## Adding New State

1. Add type to `AppStateStore` interface in types
2. Add default value in store initialization
3. Create operation functions if needed (or add to existing operations file)
4. Wire through `AppStoreOperations` if it needs service access
