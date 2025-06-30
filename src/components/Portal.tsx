import { Component, JSX, onCleanup, createEffect } from 'solid-js'
import { render } from 'solid-js/web'

export interface PortalProps {
  children: JSX.Element
  mount?: Element
}

const Portal: Component<PortalProps> = (props) => {
  let dispose: (() => void) | undefined

  createEffect(() => {
    const mountElement = props.mount || document.body
    const portalElement = document.createElement('div')

    mountElement.appendChild(portalElement)

    // Render children into the portal element
    const children = props.children
    dispose = render(() => children, portalElement)

    onCleanup(() => {
      dispose?.()
      if (mountElement.contains(portalElement)) {
        mountElement.removeChild(portalElement)
      }
    })
  })

  return null
}

export default Portal
