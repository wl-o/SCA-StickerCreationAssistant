import fs from 'node:fs'
import path from 'node:path'
import type { FastifyInstance } from 'fastify'
import { db, imagesDir } from '../db.js'
import { getImageSettings } from '../utils/settingsStore.js'

export interface ImageCandidate {
  provider: 'unsplash' | 'pexels' | 'pixabay'
  providerId: string
  thumbUrl: string
  previewUrl: string
  downloadUrl: string
  width: number
  height: number
  photographer: string
  photographerUrl: string
  sourcePageUrl: string
  license: string
  attribution: string
  downloadLocation?: string
}

interface ImageRow {
  id: string
  provider: string
  provider_id: string
  query: string
  thumb_url: string
  preview_url: string
  download_url: string
  local_path: string | null
  width: number | null
  height: number | null
  photographer: string
  photographer_url: string
  source_page_url: string
  license: string
  attribution: string
  created_at: string
}

function mapImage(row: ImageRow) {
  return {
    id: row.id,
    provider: row.provider,
    providerId: row.provider_id,
    query: row.query,
    thumbUrl: row.thumb_url,
    previewUrl: row.local_path ? `/api/images/${row.id}/file` : row.preview_url,
    downloadUrl: row.download_url,
    localPath: row.local_path || undefined,
    width: row.width || undefined,
    height: row.height || undefined,
    photographer: row.photographer,
    photographerUrl: row.photographer_url,
    sourcePageUrl: row.source_page_url,
    license: row.license,
    attribution: row.attribution,
    createdAt: row.created_at,
  }
}

async function searchUnsplash(
  query: string,
  page: number,
  accessKey: string,
): Promise<ImageCandidate[]> {
  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', '8')
  url.searchParams.set('page', String(page))
  url.searchParams.set('content_filter', 'high')
  // 不强制竖图，方便大图预览看全画面

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1',
    },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Unsplash 搜索失败（${response.status}）：${text.slice(0, 160)}`)
  }

  const data = (await response.json()) as {
    results?: Array<{
      id: string
      width: number
      height: number
      urls: { thumb: string; small: string; regular: string }
      links: { html: string; download_location: string }
      user: { name: string; links?: { html?: string } }
    }>
  }

  return (data.results || []).map((photo) => ({
    provider: 'unsplash' as const,
    providerId: photo.id,
    thumbUrl: photo.urls.small || photo.urls.thumb,
    previewUrl: photo.urls.regular,
    downloadUrl: photo.urls.regular,
    width: photo.width,
    height: photo.height,
    photographer: photo.user.name,
    photographerUrl: photo.user.links?.html || '',
    sourcePageUrl: photo.links.html,
    license: 'Unsplash License',
    attribution: `Photo by ${photo.user.name} on Unsplash`,
    downloadLocation: photo.links.download_location,
  }))
}

/** Unsplash 要求：实际使用图片时触发 download endpoint 统计 */
async function triggerUnsplashDownload(downloadLocation: string, accessKey: string) {
  if (!downloadLocation) return
  try {
    await fetch(downloadLocation, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    })
  } catch {
    // 统计失败不阻断配图
  }
}

async function searchPexels(query: string, page: number, apiKey: string): Promise<ImageCandidate[]> {
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', '8')
  url.searchParams.set('page', String(page))
  url.searchParams.set('orientation', 'portrait')

  const response = await fetch(url, {
    headers: { Authorization: apiKey },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Pexels 搜索失败（${response.status}）：${text.slice(0, 160)}`)
  }

  const data = (await response.json()) as {
    photos?: Array<{
      id: number
      width: number
      height: number
      url: string
      photographer: string
      photographer_url: string
      src: { medium: string; large: string; original: string }
    }>
  }

  return (data.photos || []).map((photo) => ({
    provider: 'pexels' as const,
    providerId: String(photo.id),
    thumbUrl: photo.src.medium,
    previewUrl: photo.src.large,
    downloadUrl: photo.src.large,
    width: photo.width,
    height: photo.height,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    sourcePageUrl: photo.url,
    license: 'Pexels License',
    attribution: `Photo by ${photo.photographer} on Pexels`,
  }))
}

