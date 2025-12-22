import { createContext, useContext, ParentComponent, For, createSignal } from 'solid-js'
import Toast, { ToastData, ToastType } from './ui/Toast'
import AnimatedShow from './ui/AnimatedShow'

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void
}

const ToastContext = createContext<ToastContextType>()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export const ToastProvider: ParentComponent = (props) => {
  const [toasts, setToasts] = createSignal<ToastData[]>([])
  const [removingIds, setRemovingIds] = createSignal<Set<string>>(new Set())
  const EXIT_DURATION = 150

  const showToast = (message: string, type: ToastType) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    const newToast: ToastData = { id, message, type }

    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      removeToast(id)
    }, 3000)
  }

  const removeToast = (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id))

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, EXIT_DURATION)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {props.children}
      <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
        <For each={toasts()}>
          {(toast) => (
            <AnimatedShow
              when={!removingIds().has(toast.id)}
              enterClass="animate-fade-in-slide-down"
              exitClass="animate-fade-out-slide-up"
              exitDuration={EXIT_DURATION}
            >
              <Toast toast={toast} onClose={removeToast} />
            </AnimatedShow>
          )}
        </For>
      </div>
    </ToastContext.Provider>
  )
}
