import { createApp } from './app.js'
import { env } from './config/index.js'

const app = createApp()
const port = env.PORT

const server = app.listen(port, () => {
  console.log(`🚀 Vaultory backend running on http://localhost:${port} (${env.NODE_ENV})`)
})

// Graceful shutdown for Render / local Ctrl+C.
function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down...`)
  server.close(() => {
    console.log('Server closed.')
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
