import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../../config/env'
import { z } from 'zod'
import { HospitalUser } from '../models/User'
import { HospitalAuditLog } from '../models/AuditLog'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  username: z.string().min(1),
  role: z.string().default('Staff'),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  active: z.boolean().optional(),
})

const updateSchema = z.object({
  username: z.string().optional(),
  role: z.string().optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  active: z.boolean().optional(),
})

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().optional(),
})

export async function list(req: Request, res: Response){
  const rows = await HospitalUser.find({}).sort({ createdAt: -1 }).lean()
  const users = rows.map((u: any)=> ({ id: String(u._id), username: u.username, role: u.role, fullName: u.fullName||'', phone: u.phone||'', email: u.email||'', active: !!u.active }))
  res.json({ users })
}

export async function create(req: Request, res: Response){
  const data = createSchema.parse(req.body)
  const username = data.username.trim().toLowerCase()
  const existing = await HospitalUser.findOne({ username }).lean()
  if (existing) return res.status(409).json({ error: 'Username already exists' })
  const hashed = await bcrypt.hash(String(data.password || '123'), 10)
  const doc: any = await HospitalUser.create({
    username,
    role: data.role,
    fullName: data.fullName,
    phone: data.phone,
    email: data.email,
    active: data.active ?? true,
    passwordHash: hashed,
    phoneNormalized: data.phone ? data.phone.replace(/\D+/g,'') : undefined,
  })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'user_add',
      label: 'USER_ADD',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `User ${doc.username} (${doc._id}) role ${doc.role}`,
    })
  } catch {}
  res.status(201).json({ user: { id: String(doc._id), username: doc.username, role: doc.role, fullName: doc.fullName||'', phone: doc.phone||'', email: doc.email||'', active: !!doc.active } })
}

export async function update(req: Request, res: Response){
  const id = String(req.params.id)
  const data = updateSchema.parse(req.body)
  const patch: any = { }
  if (data.username) patch.username = data.username.trim().toLowerCase()
  if (data.role) patch.role = data.role
  if (data.fullName != null) patch.fullName = data.fullName
  if (data.phone != null) { patch.phone = data.phone; patch.phoneNormalized = data.phone ? data.phone.replace(/\D+/g,'') : undefined }
  if (data.email != null) patch.email = data.email
  if (data.active != null) patch.active = data.active
  if (data.password) patch.passwordHash = await bcrypt.hash(String(data.password), 10)
  const u: any = await HospitalUser.findByIdAndUpdate(id, patch, { new: true })
  if (!u) return res.status(404).json({ error: 'User not found' })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'user_edit',
      label: 'USER_EDIT',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `User ${u.username} (${u._id}) updated`,
    })
  } catch {}
  res.json({ user: { id: String(u._id), username: u.username, role: u.role, fullName: u.fullName||'', phone: u.phone||'', email: u.email||'', active: !!u.active } })
}

export async function remove(req: Request, res: Response){
  const id = String(req.params.id)
  const u = await HospitalUser.findByIdAndDelete(id)
  if (!u) return res.status(404).json({ error: 'User not found' })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'user_delete',
      label: 'USER_DELETE',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `User ${u.username} (${u._id}) deleted`,
    })
  } catch {}
  res.json({ ok: true })
}

export async function login(req: Request, res: Response){
  const data = loginSchema.parse(req.body)
  const username = data.username.trim().toLowerCase()
  const u: any = await HospitalUser.findOne({ username }).lean()
  if (!u || u.active === false) return res.status(401).json({ error: 'Invalid credentials' })
  const pass = String(data.password || '')
  let ok = false
  if (!pass) return res.status(401).json({ error: 'Invalid credentials' })
  const stored = String(u.passwordHash || '')
  const isHashed = stored.startsWith('$2')
  if (stored) {
    if (isHashed) {
      try { ok = await bcrypt.compare(pass, stored) } catch { ok = false }
    } else {
      ok = stored === pass || (stored === '123' && pass === '123')
      if (ok) {
        try {
          const rehash = await bcrypt.hash(pass, 10)
          await HospitalUser.findByIdAndUpdate(u._id, { $set: { passwordHash: rehash } })
        } catch {}
      }
    }
  } else {
    ok = pass === '123'
    if (ok) {
      try {
        const rehash = await bcrypt.hash(pass, 10)
        await HospitalUser.findByIdAndUpdate(u._id, { $set: { passwordHash: rehash } })
      } catch {}
    }
  }
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  try {
    const actor = u.fullName || u.username || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'login',
      label: 'LOGIN',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `User ${u.username} logged in`,
    })
  } catch {}
  const token = jwt.sign({ sub: String(u._id), username: u.username, role: u.role, scope: 'hospital' }, env.JWT_SECRET, { expiresIn: '1d' })
  res.json({ token, user: { id: String(u._id), username: u.username, role: u.role } })
}

export async function logout(req: Request, res: Response){
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || (req.body?.username) || 'system'
    await HospitalAuditLog.create({
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
