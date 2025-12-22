import { Component, JSX, Show, createSignal, createEffect, onCleanup } from 'solid-js'
import { classnames } from '../../utils'
import Icon from './Icon'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  size?: ModalSize
  children: JSX.Element
  footer?: JSX.Element
  /** Content rendered between header and main content (e.g., tabs) */
  headerExtra?: JSX.Element
  /** Whether clicking backdrop closes modal (default: true) */
  closeOnBackdrop?: boolean
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

const EXIT_DURATION = 150

const Modal: Component<ModalProps> = (props) => {
  const size = () => props.size ?? 'md'
  const closeOnBackdrop = () => props.closeOnBackdrop !== false

  const [mounted, setMounted] = createSignal(false)
  const [exiting, setExiting] = createSignal(false)
  let exitTimeout: number | undefined

  createEffect(() => {
    const isOpen = props.isOpen
    if (isOpen) {
      if (exitTimeout) {
        clearTimeout(exitTimeout)
        exitTimeout = undefined
      }
      setMounted(true)
      setExiting(false)
    } else if (mounted()) {
      setExiting(true)
      exitTimeout = window.setTimeout(() => {
        setMounted(false)
        setExiting(false)
        exitTimeout = undefined
      }, EXIT_DURATION)
    }
  })

  onCleanup(() => {
    if (exitTimeout) clearTimeout(exitTimeout)
  })

  const handleBackdropClick = () => {
    if (closeOnBackdrop()) {
      props.onClose()
    }
  }

  return (
    <Show when={mounted()}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          class={classnames(
            'fixed inset-0 bg-black/50',
            exiting() ? 'animate-fade-out' : 'animate-fade-in',
          )}
          onClick={handleBackdropClick}
        />

        {/* Modal container */}
        <div
          class={classnames(
            'relative w-full max-h-[90vh] overflow-hidden',
            'bg-surface shadow-xl rounded-xl border border-border',
            'flex flex-col',
            exiting() ? 'animate-fade-out-scale' : 'animate-fade-in-scale',
            sizeClasses[size()],
          )}
        >
          {/* Header */}
          <div class="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
            <h3 class="text-lg font-medium text-text tracking-tight">{props.title}</h3>
            <button
              class="p-1.5 rounded-md hover:bg-surface-hover transition-colors cursor-pointer text-text-muted hover:text-text"
              onClick={() => props.onClose()}
            >
              <Icon name="close" size="sm" />
            </button>
          </div>

          {/* Header extra (e.g., tabs) */}
          <Show when={props.headerExtra}>{props.headerExtra}</Show>

          {/* Content */}
          <div class="flex-1 overflow-y-auto p-5">{props.children}</div>

          {/* Footer (optional) */}
          <Show when={props.footer}>
            <div class="flex justify-end gap-3 px-5 py-3 border-t border-border shrink-0">
              {props.footer}
            </div>
          </Show>
        </div>
      </div>
    </Show>
  )
}

export default Modal
