import { Component, For, JSX } from 'solid-js'
import { classnames } from '../../utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value?: string
  onChange?: (value: string) => void
  options: SelectOption[] | (() => SelectOption[])
  placeholder?: string
  class?: string | undefined
  disabled?: boolean
}

const Select: Component<SelectProps> = (props) => {
  const baseClasses =
    'w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed'

  const handleChange: JSX.EventHandlerUnion<HTMLSelectElement, Event> = (e) => {
    const value = e.currentTarget.value
    props.onChange?.(value)
  }

  const getOptions = () => {
    return typeof props.options === 'function' ? props.options() : props.options
  }

  return (
    <select
      class={classnames(baseClasses, props.class)}
      value={props.value || ''}
      onChange={handleChange}
      disabled={props.disabled}
    >
      <option disabled value="__placeholder__">
        {props.placeholder || 'Select an option'}
      </option>
      <For each={getOptions()}>
        {(option) => <option value={option.value}>{option.label}</option>}
      </For>
    </select>
  )
}

export default Select
