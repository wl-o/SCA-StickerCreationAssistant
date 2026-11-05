import type { Persona } from '@/types'
import { buildPersonaPrompt, buildSystemPrompt } from './shared'
import type { ChatMessage } from '@/services/ai/types'

export function buildReviewerMessages(params: {
  title: string
  content: string
  keyword: string
  topicAngle: string
  persona: Persona
  existingTitles: string[]
}): ChatMessage[] {
  const user = `请对以下贴图号内容做质量评估，并给出 0-100 分的各维度评分。

【关键词】
${params.keyword}

【内容角度】
${params.topicAngle}

【待评内容】
标题：${params.title}

正文：
${params.content}

【同批其他标题】
${params.existingTitles.length ? params.existingTitles.join('\n') : '无'}

【检查项】
1. 是否重复/雷同
2. 是否空洞套话
3. 是否像 AI 生成
4. 是否符合人设
5. 是否有明确观点/情绪张力
6. 是否有讨论价值
7. 是否存在事实风险

【评分维度与权重】
- title 标题吸引力 20%
- emotion 情绪感染力 20%
- completeness 内容完整度 15%
- originality 差异化 15%
- authenticity 真实感 10%
- opinion 观点清晰度 10%
- discussion 讨论潜力 10%

total 按权重计算综合分（整数）。

只返回 JSON：
{
  "title": 0,
  "emotion": 0,
  "completeness": 0,
  "originality": 0,
  "authenticity": 0,
  "opinion": 0,
  "discussion": 0,
  "total": 0,
  "should_rewrite": false,
  "issues": ["问题1"]
}`

  return [
    {
      role: 'system',
      content: `${buildSystemPrompt()}\n\n${buildPersonaPrompt(params.persona)}\n\n你现在是严格的内容质检官，打分要客观。`,
    },
    { role: 'user', content: user },
  ]
}
