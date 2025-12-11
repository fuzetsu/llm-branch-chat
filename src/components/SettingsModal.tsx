import { Component, createEffect, createMemo, Show, For, createSignal } from 'solid-js'
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
import { StorageInfo } from './StorageInfo'
import {
  validateProviderName,
  validateProviderUrl,
  validateProviderModels,
  createProvider,
  updateProvider,
  getAllAvailableModels,
  fetchModelsFromProvider,
} from '../utils/providerUtils.js'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'providers' | 'chat' | 'ui'

const SettingsModal: Component<SettingsModalProps> = (props) => {
  const store = useAppStore()
  const [activeTab, setActiveTab] = createSignal<Tab>('providers')
  const [editingProvider, setEditingProvider] = createSignal<string | null>(null)
  const [isFetchingModels, setIsFetchingModels] = createSignal(false)

  const storageSizeInBytes = createMemo(() =>
    props.isOpen ? new TextEncoder().encode(JSON.stringify(store)).length : 0,
  )

  // Provider form state
  const [providerForm, setProviderForm] = createStore({
    name: '',
    baseUrl: '',
    key: '' as string | undefined,
    availableModels: '',
  })

  // Chat settings form state
  const [chatForm, setChatForm] = createStore({
    model: '',
    temperature: 0.7,
    maxTokens: 2048,
    autoGenerateTitle: true,
    titleGenerationTrigger: 2,
    titleModel: '',
  })

  // UI settings form state
  const [uiForm, setUiForm] = createStore({
    theme: 'auto' as 'light' | 'dark' | 'auto',
  })

  // Get all available models from all providers
  const allAvailableModels = createMemo(() => {
    return getAllAvailableModels(store.state.settings.api.providers)
  })

  // Get provider list
  const providers = createMemo(() => {
    return Array.from(store.state.settings.api.providers.entries())
  })

  // Load current settings into forms when modal opens
  createEffect(() => {
    if (props.isOpen) {
      const settings = store.state.settings

      // Reset provider form
      setProviderForm({
        name: '',
        baseUrl: '',
        key: undefined,
        availableModels: '',
      })
      setEditingProvider(null)

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
    }
  })

  const handleSave = () => {
    // Save chat settings
    store.updateSettings({
      chat: {
        model: chatForm.model,
        availableModels: allAvailableModels(),
        temperature: chatForm.temperature,
        maxTokens: chatForm.maxTokens,
        autoGenerateTitle: chatForm.autoGenerateTitle,
        titleGenerationTrigger: chatForm.titleGenerationTrigger,
        titleModel: chatForm.titleModel,
      },
      ui: {
        theme: uiForm.theme,
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

  const handleAddProvider = () => {
    const models = providerForm.availableModels
      .split('\n')
      .map(model => model.trim())
      .filter(model => model.length > 0)

    const nameError = validateProviderName(providerForm.name, store.state.settings.api.providers)
    const urlError = validateProviderUrl(providerForm.baseUrl)
    const modelsError = validateProviderModels(models)

    if (nameError || urlError || modelsError) {
      // TODO: Show validation errors to user
      console.error('Validation errors:', { nameError, urlError, modelsError })
      return
    }

    const newProvider = createProvider(
      providerForm.name,
      providerForm.baseUrl,
      providerForm.key,
      models,
      providers().length === 0 // First provider is default
    )

    const newProviders = new Map(store.state.settings.api.providers)
    newProviders.set(providerForm.name, newProvider)

    store.updateSettings({
      api: {
        providers: newProviders,
        defaultProvider: providers().length === 0 ? providerForm.name : store.state.settings.api.defaultProvider,
      },
    })

    // Reset form
    setProviderForm({
      name: '',
      baseUrl: '',
      key: undefined,
      availableModels: '',
    })
  }

  const handleEditProvider = (providerName: string) => {
    const provider = store.state.settings.api.providers.get(providerName)
    if (!provider) return

    setEditingProvider(providerName)
    setProviderForm({
      name: provider.name,
      baseUrl: provider.baseUrl,
      key: provider.key,
      availableModels: provider.availableModels.join('\n'),
    })
  }

  const handleUpdateProvider = () => {
    const editing = editingProvider()
    if (!editing) return

    const models = providerForm.availableModels
      .split('\n')
      .map(model => model.trim())
      .filter(model => model.length > 0)

    const urlError = validateProviderUrl(providerForm.baseUrl)
    const modelsError = validateProviderModels(models)

    if (urlError || modelsError) {
      // TODO: Show validation errors to user
      console.error('Validation errors:', { urlError, modelsError })
      return
    }

    const existingProvider = store.state.settings.api.providers.get(editing)
    if (!existingProvider) return

    const updatedProvider = updateProvider(existingProvider, {
      name: providerForm.name,
      baseUrl: providerForm.baseUrl,
      key: providerForm.key,
      availableModels: models,
    })

    const newProviders = new Map(store.state.settings.api.providers)

    // If name changed, remove old entry and add new one
    if (editing !== providerForm.name) {
      newProviders.delete(editing)
      newProviders.set(providerForm.name, updatedProvider)

      // Update default provider if needed
      const newDefaultProvider = store.state.settings.api.defaultProvider === editing
        ? providerForm.name
        : store.state.settings.api.defaultProvider

      store.updateSettings({
        api: {
          providers: newProviders,
          defaultProvider: newDefaultProvider,
        },
      })
    } else {
      newProviders.set(editing, updatedProvider)
      store.updateSettings({
        api: {
          providers: newProviders,
          defaultProvider: store.state.settings.api.defaultProvider,
        },
      })
    }

    // Reset form
    setEditingProvider(null)
    setProviderForm({
      name: '',
      baseUrl: '',
      key: undefined,
      availableModels: '',
    })
  }

  const handleDeleteProvider = (providerName: string) => {
    const newProviders = new Map(store.state.settings.api.providers)
    newProviders.delete(providerName)

    let newDefaultProvider = store.state.settings.api.defaultProvider
    if (providerName === store.state.settings.api.defaultProvider && newProviders.size > 0) {
      newDefaultProvider = Array.from(newProviders.keys())[0] || 'Pollinations'
    } else if (newProviders.size === 0) {
      newDefaultProvider = 'Pollinations' // Fallback to default provider name
    }

    store.updateSettings({
      api: {
        providers: newProviders,
        defaultProvider: newDefaultProvider,
      },
    })
  }

  const handleSetDefaultProvider = (providerName: string) => {
    store.updateSettings({
      api: {
        providers: store.state.settings.api.providers,
        defaultProvider: providerName,
      },
    })
  }

  const handleFetchModels = async () => {
    setIsFetchingModels(true)
    try {
      const models = await fetchModelsFromProvider(providerForm.baseUrl, providerForm.key)
      setProviderForm('availableModels', models.join('\n'))
    } catch (error) {
      console.error('Failed to fetch models:', error)
      // TODO: Show error to user
    } finally {
      setIsFetchingModels(false)
    }
  }

  const isEditing = () => editingProvider() !== null

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300">
        {/* Backdrop */}
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={handleCancel} />

        {/* Modal */}
        <div class="relative w-full max-w-2xl max-h-[90vh] overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-dark-surface shadow-xl rounded-2xl border dark:border-dark-border flex flex-col">
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

          {/* Tabs */}
          <div class="border-b border-gray-200 dark:border-dark-border flex-shrink-0">
            <nav class="flex space-x-8 px-6">
              <button
                class={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab() === 'providers'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('providers')}
              >
                Providers
              </button>
              <button
                class={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab() === 'chat'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('chat')}
              >
                Chat
              </button>
              <button
                class={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab() === 'ui'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('ui')}
              >
                UI
              </button>
            </nav>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-y-auto p-6">
            <div class="space-y-6">
              <Show when={activeTab() === 'providers'}>
                <StorageInfo sizeInBytes={storageSizeInBytes()} />

                {/* Provider List */}
                <div class="space-y-4">
                  <h4 class="text-md font-medium text-gray-900 dark:text-white">Configured Providers</h4>
                  <For each={providers()}>
                    {([name, provider]) => (
                      <div class="border border-gray-200 dark:border-dark-border rounded-lg p-4">
                        <div class="flex justify-between items-start">
                          <div>
                            <div class="flex items-center space-x-2">
                              <span class="font-medium text-gray-900 dark:text-white">{name}</span>
                              <Show when={store.state.settings.api.defaultProvider === name}>
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                  Default
                                </span>
                              </Show>
                            </div>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{provider.baseUrl}</p>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                              {provider.availableModels.length} models
                            </p>
                          </div>
                          <div class="flex space-x-2">
                            <Show when={store.state.settings.api.defaultProvider !== name}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleSetDefaultProvider(name)}
                              >
                                Set Default
                              </Button>
                            </Show>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditProvider(name)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteProvider(name)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>

                {/* Provider Form */}
                <div class="border-t border-gray-200 dark:border-dark-border pt-6">
                  <h4 class="text-md font-medium text-gray-900 dark:text-white mb-4">
                    {isEditing() ? 'Edit Provider' : 'Add New Provider'}
                  </h4>

                  <div class="space-y-4">
                    <FormField label="Provider Name">
                      <Input
                        type="text"
                        placeholder="OpenAI, Local Ollama, etc."
                        value={providerForm.name}
                        onInput={(value) => setProviderForm('name', value)}
                        disabled={isEditing()}
                      />
                    </FormField>

                    <FormField label="Base URL">
                      <Input
                        type="text"
                        placeholder="https://api.openai.com/v1"
                        value={providerForm.baseUrl}
                        onInput={(value) => setProviderForm('baseUrl', value)}
                      />
                    </FormField>

                    <FormField label="API Key">
                      <Input
                        type="password"
                        placeholder="Your API key (optional for some providers)"
                        value={providerForm.key ?? ''}
                        onInput={(value) => setProviderForm('key', value || undefined)}
                      />
                    </FormField>

                    <FormField
                      label="Available Models"
                      helpText="One model per line, or fetch automatically from provider"
                    >
                      <div class="space-y-2">
                        <Textarea
                          rows={4}
                          placeholder="gpt-4\ngpt-3.5-turbo\nclaude-3-sonnet"
                          value={providerForm.availableModels}
                          onInput={(value) => setProviderForm('availableModels', value)}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleFetchModels}
                          disabled={isFetchingModels() || !providerForm.baseUrl}
                        >
                          {isFetchingModels() ? 'Fetching...' : 'Fetch Models Automatically'}
                        </Button>
                      </div>
                    </FormField>

                    <div class="flex space-x-2">
                      <Show when={isEditing()}>
                        <Button variant="secondary" onClick={() => {
                          setEditingProvider(null)
                          setProviderForm({
                            name: '',
                            baseUrl: '',
                            key: undefined,
                            availableModels: '',
                          })
                        }}>
                          Cancel Edit
                        </Button>
                        <Button variant="primary" onClick={handleUpdateProvider}>
                          Update Provider
                        </Button>
                      </Show>
                      <Show when={!isEditing()}>
                        <Button variant="primary" onClick={handleAddProvider}>
                          Add Provider
                        </Button>
                      </Show>
                    </div>
                  </div>
                </div>
              </Show>

              <Show when={activeTab() === 'chat'}>
                <FormField label="Default Model">
                  <Select
                    value={chatForm.model}
                    onChange={(value) => setChatForm('model', value)}
                    options={() => allAvailableModels().map(model => ({ value: model, label: model }))}
                    placeholder="Select a model"
                  />
                </FormField>

                <FormField label="Temperature">
                  <Slider
                    value={chatForm.temperature}
                    onInput={(value) => setChatForm('temperature', value)}
                    min={0}
                    max={2}
                    step={0.1}
                    showValue={true}
                  />
                </FormField>

                <FormField label="Max Tokens">
                  <Input
                    type="number"
                    value={chatForm.maxTokens}
                    onInput={(value) => setChatForm('maxTokens', parseInt(value))}
                    min="1"
                    max="4096"
                  />
                </FormField>

                <Checkbox
                  checked={chatForm.autoGenerateTitle}
                  onInput={(checked) => setChatForm('autoGenerateTitle', checked)}
                  label="Auto-generate chat titles"
                />

                <FormField
                  label="Title Generation Trigger (total messages)"
                  helpText="Generate title after this many total messages (user + assistant)"
                >
                  <Input
                    type="number"
                    value={chatForm.titleGenerationTrigger}
                    onInput={(value) => setChatForm('titleGenerationTrigger', parseInt(value))}
                    min="1"
                    max="20"
                  />
                </FormField>

                <FormField label="Title Generation Model">
                  <Select
                    value={chatForm.titleModel}
                    onChange={(value) => setChatForm('titleModel', value)}
                    options={() => allAvailableModels().map(model => ({ value: model, label: model }))}
                    placeholder="Select a model"
                  />
                </FormField>
              </Show>

              <Show when={activeTab() === 'ui'}>
                <FormField label="Theme">
                  <Select
                    value={uiForm.theme}
                    onChange={(value) => setUiForm('theme', value as 'light' | 'dark' | 'auto')}
                    options={[
                      { value: 'light', label: 'Light' },
                      { value: 'dark', label: 'Dark' },
                      { value: 'auto', label: 'Auto' },
                    ]}
                    placeholder="Select theme"
                  />
                </FormField>
              </Show>
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