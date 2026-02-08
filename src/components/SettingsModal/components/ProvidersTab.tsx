import { Component, Show, createMemo } from 'solid-js'
import { createStore, produce, SetStoreFunction } from 'solid-js/store'
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

export interface ProvidersForm {
  providers: Record<string, ProviderConfig>
  draft: ProviderFormData
}

interface ProvidersTabProps {
  formData: ProvidersForm
  setFormData: SetStoreFunction<ProvidersForm>
  storageSizeInBytes: number
  importState: { success: boolean; message: string } | null
  onExportState: () => void
  onImportState: () => void
}

const ProvidersTab: Component<ProvidersTabProps> = (props) => {
  const [editingProvider, setEditingProvider] = createStore<{
    name: string | null
  }>({ name: null })
  const [validationErrors, setValidationErrors] = createStore<ProviderFormErrors>({})

  let providerFormSection!: HTMLDivElement

  const providersList = createMemo(() => Object.entries(props.formData.providers))

  const isEditing = () => editingProvider.name !== null

  const resetForm = () => {
    setEditingProvider('name', null)
    props.setFormData('draft', {
      name: '',
      baseUrl: '',
      key: undefined,
      availableModels: '',
    })
    setValidationErrors({})
  }

  const draft = () => props.formData.draft

  const handleAddProvider = () => {
    const models = draft()
      .availableModels.split('\n')
      .map((model) => model.trim())
      .filter((model) => model.length > 0)

    const nameError = validateProviderName(draft().name, props.formData.providers)
    const urlError = validateProviderUrl(draft().baseUrl)
    const modelsError = validateProviderModels(models)

    setValidationErrors({
      name: nameError,
      baseUrl: urlError,
      models: modelsError,
    })

    if (nameError || urlError || modelsError) {
      return
    }

    const newProvider = createProvider(draft().name, draft().baseUrl, draft().key, models)

    props.setFormData('providers', draft().name, newProvider)
    resetForm()
  }

  const handleEditProvider = (providerName: string) => {
    const provider = props.formData.providers[providerName]
    if (!provider) return

    setEditingProvider('name', providerName)
    props.setFormData('draft', {
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

    const models = draft()
      .availableModels.split('\n')
      .map((model) => model.trim())
      .filter((model) => model.length > 0)

    const urlError = validateProviderUrl(draft().baseUrl)
    const modelsError = validateProviderModels(models)
    const nameError = editing !== draft().name ? 'Cannot change provider name.' : null

    setValidationErrors({ baseUrl: urlError, models: modelsError, name: nameError })

    if (urlError || modelsError || nameError) {
      return
    }

    const existingProvider = props.formData.providers[editing]
    if (!existingProvider) return

    const updatedProvider = updateProvider(existingProvider, {
      name: draft().name,
      baseUrl: draft().baseUrl,
      key: draft().key,
      availableModels: models,
    })

    props.setFormData('providers', editing, updatedProvider)
    resetForm()
  }

  const handleDeleteProvider = (providerName: string) => {
    if (
      !confirm(`Are you sure you want to delete provider "${providerName}"? This cannot be undone.`)
    ) {
      return
    }

    props.setFormData(
      produce((draft) => {
        delete draft.providers[providerName]
      }),
    )
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
            props.importState?.success ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
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
          form={draft()}
          errors={validationErrors}
          isEditing={isEditing()}
          onUpdate={(key, value) => props.setFormData('draft', key, value)}
          onClearError={(key) => setValidationErrors(key, undefined)}
          onSubmit={isEditing() ? handleUpdateProvider : handleAddProvider}
          onCancelEdit={resetForm}
        />
      </div>
    </>
  )
}

export default ProvidersTab
