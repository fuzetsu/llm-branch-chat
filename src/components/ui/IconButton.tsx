import { Component } from 'solid-js'
import Icon, { IconName } from '../Icon'
import { classnames } from '../../utils'

type IconButtonVariant = 'ghost' | 'danger' | 'success' | 'cancel' | 'compact'
type IconButtonSize = 'sm' | 'md'

interface IconButtonProps {
  icon: IconName
  variant?: IconButtonVariant
  size?: IconButtonSize
  onClick?: () => void
  disabled?: boolean
  class?: string
  title?: string
  stopPropagation?: boolean
}

const IconButton: Component<IconButtonProps> = (props) => {
  const getVariantClasses = () => {
    switch (props.variant) {
      case 'ghost':
        return 'p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
      case 'danger':
        return 'p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-500 dark:text-red-400'
      case 'success':
        return 'p-1 text-green-600 hover:text-green-700'
      case 'cancel':
        return 'p-1 text-red-600 hover:text-red-700'
      case 'compact':
        return 'p-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      default:
        return 'p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
    }
  }

  const getSizeClasses = () => {
    switch (props.size) {
      case 'sm':
        return 'text-xs'
      case 'md':
        return ''
      default:
        return ''
    }
  }

  const baseClasses =
    'transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

  const iconSize = () => {
    if (props.variant === 'compact') return 'sm'
    return props.size === 'sm' ? 'sm' : 'md'
  }

  const handleClick = (e: MouseEvent) => {
    if (props.stopPropagation) {
      e.stopPropagation()
    }
    props.onClick?.()
  }

  return (
    <button
      type="button"
      class={classnames(baseClasses, getVariantClasses(), getSizeClasses(), props.class)}
      onClick={handleClick}
      disabled={props.disabled}
      title={props.title}
    >
      <Icon name={props.icon} size={iconSize()} />
    </button>
  )
}

export default IconButton
