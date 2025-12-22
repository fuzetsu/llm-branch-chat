# Styling Architecture

This document covers the styling strategy and patterns used throughout the application.

## Technology Stack

- **Tailwind CSS v4** with custom theme configuration
- **Semantic CSS variables** for theming (light/dark mode)
- **SolidJS** reactive classes via the `classnames` utility

## Theming Approach

The app uses a semantic color token system defined in `src/index.css`. Colors are defined as CSS variables on `:root` (light mode) and `.dark` (dark mode), then registered with Tailwind's `@theme` block.

**Key principle**: Components use semantic color classes like `bg-surface`, `text-text-muted`, `border-border` rather than raw colors or explicit `dark:` prefixes. The theme automatically switches based on the `.dark` class on the document root.

**Color categories**:
- `bg-*` / `surface-*` - Background and surface colors
- `text-*` - Text colors with semantic variants (muted, secondary, placeholder)
- `border-*` - Border colors
- `primary`, `danger`, `success` - Semantic action colors
- `message-user-*`, `message-assistant-*` - Message bubble specific colors

## Shared Component Styles

`src/components/ui/styles.ts` exports shared style constants:
- `inputBaseStyles` - Common styles for Input, Select, Textarea
- `inputFullWidth` - Full-width modifier
- `cardBaseStyles` - Card/panel styling

Use these when creating new form elements or card-like components to maintain consistency.

## UI Component Patterns

### Modal
`src/components/ui/Modal.tsx` provides the standard modal structure (backdrop, header with close button, scrollable content, optional footer). Use this for all modal dialogs rather than implementing modal chrome inline.

### Custom Form Elements
Native form elements (checkbox, range slider, scrollbars) have custom styling in `src/index.css` that uses theme colors. These styles ensure form elements match the theme without additional class overrides.

### Conditional Classes
Use the `classnames()` utility from `src/utils` for conditional class application:
```tsx
class={classnames(
  'base-classes',
  condition && 'conditional-class',
  anotherCondition ? 'true-class' : 'false-class'
)}
```

## Typography

- Headings (`text-lg` and larger) use `tracking-tight` for refined letter-spacing
- Metadata/timestamps use `text-text-muted` for consistent muted appearance
- Font weights: `font-medium` for labels, `font-semibold` for headings

## Responsive Patterns

The app uses Tailwind's standard breakpoints:
- `md:` (768px) - Medium screens
- `lg:` (1024px) - Large screens (sidebar always visible)

Progressive disclosure pattern: Show more UI elements as screen size increases, collapse secondary actions into menus on smaller screens.
