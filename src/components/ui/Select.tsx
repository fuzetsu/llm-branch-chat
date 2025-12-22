import { Component, For, JSX } from 'solid-js'
import { classnames } from '../../utils'
import { inputBaseStyles, inputFullWidth } from './styles'

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
  fullWidth?: boolean
}

const Select: Component<SelectProps> = (props) => {
  const handleChange: JSX.EventHandlerUnion<HTMLSelectElement, Event> = (e) => {
    const value = e.currentTarget.value
    props.onChange?.(value)
  }

  const getOptions = () => {
    return typeof props.options === 'function' ? props.options() : props.options
  }

  const currentValue = () => props.value || ''

  return (
    <select
      class={classnames(
        inputBaseStyles,
        'cursor-pointer',
        props.fullWidth !== false && inputFullWidth,
        props.class,
      )}
      value={currentValue()}
      onChange={handleChange}
      disabled={props.disabled}
    >
      <option disabled value="__placeholder__" selected={currentValue() === '__placeholder__'}>
        {props.placeholder || 'Select an option'}
      </option>
      <For each={getOptions()}>
        {(option) => (
          <option value={option.value} selected={option.value === currentValue()}>
            {option.label}
          </option>
        )}
      </For>
    </select>
  )
}

export default Select
