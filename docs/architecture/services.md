# Services Layer

## Service Responsibilities

| Service | Purpose |
|---------|---------|
| **ApiService** | Low-level HTTP/streaming to a single provider endpoint |
| **ProviderApiService** | Routes requests to correct provider based on model selection |
| **MessageService** | Orchestrates message creation, streaming, and error handling |
| **TitleService** | Auto-generates chat titles after N messages |

## Provider Abstraction

All providers use OpenAI-compatible chat completion format:

```
User selects "ProviderName: model-id"
    ↓
ProviderApiService parses → { provider, modelName }
    ↓
Looks up provider config (baseUrl, apiKey, etc.)
    ↓
ApiService instance for that provider handles request
```

To add a new provider: add to settings UI, ensure it speaks OpenAI format.

## Streaming Pipeline

```
MessageService.sendMessage()
    ↓
Create placeholder assistant message (empty content)
    ↓
StreamingOperations.startStreaming(messageId)
    ↓
ApiService.streamResponse() → SSE stream
    ↓
Parse "data: {...}" lines, extract delta content
    ↓
StreamingOperations.updateStreamingContent(accumulated)
    ↓
On complete/error: finalize message, stop streaming
```

## Streaming Details

- **Protocol**: Server-Sent Events (SSE) with `text/event-stream`
- **Parsing**: Line-buffered, handles partial chunks
- **Timeout**: 8 seconds of no data triggers abort
- **End signal**: `data: [DONE]` or stream close
- **Error recovery**: Errors written to message content for user visibility

## Request Flow

```typescript
// Simplified flow
async sendMessage(chatId, content) {
  // 1. Add user message to store
  addMessage(chatId, { role: 'user', content })

  // 2. Create empty assistant message
  const assistantId = addMessage(chatId, { role: 'assistant', content: '' })

  // 3. Build conversation history
  const messages = getVisibleMessages(chat)

  // 4. Stream response into assistant message
  await streamToMessage(assistantId, messages)
}
```

## Adding New Services

1. Create service file in `src/services/`
2. Use factory pattern: `createXxxService(dependencies)`
3. Wire into `AppStoreOperations` if it needs store access
4. Keep services stateless; state belongs in the store
