import { Component, Show } from 'solid-js'
import Icon from './Icon'
import Button from './ui/Button'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmModal: Component<ConfirmModalProps> = (props) => {
  const confirmText = () => props.confirmText || 'Confirm'
  const cancelText = () => props.cancelText || 'Cancel'

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onCancel()
    }
  }

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
        onClick={handleBackdropClick}
      >
        {/* Backdrop */}
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />

        {/* Modal */}
        <div class="relative w-full max-w-md max-h-[90vh] overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-dark-surface shadow-xl rounded-2xl border dark:border-dark-border flex flex-col">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              {props.title}
            </h3>
            <button
              class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => props.onCancel()}
            >
              <Icon name="close" class="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-y-auto p-6">
            <p class="text-sm text-gray-500 dark:text-gray-400">{props.message}</p>
          </div>

          {/* Footer */}
          <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-dark-border flex-shrink-0">
            <Button variant="secondary" onClick={() => props.onCancel()}>
              {cancelText()}
            </Button>
            <Button variant="danger" onClick={() => props.onConfirm()}>
              {confirmText()}
            </Button>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default ConfirmModal
