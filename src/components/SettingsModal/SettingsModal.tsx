import { Component, createEffect, Show, createSignal, batch } from 'solid-js'
import { useAppStore } from '../../store/AppStore'
import { downloadJsonFile, createFileInput } from '../../utils/fileUtils'
import { classnames } from '../../utils'
import {
  exportStateToJsonExternal,
  importDraftStateFromExternalJson,
  importStateFromJson,
} from '../../utils/persistence'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import ProvidersTab from './components/ProvidersTab'
import ChatSettingsTab from './components/ChatSettingsTab'
import UISettingsTab from './components/UISettingsTab'
import SystemPromptsTab from './components/SystemPromptsTab'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'providers' | 'chat' | 'ui' | 'system'

const SettingsModal: Component<SettingsModalProps> = (props) => {
  const store = useAppStore()
  const [activeTab, setActiveTab] = createSignal<Tab>('providers')

  const handleConfirmDataLoss = () => {
    if (preventClose()) {
      const shouldClose = confirm('There are unsaved changes, are you sure you want to leave?')
      if (!shouldClose) return false
      else setPreventClose(false)
    }
    return true
  }

  const handleTabSwitch = (tab: Tab) => {
    if (handleConfirmDataLoss()) setActiveTab(tab)
  }

  // Import/export state feedback
  const [importState, setImportState] = createSignal<{
    success: boolean
    message: string
  } | null>(null)

  const [preventClose, setPreventClose] = createSignal(false)

  const storageSizeInBytes = () =>
    new TextEncoder().encode(exportStateToJsonExternal(store.state, store.draftState)).length

  createEffect(() => {
    if (importState()?.success || props.isOpen) {
      batch(() => {
        setImportState(null)
        setPreventClose(false)
      })
    }
  })

  const handleExportState = () => {
    try {
      const jsonData = exportStateToJsonExternal(store.state, store.draftState, true)
      const filename = `llm-chat-state-export-${new Date().toISOString().split('T')[0]}.json`
      downloadJsonFile(jsonData, filename)
    } catch (error) {
      console.error('Failed to export state:', error)
      setImportState({
        success: false,
        message: 'Failed to export state. Please try again.',
      })
    }
  }

  const handleImportState = (content: string) => {
    setImportState(null)

    try {
      if (!content.trim()) {
        throw new Error('Empty file')
      }

      const newState = importStateFromJson(content)
      store.replaceState(newState)

      const newDraftState = importDraftStateFromExternalJson(content)
      store.replaceDraftState(newDraftState)

      setImportState({
        success: true,
        message: 'State imported successfully!',
      })
      setTimeout(() => setImportState(null), 3000)
    } catch (error) {
      console.error('Failed to import state:', error)
      setImportState({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import state',
      })
    }
  }

  const triggerFileImport = () => {
    createFileInput((content) => handleImportState(content), '.json')
  }

  const handleClose = () => {
    if (handleConfirmDataLoss()) props.onClose()
  }

  const tabClass = (tabName: Tab) =>
    classnames(
      'py-2 px-1 border-b-2 font-medium text-sm cursor-pointer transition-colors',
      activeTab() === tabName
        ? 'border-primary text-primary'
        : 'border-transparent text-text-muted hover:text-text-secondary',
    )

  const tabs = (
    <div class="border-b border-border shrink-0">
      <nav class="flex gap-6 px-5">
        <button class={tabClass('providers')} onClick={() => handleTabSwitch('providers')}>
          Providers
        </button>
        <button class={tabClass('chat')} onClick={() => handleTabSwitch('chat')}>
          Chat
        </button>
        <button class={tabClass('ui')} onClick={() => handleTabSwitch('ui')}>
          UI
        </button>
        <button class={tabClass('system')} onClick={() => handleTabSwitch('system')}>
          System
        </button>
      </nav>
    </div>
  )

  const footer = (
    <>
      <Button variant="secondary" onClick={handleClose}>
        Close
      </Button>
    </>
  )

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleClose}
      title="Settings"
      size="xl"
      headerExtra={tabs}
      footer={footer}
    >
      <div class="space-y-4">
        <Show when={activeTab() === 'providers'}>
          <ProvidersTab
            setPreventClose={setPreventClose}
            storageSizeInBytes={storageSizeInBytes()}
            importState={importState()}
            onExportState={handleExportState}
            onImportState={triggerFileImport}
          />
        </Show>

        <Show when={activeTab() === 'chat'}>
          <ChatSettingsTab />
        </Show>

        <Show when={activeTab() === 'ui'}>
          <UISettingsTab />
        </Show>

        <Show when={activeTab() === 'system'}>
          <SystemPromptsTab setPreventClose={setPreventClose} />
        </Show>
      </div>
    </Modal>
  )
}

export default SettingsModal
