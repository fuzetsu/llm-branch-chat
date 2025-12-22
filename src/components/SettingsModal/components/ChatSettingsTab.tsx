import { Component } from 'solid-js'
import FormField from '../../ui/FormField'
import Input from '../../ui/Input'
import Select from '../../ui/Select'
import type { SelectOptionGroup } from '../../ui/Select'
import Checkbox from '../../ui/Checkbox'
import Slider from '../../ui/Slider'

export interface ChatSettingsForm {
  model: string
  temperature: number
  maxTokens: number
  autoGenerateTitle: boolean
  titleGenerationTrigger: number
  titleModel: string
}

interface ChatSettingsTabProps {
  form: ChatSettingsForm
  groupedModels: SelectOptionGroup[]
  onUpdate: <K extends keyof ChatSettingsForm>(key: K, value: ChatSettingsForm[K]) => void
}

const ChatSettingsTab: Component<ChatSettingsTabProps> = (props) => {
  return (
    <div class="space-y-4">
      <FormField label="Default Model">
        <Select
          value={props.form.model}
          onChange={(value) => props.onUpdate('model', value)}
          optionGroups={props.groupedModels}
          placeholder="Select a model"
        />
      </FormField>

      <FormField label="Temperature">
        <Slider
          value={props.form.temperature}
          onInput={(value) => props.onUpdate('temperature', value)}
          min={0}
          max={2}
          step={0.1}
          showValue={true}
        />
      </FormField>

      <FormField label="Max Tokens">
        <Input
          type="number"
          value={props.form.maxTokens}
          onInput={(value) => props.onUpdate('maxTokens', parseInt(value))}
          min="1"
          max="4096"
        />
      </FormField>

      <Checkbox
        checked={props.form.autoGenerateTitle}
        onInput={(checked) => props.onUpdate('autoGenerateTitle', checked)}
        label="Auto-generate chat titles"
      />

      <FormField
        label="Title Generation Trigger (total messages)"
        helpText="Generate title after this many total messages (user + assistant)"
      >
        <Input
          type="number"
          value={props.form.titleGenerationTrigger}
          onInput={(value) => props.onUpdate('titleGenerationTrigger', parseInt(value))}
          min="1"
          max="20"
        />
      </FormField>

      <FormField label="Title Generation Model">
        <Select
          value={props.form.titleModel}
          onChange={(value) => props.onUpdate('titleModel', value)}
          optionGroups={props.groupedModels}
          placeholder="Select a model"
        />
      </FormField>
    </div>
  )
}

export default ChatSettingsTab
