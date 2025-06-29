import type {
  ApiMessage,
  ApiRequestBody,
  ApiResponse,
  Message,
  StreamCallbacks,
} from '../types/index.js'

export class ApiService {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  public async streamResponse(
    messages: ApiMessage[],
    model: string,
    callbacks: StreamCallbacks,
    temperature: number,
    maxTokens: number,
    entropy = false,
  ): Promise<void> {
    try {
      const cleanMessages = this.filterSystemMessages(messages)
      const url = this.buildUrl(entropy)
      const requestBody = this.buildRequestBody(cleanMessages, model, temperature, maxTokens)

      const response = await this.makeRequest(url, requestBody)

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      await this.processStreamResponse(response, callbacks)
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  private filterSystemMessages(messages: ApiMessage[]): ApiMessage[] {
    return messages.filter((message) => message.role !== 'system')
  }

  private buildUrl(entropy: boolean): string {
    if (!entropy) return this.baseUrl

    const timestamp = Date.now()
    const randomValue = Math.random().toString(32).slice(2)
    return `${this.baseUrl}?rand=${timestamp}${randomValue}`
  }

  private buildRequestBody(
    messages: ApiMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
  ): ApiRequestBody {
    return {
      messages,
      model,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    }
  }

  private async makeRequest(url: string, body: ApiRequestBody): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })
  }

  private async processStreamResponse(
    response: Response,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          this.processStreamLine(line, callbacks)
        }
      }

      callbacks.onComplete()
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Stream processing error'))
    }
  }

  private processStreamLine(line: string, callbacks: StreamCallbacks): void {
    const DATA_PREFIX = 'data: '

    if (!line.startsWith(DATA_PREFIX)) return

    const data = line.slice(DATA_PREFIX.length).trim()

    if (data === '[DONE]') {
      callbacks.onComplete()
      return
    }

    try {
      const parsed: ApiResponse = JSON.parse(data)
      const content = parsed.choices?.[0]?.delta?.content

      if (content) {
        callbacks.onToken(content)
      }
    } catch (error) {
      // Ignore parse errors for malformed chunks
    }
  }

  public async generateTitle(messages: Message[], titleModel: string): Promise<string | null> {
    const titlePrompt = this.buildTitlePrompt(messages)

    try {
      const response = await this.makeRequest(this.baseUrl, {
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
        return this.truncateTitle(responseText)
      }

      const data: ApiResponse = await response.json()
      const title = data.choices[0]?.message?.content?.trim().replace(/['"*]\*?/g, '') || ''

      return this.truncateTitle(title)
    } catch (error) {
      console.error('Title generation failed:', error)
      return null
    }
  }

  private buildTitlePrompt(messages: Message[]): ApiMessage[] {
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

  private truncateTitle(title: string): string {
    const MAX_TITLE_LENGTH = 50

    if (title.length <= MAX_TITLE_LENGTH) {
      return title
    }

    return title.substring(0, MAX_TITLE_LENGTH).trim() + '...'
  }
}

// SolidJS-specific API service wrapper for reactive integration
export interface SolidStreamCallbacks {
  onStart?: () => void
  onToken?: (token: string) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export class SolidApiService extends ApiService {
  public async streamToSignals(
    messages: ApiMessage[],
    model: string,
    callbacks: SolidStreamCallbacks,
    temperature: number,
    maxTokens: number,
    entropy = false,
  ): Promise<void> {
    callbacks.onStart?.()

    const streamCallbacks: StreamCallbacks = {
      onToken: (token: string) => {
        callbacks.onToken?.(token)
      },
      onComplete: () => {
        callbacks.onComplete?.()
      },
      onError: (error: Error) => {
        callbacks.onError?.(error)
      },
    }

    return this.streamResponse(messages, model, streamCallbacks, temperature, maxTokens, entropy)
  }
}
