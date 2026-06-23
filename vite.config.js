import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-only: serve the Vercel-style functions in api/*.js in-process so
// `npm run dev` exposes /api/* without `vercel dev`. `vercel dev` runs each
// function as a spawned Node child process, and tearing those down trips a
// libuv abort (Assertion ... src\win\async.c) on Windows. Running the handlers
// in Vite's own process removes the child processes entirely. The handlers are
// imported untouched, so production Vercel deploys are unaffected.
function apiDevServer(env) {
  return {
    name: 'api-dev-server',
    apply: 'serve',
    configureServer(server) {
      // Vercel injects env from its dashboard / .env files at runtime; replicate
      // that by merging the loaded env into process.env so the handlers'
      // process.env.SPOTIFY_* reads resolve in dev.
      Object.assign(process.env, env)

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        const url = new URL(req.url, 'http://localhost')
        const name = url.pathname.replace(/^\/api\//, '').replace(/\.js$/, '')
        if (!/^[a-z0-9_-]+$/i.test(name)) return next()

        try {
          // ssrLoadModule picks up edits to the handler without a restart.
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          const handler = mod.default
          if (typeof handler !== 'function') return next()

          // Adapt Node's req/res to the Express-ish shape the Vercel handlers
          // expect (req.query, res.status().json()).
          req.query = Object.fromEntries(url.searchParams)
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (obj) => {
            if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(obj))
            return res
          }

          await handler(req, res)
        } catch (err) {
          server.config.logger.error(`[api] ${name} failed: ${err?.stack || err?.message || err}`)
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
