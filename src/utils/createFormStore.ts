import { createStore, SetStoreFunction } from 'solid-js/store'

export function createFormStore<T extends object>(setDirty: () => void, initialState: T) {
  const [get, _set] = createStore(initialState)
  const set = ((...args: never[]) => {
    setDirty()
    ;(_set as (...args: never[]) => void).apply(null, args)
  }) as SetStoreFunction<T>
  return [get, set] as const
}
