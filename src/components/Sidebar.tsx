import { Component, For, Show } from 'solid-js';
import { useAppStore } from '../store/AppStore';

const Sidebar: Component = () => {
  const store = useAppStore();

  const handleNewChat = () => {
    // TODO: Implement new chat creation
    console.log('New chat from sidebar');
  };

  const handleSelectChat = (chatId: string) => {
    store.setCurrentChatId(chatId);
  };

  const activeChats = () => store.getActiveChats();

  return (
    <aside 
      class={`fixed inset-y-0 left-0 z-40 w-80 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-dark-border transition-transform duration-300 ease-in-out ${
        store.state.ui.sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
      } lg:translate-x-0`}
    >
      <div class="flex flex-col h-full pt-16">
        <div class="p-4 border-b border-gray-200 dark:border-dark-border">
          <button 
            class="w-full px-4 py-3 text-left bg-primary hover:bg-blue-600 dark:bg-primary-dark dark:hover:bg-primary-darker text-white rounded-lg transition-colors flex items-center space-x-2"
            onClick={handleNewChat}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            <span>New Chat</span>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-4">
          <For each={activeChats()}>
            {(chat) => (
              <div 
                class={`mb-2 p-3 rounded-lg cursor-pointer transition-colors ${
                  store.state.currentChatId === chat.id 
                    ? 'bg-primary dark:bg-primary-dark text-white' 
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                }`}
                onClick={() => handleSelectChat(chat.id)}
              >
                <div class="font-medium truncate">{chat.title}</div>
                <div class="text-sm opacity-70 mt-1">
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </For>
          <Show when={activeChats().length === 0}>
            <div class="text-gray-500 dark:text-gray-400 text-center py-8">
              No chats yet. Start a new conversation!
            </div>
          </Show>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;