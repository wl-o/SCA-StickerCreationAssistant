import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

interface PersonaRow {
  id: string
  name: string
  identity: string
  age: string
  occupation: string
  life_background: string
  family_background: string
  personality: string
  language_style: string
  values_text: string
  good_at_topics: string
  bad_at_topics: string
  forbidden_expressions: string
  common_words: string
  banned_words: string
  is_default: number
  created_at: string
  updated_at: string
}

function mapPersona(row: PersonaRow) {
  return {
    id: row.id,
    name: row.name,
    identity: row.identity,
    age: row.age,
    occupation: row.occupation,
    lifeBackground: row.life_background,
    familyBackground: row.family_background,
    personality: row.personality,
    languageStyle: row.language_style,
    values: row.values_text,
    goodAtTopics: row.good_at_topics,
    badAtTopics: row.bad_at_topics,
    forbiddenExpressions: row.forbidden_expressions,
    commonWords: row.common_words,
    bannedWords: row.banned_words,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function personaRoutes(app: FastifyInstance) {
  app.get('/api/personas', async () => {
    const rows = db
      .prepare('SELECT * FROM personas ORDER BY is_default DESC, updated_at DESC')
      .all() as PersonaRow[]
    return rows.map(mapPersona)
  })

  app.get<{ Params: { id: string } }>('/api/personas/:id', async (req, reply) => {
    const row = db.prepare('SELECT * FROM personas WHERE id = ?').get(req.params.id) as
      | PersonaRow
      | undefined
    if (!row) return reply.code(404).send({ error: '人设不存在' })
    return mapPersona(row)
  })

  app.post<{ Body: Record<string, unknown> }>('/api/personas', async (req) => {
    const body = req.body
    const id = String(body.id || `persona-${Date.now()}`)
    const ts = new Date().toISOString()

    db.prepare(
      `INSERT INTO personas (
        id, name, identity, age, occupation, life_background, family_background,
        personality, language_style, values_text, good_at_topics, bad_at_topics,
        forbidden_expressions, common_words, banned_words, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      String(body.name || '新人设'),
      String(body.identity || ''),
      String(body.age || ''),
      String(body.occupation || ''),
      String(body.lifeBackground || ''),
      String(body.familyBackground || ''),
      String(body.personality || ''),
      String(body.languageStyle || ''),
      String(body.values || ''),
      String(body.goodAtTopics || ''),
      String(body.badAtTopics || ''),
      String(body.forbiddenExpressions || ''),
      String(body.commonWords || ''),
      String(body.bannedWords || ''),
      body.isDefault ? 1 : 0,
      ts,
      ts,
    )

    const row = db.prepare('SELECT * FROM personas WHERE id = ?').get(id) as PersonaRow
    return mapPersona(row)
  })

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/api/personas/:id',
    async (req, reply) => {
      const existing = db.prepare('SELECT id FROM personas WHERE id = ?').get(req.params.id)
      if (!existing) return reply.code(404).send({ error: '人设不存在' })

      const body = req.body
      const ts = new Date().toISOString()
      db.prepare(
        `UPDATE personas SET
          name = ?, identity = ?, age = ?, occupation = ?,
          life_background = ?, family_background = ?, personality = ?,
          language_style = ?, values_text = ?, good_at_topics = ?, bad_at_topics = ?,
          forbidden_expressions = ?, common_words = ?, banned_words = ?,
          is_default = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        String(body.name || ''),
        String(body.identity || ''),
        String(body.age || ''),
        String(body.occupation || ''),
        String(body.lifeBackground || ''),
        String(body.familyBackground || ''),
        String(body.personality || ''),
        String(body.languageStyle || ''),
        String(body.values || ''),
        String(body.goodAtTopics || ''),
        String(body.badAtTopics || ''),
        String(body.forbiddenExpressions || ''),
        String(body.commonWords || ''),
        String(body.bannedWords || ''),
        body.isDefault ? 1 : 0,
        ts,
        req.params.id,
      )

      const row = db.prepare('SELECT * FROM personas WHERE id = ?').get(req.params.id) as PersonaRow
      return mapPersona(row)
    },
  )

  app.delete<{ Params: { id: string } }>('/api/personas/:id', async (req, reply) => {
    const count = db.prepare('SELECT COUNT(*) as c FROM personas').get() as { c: number }
    if (count.c <= 1) {
      return reply.code(400).send({ error: '至少保留一个人设' })
    }
    const result = db.prepare('DELETE FROM personas WHERE id = ?').run(req.params.id)
    if (result.changes === 0) return reply.code(404).send({ error: '人设不存在' })
    return { ok: true }
  })
}
