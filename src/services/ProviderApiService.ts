import type { ProviderConfig, ApiMessage, StreamCallbacks, MessageNode } from '../types/index.js'
import { createApiService } from './ApiService.js'
import { getProviderForModel } from '../utils/providerUtils.js'

export interface ProviderApiService {
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

export function createProviderApiService(
  providers: Map<string, ProviderConfig>,
): ProviderApiService {
  // Create a cache of API services per provider
  const serviceCache = new Map<string, ReturnType<typeof createApiService>>()

  const getServiceForModel = (modelWithPrefix: string) => {
    const providerInfo = getProviderForModel(modelWithPrefix, providers)
    if (!providerInfo) {
      throw new Error(`No provider found for model: ${modelWithPrefix}`)
    }

    const provider = providers.get(providerInfo.providerName)
    if (!provider) {
      throw new Error(`Provider not found: ${providerInfo.providerName}`)
    }

    // Get or create service for this provider
    let service = serviceCache.get(providerInfo.providerName)
    if (!service) {
      service = createApiService({
        baseUrl: provider.baseUrl,
        apiKey: provider.key,
      })
      serviceCache.set(providerInfo.providerName, service)
    }

    return {
      service,
      model: providerInfo.modelName,
    }
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
      const { service, model } = getServiceForModel(modelWithPrefix)
      return service.streamResponse(
        messages,
        model,
        callbacks,
        temperature,
        maxTokens,
        signal,
        entropy,
      )
    },

    async generateTitle(
      messages: MessageNode[],
      titleModelWithPrefix: string,
    ): Promise<string | null> {
      const { service, model } = getServiceForModel(titleModelWithPrefix)
      return service.generateTitle(messages, model)
    },
  }
}
