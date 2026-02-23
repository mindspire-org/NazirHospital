import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDB } from '../config/db'
import { AestheticUser } from '../modules/aesthetic/models/User'

async function main() {
  await connectDB()
  const existing = await AestheticUser.findOne({ username: 'admin' }).lean()
  if (existing) {
    console.log('Aesthetic admin user already exists')
  } else {
    const passwordHash = await bcrypt.hash('123', 10)
    await AestheticUser.create({ username: 'admin', role: 'admin', passwordHash })
    console.log('Aesthetic admin user created (username: admin, password: 123)')
  }
}

main()
  .catch(err => {
    console.error('Seed failed', err)
    process.exitCode = 1
  })
  .finally(async () => {
    try { await mongoose.disconnect() } catch {}
  })
