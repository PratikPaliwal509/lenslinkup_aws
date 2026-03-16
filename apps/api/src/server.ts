import 'dotenv/config'
import { buildApp } from './app.js'

const PORT = Number(process.env.PORT ?? 4000)
const HOST = '0.0.0.0'

async function start() {
  const app = await buildApp()

  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`\n🚀 LensLinkUp API running on http://35.154.114.186:${PORT}`)
    console.log(`📋 Health: http://35.154.114.186:${PORT}/health\n`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
