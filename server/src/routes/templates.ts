import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

interface TemplateRow {
  id: string
  name: string
  description: string
  structure_json: string
  is_builtin: number
  created_at: string
  updated_at: string
}

function mapTemplate(row: TemplateRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    structure: JSON.parse(row.structure_json) as string[],
    isBuiltin: Boolean(row.is_builtin),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function templateRoutes(app: FastifyInstance) {
  app.get('/api/templates', async () => {
    const rows = db
      .prepare('SELECT * FROM templates ORDER BY is_builtin DESC, updated_at DESC')
      .all() as TemplateRow[]
    return rows.map(mapTemplate)
  })

  app.post<{ Body: Record<string, unknown> }>('/api/templates', async (req) => {
    const body = req.body
    const id = String(body.id || `tpl-${Date.now()}`)
    const ts = new Date().toISOString()
    const structure = Array.isArray(body.structure) ? body.structure : []

    db.prepare(
      `INSERT INTO templates (id, name, description, structure_json, is_builtin, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
    ).run(
      id,
      String(body.name || '自定义模板'),
      String(body.description || ''),
      JSON.stringify(structure),
      ts,
      ts,
    )

    const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as TemplateRow
    return mapTemplate(row)
  })

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/api/templates/:id',
    async (req, reply) => {
      const existing = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as
        | TemplateRow
        | undefined
      if (!existing) return reply.code(404).send({ error: '模板不存在' })

      const body = req.body
      const structure = Array.isArray(body.structure)
        ? body.structure
        : JSON.parse(existing.structure_json)
      const ts = new Date().toISOString()

      db.prepare(
        `UPDATE templates SET name = ?, description = ?, structure_json = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        String(body.name ?? existing.name),
        String(body.description ?? existing.description),
        JSON.stringify(structure),
        ts,
        req.params.id,
      )

      const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id) as TemplateRow
      return mapTemplate(row)
    },
  )

  app.delete<{ Params: { id: string } }>('/api/templates/:id', async (req, reply) => {
    const existing = db.prepare('SELECT is_builtin FROM templates WHERE id = ?').get(
      req.params.id,
    ) as { is_builtin: number } | undefined
    if (!existing) return reply.code(404).send({ error: '模板不存在' })
    if (existing.is_builtin) return reply.code(400).send({ error: '内置模板不可删除' })

    db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id)
    return { ok: true }
  })
}
