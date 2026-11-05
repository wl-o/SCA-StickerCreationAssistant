import type { ContentCoverImage } from '@/types'

function sanitizeFilename(name: string): string {
  return (name || '配图')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 通过后端下载接口拉取单张配图到本地 */
export async function downloadOneImage(
  image: Pick<ContentCoverImage, 'id'>,
  filenameBase: string,
): Promise<void> {
  const name = encodeURIComponent(sanitizeFilename(filenameBase))
  const url = `/api/images/${image.id}/download?name=${name}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `下载失败（${res.status}）`)
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i)
  const headerName = match ? decodeURIComponent(match[1] || match[2] || '') : ''
  const filename = headerName || `${sanitizeFilename(filenameBase)}.jpg`

  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

/** 按顺序下载文章全部配图（浏览器会逐个触发保存） */
export async function downloadAllImages(
  images: ContentCoverImage[],
  articleTitle: string,
): Promise<number> {
  if (!images.length) return 0
  const base = sanitizeFilename(articleTitle)
  let ok = 0
  for (let i = 0; i < images.length; i += 1) {
    const image = images[i]
    await downloadOneImage(image, `${base}-图${i + 1}`)
    ok += 1
    if (i < images.length - 1) await sleep(350)
  }
  return ok
}
