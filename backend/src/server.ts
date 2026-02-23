import app from './app'
import { connectDB } from './config/db'
import { env } from './config/env'
import { Dispense } from './modules/pharmacy/models/Dispense'
import { ensureDefaultPortalLogins } from './seeds/default_logins'
import { startBiometricPoller } from './modules/biometric/jobs/poller'

async function main(){
  await connectDB()
  await Dispense.init()
  try {
    // Ensure the sales collection exists
    await Dispense.createCollection()
  } catch {}
  await ensureDefaultPortalLogins()
  // Biometric sync should be manual-only (triggered by the UI button), not automatic.
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`)
  })
}

main().catch(err => {
  console.error('Failed to start server', err)
  process.exit(1)
})
