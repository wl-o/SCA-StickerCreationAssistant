import type { Content, DiscussionHook } from '@/types'

export function getRecommendedHook(hooks: DiscussionHook[]): DiscussionHook | undefined {
  return hooks.find((item) => item.recommended) ?? hooks[0]
}

/** 仅标题 + 正文 */
export function formatBodyForCopy(content: Content): string {
  return `${content.title}\n\n${content.content}`.trim()
}

/** 仅推荐讨论引导 */
export function formatDiscussionForCopy(content: Content): string {
  return getRecommendedHook(content.discussionHooks)?.content?.trim() || ''
}

/** 正文 + 讨论引导（发帖常用） */
export function formatContentForCopy(content: Content, full = true): string {
  const body = formatBodyForCopy(content)
  if (!full) return body
  const hook = formatDiscussionForCopy(content)
  if (!hook) return body
  return `${body}\n\n---\n\n讨论引导：\n${hook}`
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
