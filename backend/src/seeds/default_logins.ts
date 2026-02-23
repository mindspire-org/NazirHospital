import bcrypt from 'bcryptjs'
import { env } from '../config/env'
import { AestheticUser } from '../modules/aesthetic/models/User'
import { DiagnosticUser } from '../modules/diagnostic/models/User'
import { HospitalUser } from '../modules/hospital/models/User'
import { FinanceUser } from '../modules/hospital/models/finance_User'
import { LabUser } from '../modules/lab/models/User'
import { PharmacyUser } from '../modules/pharmacy/models/User'
import { ReceptionUser } from '../modules/reception/models/User'

async function ensureOne(model: any, username: string, doc: any) {
  const existing = await model.findOne({ username }).lean()
  if (existing) return false
  await model.create(doc)
  return true
}

export async function ensureDefaultPortalLogins() {
  if (String(env.NODE_ENV || '').toLowerCase() === 'production') return

  const username = 'admin'
  const passwordHash = await bcrypt.hash('123', 10)

  await ensureOne(PharmacyUser, username, { username, role: 'admin', passwordHash })
  await ensureOne(AestheticUser, username, { username, role: 'admin', passwordHash })
  await ensureOne(HospitalUser, username, { username, role: 'admin', active: true, passwordHash })
  await ensureOne(ReceptionUser, username, { username, role: 'admin', passwordHash })
  await ensureOne(LabUser, username, { username, role: 'admin', passwordHash })
  await ensureOne(DiagnosticUser, username, { username, role: 'admin', passwordHash })
  await ensureOne(FinanceUser, username, { username, role: 'admin', passwordHash })
}
