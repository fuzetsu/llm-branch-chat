import { Component, JSX } from 'solid-js'
import { classnames } from '../../utils'

interface TextareaProps {
  placeholder?: string
  value?: string
  onInput?: (value: string) => void
  rows?: number
  class?: string
  disabled?: boolean
  autofocus?: boolean
}

const Textarea: Component<TextareaProps> = (props) => {
  const baseClasses =
    'w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed resize-vertical'

  const handleInput: JSX.EventHandlerUnion<HTMLTextAreaElement, InputEvent> = (e) => {
    const value = e.currentTarget.value
    props.onInput?.(value)
  }

  return (
    <textarea
      class={classnames(baseClasses, props.class)}
      placeholder={props.placeholder}
      value={props.value || ''}
      onInput={handleInput}
      rows={props.rows || 3}
      disabled={props.disabled}
      autofocus={props.autofocus}
    />
  )
}

export default Textarea
