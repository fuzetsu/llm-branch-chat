import { Component, For, Show } from 'solid-js'
import type { ProviderConfig } from '../../../types'
import Button from '../../ui/Button'
import ItemCard from '../../ui/ItemCard'
import EmptyState from '../../ui/EmptyState'
import SectionHeader from '../../ui/SectionHeader'

interface ProviderListProps {
  providers: Array<[string, ProviderConfig]>
  onEdit: (name: string) => void
  onDelete: (name: string) => void
}

const ProviderList: Component<ProviderListProps> = (props) => {
  return (
    <div class="space-y-3">
      <SectionHeader title="Configured Providers" />

      <Show when={props.providers.length === 0}>
        <EmptyState
          title="No providers configured"
          description="Add your first provider to get started"
        />
      </Show>

      <For each={props.providers}>
        {([name, provider]) => (
          <ItemCard
            title={name}
            actions={
              <>
                <Button variant="secondary" size="sm" onClick={() => props.onEdit(name)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => props.onDelete(name)}>
                  Delete
                </Button>
              </>
            }
          >
            <p class="text-sm text-text-muted">{provider.baseUrl}</p>
            <p class="text-sm text-text-muted">{provider.availableModels.length} models</p>
          </ItemCard>
        )}
      </For>
    </div>
  )
}

export default ProviderList
