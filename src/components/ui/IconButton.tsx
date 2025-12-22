import { Component, Show } from 'solid-js'
import Icon, { IconName } from './Icon'
import { classnames } from '../../utils'
import Tooltip from './Tooltip'

type IconButtonVariant =
  | 'ghost'
  | 'ghost-light'
  | 'danger'
  | 'danger-light'
  | 'success'
  | 'cancel'
  | 'compact'
type IconButtonSize = 'sm' | 'md'

interface IconButtonProps {
  icon: IconName
  variant?: IconButtonVariant
  size?: IconButtonSize
  onClick?: () => void
  disabled?: boolean
  class?: string
  tooltip?: string
  stopPropagation?: boolean
}

const IconButton: Component<IconButtonProps> = (props) => {
  const getVariantClasses = () => {
    switch (props.variant) {
      case 'ghost':
        return 'p-1.5 rounded-md hover:bg-surface-hover text-text-muted hover:text-text'
      case 'ghost-light':
        return 'p-1.5 rounded-md hover:bg-white/20 text-white/70 hover:text-white'
      case 'danger':
        return 'p-1.5 rounded-md hover:bg-danger/10 text-danger hover:text-danger-hover'
      case 'danger-light':
        return 'p-1.5 rounded-md hover:bg-red-500/20 text-red-200 hover:text-red-100'
      case 'success':
        return 'p-1.5 text-success hover:text-success-hover'
      case 'cancel':
        return 'p-1.5 text-danger hover:text-danger-hover'
      case 'compact':
        return 'p-1 text-text-muted hover:text-text'
      default:
        return 'p-1.5 rounded-md hover:bg-surface-hover text-text-muted hover:text-text'
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
    'transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-90'

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

  const button = (
    <button
      type="button"
      class={classnames(baseClasses, getVariantClasses(), getSizeClasses(), props.class)}
      onClick={handleClick}
      disabled={props.disabled}
    >
      <Icon name={props.icon} size={iconSize()} />
    </button>
  )

  return (
    <Show when={props.tooltip} fallback={button}>
      <Tooltip content={props.tooltip!}>{button}</Tooltip>
    </Show>
  )
}

export default IconButton
