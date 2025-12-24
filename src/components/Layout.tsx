import { Component } from 'solid-js'
import Header from './Header'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'

const Layout: Component = () => {
  return (
    <>
      <Header />
      <Sidebar />
      <ChatArea />
    </>
  )
}

export default Layout
