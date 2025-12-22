import { Component, Show, createSignal } from 'solid-js'
import FormField from '../../ui/FormField'
import Input from '../../ui/Input'
import Textarea from '../../ui/Textarea'
import Button from '../../ui/Button'
import SectionHeader from '../../ui/SectionHeader'
import { fetchModelsFromProvider } from '../../../utils/providerUtils'

export interface ProviderFormData {
  name: string
  baseUrl: string
  key: string | undefined
  availableModels: string
}

export interface ProviderFormErrors {
  name?: string | null
  baseUrl?: string | null
  models?: string | null
}

interface ProviderFormProps {
  form: ProviderFormData
  errors: ProviderFormErrors
  isEditing: boolean
  onUpdate: <K extends keyof ProviderFormData>(key: K, value: ProviderFormData[K]) => void
  onClearError: (key: keyof ProviderFormErrors) => void
  onSubmit: () => void
  onCancelEdit: () => void
}

const ProviderForm: Component<ProviderFormProps> = (props) => {
  const [isFetchingModels, setIsFetchingModels] = createSignal(false)
  const [fetchError, setFetchError] = createSignal<string | null>(null)

  const handleFetchModels = async () => {
    setIsFetchingModels(true)
    setFetchError(null)
    try {
      const models = await fetchModelsFromProvider(props.form.baseUrl, props.form.key)
      props.onUpdate('availableModels', models.join('\n'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch models'
      setFetchError(message)
      console.error('Failed to fetch models:', error)
    } finally {
      setIsFetchingModels(false)
    }
  }

  return (
    <div class="border-gray-200 dark:border-dark-border pt-4">
      <SectionHeader title={props.isEditing ? 'Edit Provider' : 'Add New Provider'} class="mb-4" />

      <div class="space-y-4">
        <FormField label="Provider Name" error={props.errors.name}>
          <Input
            type="text"
            placeholder="OpenAI, Local Ollama, etc."
            value={props.form.name}
            onInput={(value) => {
              props.onUpdate('name', value)
              if (props.errors.name) props.onClearError('name')
            }}
            disabled={props.isEditing}
            class={props.errors.name ? 'border-red-300 dark:border-red-500' : ''}
          />
        </FormField>

        <FormField label="Base URL" error={props.errors.baseUrl}>
          <Input
            type="text"
            placeholder="https://api.openai.com/v1"
            value={props.form.baseUrl}
            onInput={(value) => {
              props.onUpdate('baseUrl', value)
              if (props.errors.baseUrl) props.onClearError('baseUrl')
            }}
            class={props.errors.baseUrl ? 'border-red-300 dark:border-red-500' : ''}
          />
        </FormField>

        <FormField label="API Key">
          <Input
            type="password"
            placeholder="Your API key (optional for some providers)"
            value={props.form.key ?? ''}
            onInput={(value) => props.onUpdate('key', value || undefined)}
          />
        </FormField>

        <FormField
          label="Available Models"
          helpText="One model per line, or fetch automatically from provider"
          error={props.errors.models}
        >
          <div class="space-y-2">
            <Textarea
              rows={4}
              placeholder="gpt-4&#10;gpt-3.5-turbo&#10;claude-3-sonnet"
              value={props.form.availableModels}
              onInput={(value) => {
                props.onUpdate('availableModels', value)
                if (props.errors.models) props.onClearError('models')
                if (fetchError()) setFetchError(null)
              }}
              class={props.errors.models ? 'border-red-300 dark:border-red-500' : ''}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFetchModels}
              disabled={isFetchingModels() || !props.form.baseUrl}
            >
              {isFetchingModels() ? (
                <>
                  <span class="animate-spin mr-2">↻</span> Fetching...
                </>
              ) : (
                'Fetch Models Automatically'
              )}
            </Button>
            <Show when={fetchError()}>
              <p class="text-sm text-red-600 dark:text-red-400">{fetchError()}</p>
            </Show>
          </div>
        </FormField>

        <div class="flex space-x-2">
          <Show when={props.isEditing}>
            <Button variant="secondary" onClick={props.onCancelEdit}>
              Cancel Edit
            </Button>
            <Button variant="primary" onClick={props.onSubmit}>
              Update Provider
            </Button>
          </Show>
          <Show when={!props.isEditing}>
            <Button variant="primary" onClick={props.onSubmit}>
              Add Provider
            </Button>
          </Show>
        </div>
      </div>
    </div>
  )
}

export default ProviderForm
