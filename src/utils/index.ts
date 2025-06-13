/**
 * Generates a unique identifier using timestamp and random characters
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * Formats a timestamp into a human-readable relative time string
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

/**
 * Safely gets an element by ID with type checking
 */
export function getElementById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id) as T | null
  if (!element) {
    throw new Error(`Element with id "${id}" not found`)
  }
  return element
}

/**
 * Safely queries a selector with type checking
 */
export function querySelector<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector(selector) as T | null
  if (!element) {
    throw new Error(`Element with selector "${selector}" not found`)
  }
  return element
}

/**
 * Safely queries all elements matching a selector
 */
export function querySelectorAll<T extends HTMLElement>(selector: string): NodeListOf<T> {
  return document.querySelectorAll(selector) as NodeListOf<T>
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return (...args: Parameters<T>) => {
    const later = () => {
      timeoutId = undefined
      func(...args)
    }

    clearTimeout(timeoutId)
    timeoutId = setTimeout(later, wait)
  }
}

/**
 * Creates a delay promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

/**
 * Truncates text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength).trim() + '...'
}

/**
 * Deep clones an object (for simple objects without functions)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as unknown as T
  }

  if (typeof obj === 'object') {
    const cloned = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }

  return obj
}

/**
 * Renders markdown content to HTML
 */
export async function renderMarkdown(content: string): Promise<string> {
  const { marked } = await import('marked')
  const result = marked(content)
  return await result
}
