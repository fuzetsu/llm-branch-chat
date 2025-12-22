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
    <div class="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary rounded-lg border border-border select-none">
      <Icon name="database" class="w-5 h-5 text-primary shrink-0" />
      <span class="text-sm font-semibold text-text">Storage Size:</span>
      <span class="text-sm text-text-secondary">{formatSize(props.sizeInBytes)}</span>
    </div>
  )
}
