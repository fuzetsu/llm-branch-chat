import { Component, JSX, Show } from 'solid-js'
import { classnames } from '../../utils'

interface EmptyStateProps {
  title: string
  description?: string
  action?: JSX.Element
  class?: string
}

/**
 * Reusable empty state component for lists with no items.
 */
const EmptyState: Component<EmptyStateProps> = (props) => {
  return (
    <div
      class={classnames(
        'text-center py-6 border border-border rounded-lg animate-fade-in',
        props.class,
      )}
    >
      <p class="text-text-muted">{props.title}</p>
      <Show when={props.description}>
        <p class="text-sm text-text-placeholder mt-1">{props.description}</p>
      </Show>
      <Show when={props.action}>
        <div class="mt-3">{props.action}</div>
      </Show>
    </div>
  )
}

export default EmptyState
