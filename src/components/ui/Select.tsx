import { Component, For, JSX, Show } from 'solid-js'
import { classnames } from '../../utils'
import { inputBaseStyles, inputFullWidth } from './styles'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

interface SelectProps {
  value?: string
  onChange?: (value: string) => void
  options?: SelectOption[] | (() => SelectOption[])
  optionGroups?: SelectOptionGroup[] | (() => SelectOptionGroup[])
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

  const getOptions = () =>
    typeof props.options === 'function' ? props.options() : props.options

  const getOptionGroups = () =>
    typeof props.optionGroups === 'function' ? props.optionGroups() : props.optionGroups

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
      <Show
        when={getOptionGroups()}
        fallback={
          <For each={getOptions()}>
            {(option) => (
              <option value={option.value} selected={option.value === currentValue()}>
                {option.label}
              </option>
            )}
          </For>
        }
      >
        <For each={getOptionGroups()}>
          {(group) => (
            <optgroup label={group.label}>
              <For each={group.options}>
                {(option) => (
                  <option value={option.value} selected={option.value === currentValue()}>
                    {option.label}
                  </option>
                )}
              </For>
            </optgroup>
          )}
        </For>
      </Show>
    </select>
  )
}

export default Select
