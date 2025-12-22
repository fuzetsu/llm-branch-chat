import { Component, createEffect, Show, createSignal, untrack } from 'solid-js'
import { createStore, unwrap } from 'solid-js/store'
import { useAppStore, exportStateToJson, importStateFromJson } from '../../store/AppStore'
import { downloadJsonFile, createFileInput } from '../../utils/fileUtils'
import { getAllAvailableModels, getModelsGroupedByProvider } from '../../utils/providerUtils'
import { classnames } from '../../utils'
import type { ProviderConfig, SystemPrompt } from '../../types'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import ProvidersTab from './components/ProvidersTab'
import ChatSettingsTab, { type ChatSettingsForm } from './components/ChatSettingsTab'
import UISettingsTab, { type UISettingsForm, type ThemeOption } from './components/UISettingsTab'
import SystemPromptsTab from './components/SystemPromptsTab'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'providers' | 'chat' | 'ui' | 'system'

const SettingsModal: Component<SettingsModalProps> = (props) => {
  const store = useAppStore()
  const [activeTab, setActiveTab] = createSignal<Tab>('providers')

  // Import/export state feedback
  const [importState, setImportState] = createSignal<{
    success: boolean
    message: string
  } | null>(null)

  // Form state for all settings - kept local until save
  const [providersForm, setProvidersForm] = createStore<{
    providers: Map<string, ProviderConfig>
  }>({
    providers: new Map(),
  })

  const [chatForm, setChatForm] = createStore<ChatSettingsForm>({
    model: '',
    temperature: 0.7,
    maxTokens: 2048,
    autoGenerateTitle: true,
    titleGenerationTrigger: 2,
    titleModel: '',
  })

  const [uiForm, setUiForm] = createStore<UISettingsForm>({
    theme: 'auto',
  })

  const [systemPromptsForm, setSystemPromptsForm] = createStore<{
    prompts: Map<string, SystemPrompt>
    defaultId: string | null
  }>({
    prompts: new Map(),
    defaultId: null,
  })

  const storageSizeInBytes = () => new TextEncoder().encode(exportStateToJson(store.state)).length

  const allAvailableModels = () => getAllAvailableModels(providersForm.providers)
  const groupedModels = () => getModelsGroupedByProvider(providersForm.providers)

  createEffect(() => {
    if (props.isOpen) {
      const settings = untrack(() => unwrap(store.state.settings))

      setProvidersForm({
        providers: new Map(settings.api.providers),
      })

      setChatForm({
        model: settings.chat.model,
        temperature: settings.chat.temperature,
        maxTokens: settings.chat.maxTokens,
        autoGenerateTitle: settings.chat.autoGenerateTitle,
        titleGenerationTrigger: settings.chat.titleGenerationTrigger,
        titleModel: settings.chat.titleModel,
      })

      setUiForm({
        theme: settings.ui.theme,
      })

      setSystemPromptsForm({
        prompts: new Map(settings.systemPrompts),
        defaultId: settings.chat.defaultSystemPromptId,
      })

      setImportState(null)
    }
  })

  const handleExportState = () => {
    try {
      const jsonData = exportStateToJson(store.state, true)
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

  const handleSave = () => {
    store.updateSettings({
      api: {
        providers: providersForm.providers,
      },
      chat: {
        model: chatForm.model,
        availableModels: allAvailableModels(),
        temperature: chatForm.temperature,
        maxTokens: chatForm.maxTokens,
        autoGenerateTitle: chatForm.autoGenerateTitle,
        titleGenerationTrigger: chatForm.titleGenerationTrigger,
        titleModel: chatForm.titleModel,
        defaultSystemPromptId: systemPromptsForm.defaultId,
      },
      ui: {
        theme: uiForm.theme,
        sidebarCollapsed: store.state.settings.ui.sidebarCollapsed,
        archivedSectionCollapsed: store.state.settings.ui.archivedSectionCollapsed,
        isGenerating: store.state.settings.ui.isGenerating,
        editTextareaSize: store.state.settings.ui.editTextareaSize,
      },
      systemPrompts: systemPromptsForm.prompts,
    })

    props.onClose()
  }

  const handleCancel = () => {
    props.onClose()
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
        <button class={tabClass('providers')} onClick={() => setActiveTab('providers')}>
          Providers
        </button>
        <button class={tabClass('chat')} onClick={() => setActiveTab('chat')}>
          Chat
        </button>
        <button class={tabClass('ui')} onClick={() => setActiveTab('ui')}>
          UI
        </button>
        <button class={tabClass('system')} onClick={() => setActiveTab('system')}>
          System
        </button>
      </nav>
    </div>
  )

  const footer = (
    <>
      <Button variant="secondary" onClick={handleCancel}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSave}>
        Save Settings
      </Button>
    </>
  )

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleCancel}
      title="Settings"
      size="xl"
      headerExtra={tabs}
      footer={footer}
    >
      <div class="space-y-4">
        <Show when={activeTab() === 'providers'}>
          <ProvidersTab
            providers={providersForm.providers}
            storageSizeInBytes={storageSizeInBytes()}
            importState={importState()}
            onUpdateProviders={(providers) => {
              setProvidersForm({ providers })
            }}
            onExportState={handleExportState}
            onImportState={triggerFileImport}
          />
        </Show>

        <Show when={activeTab() === 'chat'}>
          <ChatSettingsTab
            form={chatForm}
            groupedModels={groupedModels()}
            onUpdate={(key, value) => setChatForm(key, value)}
          />
        </Show>

        <Show when={activeTab() === 'ui'}>
          <UISettingsTab
            form={uiForm}
            onUpdate={(key, value) => setUiForm(key, value as ThemeOption)}
          />
        </Show>

        <Show when={activeTab() === 'system'}>
          <SystemPromptsTab
            systemPrompts={systemPromptsForm.prompts}
            defaultSystemPromptId={systemPromptsForm.defaultId}
            onUpdatePrompts={(prompts) => setSystemPromptsForm('prompts', prompts)}
            onUpdateDefaultId={(id) => setSystemPromptsForm('defaultId', id)}
          />
        </Show>
      </div>
    </Modal>
  )
}

export default SettingsModal
