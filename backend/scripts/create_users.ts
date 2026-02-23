/**
 * Create Module Admin Users Script
 * 
 * Creates 5 dedicated admin users (one per module) with full admin access.
 * Idempotent - won't duplicate existing users.
 * 
 * Usage:
 *   npx ts-node scripts/create_users.ts
 *   npm run create:users
 * 
 * Environment:
 *   Requires MONGO_URI to be set in .env or environment
 */

import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

// Load env from backend root
const envPath = path.resolve(__dirname, '../.env')
dotenv.config({ path: envPath })

// Import all User models
import { HospitalUser } from '../src/modules/hospital/models/User'
import { FinanceUser } from '../src/modules/hospital/models/finance_User'
import { LabUser } from '../src/modules/lab/models/User'
import { PharmacyUser } from '../src/modules/pharmacy/models/User'
import { ReceptionUser } from '../src/modules/reception/models/User'
import { AestheticUser } from '../src/modules/aesthetic/models/User'
import { DiagnosticUser } from '../src/modules/diagnostic/models/User'

interface ModuleUserConfig {
  module: string
  username: string
  password: string
  role: string
  model: mongoose.Model<any>
  extraFields?: Record<string, any>
}

const MODULE_USERS: ModuleUserConfig[] = [
  {
    module: 'Hospital',
    username: 'hospital_admin',
    password: '321',
    role: 'admin',
    model: HospitalUser,
    extraFields: { active: true }
  },
  {
    module: 'Lab',
    username: 'lab_admin',
    password: '321',
    role: 'admin',
    model: LabUser
  },
  {
    module: 'Pharmacy',
    username: 'pharmacy_admin',
    password: '321',
    role: 'admin',
    model: PharmacyUser
  },
  {
    module: 'Finance',
    username: 'finance_admin',
    password: '321',
    role: 'admin',
    model: FinanceUser
  },
  {
    module: 'Reception',
    username: 'reception_admin',
    password: '321',
    role: 'admin',
    model: ReceptionUser
  },
  {
    module: 'Aesthetic',
    username: 'aesthetic_admin',
    password: '321',
    role: 'admin',
    model: AestheticUser,
    extraFields: { permissions: ['all'] }
  },
  {
    module: 'Diagnostic',
    username: 'diagnostic_admin',
    password: '321',
    role: 'admin',
    model: DiagnosticUser
  }
]

async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    throw new Error('MONGO_URI environment variable is not set')
  }

  console.log('🔗 Connecting to MongoDB...')
  await mongoose.connect(mongoUri)
  console.log('✅ Connected to MongoDB')
}

async function disconnectDB(): Promise<void> {
  await mongoose.disconnect()
  console.log('🔌 Disconnected from MongoDB')
}

async function ensureUser(config: ModuleUserConfig): Promise<{ created: boolean; username: string; module: string }> {
  const { model, username, password, role, extraFields } = config

  // Check if user already exists
  const existing = await model.findOne({ username }).lean()
  if (existing) {
    return { created: false, username, module: config.module }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // Create user
  const userData = {
    username,
    role,
    passwordHash,
    ...extraFields
  }

  await model.create(userData)
  return { created: true, username, module: config.module }
}

async function main(): Promise<void> {
  console.log('🏥 NazirHospital - Module Admin User Creator\n')

  try {
    await connectDB()

    const results: { created: boolean; username: string; module: string }[] = []

    console.log('👤 Creating/Verifying admin users...\n')

    for (const config of MODULE_USERS) {
      try {
        const result = await ensureUser(config)
        results.push(result)

        if (result.created) {
          console.log(`✅ ${result.module.padEnd(12)} | ${result.username.padEnd(18)} | CREATED`)
        } else {
          console.log(`⚡ ${result.module.padEnd(12)} | ${result.username.padEnd(18)} | EXISTS (skipped)`)
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error'
        console.error(`❌ ${config.module.padEnd(12)} | ${config.username.padEnd(18)} | ERROR: ${error}`)
        results.push({ created: false, username: config.username, module: config.module })
      }
    }

    const created = results.filter(r => r.created).length
    const existing = results.filter(r => !r.created).length

    console.log('\n📊 Summary:')
    console.log(`   Created:  ${created}`)
    console.log(`   Existing: ${existing}`)
    console.log(`   Total:    ${MODULE_USERS.length}`)

    console.log('\n🔐 Login Credentials:')
    for (const config of MODULE_USERS) {
      console.log(`   ${config.module.padEnd(12)} | ${config.username.padEnd(18)} | ${config.password}`)
    }

    console.log('\n✨ Done!')
    process.exit(0)
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('\n💥 Fatal Error:', error)
    process.exit(1)
  } finally {
    await disconnectDB()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { MODULE_USERS, ensureUser, main }
