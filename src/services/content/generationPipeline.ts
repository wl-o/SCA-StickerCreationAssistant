import { createAIService } from '@/services/ai'
import { buildPlannerMessages } from '@/prompts/planner'
import { buildWriterMessages, buildPolishMessages } from '@/prompts/writer'
import { buildReviewerMessages } from '@/prompts/reviewer'
import { buildDiscussionMessages } from '@/prompts/discussion'
import type {
  AISettings,
  Content,
  ContentScore,
  CreationFormState,
  DiscussionHook,
  DiscussionHookType,
  Persona,
  TopicPlan,
} from '@/types'

const MAX_REWRITE = 2

interface WriterResult {
  title: string
  content: string
  topic_angle: string
  emotion: string
}

interface ReviewResult extends ContentScore {
  should_rewrite?: boolean
  issues?: string[]
}

interface DiscussionResult {
  hooks: Array<{
    type: DiscussionHookType | string
    content: string
    score: number
    recommended?: boolean
  }>
}

export async function planTopics(
  settings: AISettings,
  form: CreationFormState,
  persona: Persona,
): Promise<TopicPlan[]> {
  const ai = createAIService(settings)
  const data = await ai.generateJSON<{ topics: TopicPlan[] }>(buildPlannerMessages(form, persona), {
    temperature: Math.min(1.1, settings.temperature + 0.1),
  })

  const topics = Array.isArray(data.topics) ? data.topics : []
  if (topics.length === 0) {
    throw new Error('选题规划失败：未返回有效选题')
  }

  // 数量不足时补齐（用已有角度变体），过多则截断
  const normalized = topics.slice(0, form.count).map((item, index) => {
    const raw = item as TopicPlan & { coreConflict?: string; targetEmotion?: string }
    return {
      angle: raw.angle || `角度${index + 1}`,
      topic: raw.topic || `${form.keyword}选题${index + 1}`,
      core_conflict: raw.core_conflict || raw.coreConflict || '观点冲突',
      target_emotion: raw.target_emotion || raw.targetEmotion || '共鸣',
    }
  })

  while (normalized.length < form.count) {
    const i = normalized.length
    normalized.push({
      angle: `补充角度${i + 1}`,
      topic: `关于「${form.keyword}」的另一个切面 ${i + 1}`,
      core_conflict: '生活选择中的矛盾',
      target_emotion: '思考',
    })
  }

  return normalized
}

export async function generateOneContent(params: {
  settings: AISettings
  form: CreationFormState
  persona: Persona
  topic: TopicPlan
  existingTitles: string[]
  id: string
}): Promise<Content> {
  const { settings, form, persona, topic, existingTitles, id } = params
  const ai = createAIService(settings)
  const now = new Date().toISOString()

  let writer: WriterResult | null = null
  let score: ContentScore = emptyScore()
  let lastError = ''

  for (let attempt = 0; attempt <= MAX_REWRITE; attempt++) {
    try {
      const raw = await ai.generateJSON<Record<string, unknown>>(
        await buildWriterMessages({
          form,
          persona,
          topic,
          existingTitles: [
            ...existingTitles,
            ...(writer ? [`（上次不合格）${writer.title}`] : []),
          ],
        }),
        {
          temperature: settings.temperature,
          maxTokens: Math.max(settings.maxTokens || 2000, 3500),
        },
      )
      writer = normalizeWriterResult(raw)
    } catch (error) {
      lastError = error instanceof Error ? error.message : '文案 JSON 解析失败'
      writer = null
      continue
    }

    if (!writer.title?.trim() || !writer.content?.trim()) {
      lastError = '文案生成结果不完整（缺少标题或正文）'
      continue
    }

    try {
      const review = await ai.generateJSON<ReviewResult>(
        buildReviewerMessages({
          title: writer.title,
          content: writer.content,
          keyword: form.keyword,
          topicAngle: writer.topic_angle || topic.angle,
          persona,
          existingTitles,
        }),
        { temperature: 0.3 },
      )

      score = normalizeScore(review)
      const needRewrite = review.should_rewrite || score.total < 70
      if (!needRewrite || attempt === MAX_REWRITE) {
        break
      }
      lastError = (review.issues || []).join('；') || '评分过低'
    } catch {
      // 质检失败不阻断，使用估算分
      score = estimateScore(writer)
      break
    }
  }

  if (!writer?.title?.trim() || !writer?.content?.trim()) {
    throw new Error(lastError || '文案生成失败')
  }

  let hooks: DiscussionHook[] = []
  try {
    const discussion = await ai.generateJSON<DiscussionResult>(
      buildDiscussionMessages({
        title: writer.title,
        content: writer.content,
        keyword: form.keyword,
        persona,
      }),
      { temperature: 0.7 },
    )
    hooks = normalizeHooks(discussion.hooks)
  } catch {
    hooks = fallbackHooks(writer.title)
  }

  return {
    id,
    title: writer.title.trim(),
    content: writer.content.trim(),
    keyword: form.keyword,
    directions: [...form.directions],
    styles: [...form.styles],
    topicAngle: writer.topic_angle || topic.angle,
    discussionHooks: hooks,
    score,
    personaId: persona.id,
    templateId: form.templateId === 'auto' ? undefined : form.templateId,
    createdAt: now,
    updatedAt: now,
    favorite: false,
    status: 'completed',
  }
}

