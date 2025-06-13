# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript in `dist/`
- **Watch**: `npm run watch` - Compiles TypeScript in watch mode for development
- **Serve**: `npm run serve` - Serves the application on <http://localhost:8080>

## Architecture Overview

This is a client-side TypeScript chat application with a modular architecture:

### Core Components

- **App.ts**: Main application class that orchestrates all managers and handles global event coordination
- **AppState.ts**: Centralized state management with localStorage persistence
- **ApiService.ts**: HTTP client for chat API communication with streaming support

### Feature Managers

- **ChatManager**: Handles chat lifecycle (create, archive, delete, title generation)
- **MessageManager**: Manages message operations (send, edit, regenerate, branching)
- **UIManager**: Handles DOM updates and UI state synchronization
- **SettingsManager**: Manages application settings and modals

### Key Architecture Patterns

1. **Manager Pattern**: Each feature is encapsulated in a dedicated manager class
2. **Global Exposure**: Managers are exposed to `window` for HTML event handlers
3. **Centralized State**: All state flows through `AppState` with automatic persistence
4. **Event-Driven**: UI updates are triggered by state changes through proxy handlers

### State Management

- **Persistence**: All state is automatically saved to localStorage
- **Serialization**: Maps are serialized to arrays for JSON storage
- **Migration**: Automatic migration of older state formats
- **Reactive UI**: State changes trigger UI updates via proxies

### Message Branching System

Messages support branching for conversation alternatives:

- Each message can have multiple branches (alternative responses)
- `messageBranches` Map stores branches per message ID
- `currentBranches` Map tracks active branch index per message
- UI provides navigation between branches

### API Integration

- Streaming responses with token-by-token updates
- Configurable base URL and models via settings
- Per-chat model selection with fallback to global setting
- Automatic title generation using separate model

## Development Notes

- TypeScript with strict configuration
- No external dependencies beyond TypeScript
- ES modules with bundler module resolution
- HTML uses inline event handlers that call global manager methods

