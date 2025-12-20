import { Component, createMemo, For, Show, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { SystemPrompt } from '../types/index.js'
import { generateSystemPromptId } from '../utils/index.js'
import Button from './ui/Button'
import Input from './ui/Input'
import Textarea from './ui/Textarea'
import FormField from './ui/FormField'

interface SystemPromptsTabProps {
  systemPrompts: Map<string, SystemPrompt>
  defaultSystemPromptId: string | null
  onUpdateSystemPrompts: (prompts: Map<string, SystemPrompt>) => void
  onUpdateDefaultSystemPromptId: (id: string | null) => void
}

const SystemPromptsTab: Component<SystemPromptsTabProps> = (props) => {
  const [editingPromptId, setEditingPromptId] = createSignal<string | null>(null)
  const [promptForm, setPromptForm] = createStore({
    title: '',
    content: '',
  })

  // Convert Map to array for rendering
  const promptsList = createMemo(() => Array.from(props.systemPrompts.values()))

  const disableSubmit = createMemo(() => !promptForm.title.trim() || !promptForm.content.trim())

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

    props.onUpdateSystemPrompts(newPrompts)

    // Reset form
    setPromptForm({ title: '', content: '' })
  }

  const handleEditPrompt = (promptId: string) => {
    const prompt = props.systemPrompts.get(promptId)
    if (!prompt) return

    setEditingPromptId(promptId)
    setPromptForm({
      title: prompt.title,
      content: prompt.content,
    })
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

    props.onUpdateSystemPrompts(newPrompts)

    // Reset form
    setEditingPromptId(null)
    setPromptForm({ title: '', content: '' })
  }

  const handleDeletePrompt = (promptId: string) => {
    if (!confirm('Are you sure you want to delete this system prompt? This cannot be undone.')) {
      return
    }

    const newPrompts = new Map(props.systemPrompts)
    newPrompts.delete(promptId)

    // If deleting the default prompt, clear the default
    if (promptId === props.defaultSystemPromptId) {
      props.onUpdateDefaultSystemPromptId(null)
    }

    props.onUpdateSystemPrompts(newPrompts)
  }

  const handleSetDefaultPrompt = (promptId: string) => {
    if (promptId === props.defaultSystemPromptId) {
      props.onUpdateDefaultSystemPromptId(null)
    } else {
      props.onUpdateDefaultSystemPromptId(promptId)
    }
  }

  const isEditing = () => editingPromptId() !== null

  return (
    <div class="space-y-6">
      {/* System Prompts List */}
      <div class="space-y-4">
        <h4 class="text-md font-medium text-gray-900 dark:text-white">System Prompts</h4>

        <Show when={promptsList().length === 0}>
          <div class="text-center py-8 border border-gray-200 dark:border-dark-border rounded-lg">
            <p class="text-gray-500 dark:text-gray-400">No system prompts configured</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Add your first system prompt to get started
            </p>
          </div>
        </Show>

        <For each={promptsList()}>
          {(prompt) => (
            <div class="border border-gray-200 dark:border-dark-border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <span class="font-medium text-gray-900 dark:text-white">{prompt.title}</span>
                    <Show when={props.defaultSystemPromptId === prompt.id}>
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        Default
                      </span>
                    </Show>
                  </div>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap line-clamp-3">
                    {prompt.content}
                  </p>
                </div>
                <div class="flex space-x-2 ml-4">
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
                </div>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* System Prompt Form */}
      <div class="border-t border-gray-200 dark:border-dark-border pt-6">
        <h4 class="text-md font-medium text-gray-900 dark:text-white mb-4">
          {isEditing() ? 'Edit System Prompt' : 'Add New System Prompt'}
        </h4>

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

          <div class="flex space-x-2">
            <Show when={isEditing()}>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingPromptId(null)
                  setPromptForm({ title: '', content: '' })
                }}
              >
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

