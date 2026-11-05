import type { AISettings } from '@/types'
import type { AIProvider, GenerateRequest, GenerateResponse } from '../types'

/** 同源代理，避免浏览器 / Electron CORS（dev 走 Vite，桌面生产走 Fastify） */
function resolveChatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '')

  if (normalized.includes('api.deepseek.com')) {
    return '/ai-proxy/deepseek/v1/chat/completions'
  }
  if (normalized.includes('api.openai.com')) {
    return '/ai-proxy/openai/v1/chat/completions'
  }

  return `${normalized}/chat/completions`
}

export class OpenAICompatibleProvider implements AIProvider {
  private settings: AISettings

  constructor(settings: AISettings) {
    this.settings = settings
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const url = resolveChatCompletionsUrl(this.settings.baseUrl)
    const model = this.settings.model
    const wantsJson = request.responseFormat === 'json'

    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? this.settings.temperature,
      max_tokens: request.maxTokens ?? this.settings.maxTokens,
    }

    if (wantsJson) {
      body.response_format = { type: 'json_object' }
    }

    // DeepSeek V4 默认开启 thinking，推理 token 会计入 max_tokens，
    // 容易把正式 content 挤空，导致「AI 返回内容为空 / JSON 无法解析」。
    // 结构化输出与常规写作默认关闭思考模式。
    if (isDeepSeekModel(model, this.settings.baseUrl)) {
      body.thinking = { type: 'disabled' }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const rawText = await safeReadText(response)

    if (!response.ok) {
      throw new Error(formatHttpError(response.status, rawText))
    }

    let data: {
      choices?: Array<{
        finish_reason?: string
        message?: { content?: string; reasoning_content?: string }
      }>
      error?: { message?: string }
      usage?: { completion_tokens_details?: { reasoning_tokens?: number } }
    }
    try {
      data = JSON.parse(rawText) as typeof data
    } catch {
      const preview = rawText.slice(0, 80).replace(/\s+/g, ' ')
      throw new Error(
        `AI 返回不是合法 JSON（多为代理压缩/网络拦截）。请重新打包桌面版或检查代理。预览：${preview || '(空)'}`,
      )
    }

    if (data.error?.message) {
      throw new Error(data.error.message)
    }

    const choice = data.choices?.[0]
    const message = choice?.message
    let content = message?.content?.trim() || ''

    // 仅在非 JSON、且 content 为空时，才尝试从 reasoning 中抢救（极少见）
    if (!content && !wantsJson && message?.reasoning_content?.trim()) {
      content = message.reasoning_content.trim()
    }

    if (!content) {
      const reasoningTokens = data.usage?.completion_tokens_details?.reasoning_tokens
      const finish = choice?.finish_reason
      if (reasoningTokens || finish === 'length') {
        throw new Error(
          'AI 返回正文为空（思考模式占用了输出额度）。请增大设置里的 maxTokens，或换用非推理模型。',
        )
      }
      throw new Error('AI 返回内容为空')
    }

    return { content, raw: data }
  }

  async testConnection(): Promise<void> {
    await this.generate({
      messages: [
        { role: 'system', content: '你是一个连接测试助手。' },
        { role: 'user', content: '请只回复：ok' },
      ],
      temperature: 0,
      maxTokens: 16,
    })
  }
}

function isDeepSeekModel(model: string, baseUrl: string): boolean {
  const m = (model || '').toLowerCase()
  const b = (baseUrl || '').toLowerCase()
  return m.includes('deepseek') || b.includes('deepseek.com')
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

function formatHttpError(status: number, body: string): string {
  if (status === 401) return 'API Key 无效或未授权（401）'
  if (status === 403) return '无权访问该模型（403）'
  if (status === 429) return '请求过于频繁，请稍后重试（429）'
  if (status >= 500) return `服务端错误（${status}）`
  const short = body.slice(0, 200)
  return short ? `请求失败（${status}）：${short}` : `请求失败（${status}）`
}
