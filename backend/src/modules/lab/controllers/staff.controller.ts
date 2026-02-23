import { Request, Response } from 'express'
import { LabStaff } from '../models/Staff'
import { LabAuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response) {
  const q = String(req.query.q || '').trim()
  const shiftId = String((req.query as any).shiftId || '').trim()
  const page = Math.max(1, Number((req.query as any).page || 1))
  const limit = Math.max(1, Math.min(500, Number((req.query as any).limit || 10)))
  const filter: any = q ? { name: { $regex: q, $options: 'i' } } : {}
  if (shiftId) filter.shiftId = shiftId
  const total = await LabStaff.countDocuments(filter)
  const skip = (page - 1) * limit
  const items = await LabStaff.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
  const totalPages = Math.max(1, Math.ceil(total / limit))
  res.json({ items, total, page, totalPages })
}

export async function create(req: Request, res: Response) {
  const s = await LabStaff.create(req.body)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Add Staff',
      label: 'ADD_STAFF',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${s.name || ''} — ${s.position || ''}`,
    })
  } catch {}
  res.status(201).json(s)
}

export async function update(req: Request, res: Response) {
  const id = req.params.id
  const s = await LabStaff.findByIdAndUpdate(id, req.body, { new: true })
  if (!s) return res.status(404).json({ message: 'Staff not found' })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Edit Staff',
      label: 'EDIT_STAFF',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${s.name || ''} — ${s.position || ''}`,
    })
  } catch {}
  res.json(s)
}

export async function remove(req: Request, res: Response) {
  const id = req.params.id
  const before: any = await LabStaff.findById(id).lean()
  await LabStaff.findByIdAndDelete(id)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Delete Staff',
      label: 'DELETE_STAFF',
      method: 'DELETE',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${before?.name || ''}`,
    })
  } catch {}
  res.json({ ok: true })
}
