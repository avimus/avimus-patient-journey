import { serve } from '@hono/node-server'
import { app } from './index'

const port = 3001
console.log(`API server starting on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
