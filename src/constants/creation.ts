import type { CreationDirection, CreationStyle, ContentLength } from '@/types'

export const DIRECTION_OPTIONS: { id: CreationDirection; name: string; description: string }[] = [
  { id: 'emotion', name: '情绪', description: '激发情绪共鸣' },
  { id: 'opinion', name: '观点', description: '输出明确观点' },
  { id: 'story', name: '故事', description: '通过故事表达' },
  { id: 'resonance', name: '共鸣', description: '让用户产生代入感' },
  { id: 'contrarian', name: '反常识', description: '打破常规认知' },
  { id: 'controversy', name: '争议', description: '制造讨论空间' },
  { id: 'question', name: '提问', description: '通过问题引发互动' },
  { id: 'experience', name: '经验', description: '输出生活经验' },
]

export const STYLE_OPTIONS: { id: CreationStyle; name: string }[] = [
  { id: 'authentic', name: '真实' },
  { id: 'warm', name: '温暖' },
  { id: 'restrained', name: '克制' },
  { id: 'sharp', name: '犀利' },
  { id: 'humorous', name: '幽默' },
  { id: 'plain', name: '朴素' },
  { id: 'colloquial', name: '口语化' },
  { id: 'storytelling', name: '故事感' },
]

export const COUNT_OPTIONS = [1, 3, 5, 10, 20, 30] as const

export const LENGTH_OPTIONS: { id: ContentLength; name: string }[] = [
  { id: 'short', name: '短' },
  { id: 'medium', name: '中' },
  { id: 'long', name: '长' },
]

export const SCORE_LABELS = [
  { min: 90, max: 100, label: '优秀' },
  { min: 80, max: 89, label: '良好' },
  { min: 70, max: 79, label: '一般' },
  { min: 0, max: 69, label: '建议重写' },
] as const

export function getScoreLabel(total: number): string {
  const found = SCORE_LABELS.find((item) => total >= item.min && total <= item.max)
  return found?.label ?? '建议重写'
}

export const DIRECTION_LABEL_MAP = Object.fromEntries(
  DIRECTION_OPTIONS.map((item) => [item.id, item.name]),
) as Record<CreationDirection, string>

export const STYLE_LABEL_MAP = Object.fromEntries(
  STYLE_OPTIONS.map((item) => [item.id, item.name]),
) as Record<CreationStyle, string>
