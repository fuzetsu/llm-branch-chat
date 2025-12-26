import { Component, JSX, createEffect, onCleanup, onMount, createSignal, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { classnames } from '../../utils'

type PopoverPlacement = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'auto'

interface PopoverProps {
  /** Element that triggers the popover (e.g., a button) */
  trigger: JSX.Element
  /** Content to display in the popover */
  children: JSX.Element
  /** Control the open state */
  isOpen: boolean
  /** Callback when popover should close */
  onClose: () => void
  /** Where to position the popover relative to trigger */
  placement?: PopoverPlacement
  /** Gap between trigger and popover in pixels */
  offset?: number
  /** Close when clicking outside the popover */
  closeOnClickOutside?: boolean
  /** Close when pressing Escape */
  closeOnEscape?: boolean
  /** Additional CSS classes for the popover container */
  class?: string
  /** Whether the popover should match the trigger's width */
  matchTriggerWidth?: boolean
  /** CSS class for enter animation */
  enterClass?: string
  /** CSS class for exit animation */
  exitClass?: string
  /** Exit animation duration in ms */
  exitDuration?: number
}

const Popover: Component<PopoverProps> = (props) => {
  let triggerRef: HTMLDivElement | undefined
  let popoverRef: HTMLDivElement | undefined

  const [mounted, setMounted] = createSignal(false)
  const [exiting, setExiting] = createSignal(false)
  let exitTimeout: number | undefined

  const offset = () => props.offset ?? 8
  const closeOnClickOutside = () => props.closeOnClickOutside ?? true
  const closeOnEscape = () => props.closeOnEscape ?? true

  const calculatePosition = (): {
    top?: string
    bottom?: string
    left?: string
    right?: string
    width?: string
  } => {
    if (!triggerRef || !popoverRef) return {}

    // Get the actual trigger element (first child) since wrapper uses display: contents
    const triggerElement = triggerRef.firstElementChild as HTMLElement
    if (!triggerElement) return {}

    const trigger = triggerElement.getBoundingClientRect()
    const popover = popoverRef.getBoundingClientRect()
    const gap = offset()
    let placement: PopoverPlacement = props.placement ?? 'bottom-left'

    if (placement === 'auto') {
      const spaceBelow = window.innerHeight - trigger.bottom
      const spaceRight = window.innerWidth - trigger.left

      const vertical = spaceBelow >= popover.height + gap ? 'bottom' : 'top'
      const horizontal = spaceRight >= popover.width ? 'left' : 'right'
      placement = `${vertical}-${horizontal}`
    }

    const style: Record<string, string> = {}

    if (placement.startsWith('bottom')) {
      style.top = `${trigger.bottom + gap}px`
    } else {
      style.bottom = `${window.innerHeight - trigger.top + gap}px`
    }

    if (placement.endsWith('left')) {
      style.left = `${trigger.left}px`
    } else {
      style.right = `${window.innerWidth - trigger.right}px`
    }

    if (props.matchTriggerWidth) {
      style.width = `${trigger.width}px`
    }

    return style
  }

  createEffect(() => {
    const shouldShow = props.isOpen
    if (shouldShow) {
      if (exitTimeout) {
        clearTimeout(exitTimeout)
        exitTimeout = undefined
      }
      setMounted(true)
      setExiting(false)
    } else if (mounted()) {
      setExiting(true)
      const duration = props.exitDuration ?? 150
      exitTimeout = window.setTimeout(() => {
        setMounted(false)
        setExiting(false)
        exitTimeout = undefined
      }, duration)
    }
  })

  onCleanup(() => {
    if (exitTimeout) {
      clearTimeout(exitTimeout)
    }
  })

  createEffect(() => {
    if (!closeOnClickOutside() || !mounted()) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (triggerRef?.contains(target)) return

      const closestPopover = target.closest('.popover-container')
      if (closestPopover && triggerRef && !closestPopover.contains(triggerRef)) return

      props.onClose()
    }

    // Delay listener setup to avoid the click that opened the popover
    const timeoutId = window.setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    onCleanup(() => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    })
  })

  createEffect(() => {
    if (!closeOnEscape() || !mounted()) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown))
  })

  onMount(() => {
    const handleResize = () => {
      if (mounted() && popoverRef) {
        const pos = calculatePosition()
        Object.assign(popoverRef.style, pos)
      }
    }

    window.addEventListener('resize', handleResize)
    onCleanup(() => window.removeEventListener('resize', handleResize))
  })

  createEffect(() => {
    if (mounted() && popoverRef) {
      requestAnimationFrame(() => {
        const pos = calculatePosition()
        Object.assign(popoverRef!.style, pos)
      })
    }
  })

  const animationClass = () =>
    exiting()
      ? (props.exitClass ?? 'animate-fade-out-slide-up')
      : (props.enterClass ?? 'animate-fade-in-slide-down')

  return (
    <>
      <div ref={triggerRef} class="popover-trigger contents">
        {props.trigger}
      </div>
      <Portal>
        <Show when={mounted()}>
          <div
            ref={popoverRef}
            class={classnames(
              'popover-container fixed z-60 bg-surface rounded-lg shadow-lg border border-border',
              animationClass(),
              props.class,
            )}
          >
            {props.children}
          </div>
        </Show>
      </Portal>
    </>
  )
}

export default Popover
