import { Request, Response } from 'express'
import { Supplier } from '../models/Supplier'
import { supplierCreateSchema, supplierUpdateSchema } from '../validators/supplier'
import { ApiError } from '../../../common/errors/ApiError'
import { Purchase } from '../models/Purchase'
import { SupplierPayment } from '../models/SupplierPayment'
import { AuditLog } from '../models/AuditLog'

function rxEscape(s: string){
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function list(req: Request, res: Response) {
  const q = String(req.query.q || '').trim()
  const page = Math.max(1, Number((req.query as any).page || 1))
  const limit = Math.max(1, Math.min(500, Number((req.query as any).limit || 10)))
  const filter = q ? { name: { $regex: q, $options: 'i' } } : {}
  const total = await Supplier.countDocuments(filter)
  const skip = (page - 1) * limit
  const items = await Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
  const ids = items.map(i => String((i as any)._id))
  const names = items.map(i => String((i as any).name || '')).filter(Boolean)
  let purchaseAgg: any[] = []
  let paymentAgg: any[] = []
  if (ids.length){
    const namesLower = names.map(n => n.trim().toLowerCase()).filter(Boolean)
    purchaseAgg = await Purchase.aggregate([
      { $match: { $or: [
        { supplierId: { $in: ids } },
        { $expr: { $in: [ { $toLower: { $trim: { input: { $ifNull: ['$supplierName', ''] } } } }, namesLower ] } },
      ] } },
      { $addFields: {
        _sid: { $ifNull: ['$supplierId', ''] },
        _sname: { $trim: { input: { $ifNull: ['$supplierName', ''] } } },
        _total: { $ifNull: ['$totalAmount', 0] },
      } },
      { $addFields: { _key: { $cond: [ { $gt: [ { $strLenCP: '$_sid' }, 0 ] }, '$_sid', { $toLower: '$_sname' } ] } } },
      { $group: { _id: '$_key', totalPurchases: { $sum: '$_total' }, lastOrder: { $max: '$date' } } },
    ])
    paymentAgg = await SupplierPayment.aggregate([
      { $match: { supplierId: { $in: ids } } },
      { $group: { _id: '$supplierId', paid: { $sum: { $ifNull: ['$amount', 0] } } } },
    ])
  }
  const purchMap = new Map(purchaseAgg.map(x => [String(x._id), x]))
  const payMap = new Map(paymentAgg.map(x => [String(x._id), x]))
  const enriched = items.map((i: any) => {
    const idKey = String(i._id)
    const nameKey = String((i.name || '')).trim().toLowerCase()
    const p = purchMap.get(idKey) || purchMap.get(nameKey)
    const pm = payMap.get(String(i._id))
    const totalPurchasesRaw = p && typeof p.totalPurchases === 'number' ? p.totalPurchases : 0
    const totalPurchases = Math.round(totalPurchasesRaw * 100) / 100
    const paidRaw = pm && typeof pm.paid === 'number' ? pm.paid : 0
    const paid = Math.round(paidRaw * 100) / 100
    const lastOrder = (p && typeof p.lastOrder === 'string') ? p.lastOrder : (i.lastOrder || '')
    return { ...i, totalPurchases, paid, lastOrder }
  })
  const totalPages = Math.max(1, Math.ceil(total / limit))
  res.json({ items: enriched, total, page, totalPages })
}

export async function create(req: Request, res: Response) {
  const data = supplierCreateSchema.parse(req.body)
  const s = await Supplier.create(data)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Add Supplier',
      label: 'ADD_SUPPLIER',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${s.name || ''}`,
    })
  } catch {}
  res.status(201).json(s)
}

export async function update(req: Request, res: Response) {
  const id = req.params.id
  const data = supplierUpdateSchema.parse(req.body)
  const s = await Supplier.findByIdAndUpdate(id, data, { new: true })
  if (!s) throw new ApiError(404, 'Supplier not found')
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Edit Supplier',
      label: 'EDIT_SUPPLIER',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${s.name || ''}`,
    })
  } catch {}
  res.json(s)
}

export async function remove(req: Request, res: Response) {
  const id = req.params.id
  const before: any = await Supplier.findById(id).lean()
  const s = await Supplier.findByIdAndDelete(id)
  if (!s) throw new ApiError(404, 'Supplier not found')
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Delete Supplier',
      label: 'DELETE_SUPPLIER',
      method: 'DELETE',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${before?.name || ''}`,
    })
  } catch {}
  res.json({ ok: true })
}

export async function recordPayment(req: Request, res: Response) {
  const id = req.params.id
  const amount = Number((req.body?.amount ?? 0))
  const purchaseId = String(req.body?.purchaseId || '') || undefined
  const method = String(req.body?.method || '') || undefined
  const note = String(req.body?.note || '') || undefined
  const date = String(req.body?.date || '') || undefined
  if (!amount || amount <= 0) throw new ApiError(400, 'Invalid amount')
  const s = await Supplier.findById(id)
  if (!s) throw new ApiError(404, 'Supplier not found')
  await SupplierPayment.create({ supplierId: id, purchaseId, amount, method, note, date })
  // Keep legacy quick total in Supplier doc as a convenience (not source of truth)
  s.paid = Number(((s.paid || 0) + amount).toFixed(2))
  await s.save()
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Edit Supplier',
      label: 'SUPPLIER_PAYMENT',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${s.name || ''} — Payment Rs ${amount.toFixed(2)}`,
    })
  } catch {}
  res.json({ ok: true })
}

export async function purchases(req: Request, res: Response) {
  const id = String(req.params.id || '')
  if (!id) throw new ApiError(400, 'Supplier id required')
  const sup = await Supplier.findById(id).lean()
  const name = String((sup as any)?.name || '')
  const nameRx = name ? new RegExp(`^${rxEscape(name)}$`, 'i') : null
  const purchases = await Purchase.find(nameRx ? { $or: [ { supplierId: id }, { supplierName: nameRx } ] } : { supplierId: id }).sort({ date: -1, invoice: -1 }).lean()
  const payAgg = await SupplierPayment.aggregate([
    { $match: { supplierId: id, purchaseId: { $exists: true, $ne: null } } },
    { $group: { _id: '$purchaseId', paid: { $sum: { $ifNull: ['$amount', 0] } } } }
  ])
  const payMap = new Map(payAgg.map(p => [String(p._id), p.paid]))
  const withTotals = purchases.map((p: any) => {
    const paid = Number(payMap.get(String(p._id)) || 0)
    const remaining = Math.max(0, Number(p.totalAmount || 0) - paid)
    return { ...p, paid, remaining }
  })
  res.json({ items: withTotals })
}
