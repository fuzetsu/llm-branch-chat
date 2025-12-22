import type {
  ApiMessage,
  ApiRequestBody,
  ApiResponse,
  MessageNode,
  ProviderConfig,
  StreamCallbacks,
} from '../types'
import { getProviderForModel } from '../utils/providerUtils'

export interface ApiService {
  streamResponse(
    messages: ApiMessage[],
    model: string,
    callbacks: StreamCallbacks,
    temperature: number,
    maxTokens: number,
    signal: AbortSignal,
    entropy?: boolean,
  ): Promise<void>

  generateTitle(messages: MessageNode[], titleModel: string): Promise<string | null>
}

interface ProviderConnection {
  baseUrl: string
  apiKey: string | undefined
}

export function createApiService(providers: Map<string, ProviderConfig>): ApiService {
  // Cache connections per provider to avoid recreating
  const connectionCache = new Map<string, ProviderConnection>()

  const getConnection = (
    modelWithPrefix: string,
  ): { connection: ProviderConnection; model: string } => {
    const providerInfo = getProviderForModel(modelWithPrefix, providers)
    if (!providerInfo) {
      throw new Error(`No provider found for model: ${modelWithPrefix}`)
    }

    const provider = providers.get(providerInfo.providerName)
    if (!provider) {
      throw new Error(`Provider not found: ${providerInfo.providerName}`)
    }

    // Get or create cached connection
    let connection = connectionCache.get(providerInfo.providerName)
    if (!connection) {
      connection = {
        baseUrl: provider.baseUrl,
        apiKey: provider.key,
      }
      connectionCache.set(providerInfo.providerName, connection)
    }

    return { connection, model: providerInfo.modelName }
  }

  const buildUrl = (baseUrl: string, entropy: boolean): string => {
    const url = new URL(baseUrl + '/chat/completions')
    if (!entropy) return url.toString()

    const timestamp = Date.now()
    const randomValue = Math.random().toString(32).slice(2)
    url.searchParams.append('rand', timestamp + randomValue)
    return url.toString()
  }

  const buildRequestBody = (
    messages: ApiMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    stream: boolean,
  ): ApiRequestBody => ({
    messages,
    model,
    stream,
    temperature,
    max_tokens: maxTokens,
  })

  const makeRequest = async (
    url: string,
    body: ApiRequestBody,
    apiKey: string | undefined,
    signal: AbortSignal | null = null,
  ): Promise<Response> => {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : null),
      },
      body: JSON.stringify(body),
      signal,
    })
  }

  const processStreamLine = (line: string, callbacks: StreamCallbacks): boolean => {
    const DATA_PREFIX = 'data: '

    if (!line.startsWith(DATA_PREFIX)) return false

    const data = line.slice(DATA_PREFIX.length).trim()

    if (data === '[DONE]') {
      return false
    }

    try {
      const parsed: ApiResponse = JSON.parse(data)
      const content = parsed.choices?.[0]?.delta?.content

      if (content) {
        callbacks.onToken(content)
        return true
      }
    } catch {
      // Ignore parse errors for malformed chunks
    }

    return false
  }

  const processStreamResponse = async (
    response: Response,
    callbacks: StreamCallbacks,
  ): Promise<void> => {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let lastTokenTime = Date.now()
    let hasReceivedTokens = false
    const TIMEOUT_MS = 8000

    try {
      while (true) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            if (hasReceivedTokens && Date.now() - lastTokenTime > TIMEOUT_MS) {
              reject(new Error('STREAM_TIMEOUT'))
            }
          }, TIMEOUT_MS)
        })

        const result = await Promise.race([reader.read(), timeoutPromise]).catch((error) => {
          if (error.message === 'STREAM_TIMEOUT') {
            return { done: true, value: undefined }
          }
          throw error
        })

        const { done, value } = result

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const hadToken = processStreamLine(line, callbacks)
          if (hadToken) {
            lastTokenTime = Date.now()
            hasReceivedTokens = true
          }
        }
      }

      callbacks.onComplete()
    } catch (error) {
      callbacks.onError(
        error instanceof Error
          ? error
          : typeof error === 'string'
            ? new Error(error)
            : new Error('Stream processing error'),
      )
    }
  }

  const buildTitlePrompt = (messages: MessageNode[]): ApiMessage[] => {
    const conversationSample = messages
      .slice(0, 4)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n')

    return [
      {
        role: 'user',
        content: `Generate a concise title (4-6 words) for this conversation:\n\n${conversationSample}`,
      },
    ]
  }

  return {
    async streamResponse(
      messages: ApiMessage[],
      modelWithPrefix: string,
      callbacks: StreamCallbacks,
      temperature: number,
      maxTokens: number,
      signal: AbortSignal,
      entropy = false,
    ): Promise<void> {
      const { connection, model } = getConnection(modelWithPrefix)

      try {
        callbacks.onStart?.()

        const url = buildUrl(connection.baseUrl, entropy)
        const requestBody = buildRequestBody(messages, model, temperature, maxTokens, true)
        const response = await makeRequest(url, requestBody, connection.apiKey, signal)

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`)
        }

        await processStreamResponse(response, callbacks)
      } catch (error) {
        callbacks.onError(error instanceof Error ? error : new Error('Unknown error'))
      }
    },

    async generateTitle(
      messages: MessageNode[],
      titleModelWithPrefix: string,
    ): Promise<string | null> {
      const { connection, model } = getConnection(titleModelWithPrefix)
      const titlePrompt = buildTitlePrompt(messages)
      const url = buildUrl(connection.baseUrl, false)

      try {
        const response = await makeRequest(
          url,
          buildRequestBody(titlePrompt, model, 0.3, 20, false),
          connection.apiKey,
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(
            `Title generation failed: ${response.status} ${response.statusText} - ${errorText}`,
          )
        }

        const contentType = response.headers.get('content-type')
        if (!contentType?.includes('application/json')) {
          return await response.text()
        }

        const data: ApiResponse = await response.json()
        const title = data.choices[0]?.message?.content?.trim().replace(/['"*]\*?/g, '') || ''

        return title
      } catch (error) {
        console.error('Title generation failed:', error)
        return null
      }
    },
  }
}
