import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { ApiRequest, ApiResponse } from './api/_types'

// Dev-only: serve the Vercel-style functions in api/*.ts in-process so
// `npm run dev` exposes /api/* without `vercel dev`. `vercel dev` runs each
// function as a spawned Node child process, and tearing those down trips a
// libuv abort (Assertion ... src\win\async.c) on Windows. Running the handlers
// in Vite's own process removes the child processes entirely. The handlers are
// imported untouched, so production Vercel deploys are unaffected.
function apiDevServer(env: Record<string, string>): Plugin {
  return {
    name: 'api-dev-server',
    apply: 'serve',
    configureServer(server) {
      // Vercel injects env from its dashboard / .env files at runtime; replicate
      // that by merging the loaded env into process.env so the handlers'
      // process.env.SPOTIFY_* reads resolve in dev.
      Object.assign(process.env, env)

      server.middlewares.use(async (rawReq, rawRes, next) => {
        if (!rawReq.url || !rawReq.url.startsWith('/api/')) return next()
        const url = new URL(rawReq.url, 'http://localhost')
        const name = url.pathname.replace(/^\/api\//, '').replace(/\.(js|ts)$/, '')
        if (!/^[a-z0-9_-]+$/i.test(name)) return next()

        const req = rawReq as ApiRequest
        const res = rawRes as ApiResponse

        try {
          // ssrLoadModule picks up edits to the handler without a restart.
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const handler = mod.default as
            | ((req: ApiRequest, res: ApiResponse) => Promise<unknown>)
            | undefined
          if (typeof handler !== 'function') return next()

          // Adapt Node's req/res to the Express-ish shape the Vercel handlers
          // expect (req.query, res.status().json()).
          req.query = Object.fromEntries(url.searchParams)
          res.status = (code: number) => { res.statusCode = code; return res }
          res.json = (obj: unknown) => {
            if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(obj))
            return res
          }

          await handler(req, res)
        } catch (err) {
          const e = err as Error
          server.config.logger.error(`[api] ${name} failed: ${e?.stack || e?.message || err}`)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'dev api handler error' }))
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' prefix → load every key (incl. unprefixed server secrets like
  // SPOTIFY_CLIENT_SECRET) from .env / .env.local for the dev API middleware.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), apiDevServer(env)],
  }
})
