/**
 * Shared UI styles for consistent component styling.
 * These use semantic color tokens defined in index.css.
 */

/**
 * Base styles for form inputs (Input, Select, Textarea).
 * Provides consistent border, focus, and disabled states.
 */
export const inputBaseStyles = [
  'px-3 py-2 rounded-md',
  'bg-surface text-text border border-border',
  'placeholder:text-text-placeholder',
  'focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'transition-colors',
].join(' ')

export const inputFullWidth = 'w-full'

/**
 * Base styles for interactive cards (list items, settings cards).
 */
export const cardBaseStyles = [
  'border border-border rounded-lg p-3',
  'hover:bg-surface-hover hover:border-border',
  'transition-colors',
].join(' ')

export const sectionStyles = 'space-y-3'

export const labelStyles = 'block text-sm font-medium text-text-secondary mb-1.5'

export const helpTextStyles = 'text-xs text-text-muted mt-1'
export const errorTextStyles = 'text-xs text-danger mt-1'

export const gaps = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
} as const
