import { Component, JSX, Show, createSignal, createEffect, onCleanup } from 'solid-js'

interface AnimatedShowProps {
  when: boolean
  children: JSX.Element
  /** CSS class applied during enter (default: 'animate-fade-in') */
  enterClass?: string
  /** CSS class applied during exit */
  exitClass?: string
  /** Exit animation duration in ms (default: 150) */
  exitDuration?: number
}

/**
 * A Show component that supports exit animations.
 * Keeps children mounted during exit animation before removing from DOM.
 */
const AnimatedShow: Component<AnimatedShowProps> = (props) => {
  const [mounted, setMounted] = createSignal(false)
  const [exiting, setExiting] = createSignal(false)
  let exitTimeout: number | undefined

  createEffect(() => {
    const shouldShow = props.when
    if (shouldShow) {
      // Cancel any pending exit
      if (exitTimeout) {
        clearTimeout(exitTimeout)
        exitTimeout = undefined
      }
      setMounted(true)
      setExiting(false)
    } else if (mounted()) {
      // Start exit animation
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

  const animationClass = () => {
    if (exiting()) {
      return props.exitClass ?? ''
    }
    return props.enterClass ?? 'animate-fade-in'
  }

  return (
    <Show when={mounted()}>
      <div class={animationClass()}>{props.children}</div>
    </Show>
  )
}

export default AnimatedShow
