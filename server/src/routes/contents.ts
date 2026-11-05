import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

interface ContentRow {
  id: string
  title: string
  content: string
  keyword: string
  directions_json: string
  styles_json: string
  topic_angle: string
  discussion_hooks_json: string
  score_json: string
  persona_id: string | null
  template_id: string | null
  favorite: number
  status: string
  error_message: string | null
  created_at: string
  updated_at: string
  cover_image_id?: string | null
  image_query?: string | null
}

interface ImageRow {
  id: string
  provider: string
  photographer: string
  attribution: string
  source_page_url: string
  local_path: string | null
  preview_url: string
  thumb_url: string
}

function mapImageRow(row: ImageRow) {
  return {
    id: row.id,
    provider: row.provider,
    photographer: row.photographer,
    attribution: row.attribution,
    sourcePageUrl: row.source_page_url,
    previewUrl: row.local_path ? `/api/images/${row.id}/file` : row.preview_url,
    thumbUrl: row.local_path ? `/api/images/${row.id}/file` : row.thumb_url,
  }
}

function listContentImages(contentId: string) {
  const rows = db
    .prepare(
      `SELECT i.* FROM content_images ci
       JOIN images i ON i.id = ci.image_id
       WHERE ci.content_id = ?
       ORDER BY ci.sort_order ASC, ci.created_at ASC`,
    )
    .all(contentId) as ImageRow[]
  return rows.map(mapImageRow)
}

function mapContent(row: ContentRow) {
  const images = listContentImages(row.id)
  let cover = images[0]
  if (!cover && row.cover_image_id) {
    const legacy = db.prepare('SELECT * FROM images WHERE id = ?').get(row.cover_image_id) as
      | ImageRow
      | undefined
    if (legacy) cover = mapImageRow(legacy)
  }

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    keyword: row.keyword,
    directions: JSON.parse(row.directions_json),
    styles: JSON.parse(row.styles_json),
    topicAngle: row.topic_angle,
    discussionHooks: JSON.parse(row.discussion_hooks_json),
    score: JSON.parse(row.score_json),
    personaId: row.persona_id || undefined,
    templateId: row.template_id || undefined,
    favorite: Boolean(row.favorite),
    status: row.status,
    errorMessage: row.error_message || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    coverImageId: cover?.id || row.cover_image_id || undefined,
    imageQuery: row.image_query || undefined,
    coverImage: cover,
    images,
  }
}

function upsertContent(body: Record<string, unknown>) {
  const id = String(body.id)
  const ts = new Date().toISOString()
  const createdAt = String(body.createdAt || ts)
  const updatedAt = String(body.updatedAt || ts)
  const existing = db.prepare('SELECT cover_image_id, image_query FROM contents WHERE id = ?').get(
    id,
  ) as { cover_image_id: string | null; image_query: string | null } | undefined

  const coverImageId =
    body.coverImageId === null
      ? null
      : body.coverImageId
        ? String(body.coverImageId)
        : (existing?.cover_image_id ?? null)
  const imageQuery =
    body.imageQuery !== undefined
      ? String(body.imageQuery || '')
      : (existing?.image_query ?? '')

  db.prepare(
    `INSERT INTO contents (
      id, title, content, keyword, directions_json, styles_json, topic_angle,
      discussion_hooks_json, score_json, persona_id, template_id, favorite,
      status, error_message, created_at, updated_at, cover_image_id, image_query
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      keyword = excluded.keyword,
      directions_json = excluded.directions_json,
      styles_json = excluded.styles_json,
      topic_angle = excluded.topic_angle,
      discussion_hooks_json = excluded.discussion_hooks_json,
      score_json = excluded.score_json,
      persona_id = excluded.persona_id,
      template_id = excluded.template_id,
      favorite = excluded.favorite,
      status = excluded.status,
      error_message = excluded.error_message,
      updated_at = excluded.updated_at,
      cover_image_id = excluded.cover_image_id,
      image_query = excluded.image_query`,
  ).run(
    id,
    String(body.title || ''),
    String(body.content || ''),
    String(body.keyword || ''),
    JSON.stringify(body.directions || []),
    JSON.stringify(body.styles || []),
    String(body.topicAngle || ''),
    JSON.stringify(body.discussionHooks || []),
    JSON.stringify(
      body.score || {
        title: 0,
        emotion: 0,
        completeness: 0,
        originality: 0,
        authenticity: 0,
        opinion: 0,
        discussion: 0,
        total: 0,
      },
    ),
    body.personaId ? String(body.personaId) : null,
    body.templateId ? String(body.templateId) : null,
    body.favorite ? 1 : 0,
    String(body.status || 'completed'),
    body.errorMessage ? String(body.errorMessage) : null,
    createdAt,
    updatedAt,
    coverImageId,
    imageQuery,
  )

  return db.prepare('SELECT * FROM contents WHERE id = ?').get(id) as ContentRow
}

export async function contentRoutes(app: FastifyInstance) {
  app.get('/api/contents', async (req) => {
    const query = req.query as { q?: string; filter?: string }
    let rows = db
      .prepare('SELECT * FROM contents ORDER BY created_at DESC')
      .all() as ContentRow[]

    if (query.filter === 'favorite') {
      rows = rows.filter((item) => item.favorite === 1)
    } else if (query.filter === 'recent') {
      rows = rows.slice(0, 20)
    }

    if (query.q?.trim()) {
      const q = query.q.trim().toLowerCase()
      rows = rows.filter((item) => {
        const directions = JSON.parse(item.directions_json) as string[]
        return (
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.keyword.toLowerCase().includes(q) ||
          item.topic_angle.toLowerCase().includes(q) ||
          directions.some((d) => d.toLowerCase().includes(q))
        )
      })
    }

    return rows.map(mapContent)
  })

  app.post<{ Body: Record<string, unknown> }>('/api/contents', async (req) => {
    return mapContent(upsertContent(req.body))
  })

  app.post<{ Body: { items: Record<string, unknown>[] } }>('/api/contents/batch', async (req) => {
    const items = Array.isArray(req.body.items) ? req.body.items : []
    const result = db.transaction(() => items.map((item) => mapContent(upsertContent(item))))()
    return result
  })

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/api/contents/:id',
    async (req, reply) => {
      const existing = db.prepare('SELECT * FROM contents WHERE id = ?').get(req.params.id) as
        | ContentRow
        | undefined
      if (!existing) return reply.code(404).send({ error: '内容不存在' })

      const merged = {
        ...mapContent(existing),
        ...req.body,
        id: req.params.id,
        updatedAt: new Date().toISOString(),
      }
      return mapContent(upsertContent(merged))
    },
  )

  app.delete<{ Params: { id: string } }>('/api/contents/:id', async (req, reply) => {
    const result = db.prepare('DELETE FROM contents WHERE id = ?').run(req.params.id)
    if (result.changes === 0) return reply.code(404).send({ error: '内容不存在' })
    return { ok: true }
  })
}
