import { Component, JSX } from 'solid-js'
import { classnames } from '../../utils'
import { inputBaseStyles, inputFullWidth } from './styles'

interface TextareaProps {
  placeholder?: string
  value?: string
  onInput?: (value: string) => void
  onKeyDown?: (e: KeyboardEvent) => void
  rows?: number
  class?: string
  disabled?: boolean
  autofocus?: boolean
}

const Textarea: Component<TextareaProps> = (props) => {
  const handleInput: JSX.EventHandlerUnion<HTMLTextAreaElement, InputEvent> = (e) => {
    const value = e.currentTarget.value
    props.onInput?.(value)
  }

  return (
    <textarea
      class={classnames(inputBaseStyles, inputFullWidth, 'resize-y', props.class)}
      placeholder={props.placeholder}
      value={props.value || ''}
      onInput={handleInput}
      onKeyDown={(e) => props.onKeyDown?.(e)}
      rows={props.rows || 3}
      disabled={props.disabled}
      autofocus={props.autofocus}
    />
  )
}

export default Textarea
