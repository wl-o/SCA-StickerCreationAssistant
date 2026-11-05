import { db } from '../db.js'

export function getSetting<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  if (!row) return fallback
  try {
    return JSON.parse(row.value) as T
  } catch {
    return fallback
  }
}

export function setSetting(key: string, value: unknown) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, JSON.stringify(value), new Date().toISOString())
}

export interface ImageSettings {
  provider: 'unsplash' | 'pexels' | 'pixabay'
  unsplashApplicationId: string
  unsplashAccessKey: string
  unsplashSecretKey: string
  pexelsApiKey: string
  pixabayApiKey: string
}

const defaultImageSettings = (): ImageSettings => ({
  provider: 'unsplash',
  unsplashApplicationId: '',
  unsplashAccessKey: '',
  unsplashSecretKey: '',
  pexelsApiKey: '',
  pixabayApiKey: '',
})

export function getImageSettings(): ImageSettings {
  return { ...defaultImageSettings(), ...getSetting<Partial<ImageSettings>>('image', {}) }
}
