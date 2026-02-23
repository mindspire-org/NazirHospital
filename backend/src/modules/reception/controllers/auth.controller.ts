import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { env } from '../../../config/env'
import { ReceptionUser } from '../models/User'

export async function login(req: Request, res: Response){
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required' })
  const user = await ReceptionUser.findOne({ username }).lean() as any
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
  const token = jwt.sign({ sub: user._id, username: user.username, role: user.role, scope: 'reception' }, env.JWT_SECRET, { expiresIn: '1d' })
  res.json({ token, user: { id: user._id, username: user.username, role: user.role } })
}

export async function logout(_req: Request, res: Response){
  res.json({ success: true })
}
