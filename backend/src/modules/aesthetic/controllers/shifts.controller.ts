import { Request, Response } from 'express'
import { AestheticShift } from '../models/Shift'
import { shiftCreateSchema, shiftUpdateSchema } from '../validators/shift'

export async function list(_req: Request, res: Response) {
  const items = await AestheticShift.find().sort({ createdAt: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response) {
  const data = shiftCreateSchema.parse(req.body)
  const s = await AestheticShift.create(data)
  res.status(201).json(s)
}

export async function update(req: Request, res: Response) {
  const id = req.params.id
  const data = shiftUpdateSchema.parse(req.body)
  const s = await AestheticShift.findByIdAndUpdate(id, data, { new: true })
  if (!s) return res.status(404).json({ message: 'Shift not found' })
  res.json(s)
}

export async function remove(req: Request, res: Response) {
  const id = req.params.id
  await AestheticShift.findByIdAndDelete(id)
  res.json({ ok: true })
}
