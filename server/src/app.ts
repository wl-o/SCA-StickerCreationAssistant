import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import fs from 'node:fs'
import path from 'node:path'
import { initDatabase } from './db.js'
import { seedIfEmpty } from './seed.js'
import { settingsRoutes } from './routes/settings.js'
import { personaRoutes } from './routes/personas.js'
import { templateRoutes } from './routes/templates.js'
import { contentRoutes } from './routes/contents.js'
import { imageRoutes } from './routes/images.js'

export interface StartServerOptions {
  port?: number
  host?: string
  staticDir?: string
  logger?: boolean
}

export interface StartedServer {
  port: number
  close: () => Promise<void>
}

async function registerAiProxy(app: Awaited<ReturnType<typeof Fastify>>) {
  const forward = async (
    request: { method: string; url: string; headers: Record<string, unknown>; body: unknown },
    reply: {
      status: (code: number) => { send: (body: string) => unknown }
      header: (k: string, v: string) => unknown
      type: (t: string) => unknown
    },
    upstream: string,
    stripPrefix: string,
  ) => {
    const incoming = (request.url || '/').split('?')[0]
    const suffix = incoming.startsWith(stripPrefix) ? incoming.slice(stripPrefix.length) : incoming
    const target = `${upstream.replace(/\/+$/, '')}${suffix.startsWith('/') ? suffix : `/${suffix}`}`

    // 只转发必要头。绝不能带 Accept-Encoding：否则上游可能返回 gzip，
    // Node fetch 不解压时正文会变成乱码，前端 JSON.parse 报 Unexpected token。
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }
    const authorization = request.headers.authorization
    if (typeof authorization === 'string' && authorization.trim()) {
      headers.Authorization = authorization
    }
    const contentType = request.headers['content-type']
    if (typeof contentType === 'string' && contentType.trim()) {
      headers['Content-Type'] = contentType
    } else {
      headers['Content-Type'] = 'application/json'
    }

    const init: RequestInit = { method: request.method, headers }
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body !== undefined) {
      init.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
    }

    const response = await fetch(target, init)
    const text = await response.text()
    // 明确按纯文本返回，避免 Fastify 再序列化，也不带 content-encoding
    reply.type(response.headers.get('content-type') || 'application/json; charset=utf-8')
    return reply.status(response.status).send(text)
  }

  app.all('/ai-proxy/deepseek/*', async (request, reply) =>
    forward(
      request as unknown as {
        method: string
        url: string
        headers: Record<string, unknown>
        body: unknown
      },
      reply as unknown as {
        status: (code: number) => { send: (body: string) => unknown }
        header: (k: string, v: string) => unknown
        type: (t: string) => unknown
      },
      'https://api.deepseek.com',
      '/ai-proxy/deepseek',
    ),
  )
  app.all('/ai-proxy/openai/*', async (request, reply) =>
    forward(
      request as unknown as {
        method: string
        url: string
        headers: Record<string, unknown>
        body: unknown
      },
      reply as unknown as {
        status: (code: number) => { send: (body: string) => unknown }
        header: (k: string, v: string) => unknown
        type: (t: string) => unknown
      },
      'https://api.openai.com',
      '/ai-proxy/openai',
    ),
  )
}

export async function startServer(options: StartServerOptions = {}): Promise<StartedServer> {
  initDatabase()
  seedIfEmpty()

  const app = Fastify({ logger: options.logger ?? true })
  await app.register(cors, { origin: true })

  app.get('/api/health', async () => ({ ok: true }))

  await registerAiProxy(app)
  await app.register(settingsRoutes)
  await app.register(personaRoutes)
  await app.register(templateRoutes)
  await app.register(contentRoutes)
  await app.register(imageRoutes)

  const staticDir = options.staticDir || process.env.STATIC_DIR
  if (staticDir && fs.existsSync(staticDir)) {
    await app.register(fastifyStatic, {
      root: path.resolve(staticDir),
      wildcard: false,
    })
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api') && !request.url.startsWith('/ai-proxy')) {
        return reply.sendFile('index.html')
      }
      return reply.status(404).send({ error: 'Not Found' })
    })
  }

  const host = options.host || '127.0.0.1'
  const port = options.port ?? Number(process.env.PORT || 8787)
  await app.listen({ port, host })

  const address = app.server.address()
  const resolvedPort =
    typeof address === 'object' && address && 'port' in address ? address.port : port

  console.log(`SQLite API ready at http://${host}:${resolvedPort}`)

  return {
    port: resolvedPort,
    close: async () => {
      await app.close()
    },
  }
}
