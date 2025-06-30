import { Component, createEffect, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Icon from './ui/Icon'
import FormField from './ui/FormField'
import Input from './ui/Input'
import Textarea from './ui/Textarea'
import Select from './ui/Select'
import Checkbox from './ui/Checkbox'
import Slider from './ui/Slider'
import Button from './ui/Button'
import { createStore } from 'solid-js/store'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SettingsModal: Component<SettingsModalProps> = (props) => {
  const store = useAppStore()

  // Local form state
  const [formData, setFormData] = createStore({
    apiBaseUrl: '',
    apiKey: '',
    availableModels: '',
    defaultModel: '',
    temperature: 0.7,
    maxTokens: 2048,
    autoGenerateTitle: true,
    titleGenerationTrigger: 2,
    titleModel: '',
    theme: 'auto' as 'light' | 'dark' | 'auto',
  })

  // Parse models from text area
  const availableModelsList = () => {
    return formData.availableModels
      .split('\n')
      .map((model) => model.trim())
      .filter((model) => model.length > 0)
  }

  // Convert model list to Select options
  const getModelOptions = () => {
    return availableModelsList().map((model) => ({ value: model, label: model }))
  }

  // Load current settings into form when modal opens
  createEffect(() => {
    if (props.isOpen) {
      const settings = store.state.settings
      setFormData({
        apiBaseUrl: settings.api.baseUrl,
        apiKey: settings.api.key,
        availableModels: settings.chat.availableModels.join('\n'),
        defaultModel: settings.chat.model,
        temperature: settings.chat.temperature,
        maxTokens: settings.chat.maxTokens,
        autoGenerateTitle: settings.chat.autoGenerateTitle,
        titleGenerationTrigger: settings.chat.titleGenerationTrigger,
        titleModel: settings.chat.titleModel,
        theme: settings.ui.theme,
      })
    }
  })

  const handleSave = () => {
    const models = availableModelsList()

    store.updateSettings({
      api: {
        baseUrl: formData.apiBaseUrl,
        key: formData.apiKey,
        availableModels: models,
      },
      chat: {
        model: formData.defaultModel,
        availableModels: models,
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
        autoGenerateTitle: formData.autoGenerateTitle,
        titleGenerationTrigger: formData.titleGenerationTrigger,
        titleModel: formData.titleModel,
      },
      ui: {
        theme: formData.theme,
        sidebarCollapsed: store.state.settings.ui.sidebarCollapsed,
        archivedSectionCollapsed: store.state.settings.ui.archivedSectionCollapsed,
        isGenerating: store.state.settings.ui.isGenerating,
        editTextareaSize: store.state.settings.ui.editTextareaSize,
      },
    })

    props.onClose()
  }

  const handleCancel = () => {
    props.onClose()
  }

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300">
        {/* Backdrop */}
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={handleCancel} />

        {/* Modal */}
        <div class="relative w-full max-w-md max-h-[90vh] overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-dark-surface shadow-xl rounded-2xl border dark:border-dark-border flex flex-col">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">Settings</h3>
            <button
              class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={handleCancel}
            >
              <Icon name="close" class="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-y-auto p-6">
            <div class="space-y-6">
              <FormField label="API Base URL">
                <Input
                  type="text"
                  placeholder="https://api.openai.com/v1"
                  value={formData.apiBaseUrl}
                  onInput={(value) => setFormData('apiBaseUrl', value)}
                />
              </FormField>

              <FormField label="API Key">
                <Input
                  type="password"
                  placeholder="Your API key"
                  value={formData.apiKey}
                  onInput={(value) => setFormData('apiKey', value)}
                />
              </FormField>

              <FormField label="Available Models (one per line)">
                <Textarea
                  rows={4}
                  placeholder="gpt-4&#10;gpt-3.5-turbo&#10;claude-3-sonnet"
                  value={formData.availableModels}
                  onInput={(value) => setFormData('availableModels', value)}
                />
              </FormField>

              <FormField label="Default Model">
                <Select
                  value={formData.defaultModel}
                  onChange={(value) => setFormData('defaultModel', value)}
                  options={getModelOptions}
                  placeholder="Select a model"
                />
              </FormField>

              <FormField label="Temperature">
                <Slider
                  value={formData.temperature}
                  onInput={(value) => setFormData('temperature', value)}
                  min={0}
                  max={2}
                  step={0.1}
                  showValue={true}
                />
              </FormField>

              <FormField label="Max Tokens">
                <Input
                  type="number"
                  value={formData.maxTokens}
                  onInput={(value) => setFormData('maxTokens', parseInt(value))}
                  min="1"
                  max="4096"
                />
              </FormField>

              <Checkbox
                checked={formData.autoGenerateTitle}
                onInput={(checked) => setFormData('autoGenerateTitle', checked)}
                label="Auto-generate chat titles"
              />

              <FormField
                label="Title Generation Trigger (total messages)"
                helpText="Generate title after this many total messages (user + assistant)"
              >
                <Input
                  type="number"
                  value={formData.titleGenerationTrigger}
                  onInput={(value) => setFormData('titleGenerationTrigger', parseInt(value))}
                  min="1"
                  max="20"
                />
              </FormField>

              <FormField label="Title Generation Model">
                <Select
                  value={formData.titleModel}
                  onChange={(value) => setFormData('titleModel', value)}
                  options={getModelOptions}
                  placeholder="Select a model"
                />
              </FormField>

              <FormField label="Theme">
                <Select
                  value={formData.theme}
                  onChange={(value) => setFormData('theme', value as 'light' | 'dark' | 'auto')}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'auto', label: 'Auto' },
                  ]}
                  placeholder="Select theme"
                />
              </FormField>
            </div>
          </div>

          {/* Footer */}
          <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-dark-border flex-shrink-0">
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
