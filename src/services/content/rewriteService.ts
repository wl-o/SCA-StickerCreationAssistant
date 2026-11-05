import { createAIService } from '@/services/ai'
import {
  buildRewriteMessages,
  buildRewritePolishMessages,
  type RewriteMode,
} from '@/prompts/rewrite'
import type { AISettings } from '@/types'

export type { RewriteMode }

export interface RewriteResult {
  title: string
  content: string
  discussionHook: string
  keyword: string
  keyPoints?: string[]
}

function normalizeRewrite(data: Record<string, unknown>, fallbackKeyword = ''): RewriteResult {
  const title = String(data.title || data.Title || '').trim()
  const content = String(data.content || data.body || data.text || '').trim()
  const discussionHook = String(
    data.discussion_hook || data.discussionHook || data.hook || '',
  ).trim()
  const keyword = String(data.keyword || fallbackKeyword || '').trim()
  const rawPoints = data.key_points || data.keyPoints
  const keyPoints = Array.isArray(rawPoints)
    ? rawPoints.map((item) => String(item || '').trim()).filter(Boolean)
    : undefined

  if (!title || !content) {
    throw new Error('改写结果缺少标题或正文')
  }

  return { title, content, discussionHook, keyword, keyPoints }
}

export async function rewriteLongContent(
  settings: AISettings,
  sourceText: string,
  hintTitle?: string,
  mode: RewriteMode = 'compress',
): Promise<RewriteResult> {
  const text = sourceText.trim()
  if (!text) throw new Error('请先粘贴要改写的内容')
  if (!settings.apiKey) throw new Error('请先在设置里配置 AI API Key')

  const ai = createAIService(settings)
  const data = await ai.generateJSON<Record<string, unknown>>(
    buildRewriteMessages({ sourceText: text, hintTitle, mode }),
    {
      temperature: mode === 'keep-key' ? 0.55 : 0.75,
      maxTokens: Math.max(settings.maxTokens || 0, mode === 'keep-key' ? 3500 : 2500),
    },
  )
  return normalizeRewrite(data)
}

export async function polishRewriteResult(
  settings: AISettings,
  params: {
    title: string
    content: string
    discussionHook?: string
    mode: string
    keyword?: string
    sourceText?: string
  },
): Promise<RewriteResult> {
  if (!settings.apiKey) throw new Error('请先在设置里配置 AI API Key')

  const ai = createAIService(settings)
  const data = await ai.generateJSON<Record<string, unknown>>(
    buildRewritePolishMessages({
      title: params.title,
      content: params.content,
      discussionHook: params.discussionHook,
      mode: params.mode,
      sourceText: params.sourceText,
    }),
    {
      temperature: params.mode === 'keep-key' ? 0.5 : 0.8,
      maxTokens: Math.max(settings.maxTokens || 0, params.mode === 'keep-key' ? 3500 : 2500),
    },
  )
  return normalizeRewrite(data, params.keyword)
}
