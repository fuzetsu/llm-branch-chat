import { Component, JSX } from 'solid-js'
import { classnames } from '../../utils'

interface CheckboxProps {
  checked?: boolean
  onInput?: (checked: boolean) => void
  label: string
  class?: string
  disabled?: boolean
}

const Checkbox: Component<CheckboxProps> = (props) => {
  const handleInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent> = (e) => {
    const checked = e.currentTarget.checked
    props.onInput?.(checked)
  }

  return (
    <label
      class={classnames(
        'flex items-center text-sm font-medium text-gray-700 dark:text-gray-300',
        props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        props.class,
      )}
    >
      <input
        type="checkbox"
        class="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary mr-3"
        checked={props.checked || false}
        onInput={handleInput}
        disabled={props.disabled}
      />
      {props.label}
    </label>
  )
}

export default Checkbox
