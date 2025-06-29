import { Component } from 'solid-js';
import { Message as MessageType, Chat } from '../types/index.js';

interface MessageProps {
  message: MessageType;
  chat: Chat;
}

const Message: Component<MessageProps> = (props) => {
  const isUser = () => props.message.role === 'user';
  
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div class={`flex ${isUser() ? 'justify-end' : 'justify-start'} mb-4`}>
      <div class={`max-w-3xl px-4 py-3 rounded-lg ${
        isUser() 
          ? 'bg-primary dark:bg-primary-dark text-white' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
      }`}>
        <div class="message-content">
          {props.message.content}
        </div>
        <div class={`text-xs mt-2 ${
          isUser() ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {formatTimestamp(props.message.timestamp)}
          {props.message.model && (
            <span class="ml-2">• {props.message.model}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;