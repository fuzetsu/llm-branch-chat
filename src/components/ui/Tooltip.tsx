import { Component, JSX, createSignal, Show, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'

type TooltipPlacement = 'top' | 'bottom' | 'auto'

interface TooltipProps {
  content: string
  placement?: TooltipPlacement
  children: JSX.Element
}

const PADDING = 8
const GAP = 6

const Tooltip: Component<TooltipProps> = (props) => {
  const [visible, setVisible] = createSignal(false)
  const [coords, setCoords] = createSignal({ x: 0, y: 0, placeAbove: true })
  let timeoutId: number | undefined
  let containerRef: HTMLDivElement | undefined
  let tooltipRef: HTMLDivElement | undefined

  const calculatePosition = () => {
    if (!containerRef) return

    const trigger = containerRef.getBoundingClientRect()
    const tooltip = tooltipRef?.getBoundingClientRect()
    const tooltipHeight = tooltip?.height ?? 24
    const tooltipWidth = tooltip?.width ?? 100

    // Vertical placement
    let placeAbove = props.placement !== 'bottom'
    if (props.placement !== 'top' && props.placement !== 'bottom') {
      // Auto: prefer top, use bottom if insufficient space
      const spaceAbove = trigger.top
      const spaceBelow = window.innerHeight - trigger.bottom
      placeAbove = spaceAbove >= tooltipHeight + GAP || spaceAbove > spaceBelow
    }

    // Horizontal position (centered, clamped to viewport)
    const halfWidth = tooltipWidth / 2
    let x = trigger.left + trigger.width / 2
    x = Math.max(halfWidth + PADDING, Math.min(x, window.innerWidth - halfWidth - PADDING))

    const y = placeAbove ? trigger.top - GAP : trigger.bottom + GAP

    setCoords({ x, y, placeAbove })
  }

  const showTooltip = () => {
    timeoutId = window.setTimeout(() => {
      setVisible(true)
      requestAnimationFrame(calculatePosition)
    }, 150)
  }

  const hideTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = undefined
    setVisible(false)
  }

  const handleTouchStart = () => {
    if (!visible()) {
      setVisible(true)
      requestAnimationFrame(calculatePosition)
      setTimeout(hideTooltip, 1500)
    }
  }

  onCleanup(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })

  onMount(() => {
    const handleResize = () => visible() && calculatePosition()
    window.addEventListener('resize', handleResize)
    onCleanup(() => window.removeEventListener('resize', handleResize))
  })

  const tooltipStyle = () => ({
    left: `${coords().x}px`,
    top: coords().placeAbove ? undefined : `${coords().y}px`,
    bottom: coords().placeAbove ? `${window.innerHeight - coords().y}px` : undefined,
    transform: 'translateX(-50%)',
  })

  return (
    <div
      ref={containerRef}
      class="inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onTouchStart={handleTouchStart}
    >
      {props.children}
      <Show when={props.content && visible()}>
        <Portal>
          <div
            ref={tooltipRef}
            class="fixed z-[9999] px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap pointer-events-none animate-fade-in"
            style={tooltipStyle()}
          >
            {props.content}
          </div>
        </Portal>
      </Show>
    </div>
  )
}

export default Tooltip
