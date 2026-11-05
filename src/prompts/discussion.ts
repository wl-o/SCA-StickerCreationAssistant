import type { Persona } from '@/types'
import { buildPersonaPrompt, buildSystemPrompt } from './shared'
import type { ChatMessage } from '@/services/ai/types'

export function buildDiscussionMessages(params: {
  title: string
  content: string
  keyword: string
  persona: Persona
}): ChatMessage[] {
  const user = `根据以下正文，生成讨论引导（Discussion Hook），用于贴图号评论区互动。

【关键词】
${params.keyword}

【标题】
${params.title}

【正文】
${params.content}

【要求】
生成 5 种类型各 1 条：
1. question 提问型
2. choice 二选一
3. controversy 争议型
4. experience 经验征集型
5. self 自我代入型

每条必须：具体 + 可代入 + 有选择空间/不同观点。
禁止只写「你怎么看？」。

并为每条打分 0-100，选出 1 条 recommended=true 作为主推荐。

只返回 JSON：
{
  "hooks": [
    {
      "type": "question",
      "content": "...",
      "score": 85,
      "recommended": false
    }
  ]
}`

  return [
    {
      role: 'system',
      content: `${buildSystemPrompt()}\n\n${buildPersonaPrompt(params.persona)}\n\n你是讨论引擎，专注制造有互动空间的评论引导。`,
    },
    { role: 'user', content: user },
  ]
}
