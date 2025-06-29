import { Component } from 'solid-js'
import { AppStoreProvider } from './store/AppStore'
import Layout from './components/Layout'

const App: Component = () => {
  return (
    <AppStoreProvider>
      <Layout />
    </AppStoreProvider>
  )
}

export default App
