import { Request, Response } from 'express'
import { HospitalShift } from '../models/Shift'
import { shiftCreateSchema, shiftUpdateSchema } from '../validators/shift'

export async function list(_req: Request, res: Response) {
  const items = await HospitalShift.find().sort({ createdAt: 1 }).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response) {
  const data = shiftCreateSchema.parse(req.body)
  const s = await HospitalShift.create(data)
  res.status(201).json(s)
}

export async function update(req: Request, res: Response) {
  const id = req.params.id
  const data = shiftUpdateSchema.parse(req.body)
  const s = await HospitalShift.findByIdAndUpdate(id, data, { new: true })
  if (!s) return res.status(404).json({ message: 'Shift not found' })
  res.json(s)
}

export async function remove(req: Request, res: Response) {
  const id = req.params.id
  await HospitalShift.findByIdAndDelete(id)
  res.json({ ok: true })
}
