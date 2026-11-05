import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

/** Electron 通过 DATA_DIR 注入；否则用项目 cwd/data（与现有开发一致） */
export const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data')

export const imagesDir = path.join(dataDir, 'images')
const dbPath = path.join(dataDir, 'app.sqlite')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true })
}

export const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function ensureColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!cols.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      identity TEXT NOT NULL DEFAULT '',
      age TEXT NOT NULL DEFAULT '',
      occupation TEXT NOT NULL DEFAULT '',
      life_background TEXT NOT NULL DEFAULT '',
      family_background TEXT NOT NULL DEFAULT '',
      personality TEXT NOT NULL DEFAULT '',
      language_style TEXT NOT NULL DEFAULT '',
      values_text TEXT NOT NULL DEFAULT '',
      good_at_topics TEXT NOT NULL DEFAULT '',
      bad_at_topics TEXT NOT NULL DEFAULT '',
      forbidden_expressions TEXT NOT NULL DEFAULT '',
      common_words TEXT NOT NULL DEFAULT '',
      banned_words TEXT NOT NULL DEFAULT '',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      structure_json TEXT NOT NULL,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      keyword TEXT NOT NULL DEFAULT '',
      directions_json TEXT NOT NULL,
      styles_json TEXT NOT NULL,
      topic_angle TEXT NOT NULL DEFAULT '',
      discussion_hooks_json TEXT NOT NULL,
      score_json TEXT NOT NULL,
      persona_id TEXT,
      template_id TEXT,
      favorite INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      query TEXT NOT NULL DEFAULT '',
      thumb_url TEXT NOT NULL DEFAULT '',
      preview_url TEXT NOT NULL DEFAULT '',
      download_url TEXT NOT NULL DEFAULT '',
      local_path TEXT,
      width INTEGER,
      height INTEGER,
      photographer TEXT NOT NULL DEFAULT '',
      photographer_url TEXT NOT NULL DEFAULT '',
      source_page_url TEXT NOT NULL DEFAULT '',
      license TEXT NOT NULL DEFAULT '',
      attribution TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(provider, provider_id)
    );

    CREATE TABLE IF NOT EXISTS content_images (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      image_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      query TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(content_id, image_id)
    );

    CREATE INDEX IF NOT EXISTS idx_contents_created_at ON contents(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_contents_favorite ON contents(favorite);
    CREATE INDEX IF NOT EXISTS idx_content_images_content ON content_images(content_id, sort_order);
  `)

  ensureColumn('contents', 'cover_image_id', 'TEXT')
  ensureColumn('contents', 'image_query', "TEXT NOT NULL DEFAULT ''")

  // 把旧的单张封面迁移进多图表
  const legacy = db
    .prepare(
      `SELECT id, cover_image_id, image_query FROM contents
       WHERE cover_image_id IS NOT NULL AND cover_image_id != ''`,
    )
    .all() as Array<{ id: string; cover_image_id: string; image_query: string }>

  const insertLink = db.prepare(
    `INSERT OR IGNORE INTO content_images (id, content_id, image_id, sort_order, query, created_at)
     VALUES (?, ?, ?, 0, ?, ?)`,
  )
  const ts = new Date().toISOString()
  for (const row of legacy) {
    const exists = db
      .prepare(`SELECT 1 FROM content_images WHERE content_id = ? AND image_id = ?`)
      .get(row.id, row.cover_image_id)
    if (!exists) {
      insertLink.run(
        `cimg-${row.id}-${row.cover_image_id}`,
        row.id,
        row.cover_image_id,
        row.image_query || '',
        ts,
      )
    }
  }
}
