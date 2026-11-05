import type { CreationFormState, Persona } from '@/types'
import { DIRECTION_LABEL_MAP, STYLE_LABEL_MAP } from '@/constants/creation'
import { buildPersonaPrompt, buildPlatformRules, buildSystemPrompt } from './shared'
import type { ChatMessage } from '@/services/ai/types'

export function buildPlannerMessages(
  form: CreationFormState,
  persona: Persona,
): ChatMessage[] {
  const directions = form.directions.map((d) => DIRECTION_LABEL_MAP[d]).join('、')
  const styles = form.styles.map((s) => STYLE_LABEL_MAP[s]).join('、')

  const user = `请围绕关键词进行选题规划，输出 ${form.count} 个互不重复的选题。

【关键词】
${form.keyword}

【创作方向】
${directions}

【创作风格】
${styles}

【强度参数】
情绪强度：${form.emotionIntensity}/100
观点强度：${form.opinionIntensity}/100
争议程度：${form.controversyLevel}/100

【内容角度矩阵参考】
人物 / 情绪 / 金钱 / 家庭 / 婚姻 / 子女 / 工作 / 养老 / 价值观 / 社会现象
请把角度矩阵与创作方向交叉组合，例如：养老×情绪、子女×争议、金钱×反常识。

【要求】
1. 每个选题切入角度必须明显不同
2. 核心冲突要具体，不要空泛
3. 目标情绪要清晰
4. 只返回 JSON，格式如下：
{
  "topics": [
    {
      "angle": "养老 × 情绪",
      "topic": "选题一句话",
      "core_conflict": "核心冲突",
      "target_emotion": "目标情绪"
    }
  ]
}`

  return [
    { role: 'system', content: `${buildSystemPrompt()}\n\n${buildPlatformRules()}\n\n${buildPersonaPrompt(persona)}` },
    { role: 'user', content: user },
  ]
}
