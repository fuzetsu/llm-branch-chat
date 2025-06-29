import { Component, createSignal } from 'solid-js';
import { useAppStore } from '../store/AppStore';

const MessageInput: Component = () => {
  const store = useAppStore();
  const [inputValue, setInputValue] = createSignal('');
  const [isDisabled, setIsDisabled] = createSignal(false);

  const handleSend = () => {
    const message = inputValue().trim();
    if (!message || isDisabled()) return;

    // TODO: Implement message sending logic
    console.log('Sending message:', message);
    setInputValue('');
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    setInputValue(target.value);
    
    // Auto-resize textarea
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  };

  return (
    <div class="flex space-x-3">
      <textarea
        class="flex-1 resize-none border border-gray-300 dark:border-dark-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        placeholder="Type your message..."
        rows="1"
        value={inputValue()}
        onInput={handleInput}
        onKeyPress={handleKeyPress}
        disabled={isDisabled()}
      />
      <button 
        class="px-6 py-3 bg-primary hover:bg-blue-600 dark:bg-primary-dark dark:hover:bg-primary-darker disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        onClick={handleSend}
        disabled={isDisabled() || !inputValue().trim()}
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;