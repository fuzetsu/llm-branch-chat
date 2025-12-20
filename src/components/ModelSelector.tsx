import { Component, For } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import { getAllAvailableModels } from '../utils/providerUtils'
import { classnames } from '../utils'

interface ModelSelectorProps {
  class?: string
}

const ModelSelector: Component<ModelSelectorProps> = (props) => {
  const store = useAppStore()

  const currentChat = () => store.getCurrentChat()
  const currentModel = () => currentChat()?.model || store.state.settings.chat.model

  const handleModelChange = (e: Event) => {
    const selectedModel = (e.currentTarget as HTMLSelectElement).value
    const chatId = store.ensureCurrentChat()
    store.updateChat(chatId, { model: selectedModel })
  }

  return (
    <select
      class={classnames(
        'px-3 py-2 text-sm bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white cursor-pointer',
        props.class,
      )}
      value={currentModel()}
      onChange={handleModelChange}
    >
      <For each={getAllAvailableModels(store.state.settings.api.providers)}>
        {(model) => <option value={model}>{model}</option>}
      </For>
    </select>
  )
}

export default ModelSelector
