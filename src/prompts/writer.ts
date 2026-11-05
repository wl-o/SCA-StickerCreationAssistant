import type { ContentLength, CreationFormState, ContentTemplate, Persona, TopicPlan } from '@/types'
import { DIRECTION_LABEL_MAP, STYLE_LABEL_MAP } from '@/constants/creation'
import { buildPersonaPrompt, buildPlatformRules, buildSystemPrompt } from './shared'
import type { ChatMessage } from '@/services/ai/types'
import { api } from '@/services/storage/api'

function lengthGuide(length: ContentLength): string {
  if (length === 'short') return '约 120-180 字'
  if (length === 'long') return '约 350-500 字'
  return '约 220-320 字'
}

async function resolveTemplate(templateId?: string): Promise<string> {
  if (!templateId || templateId === 'auto') {
    return '根据选题自动选择最合适的结构（情绪共鸣 / 观点冲突 / 故事型 / 反常识）'
  }
  try {
    const templates = await api.get<ContentTemplate[]>('/api/templates')
    const found = templates.find((item) => item.id === templateId)
    if (!found) return '自动结构'
    return `${found.name}：${found.structure.join(' → ')}`
  } catch {
    return '自动结构'
  }
}

export async function buildWriterMessages(params: {
  form: CreationFormState
  persona: Persona
  topic: TopicPlan
  existingTitles: string[]
}): Promise<ChatMessage[]> {
  const { form, persona, topic, existingTitles } = params
  const directions = form.directions.map((d) => DIRECTION_LABEL_MAP[d]).join('、')
  const styles = form.styles.map((s) => STYLE_LABEL_MAP[s]).join('、')
  const templateText = await resolveTemplate(form.templateId)

  const user = `请根据以下选题，写一条可直接发布的贴图号文案。

【关键词】
${form.keyword}

【选题】
角度：${topic.angle}
选题：${topic.topic}
核心冲突：${topic.core_conflict}
目标情绪：${topic.target_emotion}

【创作方向】
${directions}

【创作风格】
${styles}

【内容长度】
${lengthGuide(form.length)}

【内容结构模板】
${templateText}

【同批已有标题（避免重复）】
${existingTitles.length ? existingTitles.map((t, i) => `${i + 1}. ${t}`).join('\n') : '无'}

【写作硬性要求】
1. 标题与正文高度相关，不标题党，少用夸张标点
2. 避免 AI 套话、空泛鸡汤、连续相同句式
3. 使用具体场景，有明确情绪或观点
4. 符合账号人设与口语表达
5. 正文不要写讨论引导（讨论引导另一步生成）

【只返回 JSON】
{
  "title": "标题",
  "content": "正文，可用换行分段",
  "topic_angle": "${topic.angle}",
  "emotion": "主要情绪"
}`

  return [
    {
      role: 'system',
      content: `${buildSystemPrompt()}\n\n${buildPlatformRules()}\n\n${buildPersonaPrompt(persona)}`,
    },
    { role: 'user', content: user },
  ]
}

export function buildPolishMessages(params: {
  title: string
  content: string
  mode: string
  persona: Persona
}): ChatMessage[] {
  const modeMap: Record<string, string> = {
    authentic: '更真实，增加具体生活细节，减少空话',
    emotion: '更有情绪张力，但不煽情过头',
    conflict: '更有冲突感，观点更鲜明',
    colloquial: '更口语化，像和邻居聊天',
    shorten: '更简洁，删掉水分，保留核心',
  }

  const user = `请按「${modeMap[params.mode] ?? params.mode}」方向润色以下内容。
保持原意和人设，不要改成完全不同的文章。

标题：
${params.title}

正文：
${params.content}

只返回 JSON：
{
  "title": "润色后标题",
  "content": "润色后正文"
}`

  return [
    {
      role: 'system',
      content: `${buildSystemPrompt()}\n\n${buildPersonaPrompt(params.persona)}`,
    },
    { role: 'user', content: user },
  ]
}