async function searchPixabay(query: string, page: number, apiKey: string): Promise<ImageCandidate[]> {
  const url = new URL('https://pixabay.com/api/')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('q', query)
  url.searchParams.set('image_type', 'photo')
  url.searchParams.set('orientation', 'vertical')
  url.searchParams.set('per_page', '8')
  url.searchParams.set('page', String(page))
  url.searchParams.set('safesearch', 'true')

  const response = await fetch(url)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Pixabay 搜索失败（${response.status}）：${text.slice(0, 160)}`)
  }

  const data = (await response.json()) as {
    hits?: Array<{
      id: number
      webformatURL: string
      largeImageURL: string
      previewURL: string
      user: string
      pageURL: string
      imageWidth: number
      imageHeight: number
    }>
  }

  return (data.hits || []).map((hit) => ({
    provider: 'pixabay' as const,
    providerId: String(hit.id),
    thumbUrl: hit.previewURL || hit.webformatURL,
    previewUrl: hit.webformatURL,
    downloadUrl: hit.largeImageURL || hit.webformatURL,
    width: hit.imageWidth,
    height: hit.imageHeight,
    photographer: hit.user,
    photographerUrl: `https://pixabay.com/users/${encodeURIComponent(hit.user)}/`,
    sourcePageUrl: hit.pageURL,
    license: 'Pixabay Content License',
    attribution: `Image by ${hit.user} on Pixabay`,
  }))
}

