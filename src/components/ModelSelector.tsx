import { Component } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import { getModelsGroupedByProvider } from '../utils/providerUtils'
import Select from './ui/Select'
import { classnames } from '../utils'

interface ModelSelectorProps {
  class?: string
}

const ModelSelector: Component<ModelSelectorProps> = (props) => {
  const store = useAppStore()

  const currentChat = () => store.getCurrentChat()
  const currentModel = () => currentChat()?.model || store.state.settings.chat.model

  const handleModelChange = (selectedModel: string) => {
    const chatId = store.ensureCurrentChat()
    store.updateChat(chatId, { model: selectedModel })
  }

  return (
    <Select
      placeholder="Select a model"
      fullWidth={false}
      class={classnames(props.class, 'truncate')}
      value={currentModel()}
      onChange={handleModelChange}
      optionGroups={() => getModelsGroupedByProvider(store.state.settings.api.providers)}
    />
  )
}

export default ModelSelector
