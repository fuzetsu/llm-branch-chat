import { Component } from 'solid-js'
import { AppStoreProvider } from './store/AppStore'
import { ToastProvider } from './components/ToastProvider'
import Layout from './components/Layout'

const App: Component = () => {
  return (
    <AppStoreProvider>
      <ToastProvider>
        <Layout />
      </ToastProvider>
    </AppStoreProvider>
  )
}

export default App
