import { Request, Response } from 'express'
import { CashMovement } from '../models/CashMovement'
import { cashMovementCreateSchema, cashMovementQuerySchema } from '../validators/cash_movement'
import { LabAuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response){
  const q = cashMovementQuerySchema.safeParse(req.query)
  const { from, to, type, search, page, limit } = q.success ? q.data as any : {}
  const filter: any = {}
  if (from || to){
    filter.date = {}
    if (from) filter.date.$gte = from
    if (to) filter.date.$lte = to
  }
  if (type) filter.type = type
  if (search){
    const rx = new RegExp(search, 'i')
    filter.$or = [ { category: rx }, { receiver: rx }, { handoverBy: rx }, { note: rx } ]
  }
  const effectiveLimit = Number(limit || 20)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await CashMovement.countDocuments(filter)
  const items = await CashMovement.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response){
  const data = cashMovementCreateSchema.parse(req.body)
  const e = await CashMovement.create(data)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: data.type === 'IN' ? 'Pay In' : 'Pay Out',
      label: 'CASH_MOVEMENT',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${data.type} — Rs ${Number(data.amount||0).toFixed(2)}${data.category? ' — '+data.category : ''}${data.note? ' — '+data.note : ''}`,
    })
  } catch {}
  res.status(201).json(e)
}

export async function remove(req: Request, res: Response){
  const id = req.params.id
  await CashMovement.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function summary(req: Request, res: Response){
  const q = cashMovementQuerySchema.safeParse(req.query)
  const { from, to, type } = q.success ? q.data as any : {}
  const match: any = {}
  if (from || to){
    match.date = {}
    if (from) match.date.$gte = from
    if (to) match.date.$lte = to
  }
  if (type) match.type = type
  const agg = await CashMovement.aggregate([
    { $match: match },
    { $group: { _id: '$type', sum: { $sum: { $ifNull: ['$amount', 0] } } } }
  ])
  const inAmount = Number((agg.find(x=>x._id==='IN')?.sum || 0).toFixed?.(2) || 0)
  const outAmount = Number((agg.find(x=>x._id==='OUT')?.sum || 0).toFixed?.(2) || 0)
  res.json({ inAmount, outAmount, net: Number((inAmount - outAmount).toFixed(2)), count: await CashMovement.countDocuments(match) })
}
