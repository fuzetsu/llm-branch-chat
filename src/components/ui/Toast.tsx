import { Component } from 'solid-js'
import { classnames } from '../../utils'
import Icon from './Icon'

export type ToastType = 'success' | 'error'

export interface ToastData {
  id: string
  message: string
  type: ToastType
}

interface ToastProps {
  toast: ToastData
  onClose: (id: string) => void
}

const Toast: Component<ToastProps> = (props) => {
  const getTypeClasses = () => {
    switch (props.toast.type) {
      case 'success':
        return 'bg-success text-white'
      case 'error':
        return 'bg-danger text-white'
      default:
        return 'bg-surface text-text border border-border'
    }
  }

  const getIcon = () => {
    switch (props.toast.type) {
      case 'success':
        return 'check-circle'
      case 'error':
        return 'x-circle'
      default:
        return 'check-circle'
    }
  }

  return (
    <div
      class={classnames(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md animate-fade-in-slide-down',
        getTypeClasses(),
      )}
    >
      <Icon name={getIcon()} size="md" class="shrink-0" />
      <p class="flex-1 text-sm font-medium">{props.toast.message}</p>
      <button
        onClick={() => props.onClose(props.toast.id)}
        class="shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Close"
      >
        <Icon name="close" size="sm" />
      </button>
    </div>
  )
}

export default Toast
