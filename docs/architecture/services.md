# API Layer

## Overview

The API layer (`src/store/api.ts`) handles all LLM provider communication. It abstracts away provider differences - all providers use OpenAI-compatible chat completion format.

## Provider Support

Model strings are prefixed with provider name (e.g., "Pollinations: openai-fast"). The API layer parses this to route requests to the correct endpoint.

To add a new provider: add it to the settings UI and ensure it speaks OpenAI-compatible format.

## Streaming

Responses stream via Server-Sent Events (SSE). The API layer handles line buffering, chunk parsing, and timeout detection (8 seconds of no data triggers completion).

## Reactivity

The API service instance is created via `createMemo` so it automatically recreates when provider settings change - no stale configuration issues.
