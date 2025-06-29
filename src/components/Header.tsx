import { Component } from 'solid-js';
import { useAppStore } from '../store/AppStore';

const Header: Component = () => {
  const store = useAppStore();

  const handleNewChat = () => {
    // TODO: Implement new chat creation
    console.log('New chat clicked');
  };

  const handleSettings = () => {
    // TODO: Implement settings modal
    console.log('Settings clicked');
  };

  const toggleSidebar = () => {
    store.setUI({ sidebarCollapsed: !store.state.ui.sidebarCollapsed });
  };

  const currentChat = store.getCurrentChat();

  return (
    <header class="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border shadow-sm">
      <div class="flex items-center justify-between h-16 px-4">
        <div class="flex items-center space-x-4">
          <button 
            class="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
            onClick={toggleSidebar}
          >
            <svg class="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          <div class="flex items-center space-x-3">
            <div class="relative flex items-center min-w-[120px]">
              <h1 class="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-xs cursor-pointer hover:text-primary dark:hover:text-primary-dark transition-colors">
                {currentChat?.title || 'New Chat'}
              </h1>
            </div>
            <div class="hidden sm:block">
              <select class="px-3 py-2 text-sm bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white">
                <option value="">Select Model</option>
                {/* TODO: Add dynamic model options */}
              </select>
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button 
            class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
            onClick={handleSettings}
            title="Settings"
          >
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </button>
          <button 
            class="p-2 rounded-md bg-primary hover:bg-blue-600 dark:bg-primary-dark dark:hover:bg-primary-darker text-white transition-colors" 
            onClick={handleNewChat}
            title="New Chat"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;