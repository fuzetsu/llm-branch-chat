# To-do and ideas

## Bugs

- close warning on settings modal doesn't handle reset form cases, like cancel edit on provider
  form, or returning to same data as saved

## Small

- add scroll box-shadow to indicate where overflow is in scrollable areas (Select, ChatList,
  MessageList, etc)
- move marked/highlighting logic to web worker to not block UI thread
- add way of providing or detecting token costs and get rid of hard-coded system
- add per chat opt-in message injections like timestamp so that LLM can consider time between
  messages in its responses
- store draft message input per-chat (maybe in separate LS keys to avoid stringify churn, export
  becomes an issue though, debounce is another option to avoid churn)
- add chat search functionality (cmd+k global/specific chat?), interplays with messages that are
  revealed by scrolling since cmd+f wont find them

## Bigger

- split chat display (select up to 2-3 chats to display at once for comparison/copy-paste purposes)
- move away from LocalStorage and use browser based (IndexedDB) or server based (sqlite) DB
- add builtin chat summary functionality (with custom prompts)
- add file/image input support
- add image generation support
