import { Component, JSX, onCleanup, createEffect } from 'solid-js'
import { render } from 'solid-js/web'

export interface PortalProps {
  children: JSX.Element
  mount?: Element
}

const Portal: Component<PortalProps> = (props) => {
  const mountElement = props.mount || document.body
  const portalElement = document.createElement('div')

  let dispose: (() => void) | undefined

  createEffect(() => {
    mountElement.appendChild(portalElement)

    // Render children into the portal element
    dispose = render(() => props.children, portalElement)

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