export async function polishContent(params: {
  settings: AISettings
  persona: Persona
  title: string
  content: string
  mode: string
}): Promise<{ title: string; content: string }> {
  const ai = createAIService(params.settings)
  const result = await ai.generateJSON<{ title: string; content: string }>(
    buildPolishMessages({
      title: params.title,
      content: params.content,
      mode: params.mode,
      persona: params.persona,
    }),
    { temperature: 0.7 },
  )
  return {
    title: result.title?.trim() || params.title,
    content: result.content?.trim() || params.content,
  }
}

function emptyScore(): ContentScore {
  return {
    title: 0,
    emotion: 0,
    completeness: 0,
    originality: 0,
    authenticity: 0,
    opinion: 0,
    discussion: 0,
    total: 0,
  }
}

function pickString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function normalizeWriterResult(raw: Record<string, unknown>): WriterResult {
  // 兼容模型把正文包在 data/result 里
  const nested =
    raw.data && typeof raw.data === 'object'
      ? (raw.data as Record<string, unknown>)
      : raw.result && typeof raw.result === 'object'
        ? (raw.result as Record<string, unknown>)
        : raw

  return {
    title: pickString(nested, ['title', '标题', 'Title', 'headline']),
    content: pickString(nested, ['content', '正文', 'body', 'text', 'article', '文案']),
    topic_angle: pickString(nested, ['topic_angle', 'topicAngle', 'angle', '角度', '内容角度']),
    emotion: pickString(nested, ['emotion', '情绪', 'target_emotion']),
  }
}

function normalizeScore(review: Partial<ReviewResult>): ContentScore {
  const title = clamp(review.title ?? 75)
  const emotion = clamp(review.emotion ?? 75)
  const completeness = clamp(review.completeness ?? 75)
  const originality = clamp(review.originality ?? 75)
  const authenticity = clamp(review.authenticity ?? 75)
  const opinion = clamp(review.opinion ?? 75)
  const discussion = clamp(review.discussion ?? 75)
  const weighted = Math.round(
    title * 0.2 +
      emotion * 0.2 +
      completeness * 0.15 +
      originality * 0.15 +
      authenticity * 0.1 +
      opinion * 0.1 +
      discussion * 0.1,
  )
  return {
    title,
    emotion,
    completeness,
    originality,
    authenticity,
    opinion,
    discussion,
    total: clamp(review.total ?? weighted),
  }
}

function estimateScore(writer: WriterResult): ContentScore {
  const base = Math.min(88, 70 + Math.floor(writer.content.length / 40))
  return {
    title: base,
    emotion: base,
    completeness: base,
    originality: base - 2,
    authenticity: base,
    opinion: base - 1,
    discussion: base - 1,
    total: base,
  }
}

function normalizeHooks(
  hooks: DiscussionResult['hooks'] | undefined,
): DiscussionHook[] {
  const allowed: DiscussionHookType[] = [
    'question',
    'choice',
    'controversy',
    'experience',
    'self',
  ]
  const list = (hooks || [])
    .filter((item) => item.content?.trim())
    .map((item, index) => {
      const type = allowed.includes(item.type as DiscussionHookType)
        ? (item.type as DiscussionHookType)
        : allowed[index % allowed.length]
      return {
        type,
        content: item.content.trim(),
        score: clamp(item.score ?? 80),
        recommended: Boolean(item.recommended),
      }
    })

  if (!list.length) return fallbackHooks('')

  if (!list.some((item) => item.recommended)) {
    const best = list.reduce((a, b) => (a.score >= b.score ? a : b))
    best.recommended = true
  } else {
    let seen = false
    for (const item of list) {
      if (item.recommended && !seen) {
        seen = true
      } else {
        item.recommended = false
      }
    }
  }

  return list
}

function fallbackHooks(title: string): DiscussionHook[] {
  return [
    {
      type: 'question',
      content: title ? `说到这个，你真实的感受是什么？` : '如果是你，你会怎么选？',
      score: 75,
      recommended: true,
    },
    {
      type: 'choice',
      content: '你会选择坚持自己的想法，还是先顺着家人？',
      score: 72,
      recommended: false,
    },
    {
      type: 'controversy',
      content: '有人说这是现实，有人说这是妥协，你站哪边？',
      score: 70,
      recommended: false,
    },
  ]
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}
