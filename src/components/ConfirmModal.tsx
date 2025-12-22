import { Component } from 'solid-js'
import Button from './ui/Button'
import Modal from './ui/Modal'

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

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onCancel}
      title={props.title}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => props.onCancel()}>
            {cancelText()}
          </Button>
          <Button variant="danger" onClick={() => props.onConfirm()}>
            {confirmText()}
          </Button>
        </>
      }
    >
      <p class="text-text-muted">{props.message}</p>
    </Modal>
  )
}

export default ConfirmModal
