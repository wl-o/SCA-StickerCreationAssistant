import type { Content } from '@/types'

export interface ImageQuerySuggestion {
  label: string
  query: string
}

/** 停用词：不作为画面关键词 */
const STOPWORDS = new Set([
  '的', '了', '是', '在', '我', '你', '他', '她', '它', '们', '这', '那', '有', '和', '就', '都',
  '也', '还', '很', '更', '最', '被', '把', '让', '给', '对', '从', '到', '与', '及', '或',
  '一个', '一些', '什么', '怎么', '为什么', '因为', '所以', '但是', '然后', '如果', '虽然',
  '可以', '没有', '不是', '真的', '其实', '已经', '自己', '我们', '你们', '他们', '这个',
  '那个', '这样', '那样', '时候', '现在', '后来', '今天', '明天', '昨天', '觉得', '知道',
  '看到', '听说', '开始', '出来', '进去', '过来', '过去', '起来', '下去', '一下', '一点',
  '东西', '地方', '问题', '事情', '生活', '日子', '这些', '那些', '什么', '哪个', '多少',
  '比较', '非常', '一直', '总是', '偶尔', '可能', '应该', '需要', '希望', '好像', '比如',
])

/**
 * 画面概念词典：仅当正文出现对应中文时才启用，用于生成英文搜图词。
 * 不是题材模板，不预设「跑步」等无关推荐。
 */
const VISUAL_LEXICON: Array<{ words: string[]; en: string }> = [
  { words: ['留守', '村里', '农村', '老家', '乡下', '老屋'], en: 'rural village elderly china countryside' },
  { words: ['过年', '春节', '团圆'], en: 'chinese new year family reunion home' },
  { words: ['电话', '视频', '微信'], en: 'elderly talking on phone alone' },
  { words: ['孤独', '一个人', '空巢', '寂寞'], en: 'lonely elderly person sitting alone' },
  { words: ['儿女', '子女', '孩子', '孙子', '孙女'], en: 'family grandparents grandchildren rural' },
  { words: ['邻里', '邻居', '唠嗑'], en: 'neighbors chatting village courtyard' },
  { words: ['种地', '地里', '务农', '菜园', '种菜'], en: 'elderly farming vegetable garden rural' },
  { words: ['鸡', '鸭子', '牲畜'], en: 'rural farm animals courtyard china' },
  { words: ['夜跑', '夜路', '路灯'], en: 'night running city street lights' },
  { words: ['晨跑', '清晨', '日出'], en: 'morning jogging sunrise outdoor' },
  { words: ['马拉松', '全马', '半马', '完赛'], en: 'marathon finish line runners' },
  { words: ['跑鞋', '装备', '手表'], en: 'running shoes sneakers gear' },
  { words: ['雨天', '下雨'], en: 'person walking in the rain' },
  { words: ['跑道', '训练', '间歇'], en: 'athlete track training outdoors' },
  { words: ['海边', '沙滩'], en: 'beach ocean shoreline lifestyle' },
  { words: ['山路', '越野', '山林'], en: 'trail mountain forest hiking' },
  { words: ['城市', '街景', '马路'], en: 'urban street city lifestyle photography' },
  { words: ['厨房', '做饭', '饭桌'], en: 'home kitchen cooking everyday life' },
  { words: ['医院', '看病', '病房'], en: 'hospital waiting elderly care' },
  { words: ['公交', '地铁', '通勤'], en: 'commute subway bus city life' },
  { words: ['夕阳', '黄昏', '傍晚'], en: 'sunset golden hour quiet street' },
  { words: ['冬天', '下雪', '寒冷'], en: 'winter snow quiet outdoor scene' },
  { words: ['夏天', '热天', '烈日'], en: 'summer heat outdoor lifestyle' },
  { words: ['钓鱼', '河边', '湖边'], en: 'person fishing by lake riverside' },
  { words: ['跑步', '跑者', '路跑', '慢跑'], en: 'person jogging outdoors' },
]

const GENERIC_FALLBACKS: ImageQuerySuggestion[] = [
  { label: '生活纪实', query: 'candid lifestyle storytelling photography' },
  { label: '人物特写', query: 'authentic portrait everyday life' },
  { label: '日常场景', query: 'everyday life scene documentary photo' },
]

