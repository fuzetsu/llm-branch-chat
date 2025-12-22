import { Component } from 'solid-js'
import { classnames } from '../../utils'

interface SectionHeaderProps {
  title: string
  class?: string
}

/**
 * Consistent section header styling for settings panels and similar UIs.
 */
const SectionHeader: Component<SectionHeaderProps> = (props) => {
  return <h4 class={classnames('text-md font-medium text-text', props.class)}>{props.title}</h4>
}

export default SectionHeader
