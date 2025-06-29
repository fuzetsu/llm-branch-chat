import { Component, For } from 'solid-js';
import { Chat } from '../types/index.js';
import Message from './Message';

interface MessageListProps {
  chat: Chat;
}

const MessageList: Component<MessageListProps> = (props) => {
  return (
    <div class="space-y-4">
      <For each={props.chat.messages}>
        {(message) => (
          <Message message={message} chat={props.chat} />
        )}
      </For>
    </div>
  );
};

export default MessageList;