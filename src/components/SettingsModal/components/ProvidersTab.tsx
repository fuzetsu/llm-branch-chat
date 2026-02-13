import { Component, Show, createMemo } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
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
import ProviderForm, { type ProviderFormErrors } from './ProviderForm'
import { ProviderConfig } from '../../../types'
import { useAppStore } from '../../../store/AppStore'
import { classnames } from '../../../utils'

interface ProvidersTabProps {
  storageSizeInBytes: number
  importState: { success: boolean; message: string } | null
  onExportState(): void
  onImportState(): void
  setPreventClose(canClose: boolean): void
}

interface Draft extends Omit<ProviderConfig, 'availableModels'> {
  availableModels: string
}

const ProvidersTab: Component<ProvidersTabProps> = (props) => {
  const store = useAppStore()

  const [editingProvider, setEditingProvider] = createStore<{ name: string | null }>({ name: null })
  const [validationErrors, setValidationErrors] = createStore<ProviderFormErrors>({})

  const [draft, setDraft] = createStore<Draft>({
    name: '',
    baseUrl: '',
    key: '',
    availableModels: '',
  })

  let providerFormSection!: HTMLDivElement

  const providers = () => store.state.settings.api.providers

  const providersList = createMemo(() => Object.entries(providers()))

  const isEditing = () => editingProvider.name !== null

  const resetForm = () => {
    props.setPreventClose(false)
    setEditingProvider('name', null)
    setDraft({ name: '', baseUrl: '', key: undefined, availableModels: '' })
    setValidationErrors({})
  }

  const handleAddProvider = () => {
    const models = draft.availableModels
      .split('\n')
      .map((model) => model.trim())
      .filter((model) => model.length > 0)

    const nameError = validateProviderName(draft.name, providers())
    const urlError = validateProviderUrl(draft.baseUrl)
    const modelsError = validateProviderModels(models)

    setValidationErrors({
      name: nameError,
      baseUrl: urlError,
      models: modelsError,
    })

    if (nameError || urlError || modelsError) {
      return
    }

    const newProvider = createProvider(draft.name, draft.baseUrl, draft.key, models)

    store.setState('settings', 'api', 'providers', draft.name, newProvider)
    resetForm()
  }

  const handleEditProvider = (providerName: string) => {
    const provider = providers()[providerName]
    if (!provider) return

    setEditingProvider('name', providerName)
    setDraft({
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

    const models = draft.availableModels
      .split('\n')
      .map((model) => model.trim())
      .filter((model) => model.length > 0)

    const urlError = validateProviderUrl(draft.baseUrl)
    const modelsError = validateProviderModels(models)
    const nameError = editing !== draft.name ? 'Cannot change provider name.' : null

    setValidationErrors({ baseUrl: urlError, models: modelsError, name: nameError })

    if (urlError || modelsError || nameError) {
      return
    }

    const existingProvider = providers()[editing]
    if (!existingProvider) return

    const updatedProvider = updateProvider(existingProvider, {
      name: draft.name,
      baseUrl: draft.baseUrl,
      key: draft.key,
      availableModels: models,
    })

    store.setState('settings', 'api', 'providers', editing, updatedProvider)
    resetForm()
  }

  const handleDeleteProvider = (providerName: string) => {
    if (
      !confirm(`Are you sure you want to delete provider "${providerName}"? This cannot be undone.`)
    ) {
      return
    }

    store.setState(
      produce((draft) => {
        delete draft.settings.api.providers[providerName]
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
          class={classnames(
            'p-3 rounded-md text-sm mb-4',
            props.importState?.success ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
          )}
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
          form={draft}
          errors={validationErrors}
          isEditing={isEditing()}
          onUpdate={(key, value) => {
            props.setPreventClose(true)
            setDraft(key, value)
          }}
          onClearError={(key) => setValidationErrors(key, undefined)}
          onSubmit={isEditing() ? handleUpdateProvider : handleAddProvider}
          onCancelEdit={resetForm}
        />
      </div>
    </>
  )
}

export default ProvidersTab
