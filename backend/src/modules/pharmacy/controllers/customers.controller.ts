import { Request, Response } from 'express'
import { Customer } from '../models/Customer'
import { Dispense } from '../models/Dispense'
import { customerCreateSchema, customerUpdateSchema } from '../validators/customer'
import { AuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response) {
  const q = String(req.query.q || '').trim()
  const page = Math.max(1, Number((req.query.page as any) || 1))
  const limit = Math.max(1, Number((req.query.limit as any) || 10))
  const filter = q ? {
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { cnic: { $regex: q, $options: 'i' } },
      { mrNumber: { $regex: q, $options: 'i' } },
      { company: { $regex: q, $options: 'i' } },
    ]
  } : {}
  const skip = (page - 1) * limit
  const [rawItems, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments(filter),
  ])
  const ids = rawItems.map(i => String((i as any)._id))
  let stats: { _id: string; totalSpent: number; salesCount: number; lastPurchaseAt: string }[] = []
  if (ids.length) {
    stats = await Dispense.aggregate([
      { $match: { customerId: { $in: ids } } },
      { $group: { _id: '$customerId', totalSpent: { $sum: { $ifNull: ['$total', 0] } }, salesCount: { $sum: 1 }, lastPurchaseAt: { $max: '$datetime' } } },
    ])
  }
  const map = new Map(stats.map(s => [String(s._id), s]))
  const enriched = rawItems.map((i: any) => {
    const s = map.get(String(i._id))
    const totalSpentRaw = (s && typeof s.totalSpent === 'number') ? s.totalSpent : 0
    const totalSpent = Math.round(totalSpentRaw * 100) / 100
    const salesCount = (s && typeof s.salesCount === 'number') ? s.salesCount : 0
    const lastPurchaseAt = (s && typeof s.lastPurchaseAt === 'string') ? s.lastPurchaseAt : null
    return { ...i, totalSpent, salesCount, lastPurchaseAt }
  })
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)))
  res.json({ items: enriched, total, page, totalPages })
}

export async function create(req: Request, res: Response) {
  const data = customerCreateSchema.parse(req.body)
  const c = await Customer.create(data)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Add Customer',
      label: 'ADD_CUSTOMER',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${c.name || ''} — ${c.phone || ''}`,
    })
  } catch {}
  res.status(201).json(c)
}

export async function update(req: Request, res: Response) {
  const id = String(req.params.id || '')
  if (!id) return res.status(400).json({ error: 'ID required' })
  const data = customerUpdateSchema.parse(req.body)
  const updated = await Customer.findByIdAndUpdate(id, data, { new: true })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Edit Customer',
      label: 'EDIT_CUSTOMER',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${updated.name || ''} — ${updated.phone || ''}`,
    })
  } catch {}
  res.json(updated)
}

export async function remove(req: Request, res: Response) {
  const id = String(req.params.id || '')
  if (!id) return res.status(400).json({ error: 'ID required' })
  const before: any = await Customer.findById(id).lean()
  await Customer.findByIdAndDelete(id)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Delete Customer',
      label: 'DELETE_CUSTOMER',
      method: 'DELETE',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${before?.name || ''} — ${before?.phone || ''}`,
    })
  } catch {}
  res.json({ ok: true })
}
