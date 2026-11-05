import { buildPlatformRules, buildSystemPrompt } from './shared'
import type { ChatMessage } from '@/services/ai/types'

export type RewriteMode = 'compress' | 'keep-key'

/** 去 AI 味、像真人重写的核心原则（产品约定） */
export function buildHumanRewritePrinciples(): string {
  return `你是一名长期真实写作的作者。你的任务不是润色，而是**重新组织语言，把文章改写得像真实的人写的**。不代入任何账号人设。

## 改写原则

1. **保留核心**
   - 保留原文事实、核心观点、关键信息和文章意图。
   - 不凭空增加事实，不改变原意。
   - 不逐句润色，而是理解后重新写。

2. **去除 AI 味**
   主动减少或删除：
   - 首先、其次、最后
   - 总的来说、综上所述、值得注意的是
   - 不仅……而且……、一方面……另一方面……
   - “本质上、归根结底、这不是……而是……”等套路句式
   - 过度总结、过度解释、空洞升华
   - 连续排比和高度工整的表达

3. **增加真人感**
   - 多用自然口语，但不要刻意装口语。
   - 加入适度的个人判断、情绪、疑问和态度。
   - 允许观点不那么“标准答案”，可以有犹豫、转折和留白。
   - 句子长短错落，段落不要过于整齐。
   - 可以出现“其实、说实话、我反而觉得、后来才发现”等自然表达，但不要堆砌。

4. **保持真实**
   - 不要故意制造错别字、病句或低级口语。
   - 不要为了“像真人”而刻意不自然。
   - 核心目标是：自然、有观点、有人的思考痕迹。

5. **节奏**
   避免“观点→解释→总结”的机械循环。
   适当使用短句、停顿、转折和思维跳跃，让文章读起来有呼吸感。

## 最终检查（写完后在心里自检，不要输出检查过程）
- 是否还有明显 AI 套话？
- 是否过于工整？
- 是否像标准答案？
- 是否缺少个人判断？
- 是否存在过度总结和解释？
- 是否读起来像一个真实的人在说话？
若还有明显 AI 味，继续重写后再输出。`
}

function modeGuide(mode: RewriteMode): string {
  if (mode === 'keep-key') {
    return `【模式：保留关键信息重写】
这是硬性要求，优先级高于“短、好看、好读”：
1. 先从原文提取全部关键信息：数字、比例、金额、时间、人名/称谓、地名、机构名、条件、结论、因果、对比、步骤、专有名词、不可替代的细节
2. 重写后这些关键信息必须全部落到正文里，禁止为了压缩而省略、合并成含糊说法、或用“很多/一些/大概”替换具体数据
3. 可以删空话、套话、重复解释，但绝不能删关键事实
4. 若原文信息较多，宁肯写长一点，也不许漏关键点
5. 标题约 16-28 字；正文约 220-450 字（信息特别密时可到 500 字），短段落
6. 另给 1 条讨论引导；提炼 2-8 字主题词
7. JSON 中额外返回 key_points：你保留进正文的关键信息清单（用于自检，3-12 条短句）`
  }

  return `【模式：缩略改写】
- 标题约 16-28 字，吸引但不标题党，少用夸张标点
- 正文约 120-220 字，短段落，适合手机快读
- 另给 1 条讨论引导（评论区用），简短、有互动空间
- 提炼 2-8 字主题词
- 保留精华与最核心信息，删除水分和空话；不编造原文没有的事实`
}

export function buildRewriteMessages(params: {
  sourceText: string
  hintTitle?: string
  mode?: RewriteMode
}): ChatMessage[] {
  const mode = params.mode || 'compress'
  const hint = params.hintTitle?.trim()
  const user = `请将下面原文**理解后重新写**成适合微信贴图号的内容（不是逐句润色）。

${modeGuide(mode)}

【共同约束】
- 不代入任何账号人设
- 不编造原文没有的事实
- 严格遵守系统里的「像真人重写」原则

${hint ? `【可选标题提示】\n${hint}\n` : ''}
【原文】
${params.sourceText.slice(0, 10000)}

只返回 JSON（不要解释修改过程）：
{
  "title": "标题",
  "content": "正文，可用换行分段",
  "discussion_hook": "讨论引导一句话",
  "keyword": "主题词"${mode === 'keep-key' ? ',\n  "key_points": ["关键信息1", "关键信息2"]' : ''}
}`

  return [
    {
      role: 'system',
      content: `${buildSystemPrompt()}\n\n${buildPlatformRules()}\n\n${buildHumanRewritePrinciples()}\n\n【输出硬性要求】必须只返回一个合法 JSON 对象，不要输出文章正文以外的说明，不要 Markdown 代码块。${
        mode === 'keep-key'
          ? '\n【特别强调】漏掉原文关键数字/事实/结论视为失败，必须全部写入 content。'
          : ''
      }`,
    },
    { role: 'user', content: user },
  ]
}

export function buildRewritePolishMessages(params: {
  title: string
  content: string
  discussionHook?: string
  mode: string
  sourceText?: string
}): ChatMessage[] {
  const modeMap: Record<string, string> = {
    human: '全面去 AI 味，像真人重新写一遍，保持篇幅差不多',
    'keep-key':
      '对照原文核对，把被省略的关键信息（数字、事实、结论、专有名词等）全部补回正文，同时保持真人语气；宁可稍长，不可漏关键点',
    authentic: '更有个人判断和具体细节，少空话',
    emotion: '情绪更真一点，但不煽情、不鸡汤',
    conflict: '态度更鲜明，允许犹豫和转折，不要标准答案腔',
    colloquial: '更自然口语，但不刻意装口语、不堆口头禅',
    shorten: '再压缩一遍，删水分，保留核心与人味',
  }

  const sourceBlock =
    params.mode === 'keep-key' && params.sourceText?.trim()
      ? `\n【原文（必须对照，不得忽略其中的关键信息）】\n${params.sourceText.trim().slice(0, 10000)}\n`
      : ''

  const user = `请按「${modeMap[params.mode] ?? params.mode}」方向，对以下贴图号文案**重新组织语言**（不是润色修饰）。
不代入人设。若仍有 AI 味，继续重写到自然为止。
${sourceBlock}
标题：
${params.title}

正文：
${params.content}

讨论引导：
${params.discussionHook || '无'}

只返回 JSON（不要解释修改过程）：
{
  "title": "重写后标题",
  "content": "重写后正文",
  "discussion_hook": "重写后讨论引导"${
    params.mode === 'keep-key' ? ',\n  "key_points": ["补回或保留的关键信息1", "关键信息2"]' : ''
  }
}`

  return [
    {
      role: 'system',
      content: `${buildSystemPrompt()}\n\n${buildPlatformRules()}\n\n${buildHumanRewritePrinciples()}\n\n【输出硬性要求】必须只返回一个合法 JSON 对象，不要输出文章正文以外的说明，不要 Markdown 代码块。`,
    },
    { role: 'user', content: user },
  ]
}
