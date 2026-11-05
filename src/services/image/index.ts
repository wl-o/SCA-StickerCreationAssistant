import { api } from '@/services/storage/api'
import type { ContentCoverImage, ImageCandidate, ImageSettings } from '@/types'

export async function searchImages(query: string, page = 1) {
  const q = encodeURIComponent(query)
  return api.get<{
    query: string
    page: number
    provider: string
    items: ImageCandidate[]
  }>(`/api/images/search?q=${q}&page=${page}`)
}

export async function attachImage(params: {
  contentId: string
  query: string
  candidate: ImageCandidate
}) {
  return api.post<{ image: ContentCoverImage; images: ContentCoverImage[] }>(
    '/api/images/attach',
    params,
  )
}

export async function detachImage(contentId: string, imageId?: string) {
  if (imageId) {
    return api.delete<{ ok: boolean; images: ContentCoverImage[] }>(
      `/api/images/content/${contentId}/${imageId}`,
    )
  }
  return api.delete<{ ok: boolean; images: ContentCoverImage[] }>(
    `/api/images/content/${contentId}`,
  )
}

export async function loadImageSettings() {
  return api.get<ImageSettings>('/api/settings/image')
}

export async function saveImageSettings(settings: ImageSettings) {
  return api.put<ImageSettings>('/api/settings/image', settings)
}
