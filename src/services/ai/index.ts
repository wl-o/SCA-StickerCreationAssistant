import { createAIProvider } from './factory'
import type { ChatMessage, GenerateRequest, GenerateResponse } from './types'
import type { AISettings } from '@/types'

export class AIService {
  private settings: AISettings

  constructor(settings: AISettings) {
    this.settings = settings
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const provider = createAIProvider(this.settings)
    return provider.generate(request)
  }

  async generateText(messages: ChatMessage[], options?: Partial<GenerateRequest>): Promise<string> {
    const result = await this.generate({
      messages,
      ...options,
      responseFormat: options?.responseFormat ?? 'text',
    })
    return result.content
  }

  async generateJSON<T>(messages: ChatMessage[], options?: Partial<GenerateRequest>): Promise<T> {
    try {
      const result = await this.generate({
        messages,
        ...options,
        responseFormat: 'json',
      })
      return parseJSON<T>(result.content)
    } catch (firstError) {
      // 部分模型对 response_format=json_object 支持不稳，降级重试纯文本 JSON
      const result = await this.generate({
        messages: [
          ...messages,
          {
            role: 'user',
            content: '请再次输出，必须是合法 JSON 对象，不要 Markdown 代码块，不要额外解释。',
          },
        ],
        ...options,
        responseFormat: 'text',
        temperature: Math.min(options?.temperature ?? this.settings.temperature, 0.5),
      })
      try {
        return parseJSON<T>(result.content)
      } catch {
        const hint =
          firstError instanceof Error ? firstError.message : 'JSON 解析失败'
        throw new Error(`${hint}；原文片段：${result.content.slice(0, 120)}`)
      }
    }
  }

  async testConnection(): Promise<void> {
    const provider = createAIProvider(this.settings)
    await provider.testConnection()
  }
}

export function createAIService(settings: AISettings): AIService {
  return new AIService(settings)
}

export function parseJSON<T>(text: string): T {
  const cleaned = stripCodeFence(text)
  const candidates = [cleaned]

  const objectMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objectMatch) candidates.push(objectMatch[0])

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) candidates.push(arrayMatch[0])

  // 尝试修复被截断的 JSON（补齐末尾括号）
  const repaired = repairTruncatedJson(cleaned)
  if (repaired) candidates.push(repaired)

  let lastError: unknown
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `AI 返回的 JSON 无法解析：${lastError.message}`
      : 'AI 返回的 JSON 无法解析',
  )
}

function stripCodeFence(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function repairTruncatedJson(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let snippet = text.slice(start)

  // 去掉尾部残缺字符串的未闭合引号影响
  const quoteCount = (snippet.match(/(?<!\\)"/g) || []).length
  if (quoteCount % 2 === 1) {
    snippet += '"'
  }

  const openCurly = (snippet.match(/\{/g) || []).length
  const closeCurly = (snippet.match(/\}/g) || []).length
  const openSquare = (snippet.match(/\[/g) || []).length
  const closeSquare = (snippet.match(/\]/g) || []).length

  if (openCurly <= closeCurly && openSquare <= closeSquare) return null

  // 去掉末尾悬挂逗号
  snippet = snippet.replace(/,\s*$/, '')

  snippet += ']'.repeat(Math.max(0, openSquare - closeSquare))
  snippet += '}'.repeat(Math.max(0, openCurly - closeCurly))
  return snippet
}
