import { Component } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Select from './ui/Select'
import { classnames } from '../utils'

interface ModelSelectorProps {
  class?: string
}

const NO_PROMPT = '__none__'

const SystemPromptSelector: Component<ModelSelectorProps> = (props) => {
  const store = useAppStore()

  const currentChat = () => store.getCurrentChat()
  const currentPrompt = () => currentChat()?.systemPromptId

  const handlePromptChange = (selectedPrompt: string) => {
    const chatId = store.ensureCurrentChat()
    store.updateChat(chatId, {
      systemPromptId: !selectedPrompt || selectedPrompt === NO_PROMPT ? null : selectedPrompt,
    })
  }

  return (
    <Select
      class={classnames(props.class, 'truncate')}
      fullWidth={false}
      value={currentPrompt() || NO_PROMPT}
      onChange={handlePromptChange}
      options={() => [
        { value: NO_PROMPT, label: 'None (use default)' },
        ...Object.values(store.state.settings.systemPrompts).map((prompt) => ({
          value: prompt.id,
          label: prompt.title,
        })),
      ]}
      placeholder="Select a system prompt"
    />
  )
}

export default SystemPromptSelector
