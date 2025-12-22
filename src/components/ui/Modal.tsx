import { Component, JSX, Show } from 'solid-js'
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

const Modal: Component<ModalProps> = (props) => {
  const size = () => props.size ?? 'md'
  const closeOnBackdrop = () => props.closeOnBackdrop !== false

  const handleBackdropClick = () => {
    if (closeOnBackdrop()) {
      props.onClose()
    }
  }

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          class="fixed inset-0 bg-black/50 animate-fade-in"
          onClick={handleBackdropClick}
        />

        {/* Modal container */}
        <div
          class={classnames(
            'relative w-full max-h-[90vh] overflow-hidden',
            'bg-surface shadow-xl rounded-xl border border-border',
            'flex flex-col animate-fade-in-scale',
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
