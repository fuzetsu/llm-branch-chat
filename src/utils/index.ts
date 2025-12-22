/** Basic console.log wrapper that returns first argument for easy debugging */
export function p<T>(first: T, ...rest: unknown[]): T {
  console.log(first, ...rest)
  return first
}

/**
 * Generates a unique identifier using timestamp and random characters
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function generateChatId(): string {
  return generateId()
}

export function generateMessageId(): string {
  return generateId()
}

export function generateSystemPromptId(): string {
  return generateId()
}

/**
 * Formats a timestamp into a human-readable relative time string
 */
export function relativeTimestamp(timestamp: number) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
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
export function querySelector<T extends HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector)
}

/**
 * Safely queries all elements matching a selector
 */
export function querySelectorAll<T extends HTMLElement>(selector: string): NodeListOf<T> {
  return document.querySelectorAll(selector) as NodeListOf<T>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeoutId = -1
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const exec = () => {
      lastCall = Date.now()
      func(...args)
    }
    const now = Date.now()
    const delta = now - lastCall
    clearTimeout(timeoutId)

    if (delta >= wait) {
      exec()
      return
    }

    timeoutId = setTimeout(exec, wait - delta)
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength).trim() + '...'
}

type FalsyOr<T> = T | number | boolean | null | undefined | false | FalsyOr<T>[]

/**
 * Concatenates class names, filtering out falsy values
 * Supports both string arguments and objects where keys are class names
 * and values determine whether the class should be included
 */
export function classnames(...args: FalsyOr<string | Record<string, unknown>>[]): string {
  const classes: string[] = []

  for (const arg of args) {
    if (!arg) continue

    const type = typeof arg
    if (type === 'string' || type === 'number') {
      classes.push(String(arg))
    } else if (type === 'object' && arg !== null) {
      if (Array.isArray(arg)) {
        classes.push(classnames(...arg))
      } else {
        for (const [key, value] of Object.entries(arg)) {
          if (value) {
            classes.push(key)
          }
        }
      }
    }
  }

  return classes.join(' ')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function touch(_x: unknown): void {}

export function block<T>(callback: () => T): T {
  return callback()
}

export function isMobileBrowser() {
  if (window.matchMedia('(pointer:coarse)').matches) {
    return true // Touch-first devices
  }

  const ua = navigator.userAgent.toLowerCase()
  return (
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) ||
    navigator.maxTouchPoints > 0 ||
    'ontouchstart' in window
  )
}
