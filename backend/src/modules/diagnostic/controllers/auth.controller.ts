import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { env } from '../../../config/env'
import { DiagnosticUser } from '../models/User'
import { DiagnosticAuditLog } from '../models/AuditLog'

export async function login(req: Request, res: Response){
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required' })
  const user = await DiagnosticUser.findOne({ username }).lean() as any
  if (!user) {
    try {
      await DiagnosticAuditLog.create({
        action: 'auth.login.fail',
        subjectType: 'User',
        subjectId: '',
        message: `Login failed for ${username}: user not found`,
        data: { username },
        actorUsername: String(username||''),
        ip: req.ip,
        userAgent: String(req.headers['user-agent']||''),
      })
    } catch {}
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    try {
      await DiagnosticAuditLog.create({
        action: 'auth.login.fail',
        subjectType: 'User',
        subjectId: String(user._id||''),
        message: `Login failed for ${username}: invalid password`,
        actorUsername: String(username||''),
        ip: req.ip,
        userAgent: String(req.headers['user-agent']||''),
      })
    } catch {}
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const token = jwt.sign({ sub: user._id, username: user.username, role: user.role, scope: 'diagnostic' }, env.JWT_SECRET, { expiresIn: '1d' })
  try {
    await DiagnosticAuditLog.create({
      action: 'auth.login',
      subjectType: 'User',
      subjectId: String(user._id||''),
      message: `User ${user.username} logged in`,
      data: { role: user.role },
      actorId: String(user._id||''),
      actorUsername: String(user.username||''),
      ip: req.ip,
      userAgent: String(req.headers['user-agent']||''),
    })
  } catch {}
  res.json({ token, user: { id: user._id, username: user.username, role: user.role } })
}

function getActor(req: Request){
  try {
    const auth = String(req.headers['authorization']||'')
    const token = auth.startsWith('Bearer ')? auth.slice(7) : ''
    if (!token) return {}
    const payload: any = jwt.verify(token, env.JWT_SECRET)
    return { actorId: String(payload?.sub||''), actorUsername: String(payload?.username||'') }
  } catch { return {} }
}

export async function logout(req: Request, res: Response){
  try {
    const actor = getActor(req) as any
    await DiagnosticAuditLog.create({
      action: 'auth.logout',
      subjectType: 'User',
      subjectId: String(actor.actorId||''),
      message: `User ${actor.actorUsername||''} logged out`,
      actorId: actor.actorId,
      actorUsername: actor.actorUsername,
      ip: req.ip,
      userAgent: String(req.headers['user-agent']||''),
    })
  } catch {}
  res.json({ success: true })
}