async function downloadToLocal(imageId: string, remoteUrl: string): Promise<string> {
  const ext = guessExt(remoteUrl)
  const filename = `${imageId}${ext}`
  const localPath = path.join(imagesDir, filename)

  if (fs.existsSync(localPath)) return localPath

  const response = await fetch(remoteUrl)
  if (!response.ok) {
    throw new Error(`图片下载失败（${response.status}）`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(localPath, buffer)
  return localPath
}

function guessExt(url: string): string {
  const clean = url.split('?')[0].toLowerCase()
  if (clean.endsWith('.png')) return '.png'
  if (clean.endsWith('.webp')) return '.webp'
  return '.jpg'
}

export async function imageRoutes(app: FastifyInstance) {
  app.get('/api/images/search', async (req, reply) => {
    const query = req.query as { q?: string; page?: string }
    const q = (query.q || '').trim()
    if (!q) return reply.code(400).send({ error: '请提供搜索关键词' })

    const settings = getImageSettings()
    const page = Math.max(1, Number(query.page || 1))

    try {
      let items: ImageCandidate[] = []
      if (settings.provider === 'pixabay') {
        if (!settings.pixabayApiKey.trim()) {
          return reply.code(400).send({ error: '请先在设置中填写 Pixabay API Key' })
        }
        items = await searchPixabay(q, page, settings.pixabayApiKey.trim())
      } else if (settings.provider === 'pexels') {
        if (!settings.pexelsApiKey.trim()) {
          return reply.code(400).send({ error: '请先在设置中填写 Pexels API Key' })
        }
        items = await searchPexels(q, page, settings.pexelsApiKey.trim())
      } else {
        if (!settings.unsplashAccessKey.trim()) {
          return reply.code(400).send({ error: '请先在设置中填写 Unsplash Access Key' })
        }
        items = await searchUnsplash(q, page, settings.unsplashAccessKey.trim())
      }

      return { query: q, page, provider: settings.provider, items }
    } catch (error) {
      return reply
        .code(502)
        .send({ error: error instanceof Error ? error.message : '搜图失败' })
    }
  })

  app.post<{
    Body: {
      contentId: string
      query?: string
      candidate: ImageCandidate
    }
  }>('/api/images/attach', async (req, reply) => {
    const { contentId, candidate, query } = req.body || {}
    if (!contentId || !candidate?.providerId) {
      return reply.code(400).send({ error: '参数不完整' })
    }

    const content = db.prepare('SELECT id FROM contents WHERE id = ?').get(contentId)
    if (!content) return reply.code(404).send({ error: '内容不存在，请先保存内容再配图' })

    const existing = db
      .prepare('SELECT * FROM images WHERE provider = ? AND provider_id = ?')
      .get(candidate.provider, candidate.providerId) as ImageRow | undefined

    const imageId = existing?.id || `img-${candidate.provider}-${candidate.providerId}`
    const ts = new Date().toISOString()

    let localPath = existing?.local_path || null
    try {
      if (candidate.provider === 'unsplash' && candidate.downloadLocation) {
        const settings = getImageSettings()
        await triggerUnsplashDownload(
          candidate.downloadLocation,
          settings.unsplashAccessKey.trim(),
        )
      }
      localPath = await downloadToLocal(imageId, candidate.downloadUrl || candidate.previewUrl)
    } catch (error) {
      app.log.warn({ err: error }, 'image download failed, keep remote url')
    }

    db.prepare(
      `INSERT INTO images (
        id, provider, provider_id, query, thumb_url, preview_url, download_url, local_path,
        width, height, photographer, photographer_url, source_page_url, license, attribution, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider, provider_id) DO UPDATE SET
        query = excluded.query,
        thumb_url = excluded.thumb_url,
        preview_url = excluded.preview_url,
        download_url = excluded.download_url,
        local_path = COALESCE(excluded.local_path, images.local_path),
        width = excluded.width,
        height = excluded.height,
        photographer = excluded.photographer,
        photographer_url = excluded.photographer_url,
        source_page_url = excluded.source_page_url,
        license = excluded.license,
        attribution = excluded.attribution`,
    ).run(
      imageId,
      candidate.provider,
      candidate.providerId,
      query || '',
      candidate.thumbUrl,
      candidate.previewUrl,
      candidate.downloadUrl,
      localPath,
      candidate.width || null,
      candidate.height || null,
      candidate.photographer || '',
      candidate.photographerUrl || '',
      candidate.sourcePageUrl || '',
      candidate.license || '',
      candidate.attribution || '',
      existing?.created_at || ts,
    )

    const maxOrder = db
      .prepare(
        `SELECT COALESCE(MAX(sort_order), -1) as m FROM content_images WHERE content_id = ?`,
      )
      .get(contentId) as { m: number }

    db.prepare(
      `INSERT INTO content_images (id, content_id, image_id, sort_order, query, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_id, image_id) DO UPDATE SET query = excluded.query`,
    ).run(
      `cimg-${contentId}-${imageId}`,
      contentId,
      imageId,
      maxOrder.m + 1,
      query || '',
      ts,
    )

    // 封面同步为第一张
    const first = db
      .prepare(
        `SELECT image_id FROM content_images WHERE content_id = ? ORDER BY sort_order ASC LIMIT 1`,
      )
      .get(contentId) as { image_id: string } | undefined

    db.prepare(
      `UPDATE contents SET cover_image_id = ?, image_query = ?, updated_at = ? WHERE id = ?`,
    ).run(first?.image_id || imageId, query || '', ts, contentId)

    const row = db.prepare('SELECT * FROM images WHERE id = ?').get(imageId) as ImageRow
    const images = db
      .prepare(
        `SELECT i.* FROM content_images ci
         JOIN images i ON i.id = ci.image_id
         WHERE ci.content_id = ?
         ORDER BY ci.sort_order ASC`,
      )
      .all(contentId) as ImageRow[]

    return {
      image: mapImage(row),
      images: images.map(mapImage),
    }
  })

  app.delete<{ Params: { contentId: string; imageId: string } }>(
    '/api/images/content/:contentId/:imageId',
    async (req, reply) => {
      const { contentId, imageId } = req.params
      db.prepare(`DELETE FROM content_images WHERE content_id = ? AND image_id = ?`).run(
        contentId,
        imageId,
      )

      const first = db
        .prepare(
          `SELECT image_id FROM content_images WHERE content_id = ? ORDER BY sort_order ASC LIMIT 1`,
        )
        .get(contentId) as { image_id: string } | undefined

      db.prepare(
        `UPDATE contents SET cover_image_id = ?, updated_at = ? WHERE id = ?`,
      ).run(first?.image_id || null, new Date().toISOString(), contentId)

      const images = db
        .prepare(
          `SELECT i.* FROM content_images ci
           JOIN images i ON i.id = ci.image_id
           WHERE ci.content_id = ?
           ORDER BY ci.sort_order ASC`,
        )
        .all(contentId) as ImageRow[]

      return { ok: true, images: images.map(mapImage) }
    },
  )

  app.delete<{ Params: { contentId: string } }>(
    '/api/images/content/:contentId',
    async (req, reply) => {
      const result = db
        .prepare(`DELETE FROM content_images WHERE content_id = ?`)
        .run(req.params.contentId)
      db.prepare(
        `UPDATE contents SET cover_image_id = NULL, updated_at = ? WHERE id = ?`,
      ).run(new Date().toISOString(), req.params.contentId)
      if (result.changes === 0) {
        // 兼容旧数据仅清封面
        const cleared = db
          .prepare(`UPDATE contents SET cover_image_id = NULL, updated_at = ? WHERE id = ?`)
          .run(new Date().toISOString(), req.params.contentId)
        if (cleared.changes === 0) return reply.code(404).send({ error: '内容不存在' })
      }
      return { ok: true, images: [] }
    },
  )

  app.get<{ Params: { id: string } }>('/api/images/:id', async (req, reply) => {
    const row = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id) as
      | ImageRow
      | undefined
    if (!row) return reply.code(404).send({ error: '图片不存在' })
    return mapImage(row)
  })

  app.get<{ Params: { id: string } }>('/api/images/:id/file', async (req, reply) => {
    const row = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id) as
      | ImageRow
      | undefined
    if (!row?.local_path || !fs.existsSync(row.local_path)) {
      if (row?.preview_url) return reply.redirect(row.preview_url)
      return reply.code(404).send({ error: '本地图片不存在' })
    }
    return reply.type(mimeOf(row.local_path)).send(fs.createReadStream(row.local_path))
  })

  app.get<{ Params: { id: string }; Querystring: { name?: string } }>(
    '/api/images/:id/download',
    async (req, reply) => {
      const row = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id) as
        | ImageRow
        | undefined
      if (!row) return reply.code(404).send({ error: '图片不存在' })

      const safeName = String(req.query.name || `image-${row.id}`)
        .replace(/[\\/:*?"<>|]+/g, '_')
        .slice(0, 80)

      if (row.local_path && fs.existsSync(row.local_path)) {
        const ext = path.extname(row.local_path) || '.jpg'
        const filename = safeName.endsWith(ext) ? safeName : `${safeName}${ext}`
        return reply
          .header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
          .type(mimeOf(row.local_path))
          .send(fs.createReadStream(row.local_path))
      }

      const remote = row.download_url || row.preview_url
      if (!remote) return reply.code(404).send({ error: '无可下载地址' })

      const upstream = await fetch(remote)
      if (!upstream.ok) {
        return reply.code(502).send({ error: '远程图片下载失败' })
      }
      const contentType = upstream.headers.get('content-type') || 'image/jpeg'
      const ext =
        contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg'
      const filename = safeName.endsWith(ext) ? safeName : `${safeName}${ext}`
      const buffer = Buffer.from(await upstream.arrayBuffer())
      return reply
        .header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
        .type(contentType)
        .send(buffer)
    },
  )
}

function mimeOf(filePath: string): string {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}
