import { Component } from 'solid-js'
import { classnames } from '../../utils'

export type IconName =
  | 'menu'
  | 'settings'
  | 'settings-gear'
  | 'plus'
  | 'close'
  | 'edit'
  | 'regenerate'
  | 'send'
  | 'archive'
  | 'delete'
  | 'chevron'
  | 'check'
  | 'database'
  | 'more-horizontal'
  | 'more-vertical'
  | 'copy'
  | 'bar-chart'
  | 'file-text'
  | 'check-circle'
  | 'x-circle'

interface IconProps {
  name: IconName
  class?: string
  size?: 'sm' | 'md' | 'lg'
}

const Icon: Component<IconProps> = (props) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const size = () => props.size || 'md'
  const classes = () => classnames(sizeClasses[size()], props.class)

  const commonProps = {
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
    'stroke-width': '2',
    stroke: 'currentColor',
  } as const

  const getIconPath = () => {
    switch (props.name) {
      case 'menu':
        return <path {...commonProps} d="M4 6h16M4 12h16M4 18h16" />

      case 'settings':
      case 'settings-gear':
        return (
          <>
            <path
              {...commonProps}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path {...commonProps} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </>
        )

      case 'plus':
        return <path {...commonProps} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />

      case 'close':
        return <path {...commonProps} d="M6 18L18 6M6 6l12 12" />

      case 'edit':
        return (
          <path
            {...commonProps}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        )

      case 'regenerate':
        return (
          <path
            {...commonProps}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        )

      case 'send':
        return <path {...commonProps} d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />

      case 'archive':
        return <path {...commonProps} d="M5 8l6 6 6-6" />

      case 'delete':
        return (
          <path
            {...commonProps}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        )

      case 'chevron':
        return <path {...commonProps} d="M19 9l-7 7-7-7" />

      case 'check':
        return <path {...commonProps} d="M5 13l4 4L19 7" />

      case 'database':
        return (
          <>
            <ellipse cx="12" cy="6" rx="9" ry="3" {...commonProps} />
            <path d="M3 6v6c0 1.657 4.03 3 9 3s9-1.343 9-3V6" {...commonProps} />
            <path d="M3 12v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6" {...commonProps} />
          </>
        )

      case 'more-horizontal':
        return (
          <>
            <circle cx="12" cy="12" r="1" {...commonProps} />
            <circle cx="19" cy="12" r="1" {...commonProps} />
            <circle cx="5" cy="12" r="1" {...commonProps} />
          </>
        )

      case 'more-vertical':
        return (
          <>
            <circle cx="12" cy="12" r="1" {...commonProps} />
            <circle cx="12" cy="5" r="1" {...commonProps} />
            <circle cx="12" cy="19" r="1" {...commonProps} />
          </>
        )

      case 'copy':
        return (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" {...commonProps} />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" {...commonProps} />
          </>
        )

      case 'bar-chart':
        return (
          <>
            <line x1="18" y1="20" x2="18" y2="10" {...commonProps} />
            <line x1="12" y1="20" x2="12" y2="4" {...commonProps} />
            <line x1="6" y1="20" x2="6" y2="14" {...commonProps} />
          </>
        )

      case 'file-text':
        return (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...commonProps} />
            <polyline points="14 2 14 8 20 8" {...commonProps} />
            <line x1="16" y1="13" x2="8" y2="13" {...commonProps} />
            <line x1="16" y1="17" x2="8" y2="17" {...commonProps} />
            <polyline points="10 9 9 9 8 9" {...commonProps} />
          </>
        )

      case 'check-circle':
        return (
          <>
            <circle cx="12" cy="12" r="10" {...commonProps} />
            <path {...commonProps} d="M9 12l2 2 4-4" />
          </>
        )

      case 'x-circle':
        return (
          <>
            <circle cx="12" cy="12" r="10" {...commonProps} />
            <path {...commonProps} d="M15 9l-6 6M9 9l6 6" />
          </>
        )

      default:
        return null
    }
  }

  return (
    <svg class={classes()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {getIconPath()}
    </svg>
  )
}

export default Icon
