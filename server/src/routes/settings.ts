import type { FastifyInstance } from 'fastify'
import { getSetting, setSetting } from '../utils/settingsStore.js'

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/api/settings/ai', async () => {
    return getSetting('ai', {
      provider: 'deepseek',
      apiKey: '',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      temperature: 0.8,
      maxTokens: 2000,
    })
  })

  app.put<{ Body: Record<string, unknown> }>('/api/settings/ai', async (req) => {
    const current = getSetting('ai', {})
    const next = { ...current, ...req.body }
    setSetting('ai', next)
    return next
  })

  app.get('/api/settings/image', async () => {
    return {
      provider: 'unsplash',
      unsplashApplicationId: '',
      unsplashAccessKey: '',
      unsplashSecretKey: '',
      pexelsApiKey: '',
      pixabayApiKey: '',
      ...getSetting('image', {}),
    }
  })

  app.put<{ Body: Record<string, unknown> }>('/api/settings/image', async (req) => {
    const current = {
      provider: 'unsplash',
      unsplashApplicationId: '',
      unsplashAccessKey: '',
      unsplashSecretKey: '',
      pexelsApiKey: '',
      pixabayApiKey: '',
      ...getSetting('image', {}),
    }
    const next = { ...current, ...req.body }
    setSetting('image', next)
    return next
  })

  app.get('/api/settings/active-persona', async () => {
    return { id: getSetting('activePersonaId', 'persona-default') }
  })

  app.put<{ Body: { id: string } }>('/api/settings/active-persona', async (req) => {
    setSetting('activePersonaId', req.body.id)
    return { id: req.body.id }
  })
}
