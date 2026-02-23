import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { ReceptionUser } from '../models/User'
import { userCreateSchema, userUpdateSchema } from '../validators/user'

export async function list(_req: Request, res: Response){
  const items = await ReceptionUser.find().sort({ username: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response){
  const parsed = userCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  const data = parsed.data
  const exists = await ReceptionUser.findOne({ username: data.username }).lean()
  if (exists) return res.status(400).json({ error: 'Username already exists' })
  const passwordHash = await bcrypt.hash(data.password, 10)
  const u = await ReceptionUser.create({ username: data.username, role: data.role, passwordHash })
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
  const u = await ReceptionUser.findByIdAndUpdate(id, patch, { new: true })
  res.json(u)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await ReceptionUser.findByIdAndDelete(id)
  res.json({ ok: true })
}
