import { Component, JSX } from 'solid-js'
import { classnames } from '../../utils'
import { inputBaseStyles, inputFullWidth } from './styles'

interface InputProps {
  id?: string
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
      id={props.id}
      type={props.type || 'text'}
      class={classnames(inputBaseStyles, inputFullWidth, props.class)}
      placeholder={props.placeholder}
      value={props.value ?? ''}
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
