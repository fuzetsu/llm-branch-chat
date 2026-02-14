# To-do and ideas

## Bugs

## Small

- add scroll box-shadow to indicate where overflow is in scrollable areas (Select, ChatList,
  MessageList, etc)
- move marked/highlighting logic to web worker to not block UI thread
- add way of providing or detecting token costs and get rid of hard-coded system
- add per chat opt-in message injections like timestamp so that LLM can consider time between
  messages in its responses

## Medium

- add chat search functionality (cmd+k global/specific chat?), interplays with messages that are
  revealed by scrolling since cmd+f wont find them
  test message)
- add way to test model ID while adding or editing provider to know if it actually works (send small

## Large

- split chat display (select up to 2-3 chats to display at once for comparison/copy-paste purposes)
- move away from LocalStorage and use browser based (IndexedDB) or server based (sqlite) DB
- add builtin chat summary functionality (with custom prompts)
- add file/image input support
- add image generation support
