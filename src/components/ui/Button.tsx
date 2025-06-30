import { Component, JSX } from 'solid-js'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  onClick?: () => void
  disabled?: boolean
  class?: string
  children: JSX.Element
  type?: 'button' | 'submit' | 'reset'
}

const Button: Component<ButtonProps> = (props) => {
  const getVariantClasses = () => {
    switch (props.variant) {
      case 'primary':
        return 'text-white bg-primary hover:bg-blue-600 dark:bg-primary-dark dark:hover:bg-primary-darker'
      case 'secondary':
        return 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
      case 'danger':
        return 'text-white bg-danger hover:bg-red-600'
      case 'ghost':
        return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      default:
        return 'text-white bg-primary hover:bg-blue-600 dark:bg-primary-dark dark:hover:bg-primary-darker'
    }
  }

  const getSizeClasses = () => {
    switch (props.size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs'
      case 'md':
        return 'px-4 py-2 text-sm'
      case 'lg':
        return 'px-6 py-3 text-base'
      default:
        return 'px-4 py-2 text-sm'
    }
  }

  const baseClasses =
    'font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

  return (
    <button
      type={props.type || 'button'}
      class={`${baseClasses} ${getVariantClasses()} ${getSizeClasses()} ${props.class || ''}`}
      onClick={() => props.onClick?.()}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}

export default Button
