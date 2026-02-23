import { Request, Response } from 'express'
import { AestheticStaff } from '../models/Staff'
import { AuditLog } from '../models/AuditLog'
import { upsertStaffSchema } from '../validators/staff'

export async function list(req: Request, res: Response){
  const shiftId = String((req.query as any).shiftId || '').trim()
  const page = Math.max(1, Number((req.query as any).page || 1))
  const limit = Math.max(1, Math.min(500, Number((req.query as any).limit || 10)))
  const filter: any = {}
  if (shiftId) filter.shiftId = shiftId
  const total = await AestheticStaff.countDocuments(filter)
  const skip = (page - 1) * limit
  const items = await AestheticStaff.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
  const totalPages = Math.max(1, Math.ceil(total / limit))
  res.json({ items, total, page, totalPages })
}

export async function create(req: Request, res: Response){
  const data = upsertStaffSchema.parse(req.body)
  const row: any = await AestheticStaff.create(data)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Add Staff',
      label: 'ADD_STAFF',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${row?.name || ''} — ${row?.role || ''}`,
    })
  } catch {}
  res.status(201).json(row)
}

export async function update(req: Request, res: Response){
  const data = upsertStaffSchema.parse(req.body)
  const row: any = await AestheticStaff.findByIdAndUpdate(req.params.id, data, { new: true })
  if (!row) return res.status(404).json({ error: 'Staff not found' })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Edit Staff',
      label: 'EDIT_STAFF',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${row?.name || ''} — ${row?.role || ''}`,
    })
  } catch {}
  res.json(row)
}

export async function remove(req: Request, res: Response){
  const before: any = await AestheticStaff.findById(req.params.id).lean()
  const row = await AestheticStaff.findByIdAndDelete(req.params.id)
  if (!row) return res.status(404).json({ error: 'Staff not found' })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
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
