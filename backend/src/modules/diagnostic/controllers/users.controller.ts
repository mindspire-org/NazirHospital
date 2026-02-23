import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { DiagnosticUser } from '../models/User'
import { userCreateSchema, userUpdateSchema } from '../validators/user'
import { DiagnosticAuditLog } from '../models/AuditLog'

export async function list(_req: Request, res: Response){
  const items = await DiagnosticUser.find().sort({ username: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response){
  const parsed = userCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const data = parsed.data
  const exists = await DiagnosticUser.findOne({ username: data.username }).lean()
  if (exists) return res.status(400).json({ error: 'Username already exists' })
  const passwordHash = await bcrypt.hash(data.password, 10)
  const u = await DiagnosticUser.create({ username: data.username, role: data.role, passwordHash })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await DiagnosticAuditLog.create({
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
  const u = await DiagnosticUser.findByIdAndUpdate(id, patch, { new: true })
  res.json(u)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await DiagnosticUser.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function login(req: Request, res: Response){
  const { username, password } = (req.body || {}) as { username?: string; password?: string }
  const u: any = await DiagnosticUser.findOne({ username }).lean()
  if (!u) return res.status(401).json({ error: 'Invalid credentials' })
  const pass = String(password || '')
  const ok = pass ? await bcrypt.compare(pass, u.passwordHash || '') : false
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  try {
    const actor = u.username || 'system'
    await DiagnosticAuditLog.create({
      actor,
      action: 'Login',
      label: 'LOGIN',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `User ${u.username} login`,
    })
  } catch {}
  res.json({ user: { id: String(u._id), username: u.username, role: u.role } })
}

export async function logout(req: Request, res: Response){
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || (req.body?.username) || 'system'
    await DiagnosticAuditLog.create({
      actor,
      action: 'Logout',
      label: 'LOGOUT',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: 'User logout',
    })
  } catch {}
  res.json({ ok: true })
}
