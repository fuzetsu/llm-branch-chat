import { Component, createEffect, createMemo, Show, createSignal, untrack } from 'solid-js'
import { createStore, unwrap } from 'solid-js/store'
import { useAppStore, exportStateToJson, importStateFromJson } from '../../store/AppStore'
import { downloadJsonFile, createFileInput } from '../../utils/fileUtils'
import { getAllAvailableModels, getModelsGroupedByProvider } from '../../utils/providerUtils'
import { classnames } from '../../utils'
import type { ProviderConfig, SystemPrompt } from '../../types'
import Icon from '../ui/Icon'
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

  // Computed values
  const storageSizeInBytes = createMemo(() =>
    props.isOpen ? new TextEncoder().encode(exportStateToJson(store.state)).length : 0,
  )

  const allAvailableModels = createMemo(() => getAllAvailableModels(providersForm.providers))
  const groupedModels = createMemo(() => getModelsGroupedByProvider(providersForm.providers))

  // Load current settings into forms when modal opens
  createEffect(() => {
    if (props.isOpen) {
      const settings = untrack(() => unwrap(store.state.settings))

      // Load providers
      setProvidersForm({
        providers: new Map(settings.api.providers),
      })

      // Load chat settings
      setChatForm({
        model: settings.chat.model,
        temperature: settings.chat.temperature,
        maxTokens: settings.chat.maxTokens,
        autoGenerateTitle: settings.chat.autoGenerateTitle,
        titleGenerationTrigger: settings.chat.titleGenerationTrigger,
        titleModel: settings.chat.titleModel,
      })

      // Load UI settings
      setUiForm({
        theme: settings.ui.theme,
      })

      // Load system prompts
      setSystemPromptsForm({
        prompts: new Map(settings.systemPrompts),
        defaultId: settings.chat.defaultSystemPromptId,
      })

      // Reset import state
      setImportState(null)
    }
  })

  // Import/Export handlers
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

  // Save all settings
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

  // Tab styling
  const tabClass = (tabName: Tab) =>
    classnames(
      'py-2 px-1 border-b-2 font-medium text-sm cursor-pointer transition-colors',
      activeTab() === tabName
        ? 'border-primary text-primary'
        : 'border-transparent text-text-muted hover:text-text-secondary',
    )

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div class="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCancel} />

        {/* Modal */}
        <div class="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-surface shadow-xl rounded-xl border border-border flex flex-col">
          {/* Header */}
          <div class="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
            <h3 class="text-lg font-medium text-text tracking-tight">Settings</h3>
            <button
              class="p-1.5 rounded-md hover:bg-surface-hover transition-colors cursor-pointer text-text-muted hover:text-text"
              onClick={handleCancel}
            >
              <Icon name="close" size="sm" />
            </button>
          </div>

          {/* Tabs */}
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

          {/* Content */}
          <div class="flex-1 overflow-y-auto p-5">
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
          </div>

          {/* Footer */}
          <div class="flex justify-end gap-3 px-5 py-3 border-t border-border shrink-0">
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default SettingsModal
