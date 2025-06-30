import { Component, JSX, Show } from 'solid-js'

interface FormFieldProps {
  label: string
  children: JSX.Element
  helpText?: string
}

const FormField: Component<FormFieldProps> = (props) => {
  return (
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {props.label}
      </label>
      {props.children}
      <Show when={props.helpText}>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{props.helpText}</p>
      </Show>
    </div>
  )
}

export default FormField
