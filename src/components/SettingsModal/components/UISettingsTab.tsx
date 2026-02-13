import { Component } from 'solid-js'
import FormField from '../../ui/FormField'
import Select from '../../ui/Select'
import { Theme } from '../../../types'
import { useAppStore } from '../../../store/AppStore'

export type ThemeOption = 'light' | 'dark' | 'auto'

export interface UISettingsForm {
  theme: ThemeOption
}

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
]

const UISettingsTab: Component = () => {
  const store = useAppStore()

  return (
    <FormField label="Theme">
      <Select
        value={store.state.settings.ui.theme}
        onChange={(value) => store.updateUI({ theme: value as ThemeOption })}
        options={themeOptions}
        placeholder="Select theme"
      />
    </FormField>
  )
}

export default UISettingsTab
