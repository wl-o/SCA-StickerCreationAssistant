import { createAIService } from '@/services/ai'
import type { AISettings, Content } from '@/types'
import {
  extractContentTerms,
  suggestImageQueries,
  type ImageQuerySuggestion,
} from '@/utils/imageQuery'

interface AISuggestPayload {
  suggestions?: Array<{ label?: string; query?: string }>
}

/**
 * 用 AI 根据正文推荐配图关键词（英文搜词 + 中文短标签）。
 * 失败时回退到本地基于内容的推荐。
 */
export async function suggestImageQueriesWithAI(
  settings: AISettings,
  content: Pick<Content, 'title' | 'content' | 'keyword' | 'topicAngle'>,
): Promise<ImageQuerySuggestion[]> {
  const local = suggestImageQueries(content)
  if (!settings.apiKey) return local

  const terms = extractContentTerms(content, 10)
  const excerpt = (content.content || '').slice(0, 900)

  try {
    const ai = createAIService(settings)
    const data = await ai.generateJSON<AISuggestPayload>(
      [
        {
          role: 'system',
          content:
            '你是配图助手。根据文章内容推荐适合 Unsplash/图库搜索的关键词。只输出 JSON，不要解释。',
        },
        {
          role: 'user',
          content: `请根据下面文章，推荐 6 个配图搜索词。

要求：
1. 必须紧扣文章具体画面与情境，不要推荐文章没写到的题材
2. label：中文短标签（2-8字），方便用户点选
3. query：英文搜索短语（3-8个词），适合 Unsplash
4. 6 条之间角度略有差异（人物/场景/氛围/细节）
5. 输出格式：{"suggestions":[{"label":"...","query":"..."}]}

文章主题词：${content.keyword || '无'}
选题角度：${content.topicAngle || '无'}
标题：${content.title || '无'}
正文提取词：${terms.join('、') || '无'}
正文摘录：
${excerpt}`,
        },
      ],
      { temperature: 0.4, maxTokens: 800 },
    )

    const fromAI = (data.suggestions || [])
      .map((item) => ({
        label: String(item.label || '').trim().slice(0, 16),
        query: String(item.query || '').trim(),
      }))
      .filter((item) => item.label && item.query)

    if (!fromAI.length) return local

    // AI 结果优先，再补本地内容词，避免全空
    const seen = new Set<string>()
    const merged: ImageQuerySuggestion[] = []
    for (const item of [...fromAI, ...local]) {
      const key = item.query.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(item)
      if (merged.length >= 8) break
    }
    return merged
  } catch {
    return local
  }
}
