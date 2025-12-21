import { Component } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Select from './ui/Select'
import { classnames } from '../utils'

interface ModelSelectorProps {
  class?: string
}

const SystemPromptSelector: Component<ModelSelectorProps> = (props) => {
  const store = useAppStore()

  const currentChat = () => store.getCurrentChat()
  const currentPrompt = () => currentChat()?.systemPromptId

  const handlePromptChange = (selectedPrompt: string) => {
    const chatId = store.ensureCurrentChat()
    store.updateChat(chatId, { systemPromptId: selectedPrompt || null })
  }

  return (
    <Select
      class={classnames(props.class, 'truncate')}
      fullWidth={false}
      value={currentPrompt() || ''}
      onChange={handlePromptChange}
      options={() => [
        { value: '', label: 'None (use default)' },
        ...Array.from(store.state.settings.systemPrompts.values()).map((prompt) => ({
          value: prompt.id,
          label: prompt.title,
        })),
      ]}
      placeholder="Select a system prompt"
    />
  )
}

export default SystemPromptSelector
