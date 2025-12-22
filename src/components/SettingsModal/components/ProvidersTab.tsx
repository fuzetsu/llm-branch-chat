import { Component, Show, createMemo } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { ProviderConfig } from '../../../types'
import {
  validateProviderName,
  validateProviderUrl,
  validateProviderModels,
  createProvider,
  updateProvider,
} from '../../../utils/providerUtils'
import { StorageInfo } from '../../StorageInfo'
import Button from '../../ui/Button'
import ProviderList from './ProviderList'
import ProviderForm, { type ProviderFormData, type ProviderFormErrors } from './ProviderForm'

interface ProvidersTabProps {
  providers: Map<string, ProviderConfig>
  storageSizeInBytes: number
  importState: { success: boolean; message: string } | null
  onUpdateProviders: (providers: Map<string, ProviderConfig>) => void
  onExportState: () => void
  onImportState: () => void
}

const ProvidersTab: Component<ProvidersTabProps> = (props) => {
  const [editingProvider, setEditingProvider] = createStore<{
    name: string | null
  }>({ name: null })
  const [providerForm, setProviderForm] = createStore<ProviderFormData>({
    name: '',
    baseUrl: '',
    key: undefined,
    availableModels: '',
  })
  const [validationErrors, setValidationErrors] = createStore<ProviderFormErrors>({})

  let providerFormSection!: HTMLDivElement

  const providersList = createMemo(() => Array.from(props.providers.entries()))

  const isEditing = () => editingProvider.name !== null

  const resetForm = () => {
    setEditingProvider('name', null)
    setProviderForm({
      name: '',
      baseUrl: '',
      key: undefined,
      availableModels: '',
    })
    setValidationErrors({})
  }

  const handleAddProvider = () => {
    const models = providerForm.availableModels
      .split('\n')
      .map((model) => model.trim())
      .filter((model) => model.length > 0)

    const nameError = validateProviderName(providerForm.name, props.providers)
    const urlError = validateProviderUrl(providerForm.baseUrl)
    const modelsError = validateProviderModels(models)

    setValidationErrors({
      name: nameError,
      baseUrl: urlError,
      models: modelsError,
    })

    if (nameError || urlError || modelsError) {
      return
    }

    const newProvider = createProvider(
      providerForm.name,
      providerForm.baseUrl,
      providerForm.key,
      models
    )

    const newProviders = new Map(props.providers)
    newProviders.set(providerForm.name, newProvider)

    props.onUpdateProviders(newProviders)
    resetForm()
  }

  const handleEditProvider = (providerName: string) => {
    const provider = props.providers.get(providerName)
    if (!provider) return

    setEditingProvider('name', providerName)
    setProviderForm({
      name: provider.name,
      baseUrl: provider.baseUrl,
      key: provider.key,
      availableModels: provider.availableModels.join('\n'),
    })
    providerFormSection.scrollIntoView({ behavior: 'smooth' })
  }

  const handleUpdateProvider = () => {
    const editing = editingProvider.name
    if (!editing) return

    const models = providerForm.availableModels
      .split('\n')
      .map((model) => model.trim())
      .filter((model) => model.length > 0)

    const urlError = validateProviderUrl(providerForm.baseUrl)
    const modelsError = validateProviderModels(models)

    setValidationErrors({ baseUrl: urlError, models: modelsError })

    if (urlError || modelsError) {
      return
    }

    const existingProvider = props.providers.get(editing)
    if (!existingProvider) return

    const updatedProvider = updateProvider(existingProvider, {
      name: providerForm.name,
      baseUrl: providerForm.baseUrl,
      key: providerForm.key,
      availableModels: models,
    })

    const newProviders = new Map(props.providers)

    if (editing !== providerForm.name) {
      newProviders.delete(editing)
      newProviders.set(providerForm.name, updatedProvider)
    } else {
      newProviders.set(editing, updatedProvider)
    }

    props.onUpdateProviders(newProviders)
    resetForm()
  }

  const handleDeleteProvider = (providerName: string) => {
    if (
      !confirm(`Are you sure you want to delete provider "${providerName}"? This cannot be undone.`)
    ) {
      return
    }

    const newProviders = new Map(props.providers)
    newProviders.delete(providerName)

    props.onUpdateProviders(newProviders)
  }

  return (
    <>
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <StorageInfo sizeInBytes={props.storageSizeInBytes} />

        <div class="flex gap-3 shrink-0">
          <Button variant="secondary" size="sm" onClick={props.onImportState}>
            Import State
          </Button>
          <Button variant="secondary" size="sm" onClick={props.onExportState}>
            Export State
          </Button>
        </div>
      </div>

      <Show when={props.importState}>
        <div
          class={`p-3 rounded-md text-sm mb-4 ${
            props.importState?.success
              ? 'bg-success/10 text-success'
              : 'bg-danger/10 text-danger'
          }`}
        >
          {props.importState?.message}
        </div>
      </Show>

      <ProviderList
        providers={providersList()}
        onEdit={handleEditProvider}
        onDelete={handleDeleteProvider}
      />

      <div ref={providerFormSection}>
        <ProviderForm
          form={providerForm}
          errors={validationErrors}
          isEditing={isEditing()}
          onUpdate={(key, value) => setProviderForm(key, value)}
          onClearError={(key) => setValidationErrors(key, undefined)}
          onSubmit={isEditing() ? handleUpdateProvider : handleAddProvider}
          onCancelEdit={resetForm}
        />
      </div>
    </>
  )
}

export default ProvidersTab
