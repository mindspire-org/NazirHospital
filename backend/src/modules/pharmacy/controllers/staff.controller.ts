import { Request, Response } from 'express'
import { Staff } from '../models/Staff'

export async function list(req: Request, res: Response) {
  const q = String(req.query.q || '').trim()
  const shiftId = String((req.query as any).shiftId || '').trim()
  const page = Math.max(1, Number((req.query as any).page || 1))
  const limit = Math.max(1, Math.min(500, Number((req.query as any).limit || 10)))
  const filter: any = q ? { name: { $regex: q, $options: 'i' } } : {}
  if (shiftId) filter.shiftId = shiftId
  const total = await Staff.countDocuments(filter)
  const skip = (page - 1) * limit
  const items = await Staff.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
  const totalPages = Math.max(1, Math.ceil(total / limit))
  res.json({ items, total, page, totalPages })
}

export async function create(req: Request, res: Response) {
  const s = await Staff.create(req.body)
  res.status(201).json(s)
}

export async function update(req: Request, res: Response) {
  const id = req.params.id
  const s = await Staff.findByIdAndUpdate(id, req.body, { new: true })
  if (!s) return res.status(404).json({ message: 'Staff not found' })
  res.json(s)
}

export async function remove(req: Request, res: Response) {
  const id = req.params.id
  await Staff.findByIdAndDelete(id)
  res.json({ ok: true })
}
