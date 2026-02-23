import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { env } from '../../../config/env'
import { AestheticUser } from '../models/User'
import { AuditLog } from '../models/AuditLog'

export async function login(req: Request, res: Response){
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required' })
  const user = await AestheticUser.findOne({ username }).lean() as any
  if (!user) {
    try {
      await AuditLog.create({
        actor: String(username||'unknown'),
        action: 'auth.login.fail',
        label: 'AUTH_LOGIN_FAIL',
        method: 'POST',
        path: req.originalUrl,
        at: new Date().toISOString(),
        detail: `Login failed for ${username}: user not found`,
      })
    } catch {}
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    try {
      await AuditLog.create({
        actor: String(username||'unknown'),
        action: 'auth.login.fail',
        label: 'AUTH_LOGIN_FAIL',
        method: 'POST',
        path: req.originalUrl,
        at: new Date().toISOString(),
        detail: `Login failed for ${username}: invalid password`,
      })
    } catch {}
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const token = jwt.sign({ sub: user._id, username: user.username, role: user.role, scope: 'aesthetic' }, env.JWT_SECRET, { expiresIn: '1d' })
  try {
    await AuditLog.create({
      actor: String(user.username||'unknown'),
      action: 'auth.login',
      label: 'AUTH_LOGIN',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `User ${user.username} logged in`,
    })
  } catch {}
  res.json({ token, user: { id: user._id, username: user.username, role: user.role } })
}

function getActor(req: Request){
  try {
    const hdr = String(req.headers['authorization']||'')
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : ''
    if (!token) return {}
    const payload: any = jwt.verify(token, env.JWT_SECRET)
    return { actorId: String(payload?.sub||''), actorUsername: String(payload?.username||'') }
  } catch { return {} }
}

export async function logout(req: Request, res: Response){
  try {
    const actor = getActor(req) as any
    await AuditLog.create({
      actor: String(actor.actorUsername||'unknown'),
      action: 'auth.logout',
      label: 'AUTH_LOGOUT',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `User ${actor.actorUsername||''} logged out`,
    })
  } catch {}
  res.json({ success: true })
}
