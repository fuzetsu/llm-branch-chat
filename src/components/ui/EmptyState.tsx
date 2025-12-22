import { Component, JSX, Show } from 'solid-js'

interface EmptyStateProps {
  title: string
  description?: string
  action?: JSX.Element
}

/**
 * Reusable empty state component for lists with no items.
 */
const EmptyState: Component<EmptyStateProps> = (props) => {
  return (
    <div class="text-center py-8 border border-gray-200 dark:border-dark-border rounded-lg">
      <p class="text-gray-500 dark:text-gray-400">{props.title}</p>
      <Show when={props.description}>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{props.description}</p>
      </Show>
      <Show when={props.action}>
        <div class="mt-4">{props.action}</div>
      </Show>
    </div>
  )
}

export default EmptyState
