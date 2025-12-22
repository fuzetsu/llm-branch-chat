# State Management

## Overview

The app uses a single SolidJS store provided via Context. All state and operations live in `AppStore.tsx` - there are no separate operations files.

## Store Shape

The store holds chats (with their message trees), current selection, settings, and streaming state. Maps are used for O(1) lookups.

## Adding Features

1. Add types to `AppStateStore` in `src/utils/persistence.ts`
2. Add default values in `createDefaultState()`
3. Add operations directly in `AppStoreProvider`
4. Export via the context value

## Persistence

State automatically persists to localStorage via a `createEffect`. Serialization logic lives in `src/utils/persistence.ts` and handles Map-to-array conversion for JSON compatibility.

## Reactivity

Components access the store via `useAppStore()` and SolidJS tracks dependencies automatically. Use `createMemo` for derived values that need caching.
