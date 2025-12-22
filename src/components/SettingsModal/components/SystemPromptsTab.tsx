import { Component, createMemo, For, Show, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { SystemPrompt } from '../../../types'
import { generateSystemPromptId } from '../../../utils'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import Textarea from '../../ui/Textarea'
import FormField from '../../ui/FormField'
import ItemCard from '../../ui/ItemCard'
import EmptyState from '../../ui/EmptyState'
import SectionHeader from '../../ui/SectionHeader'

interface SystemPromptsTabProps {
  systemPrompts: Map<string, SystemPrompt>
  defaultSystemPromptId: string | null
  onUpdatePrompts: (prompts: Map<string, SystemPrompt>) => void
  onUpdateDefaultId: (id: string | null) => void
}

const SystemPromptsTab: Component<SystemPromptsTabProps> = (props) => {
  const [editingPromptId, setEditingPromptId] = createSignal<string | null>(null)
  const [promptForm, setPromptForm] = createStore({
    title: '',
    content: '',
  })

  let formSection!: HTMLDivElement

  const promptsList = createMemo(() => Array.from(props.systemPrompts.values()))

  const disableSubmit = createMemo(() => !promptForm.title.trim() || !promptForm.content.trim())

  const isEditing = () => editingPromptId() !== null

  const resetForm = () => {
    setEditingPromptId(null)
    setPromptForm({ title: '', content: '' })
  }

  const handleAddPrompt = () => {
    if (disableSubmit()) return

    const newPromptId = generateSystemPromptId()
    const newPrompt: SystemPrompt = {
      id: newPromptId,
      title: promptForm.title.trim(),
      content: promptForm.content.trim(),
    }

    const newPrompts = new Map(props.systemPrompts)
    newPrompts.set(newPromptId, newPrompt)

    props.onUpdatePrompts(newPrompts)
    resetForm()
  }

  const handleEditPrompt = (promptId: string) => {
    const prompt = props.systemPrompts.get(promptId)
    if (!prompt) return

    setEditingPromptId(promptId)
    setPromptForm({
      title: prompt.title,
      content: prompt.content,
    })
    formSection.scrollIntoView({ behavior: 'smooth' })
  }

  const handleUpdatePrompt = () => {
    const promptId = editingPromptId()
    if (!promptId || disableSubmit()) return

    const updatedPrompt: SystemPrompt = {
      id: promptId,
      title: promptForm.title.trim(),
      content: promptForm.content.trim(),
    }

    const newPrompts = new Map(props.systemPrompts)
    newPrompts.set(promptId, updatedPrompt)

    props.onUpdatePrompts(newPrompts)
    resetForm()
  }

  const handleDeletePrompt = (promptId: string) => {
    if (!confirm('Are you sure you want to delete this system prompt? This cannot be undone.')) {
      return
    }

    const newPrompts = new Map(props.systemPrompts)
    newPrompts.delete(promptId)

    // If deleting the default prompt, clear the default
    if (promptId === props.defaultSystemPromptId) {
      props.onUpdateDefaultId(null)
    }

    props.onUpdatePrompts(newPrompts)
  }

  const handleSetDefaultPrompt = (promptId: string) => {
    if (promptId === props.defaultSystemPromptId) {
      props.onUpdateDefaultId(null)
    } else {
      props.onUpdateDefaultId(promptId)
    }
  }

  return (
    <div class="space-y-5">
      {/* System Prompts List */}
      <div class="space-y-3">
        <SectionHeader title="System Prompts" />

        <Show when={promptsList().length === 0}>
          <EmptyState
            title="No system prompts configured"
            description="Add your first system prompt to get started"
          />
        </Show>

        <For each={promptsList()}>
          {(prompt) => (
            <ItemCard
              title={prompt.title}
              badge={props.defaultSystemPromptId === prompt.id ? 'Default' : undefined}
              actions={
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSetDefaultPrompt(prompt.id)}
                  >
                    {props.defaultSystemPromptId === prompt.id ? 'Unset Default' : 'Set Default'}
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
              value={promptForm.title}
              onInput={(value) => setPromptForm('title', value)}
            />
          </FormField>

          <FormField label="Prompt Content">
            <Textarea
              rows={6}
              placeholder="Enter the system prompt content here..."
              value={promptForm.content}
              onInput={(value) => setPromptForm('content', value)}
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
