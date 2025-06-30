# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run build` - Compiles SolidJS application to optimized bundle in `dist/`
- **Dev**: `npm run dev` - Runs Vite development server on <http://localhost:8080>
- **Serve**: `npm run serve` - Serves the built application
- **Type Check**: `npm run type-check` - Runs TypeScript type checking without emitting files
- **Lint**: `npm run lint` - Runs ESLint with SolidJS and TypeScript rules
- **Format**: `npm run format` - Formats code using Prettier
- **Verify Build**: `npm run verify-build` - Runs linting, type checking, AND build verification in one command

## Testing Rule

- **Primary Verification**: Use `npm run verify-build` for complete validation (linting + type checking + build)
- **Build Verification**: If `npm run verify-build` passes without errors, the application is considered functional
- **Code Quality**: ESLint with SolidJS and TypeScript rules ensures code consistency and catches potential issues
- **Type Safety**: TypeScript compilation with strict checking ensures code quality and prevents runtime errors
- **Code Formatting**: Run `npm run format` at the end of task implementations to ensure proper code formatting
- **No Dev Server Testing Required**: Running the dev server is not necessary for verification unless specifically debugging runtime issues

## Architecture Overview

This is a modern SolidJS chat application with reactive state management and component-based architecture.

### Core Components

- **App.tsx**: Root SolidJS component with global state provider and routing
- **AppStore.tsx**: Reactive state management using SolidJS stores with localStorage persistence and composed operations architecture
- **AppStoreOperations.tsx**: Modular operations layer providing chat, message, and streaming functionality
- **ApiService.ts**: HTTP client for chat API communication with streaming support and SolidJS integration

### Component Architecture

- **Layout Components**: `Layout.tsx`, `Header.tsx`, `Sidebar.tsx` - Main application structure
- **Chat Components**: `ChatList.tsx`, `ChatItem.tsx`, `ChatArea.tsx` - Chat management interface
- **Message Components**: `MessageList.tsx`, `Message.tsx`, `MessageInput.tsx`, `MessageBranching.tsx` - Message display and interaction
- **Modal Components**: `SettingsModal.tsx`, `ConfirmModal.tsx`, `Portal.tsx` - Modal system with portal rendering
- **UI Components**: `Icon.tsx` - Centralized icon system with type-safe interface

### Key Architecture Patterns

1. **Reactive State Management**: SolidJS stores with fine-grained reactivity for optimal performance
2. **Component Composition**: Modular components with clear separation of concerns
3. **Context Providers**: Global state access through SolidJS context system
4. **Portal Rendering**: Modal components rendered at document body level for proper layering

### State Management

- **Reactive Stores**: All state managed through SolidJS `createStore` with automatic reactivity
- **Persistence**: Automatic localStorage persistence with effects
- **Serialization**: Maps are serialized to arrays for JSON storage with backward compatibility
- **Migration**: Automatic migration of older state formats maintained
- **Composed Operations**: Modular operations architecture with dependency injection pattern
- **Type-Safe Operations**: Strong typing for state operations with proper error handling

### Message Branching System

Messages support branching for conversation alternatives with full metadata tracking:

- Each message can have multiple branches (alternative responses)
- `messageBranches` Map stores branches per message ID with metadata
- `currentBranches` Map tracks active branch index per message
- Each branch stores: content, children, timestamp, and model used
- UI provides navigation between branches with branch-specific timestamps
- Editing or regenerating messages creates new branches with fresh timestamps
- Full backward compatibility with existing branch data

### API Integration

- **Streaming Responses**: Real-time token-by-token updates using SolidJS signals
- **SolidApiService**: Wrapper class providing reactive streaming via `streamToSignals()`
- **Configurable Models**: Per-chat model selection with fallback to global settings
- **Title Generation**: Automatic chat title creation using separate model
- **Error Handling**: Comprehensive error recovery with user-friendly messages

## UI Features

### Message Display

- Relative timestamps on all messages (e.g., "5m ago", "Just now")
- Branch-specific timestamps that update when editing/regenerating
- Model indicators for messages generated with different models
- Real-time streaming indicators with animated cursors
- Inline message editing with keyboard shortcuts

### Chat Management

- Create, edit, archive, and delete chats with confirmation modals
- Real-time chat list updates with reactive sorting
- Chat title editing with Enter/Escape keyboard shortcuts
- Visual selection states and hover actions

### Mobile Optimization

- Fully responsive design with collapsible sidebar
- Touch-friendly interface elements with proper tap targets
- Mobile sidebar with backdrop overlay and smooth transitions
- Optimized layout that adapts to different screen sizes

### Modal System

- Professional modal components with portal rendering
- Settings modal with reactive form controls and real-time validation
- Confirmation modals for destructive actions
- Proper focus management and keyboard navigation

## CSS Architecture

The application uses Tailwind CSS with minimal custom styles for optimal maintainability:

### Styling Approach

- **Tailwind CSS**: Utility-first framework via CDN with custom color palette
- **Custom Colors**: Extended theme with dark mode support (`primary`, `primary-dark`, `danger`, `dark-bg`, etc.)
- **Global Styles**: Minimal custom CSS for markdown content rendering in messages
- **Component Styles**: All styling done through Tailwind utility classes

### Dark Mode Support

- Class-based dark mode implementation (`dark:` prefixes)
- Custom dark theme colors integrated with Tailwind configuration
- Automatic theme detection and manual theme switching
- Consistent dark mode styling across all components

### Layout System

- Flexbox-based responsive layout using Tailwind utilities
- Fixed header with proper z-index layering
- Sidebar with transform-based mobile toggles
- Optimized for both desktop and mobile experiences

## Icon System

Centralized icon management with type safety:

- **Icon Component**: `Icon.tsx` with string union type for icon names
- **Type Safety**: `IconName` union prevents invalid icon usage
- **Size Variants**: Small, medium, and large size options
- **Consistent SVG Paths**: All icons use standardized SVG implementations
- **Available Icons**: `menu`, `settings`, `plus`, `close`, `edit`, `regenerate`, `send`, `archive`, `delete`

## Development Notes

### Code Conventions

- **Flow Control**: Use proper Solid JS flow control components like Show, For, Index, Match
  - Prefer these components over traditional JavaScript control structures for better reactivity and performance

### Technology Stack

- **SolidJS**: Reactive UI framework with fine-grained reactivity
- **TypeScript**: Full type safety with strict configuration
- **Vite**: Modern build tool with HMR and optimized bundling
- **Tailwind CSS**: Utility-first styling framework

### Code Organization

```
src/
├── App.tsx                 # Root component
├── main.tsx               # Application entry point
├── store/
│   ├── AppStore.tsx       # Global reactive state management
│   └── AppStoreOperations.tsx # Modular operations layer
├── components/            # All SolidJS components
│   ├── Layout.tsx         # Main layout structure
│   ├── Header.tsx         # App header with navigation
│   ├── Sidebar.tsx        # Chat list sidebar
│   ├── ChatArea.tsx       # Main chat interface
│   ├── ChatList.tsx       # Reactive chat list
│   ├── ChatItem.tsx       # Individual chat item
│   ├── MessageList.tsx    # Message container
│   ├── Message.tsx        # Individual message
│   ├── MessageInput.tsx   # Message input area
│   ├── MessageBranching.tsx # Branch navigation
│   ├── SettingsModal.tsx  # Settings interface
│   ├── ConfirmModal.tsx   # Confirmation dialogs
│   ├── Portal.tsx         # Modal portal system
│   └── Icon.tsx           # Icon component
├── services/
│   └── ApiService.ts      # API communication
├── types/
│   └── index.ts          # TypeScript type definitions
└── utils/
    └── index.ts          # Utility functions
```

### Performance Considerations

- **Reactive Updates**: SolidJS provides optimal re-rendering with fine-grained reactivity
- **Component Granularity**: Small, focused components for efficient updates
- **Bundle Size**: Optimized build produces ~66KB (21KB gzipped)
- **Memory Management**: Proper cleanup of effects and event handlers

### Build Process

- **Verification Command**: `npm run verify-build` provides complete validation pipeline
- **Code Linting**: ESLint with SolidJS plugin enforces code quality and catches potential issues
- **Type Checking**: Strict TypeScript compilation with `tsc --noEmit` before build
- **Vite Configuration**: Optimized for SolidJS with TypeScript support
- **Bundle Analysis**: Build process provides size analysis and optimization hints
- **Production Ready**: Minified, tree-shaken, and optimized for deployment
- **Quality Assurance**: ESLint and type safety ensure code quality and runtime error prevention

### Backward Compatibility

- **Data Migration**: Existing localStorage data is automatically migrated
- **Legacy Support**: Old chat data and settings are preserved during migration
- **API Compatibility**: Maintains compatibility with existing API endpoints
- **Feature Parity**: All original functionality preserved with modern enhancements
