# Architecture Overview

This directory contains architecture documentation for deeper understanding of the codebase. Read selectively based on your task.

## Quick Reference

| Document                                     | Covers                                  | Read when...                                                 |
| -------------------------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| [state-management.md](./state-management.md) | Store composition, context, persistence | Modifying state, adding features that need reactive data     |
| [services.md](./services.md)                 | API abstraction, providers, streaming   | Working with API calls, adding providers, debugging requests |
| [message-model.md](./message-model.md)       | Node pool structure, branching logic    | Touching message display, editing, or branch navigation      |
| [styling.md](./styling.md)                   | Theming, component styles, patterns     | Working with UI styling, adding components, theming          |

## High-Level Data Flow

```
User Input
    ↓
Component (MessageInput, ChatItem, etc.)
    ↓
Store Operations (ChatOperations, MessageOperations, StreamingOperations)
    ↓
Services (MessageService → ProviderApiService → ApiService)
    ↓
External API (streaming response)
    ↓
Store update (streaming content → final message)
    ↓
Reactive UI update (automatic via SolidJS)
```

## Key Design Decisions

1. **No external state library** - Pure SolidJS primitives (createStore, createContext) handle all reactivity
2. **Composition over inheritance** - Store operations are composed functions, not class hierarchies
3. **Node pool over tree** - Messages stored flat in a Map with parent/child references, not nested objects
4. **Provider abstraction** - All LLM providers use OpenAI-compatible API format
5. **Local-first** - All data persists to localStorage; no backend required
