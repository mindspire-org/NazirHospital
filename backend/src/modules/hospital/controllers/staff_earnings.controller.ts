import { Request, Response } from 'express'
import { HospitalStaffEarning } from '../models/StaffEarning'
import { HospitalAuditLog } from '../models/AuditLog'
import { staffEarningCreateSchema, staffEarningQuerySchema, staffEarningUpdateSchema } from '../validators/staff_earnings'

export async function list(req: Request, res: Response){
  const parsed = staffEarningQuerySchema.safeParse(req.query)
  const { staffId, from, to, page, limit } = parsed.success ? (parsed.data as any) : {}
  const filter: any = {}
  if (staffId) filter.staffId = staffId
  if (from || to){
    filter.date = filter.date || {}
    if (from) filter.date.$gte = from
    if (to) filter.date.$lte = to
  }
  const effectiveLimit = Math.max(1, Math.min(500, Number(limit || 20)))
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await HospitalStaffEarning.countDocuments(filter)
  const items = await HospitalStaffEarning.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response){
  const data = staffEarningCreateSchema.parse(req.body)
  const toInsert: any = { ...data }
  if ((!toInsert.amount || Number.isNaN(Number(toInsert.amount))) && toInsert.category === 'RevenueShare'){
    if (toInsert.rate!=null && toInsert.base!=null){
      toInsert.amount = Number(toInsert.base) * (Number(toInsert.rate)/100)
    }
  }
  if (toInsert.amount==null) return res.status(400).json({ message: 'amount or (rate and base) required' })
  const row: any = await HospitalStaffEarning.create(toInsert)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'Add Staff Earning',
      label: 'ADD_STAFF_EARNING',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${row?.staffId || ''} — ${row?.category || ''} — ${row?.amount || 0}`,
    })
  } catch {}
  res.status(201).json(row)
}

export async function update(req: Request, res: Response){
  const patch = staffEarningUpdateSchema.parse(req.body)
  const toUpdate: any = { ...patch }
  if ((toUpdate.amount==null || Number.isNaN(Number(toUpdate.amount))) && toUpdate.category === 'RevenueShare'){
    if (toUpdate.rate!=null && toUpdate.base!=null){
      toUpdate.amount = Number(toUpdate.base) * (Number(toUpdate.rate)/100)
    }
  }
  const row: any = await HospitalStaffEarning.findByIdAndUpdate(req.params.id, toUpdate, { new: true })
  if (!row) return res.status(404).json({ message: 'Earning not found' })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'Edit Staff Earning',
      label: 'EDIT_STAFF_EARNING',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${row?.staffId || ''} — ${row?.category || ''} — ${row?.amount || 0}`,
    })
  } catch {}
  res.json(row)
}

export async function remove(req: Request, res: Response){
  const before: any = await HospitalStaffEarning.findById(req.params.id).lean()
  await HospitalStaffEarning.findByIdAndDelete(req.params.id)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'Delete Staff Earning',
      label: 'DELETE_STAFF_EARNING',
      method: 'DELETE',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${before?.staffId || ''} — ${before?.category || ''} — ${before?.amount || 0}`,
    })
  } catch {}
  res.json({ ok: true })
}
