import { Component, Show } from 'solid-js'
import { useAppStore } from '../store/AppStore'
import Header from './Header'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'

const Layout: Component = () => {
  const store = useAppStore()

  console.log('hi!')

  return (
    <div class="flex h-screen flex-col">
      <Header />

      <div class="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content */}
        <main class="flex-1 lg:ml-80 pt-16 flex flex-col h-screen">
          <ChatArea />
        </main>
      </div>
    </div>
  )
}

export default Layout

