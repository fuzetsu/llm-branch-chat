import { Component, JSX } from 'solid-js'

interface SliderProps {
  value?: number
  onInput?: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  showValue?: boolean
  class?: string
  disabled?: boolean
}

const Slider: Component<SliderProps> = (props) => {
  const handleInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent> = (e) => {
    const value = parseFloat(e.currentTarget.value)
    props.onInput?.(value)
  }

  return (
    <div class={props.class}>
      <div class="flex items-center justify-between mb-2">
        {props.label && (
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {props.label}
          </label>
        )}
        {props.showValue && (
          <span class="text-primary font-semibold text-sm">{props.value || 0}</span>
        )}
      </div>
      <input
        type="range"
        class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        min={props.min || 0}
        max={props.max || 100}
        step={props.step || 1}
        value={props.value || 0}
        onInput={handleInput}
        disabled={props.disabled}
      />
    </div>
  )
}

export default Slider
