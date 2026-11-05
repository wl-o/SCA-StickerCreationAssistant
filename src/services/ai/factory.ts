import type { AISettings } from '@/types'
import { OpenAICompatibleProvider } from './providers/openaiCompatible'
import type { AIProvider } from './types'

export function createAIProvider(settings: AISettings): AIProvider {
  if (!settings.apiKey.trim()) {
    throw new Error('请先在设置页填写 API Key')
  }
  if (!settings.baseUrl.trim()) {
    throw new Error('请先在设置页填写 Base URL')
  }
  if (!settings.model.trim()) {
    throw new Error('请先在设置页填写 Model')
  }

  switch (settings.provider) {
    case 'openai':
    case 'deepseek':
    case 'openai-compatible':
      return new OpenAICompatibleProvider(settings)
    case 'anthropic':
      // MVP：Anthropic 暂走兼容层提示，建议改用 OpenAI Compatible 代理
      throw new Error('当前版本请选择 DeepSeek 或 OpenAI Compatible')
    default:
      return new OpenAICompatibleProvider(settings)
  }
}
