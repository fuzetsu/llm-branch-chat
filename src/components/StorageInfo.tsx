import { Component } from 'solid-js'
import Icon from './ui/Icon'

export const StorageInfo: Component<{ sizeInBytes: number }> = (props) => {
  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
    if (bytes > 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${bytes} bytes`
  }

  return (
    <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 select-none">
      <Icon name="database" class="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" />
      <span class="text-sm font-semibold text-gray-900 dark:text-white">Storage Size:</span>
      <span class="text-sm text-gray-600 dark:text-gray-300">{formatSize(props.sizeInBytes)}</span>
    </div>
  )
}
