import { Component } from 'solid-js'

interface SectionHeaderProps {
  title: string
  class?: string
}

/**
 * Consistent section header styling for settings panels and similar UIs.
 */
const SectionHeader: Component<SectionHeaderProps> = (props) => {
  return (
    <h4 class={`text-md font-medium text-gray-900 dark:text-white ${props.class ?? ''}`}>
      {props.title}
    </h4>
  )
}

export default SectionHeader
