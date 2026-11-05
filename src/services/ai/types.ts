import type { AISettings } from '@/types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateRequest {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json'
}

export interface GenerateResponse {
  content: string
  raw?: unknown
}

export interface AIProvider {
  generate(request: GenerateRequest): Promise<GenerateResponse>
  testConnection(): Promise<void>
}

export function resolveProviderDefaults(provider: AISettings['provider']): Partial<AISettings> {
  switch (provider) {
    case 'deepseek':
      return {
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-flash',
      }
    case 'openai':
      return {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      }
    case 'anthropic':
      return {
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-3-5-sonnet-latest',
      }
    case 'openai-compatible':
    default:
      return {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      }
  }
}
