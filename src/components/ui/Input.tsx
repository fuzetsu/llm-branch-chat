import { Component, JSX } from 'solid-js'
import { classnames } from '../../utils'

interface InputProps {
  type?: 'text' | 'password' | 'number' | 'email'
  placeholder?: string
  value?: string | number
  onInput?: (value: string) => void
  onChange?: (value: string) => void
  min?: string | number
  max?: string | number
  step?: string | number
  class?: string
  disabled?: boolean
  autofocus?: boolean
}

const Input: Component<InputProps> = (props) => {
  const baseClasses =
    'w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed'

  const handleInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent> = (e) => {
    const value = e.currentTarget.value
    props.onInput?.(value)
  }

  const handleChange: JSX.EventHandlerUnion<HTMLInputElement, Event> = (e) => {
    const value = e.currentTarget.value
    props.onChange?.(value)
  }

  return (
    <input
      type={props.type || 'text'}
      class={classnames(baseClasses, props.class)}
      placeholder={props.placeholder}
      value={props.value || ''}
      onInput={handleInput}
      onChange={handleChange}
      min={props.min}
      max={props.max}
      step={props.step}
      disabled={props.disabled}
      autofocus={props.autofocus}
    />
  )
}

export default Input
