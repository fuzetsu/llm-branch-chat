import { createEffect, createMemo, createSignal } from 'solid-js'

/**
 * Creates a signal that resets to its initial value whenever the provided key changes.
 *
 * This utility behaves like a normal `createSignal`, but automatically resets the signal's value
 * to the initial value whenever the `key` signal changes. It is useful for scenarios where you want
 * to reset some reactive state in response to changes in a dependency.
 *
 * @template T - The type of the signal's value.
 * @param initial - The initial value of the signal.
 * @param key - A reactive getter function whose change triggers the signal reset.
 * @returns A tuple containing the signal getter and setter, identical to `createSignal`.
 *
 * @example
 * ```tsx
 * const [count, setCount] = createKeyedSignal(0, () => props.id)
 *
 * // Whenever props.id changes, count resets to 0 automatically.
 * ```
 */
export const createKeyedSignal = <T>(initial: T, key: () => unknown) => {
  const [signal, setSignal] = createSignal(initial)
  const resetSignal = createMemo(key)
  createEffect(() => {
    resetSignal()
    setSignal(() => initial)
  })
  return [signal, setSignal] as const
}
