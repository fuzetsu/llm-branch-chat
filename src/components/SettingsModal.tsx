import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Icon from './Icon'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SettingsModal: Component<SettingsModalProps> = (props) => {
  const store = useAppStore()

  // Local form state
  const [formData, setFormData] = createSignal({
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
    return formData()
      .availableModels.split('\n')
      .map((model) => model.trim())
      .filter((model) => model.length > 0)
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

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    const models = availableModelsList()

    store.updateSettings({
      api: {
        baseUrl: formData().apiBaseUrl,
        key: formData().apiKey,
        availableModels: models,
      },
      chat: {
        model: formData().defaultModel,
        availableModels: models,
        temperature: formData().temperature,
        maxTokens: formData().maxTokens,
        autoGenerateTitle: formData().autoGenerateTitle,
        titleGenerationTrigger: formData().titleGenerationTrigger,
        titleModel: formData().titleModel,
      },
      ui: {
        theme: formData().theme,
        sidebarCollapsed: store.state.settings.ui.sidebarCollapsed,
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
        <div
          class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleCancel}
        />

        {/* Modal */}
        <div class="relative w-full max-w-md max-h-[90vh] overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-dark-surface shadow-xl rounded-2xl border dark:border-dark-border flex flex-col">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">Settings</h3>
            <button
              class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={handleCancel}
            >
              <Icon name="close" class="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-y-auto p-6">
            <div class="space-y-6">
              {/* API Base URL */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Base URL
                </label>
                <input
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  placeholder="https://api.openai.com/v1"
                  value={formData().apiBaseUrl}
                  onInput={(e) => handleInputChange('apiBaseUrl', e.currentTarget.value)}
                />
              </div>

              {/* API Key */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  placeholder="Your API key"
                  value={formData().apiKey}
                  onInput={(e) => handleInputChange('apiKey', e.currentTarget.value)}
                />
              </div>

              {/* Available Models */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available Models (one per line)
                </label>
                <textarea
                  class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  rows={4}
                  placeholder="gpt-4&#10;gpt-3.5-turbo&#10;claude-3-sonnet"
                  value={formData().availableModels}
                  onInput={(e) => handleInputChange('availableModels', e.currentTarget.value)}
                />
              </div>

              {/* Default Model */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Model
                </label>
                <select
                  class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  value={formData().defaultModel}
                  onChange={(e) => handleInputChange('defaultModel', e.currentTarget.value)}
                >
                  <option value="">Select a model</option>
                  <For each={availableModelsList()}>
                    {(model) => <option value={model}>{model}</option>}
                  </For>
                </select>
              </div>

              {/* Temperature */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperature{' '}
                  <span class="text-primary font-semibold">{formData().temperature}</span>
                </label>
                <input
                  type="range"
                  class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData().temperature}
                  onInput={(e) =>
                    handleInputChange('temperature', parseFloat(e.currentTarget.value))
                  }
                />
              </div>

              {/* Max Tokens */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  min="1"
                  max="4096"
                  value={formData().maxTokens}
                  onInput={(e) => handleInputChange('maxTokens', parseInt(e.currentTarget.value))}
                />
              </div>

              {/* Auto Generate Title */}
              <div>
                <label class="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    class="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary mr-3"
                    checked={formData().autoGenerateTitle}
                    onInput={(e) => handleInputChange('autoGenerateTitle', e.currentTarget.checked)}
                  />
                  Auto-generate chat titles
                </label>
              </div>

              {/* Title Generation Trigger */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title Generation Trigger (total messages)
                </label>
                <input
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  min="1"
                  max="20"
                  value={formData().titleGenerationTrigger}
                  onInput={(e) =>
                    handleInputChange('titleGenerationTrigger', parseInt(e.currentTarget.value))
                  }
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Generate title after this many total messages (user + assistant)
                </p>
              </div>

              {/* Title Model */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title Generation Model
                </label>
                <select
                  class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  value={formData().titleModel}
                  onChange={(e) => handleInputChange('titleModel', e.currentTarget.value)}
                >
                  <option value="">Select a model</option>
                  <For each={availableModelsList()}>
                    {(model) => <option value={model}>{model}</option>}
                  </For>
                </select>
              </div>

              {/* Theme */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <select
                  class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  value={formData().theme}
                  onChange={(e) =>
                    handleInputChange('theme', e.currentTarget.value as 'light' | 'dark' | 'auto')
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-dark-border flex-shrink-0">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 dark:bg-primary-dark dark:hover:bg-primary-darker rounded-md transition-colors"
              onClick={handleSave}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default SettingsModal
