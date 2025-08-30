import { Component, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Header from './Header'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'

const Layout: Component = () => {
  const store = useAppStore()

  const handleBackdropClick = () => {
    if (!store.state.ui.sidebarCollapsed) {
      store.setUI({ sidebarCollapsed: true })
    }
  }

  return (
    <div class="flex h-screen flex-col">
      <Header />

      <div class="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Mobile sidebar backdrop */}
        <Show when={!store.state.ui.sidebarCollapsed}>
          <div class="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={handleBackdropClick} />
        </Show>

        {/* Main Content */}
        <main class="flex-1 lg:ml-80 pt-16 flex flex-col h-screen max-w-full">
          <ChatArea />
        </main>
      </div>
    </div>
  )
}

export default Layout
