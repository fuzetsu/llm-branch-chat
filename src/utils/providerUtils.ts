import type { ProviderConfig } from '../types'

export function validateProviderName(
  name: string,
  existingProviders: Map<string, ProviderConfig>,
): string | null {
  if (!name.trim()) {
    return 'Provider name cannot be empty'
  }
  if (existingProviders.has(name)) {
    return 'Provider name already exists'
  }
  return null
}

export function validateProviderUrl(url: string): string | null {
  if (!url.trim()) {
    return 'Base URL cannot be empty'
  }
  try {
    new URL(url)
    return null
  } catch {
    return 'Invalid URL format'
  }
}

export function validateProviderModels(models: string[]): string | null {
  if (models.length === 0) {
    return 'At least one model must be provided'
  }
  if (models.some((model) => !model.trim())) {
    return 'Model names cannot be empty'
  }
  return null
}

export function createProvider(
  name: string,
  baseUrl: string,
  key: string | undefined,
  availableModels: string[],
): ProviderConfig {
  return {
    name: name.trim(),
    baseUrl: baseUrl.trim(),
    key: key?.trim() || undefined,
    availableModels: availableModels
      .map((model) => model.trim())
      .filter((model) => model.length > 0),
  }
}

export function updateProvider(
  existing: ProviderConfig,
  updates: Partial<ProviderConfig>,
): ProviderConfig {
  return {
    ...existing,
    ...updates,
    name: updates.name?.trim() || existing.name,
    baseUrl: updates.baseUrl?.trim() || existing.baseUrl,
    key: updates.key?.trim() || existing.key,
    availableModels:
      updates.availableModels?.map((model) => model.trim()).filter((model) => model.length > 0) ||
      existing.availableModels,
  }
}

export function getAllAvailableModels(providers: Map<string, ProviderConfig>): string[] {
  const allModels: string[] = []

  for (const [providerName, provider] of providers.entries()) {
    for (const model of provider.availableModels) {
      allModels.push(`${providerName}: ${model}`)
    }
  }

  return allModels
}

export interface ModelOptionGroup {
  label: string
  options: { value: string; label: string }[]
}

export function getModelsGroupedByProvider(
  providers: Map<string, ProviderConfig>,
): ModelOptionGroup[] {
  const groups: ModelOptionGroup[] = []

  for (const [providerName, provider] of providers.entries()) {
    if (provider.availableModels.length > 0) {
      groups.push({
        label: providerName,
        options: provider.availableModels.map((model) => ({
          value: `${providerName}: ${model}`,
          label: model,
        })),
      })
    }
  }

  return groups
}

export function getProviderForModel(
  modelWithPrefix: string,
  providers: Map<string, ProviderConfig>,
): { providerName: string; modelName: string } | null {
  const match = modelWithPrefix.match(/^([^:]+):\s*(.+)$/)
  if (!match || !match[1] || !match[2]) {
    return null
  }

  const providerName = match[1].trim()
  const modelName = match[2].trim()

  const provider = providers.get(providerName)
  if (!provider || !provider.availableModels.includes(modelName)) {
    return null
  }

  return { providerName, modelName }
}

export function getProviderConfigForModel(
  modelWithPrefix: string,
  providers: Map<string, ProviderConfig>,
): ProviderConfig | null {
  const providerInfo = getProviderForModel(modelWithPrefix, providers)
  if (!providerInfo) {
    return null
  }

  return providers.get(providerInfo.providerName) || null
}

export async function fetchModelsFromProvider(baseUrl: string, apiKey?: string): Promise<string[]> {
  try {
    const url = baseUrl + '/models'
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // Handle different response formats
    if (Array.isArray(data)) {
      // OpenAI format: array of model objects
      return data
        .map((model: { id?: string; name?: string }) => model.id || model.name || model)
        .filter((m: unknown): m is string => typeof m === 'string')
    } else if (data.data && Array.isArray(data.data)) {
      // OpenAI format with data wrapper
      return data.data
        .map((model: { id?: string; name?: string }) => model.id || model.name || model)
        .filter((m: unknown): m is string => typeof m === 'string')
    } else if (typeof data === 'object' && data.models && Array.isArray(data.models)) {
      // Alternative format
      return data.models
        .map((model: { id?: string; name?: string }) => model.id || model.name || model)
        .filter((m: unknown): m is string => typeof m === 'string')
    } else {
      throw new Error('Unexpected response format from models endpoint')
    }
  } catch (error) {
    console.error('Failed to fetch models from provider:', error)
    throw error
  }
}
