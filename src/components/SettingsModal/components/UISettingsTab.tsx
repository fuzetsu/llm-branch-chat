import { Component } from 'solid-js'
import FormField from '../../ui/FormField'
import Select from '../../ui/Select'

export type ThemeOption = 'light' | 'dark' | 'auto'

export interface UISettingsForm {
  theme: ThemeOption
}

interface UISettingsTabProps {
  form: UISettingsForm
  onUpdate: <K extends keyof UISettingsForm>(key: K, value: UISettingsForm[K]) => void
}

const UISettingsTab: Component<UISettingsTabProps> = (props) => {
  return (
    <FormField label="Theme">
      <Select
        value={props.form.theme}
        onChange={(value) => props.onUpdate('theme', value as ThemeOption)}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'auto', label: 'Auto' },
        ]}
        placeholder="Select theme"
      />
    </FormField>
  )
}

export default UISettingsTab
