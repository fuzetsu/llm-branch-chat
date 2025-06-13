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

Messages support branching for conversation alternatives with full metadata tracking:

- Each message can have multiple branches (alternative responses)
- `messageBranches` Map stores branches per message ID with metadata
- `currentBranches` Map tracks active branch index per message
- Each branch stores: content, children, timestamp, and model used
- UI provides navigation between branches with branch-specific timestamps
- Editing or regenerating messages creates new branches with fresh timestamps
- Data migration ensures backward compatibility for existing branches

### API Integration

- Streaming responses with token-by-token updates
- Configurable base URL and models via settings
- Per-chat model selection with fallback to global setting
- Automatic title generation using separate model

## UI Features

### Message Display

- Relative timestamps on all messages (e.g., "5m ago", "Just now")
- Branch-specific timestamps that update when editing/regenerating
- Hover tooltips showing full date/time information
- Model indicators for messages generated with different models

### Mobile Optimization

- Responsive design with collapsible sidebar
- Fixed viewport height to prevent scroll issues
- Proper header/nav positioning in mobile views
- Touch-friendly interface elements

## CSS Architecture

The application uses a modular CSS architecture to prevent conflicts and improve maintainability:

### CSS Modules

- **`css/variables.css`**: CSS custom properties and theme definitions
- **`css/base.css`**: Reset styles and utility classes
- **`css/layout.css`**: Main app layout (header, sidebar, main-content)
- **`css/messages.css`**: Message display, editing, and branching features
- **`css/components.css`**: Reusable UI components (buttons, chat lists, etc.)
- **`css/forms.css`**: Input areas and form elements
- **`css/modals.css`**: Modal dialog components
- **`css/responsive.css`**: Mobile and responsive styles

### CSS Variables

Key layout constants are defined in `variables.css`:

- `--header-height`: 60px (header content height)
- `--header-total-height`: 61px (height + border, used for padding-top)

### Layout System

- Fixed header with `position: fixed` and `z-index: 100`
- Sidebar and main content use `padding-top: var(--header-total-height)` to avoid header overlap
- Mobile responsive design with collapsible sidebar overlay
- Flexbox layout for reliable cross-browser compatibility
- **Important**: Mobile styles avoid double-accounting for header height (use padding-top OR height calc, not both)

## Development Notes

- TypeScript with strict configuration and exact optional property types
- No external dependencies beyond TypeScript
- ES modules with bundler module resolution
- HTML uses inline event handlers that call global manager methods
- Automatic data migration for schema changes
- Comprehensive timestamp tracking for conversation history
- Modular CSS prevents layout conflicts and improves maintainability
