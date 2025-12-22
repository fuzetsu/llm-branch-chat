import { Component, JSX } from 'solid-js'
import { classnames } from '../../utils'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'plain'
type ButtonSize = 'micro' | 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  onClick?: () => void
  title?: string
  disabled?: boolean
  class?: string
  children: JSX.Element
  type?: 'button' | 'submit' | 'reset'
}

const Button: Component<ButtonProps> = (props) => {
  const getVariantClasses = () => {
    switch (props.variant) {
      case 'primary':
        return 'text-white bg-primary hover:bg-primary-hover'
      case 'secondary':
        return 'text-text-secondary bg-surface border border-border hover:bg-surface-hover'
      case 'danger':
        return 'text-white bg-danger hover:bg-danger-hover'
      case 'ghost':
        return 'text-text-secondary hover:bg-surface-hover'
      case 'plain':
        return 'text-sm text-text-muted hover:text-primary'
      default:
        return 'text-white bg-primary hover:bg-primary-hover'
    }
  }

  const getSizeClasses = () => {
    switch (props.size) {
      case 'micro':
        return 'px-2 py-0.5 text-xs'
      case 'sm':
        return 'px-3 py-1.5 text-xs'
      case 'md':
        return 'px-4 py-2 text-sm'
      case 'lg':
        return 'px-5 py-2.5 text-base'
      default:
        return 'px-4 py-2 text-sm'
    }
  }

  const baseClasses =
    'inline-flex items-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

  return (
    <button
      type={props.type || 'button'}
      class={classnames(baseClasses, getVariantClasses(), getSizeClasses(), props.class)}
      onClick={() => props.onClick?.()}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </button>
  )
}

export default Button
