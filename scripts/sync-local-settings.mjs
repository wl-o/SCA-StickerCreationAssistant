/**
 * 将本机已有 AI/图库配置同步到桌面版 userData。
 * 仅本地执行，不会打印完整密钥，也不应提交产生的任何密钥文件。
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

function mask(v) {
  if (!v || typeof v !== 'string') return '(empty)'
  if (v.length <= 8) return '*'.repeat(v.length)
  return `${v.slice(0, 4)}...${v.slice(-4)} len=${v.length}`
}

function readSettings(dbPath) {
  if (!fs.existsSync(dbPath)) return null
  const db = new Database(dbPath, { readonly: true })
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    return {
      path: dbPath,
      ai: map.ai ? JSON.parse(map.ai) : null,
      image: map.image ? JSON.parse(map.image) : null,
    }
  } finally {
    db.close()
  }
}

function upsert(dbPath, key, value) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new Database(dbPath)
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`)
    db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).run(key, JSON.stringify(value), new Date().toISOString())
  } finally {
    db.close()
  }
}

const candidates = [
  path.resolve('data/app.sqlite'),
  path.join(process.env.APPDATA || '', 'ai-sticker-creator/data/app.sqlite'),
]

const sources = candidates.map(readSettings).filter(Boolean)
for (const s of sources) {
  console.log('SOURCE', s.path)
  if (s.ai) {
    console.log(
      ' ai',
      s.ai.provider,
      s.ai.model,
      'key=',
      mask(s.ai.apiKey),
      'base=',
      s.ai.baseUrl,
    )
  } else console.log(' ai=(none)')
  if (s.image) {
    console.log(
      ' image',
      s.image.provider,
      'appId=',
      mask(String(s.image.unsplashApplicationId || '')),
      'access=',
      mask(s.image.unsplashAccessKey || ''),
      'secret=',
      mask(s.image.unsplashSecretKey || ''),
    )
  } else console.log(' image=(none)')
}

const withAi = sources.find((s) => s.ai?.apiKey?.trim()) || sources[0]
const withImage =
  sources.find((s) =>
    Boolean(
      (s.image?.unsplashAccessKey || s.image?.pexelsApiKey || s.image?.pixabayApiKey || '').trim(),
    ),
  ) || withAi

if (!withAi?.ai?.apiKey?.trim()) {
  console.error('NO_AI_KEY_FOUND')
  process.exit(1)
}

const legacyModels = new Set(['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-flash'])
const ai = {
  ...withAi.ai,
  model: legacyModels.has(String(withAi.ai.model || '').toLowerCase())
    ? 'deepseek-flash'
    : withAi.ai.model,
}

const image = withImage?.image || {
  provider: 'unsplash',
  unsplashApplicationId: '',
  unsplashAccessKey: '',
  unsplashSecretKey: '',
  pexelsApiKey: '',
  pixabayApiKey: '',
}

const target = path.join(process.env.APPDATA || '', 'ai-sticker-creator/data/app.sqlite')
upsert(target, 'ai', ai)
upsert(target, 'image', image)

const verify = readSettings(target)
console.log('WRITTEN_TO', target)
console.log('VERIFY ai key=', mask(verify?.ai?.apiKey || ''), 'model=', verify?.ai?.model)
console.log(
  'VERIFY image access=',
  mask(verify?.image?.unsplashAccessKey || ''),
  'appId=',
  mask(String(verify?.image?.unsplashApplicationId || '')),
)
