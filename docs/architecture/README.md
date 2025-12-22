# Architecture Overview

This directory contains architecture documentation for deeper understanding of the codebase. Read selectively based on your task.

## Quick Reference

| Document | Read when... |
| -------- | ------------ |
| [state-management.md](./state-management.md) | Modifying state, adding features |
| [services.md](./services.md) | Working with API calls, adding providers |
| [message-model.md](./message-model.md) | Touching message display, editing, or branch navigation |
| [styling.md](./styling.md) | Working with UI styling, adding components |

## Key Design Decisions

1. **No external state library** - Pure SolidJS primitives handle all reactivity
2. **Single store file** - All state and operations in `AppStore.tsx` for easy navigation
3. **Node pool over tree** - Messages stored flat with parent/child references
4. **Provider abstraction** - All LLM providers use OpenAI-compatible API format
5. **Local-first** - All data persists to localStorage; no backend required
