import * as esbuild from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

await esbuild.build({
  entryPoints: [path.join(projectRoot, 'server/src/app.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.join(projectRoot, 'dist-server/server.cjs'),
  external: ['better-sqlite3'],
  target: 'node20',
  logLevel: 'info',
})

console.log('server bundle -> dist-server/server.cjs')
