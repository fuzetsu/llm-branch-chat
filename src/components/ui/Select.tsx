import {
  Component,
  For,
  Show,
  createSignal,
  createMemo,
  createEffect,
  createUniqueId,
  onCleanup,
} from 'solid-js'
import { classnames, getElementById, isMobileBrowser } from '../../utils'
import { inputBaseStyles } from './styles'
import Popover from './Popover'
import Icon from './Icon'
import Input from './Input'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

interface SelectProps {
  value?: string
  onChange?: (value: string) => void
  options?: SelectOption[] | (() => SelectOption[])
  optionGroups?: SelectOptionGroup[] | (() => SelectOptionGroup[])
  placeholder?: string
  class?: string | undefined
  disabled?: boolean
  fullWidth?: boolean
  /** Hide the search input (default: false, search shown) */
  hideSearch?: boolean
}

const Select: Component<SelectProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [searchQuery, setSearchQuery] = createSignal('')
  const [lockedWidth, setLockedWidth] = createSignal<number | null>(null)

  const searchId = createUniqueId()
  const popoverId = createUniqueId()

  const getOptions = () => (typeof props.options === 'function' ? props.options() : props.options)

  const getOptionGroups = () =>
    typeof props.optionGroups === 'function' ? props.optionGroups() : props.optionGroups

  const currentValue = () => props.value || ''

  const selectedLabel = createMemo(() => {
    const value = currentValue()
    if (!value) return null

    const flatOptions = getOptions()
    if (flatOptions) {
      const option = flatOptions.find((opt) => opt.value === value)
      if (option) return option.label
    }

    const groups = getOptionGroups()
    if (groups) {
      for (const group of groups) {
        const option = group.options.find((opt) => opt.value === value)
        if (option) return option.label
      }
    }

    return null
  })

  const filteredOptions = createMemo(() => {
    const options = getOptions()
    if (!options) return null

    const query = searchQuery().toLowerCase()
    if (!query) return options

    return options.filter((opt) => opt.label.toLowerCase().includes(query))
  })

  const filteredGroups = createMemo(() => {
    const groups = getOptionGroups()
    if (!groups) return null

    const query = searchQuery().toLowerCase()
    if (!query) return groups

    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter((opt) => opt.label.toLowerCase().includes(query)),
      }))
      .filter((group) => group.options.length > 0)
  })

  const hasOptions = createMemo(
    () => (filteredOptions()?.length ?? 0) > 0 || (filteredGroups()?.length ?? 0) > 0,
  )

  const handleSelect = (value: string) => {
    props.onChange?.(value)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleToggle = () => {
    if (props.disabled) return
    setIsOpen(!isOpen())
  }

  const handleClose = () => {
    setIsOpen(false)
    setSearchQuery('')
    setLockedWidth(null)
  }

  createEffect(() => {
    if (isOpen() && !props.hideSearch && !isMobileBrowser()) {
      // Small delay to ensure popover is mounted and positioned
      const id = setTimeout(() => getElementById(searchId)?.focus(), 100)
      onCleanup(() => clearTimeout(id))
    }
  })

  createEffect(() => {
    if (isOpen()) {
      // automatically scroll selected option into view
      const id = setTimeout(
        () =>
          getElementById(popoverId).querySelector('[data-selected=true]')?.scrollIntoView({
            block: 'center',
          }),
        0,
      )
      onCleanup(() => clearTimeout(id))
    }
  })

  createEffect(() => {
    if (isOpen() && !lockedWidth()) {
      // Lock width on first open to prevent jumping during search
      setTimeout(() => {
        const popover = document.getElementById(popoverId)
        if (popover) {
          setLockedWidth(popover.offsetWidth)
        }
      }, 50)
    }
  })

  const optionButtonClass = (optionValue: string) =>
    classnames(
      'block w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer',
      currentValue() === optionValue
        ? 'bg-surface-active text-primary font-medium'
        : 'text-text hover:bg-surface-hover',
    )

  const trigger = (
    <button
      type="button"
      class={classnames(
        inputBaseStyles,
        'cursor-pointer flex items-center justify-between gap-2 w-full text-sm',
        props.disabled && 'opacity-50 cursor-not-allowed',
        props.class,
      )}
      onClick={handleToggle}
      disabled={props.disabled}
    >
      <span class={classnames('truncate min-w-0', !selectedLabel() && 'text-text-muted')}>
        {selectedLabel() || props.placeholder || 'Select an option'}
      </span>
      <Icon
        name="chevron"
        size="sm"
        class={classnames(
          'text-text-muted transition-transform shrink-0',
          isOpen() && 'rotate-180',
        )}
      />
    </button>
  )

  return (
    <Popover
      trigger={trigger}
      isOpen={isOpen()}
      onClose={handleClose}
      placement="auto"
      class="py-1 min-w-50 max-w-100"
    >
      <div
        id={popoverId}
        class="flex flex-col"
        style={lockedWidth() ? { width: `${lockedWidth()}px` } : undefined}
      >
        <Show when={!props.hideSearch}>
          <div class="px-2 py-1">
            <Input
              id={searchId}
              type="text"
              placeholder="Search..."
              value={searchQuery()}
              onInput={setSearchQuery}
              class="text-sm"
            />
          </div>
          <div class="border-t border-border my-1" />
        </Show>

        <div class="max-h-80 overflow-y-auto">
          <Show
            when={hasOptions()}
            fallback={
              <div class="px-3 py-2 text-sm text-text-muted text-center">
                {searchQuery() ? 'No results found' : 'No options available'}
              </div>
            }
          >
            <Show
              when={getOptionGroups()}
              fallback={
                <For each={filteredOptions()}>
                  {(option) => (
                    <button
                      class={optionButtonClass(option.value)}
                      onClick={() => handleSelect(option.value)}
                    >
                      {option.label}
                    </button>
                  )}
                </For>
              }
            >
              <For each={filteredGroups()}>
                {(group) => (
                  <>
                    <div class="px-3 py-2 text-xs font-medium text-text-muted uppercase tracking-wide">
                      {group.label}
                    </div>
                    <For each={group.options}>
                      {(option) => (
                        <button
                          data-selected={option.value === currentValue()}
                          class={optionButtonClass(option.value)}
                          onClick={() => handleSelect(option.value)}
                        >
                          {option.label}
                        </button>
                      )}
                    </For>
                  </>
                )}
              </For>
            </Show>
          </Show>
        </div>
      </div>
    </Popover>
  )
}

export default Select
