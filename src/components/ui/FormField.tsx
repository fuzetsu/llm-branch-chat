import { Component, JSX, Show } from 'solid-js'
import { labelStyles, helpTextStyles, errorTextStyles } from './styles'

interface FormFieldProps {
  label: string
  children: JSX.Element
  helpText?: string
  error?: string | null | undefined
}

const FormField: Component<FormFieldProps> = (props) => {
  return (
    <div>
      <label class={labelStyles}>{props.label}</label>
      {props.children}
      <Show when={props.error}>
        <p class={errorTextStyles}>{props.error}</p>
      </Show>
      <Show when={props.helpText && !props.error}>
        <p class={helpTextStyles}>{props.helpText}</p>
      </Show>
    </div>
  )
}

export default FormField