function pushUnique(
  list: ImageQuerySuggestion[],
  seen: Set<string>,
  item: ImageQuerySuggestion,
) {
  const key = item.query.toLowerCase().trim()
  if (!key || seen.has(key)) return
  seen.add(key)
  list.push(item)
}

/** 从正文抽中文词（2–4 字），按出现次数排序 */
export function extractContentTerms(
  content: Pick<Content, 'title' | 'content' | 'keyword' | 'topicAngle'>,
  limit = 12,
): string[] {
  const weighted = [
    { text: content.keyword || '', weight: 5 },
    { text: content.topicAngle || '', weight: 4 },
    { text: content.title || '', weight: 4 },
    { text: (content.content || '').slice(0, 1200), weight: 1 },
  ]

  const scores = new Map<string, number>()

  for (const { text, weight } of weighted) {
    const cleaned = text.replace(/[^\u4e00-\u9fffA-Za-z0-9]+/g, ' ')
    // 英文词
    for (const en of cleaned.match(/[A-Za-z]{3,}/g) || []) {
      const w = en.toLowerCase()
      scores.set(w, (scores.get(w) || 0) + weight * 2)
    }
    const cn = cleaned.replace(/[A-Za-z0-9]/g, ' ')
    for (let len = 4; len >= 2; len -= 1) {
      for (let i = 0; i <= cn.length - len; i += 1) {
        const slice = cn.slice(i, i + len)
        if (!/^[\u4e00-\u9fff]+$/.test(slice)) continue
        if (STOPWORDS.has(slice)) continue
        if ([...slice].every((ch) => STOPWORDS.has(ch))) continue
        scores.set(slice, (scores.get(slice) || 0) + weight * (len === 2 ? 1 : 1.4))
      }
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([term]) => term)
    .filter((term, index, arr) => {
      // 去掉被更长短语包含的短词，减少噪音
      return !arr.some((other, j) => j < index && other.includes(term) && other !== term)
    })
    .slice(0, limit)
}

function lexiconHits(text: string): ImageQuerySuggestion[] {
  const hits: ImageQuerySuggestion[] = []
  for (const item of VISUAL_LEXICON) {
    const hit = item.words.find((w) => text.includes(w))
    if (!hit) continue
    hits.push({
      label: hit,
      query: item.en,
    })
  }
  return hits
}

/**
 * 基于文章内容本地推荐配图关键词（无 AI 时的即时结果）。
 */
export function suggestImageQueries(
  content: Pick<Content, 'title' | 'content' | 'keyword' | 'topicAngle'>,
): ImageQuerySuggestion[] {
  const fullText = `${content.title}\n${content.keyword}\n${content.topicAngle}\n${content.content}`
  const terms = extractContentTerms(content)
  const seen = new Set<string>()
  const result: ImageQuerySuggestion[] = []

  const keyword = (content.keyword || '').trim()
  if (keyword) {
    pushUnique(result, seen, {
      label: keyword.slice(0, 14),
      query: /[\u4e00-\u9fff]/.test(keyword)
        ? `${keyword} lifestyle photography`
        : keyword,
    })
  }

  const angle = (content.topicAngle || '').trim()
  if (angle && angle !== keyword) {
    pushUnique(result, seen, {
      label: angle.slice(0, 14),
      query: `${angle} documentary lifestyle photo`,
    })
  }

  // 正文高频词 → 可搜画面词
  for (const term of terms.slice(0, 6)) {
    pushUnique(result, seen, {
      label: term,
      query: /[A-Za-z]/.test(term)
        ? `${term} photography`
        : `${term} lifestyle photography candid`,
    })
  }

  // 仅在正文确实出现时，补充英文画面译法
  for (const hit of lexiconHits(fullText)) {
    pushUnique(result, seen, hit)
  }

  // 组合前几个词，增强针对性
  if (terms.length >= 2) {
    pushUnique(result, seen, {
      label: `${terms[0]}·${terms[1]}`,
      query: `${terms[0]} ${terms[1]} lifestyle photography`,
    })
  }

  for (const item of GENERIC_FALLBACKS) {
    pushUnique(result, seen, item)
    if (result.length >= 8) break
  }

  return result.slice(0, 8)
}

export function extractImageQuery(
  content: Pick<Content, 'title' | 'content' | 'keyword' | 'topicAngle'>,
): string {
  return suggestImageQueries(content)[0]?.query || 'lifestyle photography candid'
}
