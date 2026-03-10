import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { LabUser } from '../models/User'
import { userCreateSchema, userUpdateSchema } from '../validators/user'
import { LabAuditLog } from '../models/AuditLog'
import { LabShift } from '../models/Shift'
import { env } from '../../../config/env'

function toMin(hhmm: string){
  const [h,m] = (hhmm||'').split(':').map(x=>parseInt(x,10)||0)
  return h*60+m
}

function isNowWithinShift(shift: any, now: Date){
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  const cur = toMin(hhmm)
  const start = toMin(String(shift?.start || '00:00'))
  const end = toMin(String(shift?.end || '00:00'))
  if (end > start) return cur >= start && cur < end
  if (end < start) return cur >= start || cur < end
  return true
}

export async function list(_req: Request, res: Response){
  const items = await LabUser.find().sort({ username: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response){
  const parsed = userCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const data = parsed.data
  const exists = await LabUser.findOne({ username: data.username }).lean()
  if (exists) return res.status(400).json({ error: 'Username already exists' })
  const passwordHash = await bcrypt.hash(data.password, 10)
  const u = await LabUser.create({
    username: data.username,
    role: data.role,
    passwordHash,
    shiftId: data.shiftId || undefined,
    shiftRestricted: data.shiftRestricted ?? false,
  })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Add User',
      label: 'ADD_USER',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${u.username} — ${u.role}`,
    })
  } catch {}
  res.status(201).json(u)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const parsed = userUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const data = parsed.data
  const patch: any = {}
  if (data.username) patch.username = data.username
  if (data.role) patch.role = data.role
  if (data.password) patch.passwordHash = await bcrypt.hash(data.password, 10)
  if (data.shiftRestricted != null) patch.shiftRestricted = data.shiftRestricted
  if (Object.prototype.hasOwnProperty.call(data, 'shiftId')) patch.shiftId = data.shiftId ? String(data.shiftId) : undefined
  const u = await LabUser.findByIdAndUpdate(id, patch, { new: true })
  res.json(u)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await LabUser.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function login(req: Request, res: Response){
  const username = String((req.body?.username ?? '')).trim()
  const password = String((req.body?.password ?? '')).trim()
  if (!username) return res.status(400).json({ error: 'Username required' })
  const u: any = await LabUser.findOne({ username }).lean()
  if (!u) return res.status(401).json({ error: 'Invalid credentials' })
  const passOk = password ? await bcrypt.compare(password, u.passwordHash || '') : false
  if (!passOk) return res.status(401).json({ error: 'Invalid credentials' })

  // Optional shift restriction
  try {
    if (u.shiftRestricted) {
      if (!u.shiftId) return res.status(403).json({ error: 'Shift not assigned' })
      const shift: any = await LabShift.findById(String(u.shiftId)).lean()
      if (!shift) return res.status(403).json({ error: 'Shift not found' })
      const now = new Date()
      if (!isNowWithinShift(shift, now)) {
        return res.status(403).json({ error: `Login not allowed outside shift timing (${shift.name}: ${shift.start}-${shift.end})` })
      }
    }
  } catch {}

  try {
    const actor = u.username || 'system'
    await LabAuditLog.create({
      actor,
      action: 'login',
      label: 'LOGIN',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `User ${u.username} logged in`,
    })
  } catch {}

  const token = jwt.sign(
    { id: String(u._id), username: u.username, role: u.role },
    env.JWT_SECRET,
    { expiresIn: '30d' },
  )

  res.json({
    token,
    user: {
      id: String(u._id),
      username: u.username,
      role: u.role,
      shiftId: u.shiftId ? String(u.shiftId) : undefined,
      shiftRestricted: !!u.shiftRestricted,
    },
  })
}

export async function logout(req: Request, res: Response){
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || (req.body?.username) || 'system'
    await LabAuditLog.create({
      actor,
      action: 'logout',
      label: 'LOGOUT',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `User logout`,
    })
  } catch {}
  res.json({ ok: true })
}
