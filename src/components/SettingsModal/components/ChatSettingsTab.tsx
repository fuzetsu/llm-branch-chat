import { Component } from 'solid-js'
import FormField from '../../ui/FormField'
import Input from '../../ui/Input'
import Select from '../../ui/Select'
import Checkbox from '../../ui/Checkbox'
import Slider from '../../ui/Slider'
import { getModelsGroupedByProvider } from '../../../utils/providerUtils'
import { useAppStore } from '../../../store/AppStore'
import { ChatSettings } from '../../../types'

export interface ChatSettingsForm {
  model: string
  temperature: number
  maxTokens: number
  autoGenerateTitle: boolean
  titleGenerationTrigger: number
  titleModel: string
}

const ChatSettingsTab: Component = () => {
  const store = useAppStore()

  const settings = () => store.state.settings.chat

  const groupedModels = () => getModelsGroupedByProvider(store.state.settings.api.providers)

  function onUpdate<T extends keyof ChatSettings>(key: T, value: ChatSettings[T]) {
    store.setState('settings', 'chat', key, value)
  }

  return (
    <div class="space-y-4">
      <FormField label="Default Model">
        <Select
          value={settings().model}
          onChange={(value) => onUpdate('model', value)}
          optionGroups={groupedModels()}
          placeholder="Select a model"
        />
      </FormField>

      <FormField label="Temperature">
        <Slider
          value={settings().temperature}
          onInput={(value) => onUpdate('temperature', value)}
          min={0}
          max={2}
          step={0.1}
          showValue={true}
        />
      </FormField>

      <FormField label="Max Tokens">
        <Input
          type="number"
          value={settings().maxTokens}
          onInput={(value) => onUpdate('maxTokens', Number(value))}
          min="1"
          max="4096"
        />
      </FormField>

      <Checkbox
        checked={settings().autoGenerateTitle}
        onInput={(checked) => onUpdate('autoGenerateTitle', checked)}
        label="Auto-generate chat titles"
      />

      <FormField
        label="Title Generation Trigger (total messages)"
        helpText="Generate title after this many total messages (user + assistant)"
      >
        <Input
          type="number"
          value={settings().titleGenerationTrigger}
          onInput={(value) => onUpdate('titleGenerationTrigger', parseInt(value))}
          min="1"
          max="20"
        />
      </FormField>

      <FormField label="Title Generation Model">
        <Select
          value={settings().titleModel}
          onChange={(value) => onUpdate('titleModel', value)}
          optionGroups={groupedModels()}
          placeholder="Select a model"
        />
      </FormField>
    </div>
  )
}

export default ChatSettingsTab
