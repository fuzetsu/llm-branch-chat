import { Component, createMemo, For, Show, createSignal } from 'solid-js'
import type { SystemPrompt } from '../../../types'
import { generateSystemPromptId } from '../../../utils'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import Textarea from '../../ui/Textarea'
import FormField from '../../ui/FormField'
import ItemCard from '../../ui/ItemCard'
import EmptyState from '../../ui/EmptyState'
import SectionHeader from '../../ui/SectionHeader'
import { createStore, produce } from 'solid-js/store'
import { useAppStore } from '../../../store/AppStore'

type Draft = Omit<SystemPrompt, 'id'>

const SystemPromptsTab: Component<{ setPreventClose(shouldPrevent: boolean): void }> = (props) => {
  const store = useAppStore()

  const [editingPromptId, setEditingPromptId] = createSignal<string | null>(null)

  let formSection!: HTMLDivElement

  const prompts = () => store.state.settings.systemPrompts
  const defaultPromptId = () => store.state.settings.chat.defaultSystemPromptId

  const promptsList = () => Object.values(prompts())

  const [draft, setDraft] = createStore<Draft>({ title: '', content: '' })

  const disableSubmit = createMemo(() => !draft.title.trim() || !draft.content.trim())

  const isEditing = () => editingPromptId() !== null

  const resetForm = () => {
    props.setPreventClose(false)
    setEditingPromptId(null)
    setDraft({ title: '', content: '' })
  }

  const handleAddPrompt = () => {
    if (disableSubmit()) return

    const newPromptId = generateSystemPromptId()
    const newPrompt: SystemPrompt = {
      id: newPromptId,
      title: draft.title.trim(),
      content: draft.content.trim(),
    }

    store.setState('settings', 'systemPrompts', newPromptId, newPrompt)
    resetForm()
  }

  const handleEditPrompt = (promptId: string) => {
    const prompt = prompts()[promptId]
    if (!prompt) return

    setEditingPromptId(promptId)
    setDraft({ title: prompt.title, content: prompt.content })
    formSection.scrollIntoView({ behavior: 'smooth' })
  }

  const handleUpdateDraft = (key: keyof Draft, value: string) => {
    props.setPreventClose(true)
    setDraft(key, value)
  }

  const handleUpdatePrompt = () => {
    const promptId = editingPromptId()
    if (!promptId || disableSubmit()) return

    const updatedPrompt: SystemPrompt = {
      id: promptId,
      title: draft.title.trim(),
      content: draft.content.trim(),
    }

    store.setState('settings', 'systemPrompts', promptId, updatedPrompt)
    resetForm()
  }

  const handleDeletePrompt = (promptId: string) => {
    if (!confirm('Are you sure you want to delete this system prompt? This cannot be undone.')) {
      return
    }
    // If deleting the default prompt, clear the default
    if (promptId === defaultPromptId()) {
      store.setState('settings', 'chat', 'defaultSystemPromptId', null)
    }

    if (editingPromptId() === promptId) resetForm()

    store.setState(
      produce((draft) => {
        delete draft.settings.systemPrompts[promptId]
      }),
    )
  }

  const handleSetDefaultPrompt = (promptId: string) =>
    store.setState(
      'settings',
      'chat',
      'defaultSystemPromptId',
      promptId === defaultPromptId() ? null : promptId,
    )

  return (
    <div class="space-y-5">
      {/* System Prompts List */}
      <div class="space-y-3">
        <SectionHeader title="System Prompts" />

        <For
          each={promptsList()}
          fallback={
            <EmptyState
              title="No system prompts configured"
              description="Add your first system prompt to get started"
            />
          }
        >
          {(prompt) => (
            <ItemCard
              title={prompt.title}
              badge={defaultPromptId() === prompt.id ? 'Default' : undefined}
              actions={
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSetDefaultPrompt(prompt.id)}
                  >
                    {defaultPromptId() === prompt.id ? 'Unset Default' : 'Set Default'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleEditPrompt(prompt.id)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeletePrompt(prompt.id)}>
                    Delete
                  </Button>
                </>
              }
            >
              <p class="text-sm text-text-muted whitespace-pre-wrap line-clamp-3">
                {prompt.content}
              </p>
            </ItemCard>
          )}
        </For>
      </div>

      {/* System Prompt Form */}
      <div ref={formSection} class="border-border">
        <SectionHeader
          title={isEditing() ? 'Edit System Prompt' : 'Add New System Prompt'}
          class="mb-4"
        />

        <div class="space-y-4">
          <FormField label="Prompt Title">
            <Input
              type="text"
              placeholder="e.g., 'Creative Writer', 'Code Assistant'"
              value={draft.title}
              onInput={(value) => handleUpdateDraft('title', value)}
            />
          </FormField>

          <FormField label="Prompt Content">
            <Textarea
              rows={6}
              placeholder="Enter the system prompt content here..."
              value={draft.content}
              onInput={(value) => handleUpdateDraft('content', value)}
            />
          </FormField>

          <div class="flex gap-2">
            <Show when={isEditing()}>
              <Button variant="secondary" onClick={resetForm}>
                Cancel Edit
              </Button>
              <Button variant="primary" disabled={disableSubmit()} onClick={handleUpdatePrompt}>
                Update Prompt
              </Button>
            </Show>
            <Show when={!isEditing()}>
              <Button variant="primary" disabled={disableSubmit()} onClick={handleAddPrompt}>
                Add Prompt
              </Button>
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemPromptsTab
