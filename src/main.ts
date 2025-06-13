import { App } from './App.js'

// Initialize the application
const app = new App()

// Start the app when DOM is loaded
function initializeApp(): void {
  app.initialize().catch((error) => {
    console.error('Failed to initialize app:', error)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  initializeApp()
}

