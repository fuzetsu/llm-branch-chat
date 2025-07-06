import type {
  ApiMessage,
  ApiRequestBody,
  ApiResponse,
  MessageNode,
  StreamCallbacks,
} from '../types/index.js'

export interface ApiServiceDeps {
  baseUrl: string
  apiKey: string | undefined
}

export const createApiService = ({ baseUrl, apiKey }: ApiServiceDeps) => {
  const filterSystemMessages = (messages: ApiMessage[]): ApiMessage[] => {
    return messages.filter((message) => message.role !== 'system')
  }

  const buildUrl = (entropy: boolean): string => {
    if (!entropy) return baseUrl

    const timestamp = Date.now()
    const randomValue = Math.random().toString(32).slice(2)
    return `${baseUrl}?rand=${timestamp}${randomValue}`
  }

  const buildRequestBody = (
    messages: ApiMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
  ): ApiRequestBody => {
    return {
      messages,
      model,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    }
  }

  const makeRequest = async (url: string, body: ApiRequestBody): Promise<Response> => {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : null),
      },
      body: JSON.stringify(body),
    })
  }

  const processStreamLine = (line: string, callbacks: StreamCallbacks): boolean => {
    const DATA_PREFIX = 'data: '

    if (!line.startsWith(DATA_PREFIX)) return false

    const data = line.slice(DATA_PREFIX.length).trim()

    if (data === '[DONE]') {
      // Don't call onComplete here - let the stream reader handle it
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
    const TIMEOUT_MS = 1200 // 1.2 seconds after last token

    try {
      while (true) {
        // Create a timeout promise that rejects after TIMEOUT_MS
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            if (hasReceivedTokens && Date.now() - lastTokenTime > TIMEOUT_MS) {
              reject(new Error('STREAM_TIMEOUT'))
            }
          }, TIMEOUT_MS)
        })

        // Race between reading and timeout
        const result = await Promise.race([reader.read(), timeoutPromise]).catch((error) => {
          if (error.message === 'STREAM_TIMEOUT') {
            // Treat timeout as completion
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
      callbacks.onError(error instanceof Error ? error : new Error('Stream processing error'))
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

  const truncateTitle = (title: string): string => {
    const MAX_TITLE_LENGTH = 50

    if (title.length <= MAX_TITLE_LENGTH) {
      return title
    }

    return title.substring(0, MAX_TITLE_LENGTH).trim() + '...'
  }

  return {
    async streamResponse(
      messages: ApiMessage[],
      model: string,
      callbacks: StreamCallbacks,
      temperature: number,
      maxTokens: number,
      entropy = false,
    ): Promise<void> {
      try {
        callbacks.onStart?.()

        const cleanMessages = filterSystemMessages(messages)
        const url = buildUrl(entropy)
        const requestBody = buildRequestBody(cleanMessages, model, temperature, maxTokens)

        const response = await makeRequest(url, requestBody)

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`)
        }

        await processStreamResponse(response, callbacks)
      } catch (error) {
        callbacks.onError(error instanceof Error ? error : new Error('Unknown error'))
      }
    },

    async generateTitle(messages: MessageNode[], titleModel: string): Promise<string | null> {
      const titlePrompt = buildTitlePrompt(messages)

      try {
        const response = await makeRequest(baseUrl, {
          messages: titlePrompt,
          model: titleModel,
          stream: false,
          temperature: 0.3,
          max_tokens: 20,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(
            `Title generation failed: ${response.status} ${response.statusText} - ${errorText}`,
          )
        }

        const contentType = response.headers.get('content-type')
        if (!contentType?.includes('application/json')) {
          const responseText = await response.text()
          return truncateTitle(responseText)
        }

        const data: ApiResponse = await response.json()
        const title = data.choices[0]?.message?.content?.trim().replace(/['"*]\*?/g, '') || ''

        return truncateTitle(title)
      } catch (error) {
        console.error('Title generation failed:', error)
        return null
      }
    },
  }
}
