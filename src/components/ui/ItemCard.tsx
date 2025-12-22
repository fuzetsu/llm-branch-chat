import { Component, JSX, Show } from 'solid-js'

interface ItemCardProps {
  title: string
  badge?: string | undefined
  children?: JSX.Element
  actions?: JSX.Element
}

/**
 * Reusable card component for CRUD list items.
 * Used in settings for providers, system prompts, etc.
 */
const ItemCard: Component<ItemCardProps> = (props) => {
  return (
    <div class="border border-gray-200 dark:border-dark-border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div class="flex justify-between items-start gap-2 flex-wrap md:flex-nowrap">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium text-gray-900 dark:text-white">{props.title}</span>
            <Show when={props.badge}>
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {props.badge}
              </span>
            </Show>
          </div>
          <Show when={props.children}>
            <div class="mt-1">{props.children}</div>
          </Show>
        </div>
        <Show when={props.actions}>
          <div class="flex gap-2 shrink-0">{props.actions}</div>
        </Show>
      </div>
    </div>
  )
}

export default ItemCard
