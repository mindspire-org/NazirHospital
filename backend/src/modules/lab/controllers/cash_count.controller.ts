import { Request, Response } from 'express'
import { CashCount } from '../models/CashCount'
import { cashCountCreateSchema, cashCountQuerySchema } from '../validators/cash_count'
import { LabAuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response){
  const q = cashCountQuerySchema.safeParse(req.query)
  const { from, to, search, page, limit } = q.success ? q.data as any : {}
  const filter: any = {}
  if (from || to){
    filter.date = {}
    if (from) filter.date.$gte = from
    if (to) filter.date.$lte = to
  }
  if (search){
    const rx = new RegExp(search, 'i')
    filter.$or = [ { receiver: rx }, { handoverBy: rx }, { note: rx } ]
  }
  const effectiveLimit = Number(limit || 20)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await CashCount.countDocuments(filter)
  const items = await CashCount.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response){
  const data = cashCountCreateSchema.parse(req.body)
  const e = await CashCount.create(data)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Manager Cash Count',
      label: 'CASH_COUNT',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Rs ${Number(data.amount||0).toFixed(2)}${data.note? ' — '+data.note : ''}`,
    })
  } catch {}
  res.status(201).json(e)
}

export async function remove(req: Request, res: Response){
  const id = req.params.id
  await CashCount.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function summary(req: Request, res: Response){
  const q = cashCountQuerySchema.safeParse(req.query)
  const { from, to, search } = q.success ? q.data as any : {}
  const match: any = {}
  if (from || to){
    match.date = {}
    if (from) match.date.$gte = from
    if (to) match.date.$lte = to
  }
  if (search){
    const rx = new RegExp(search, 'i')
    match.$or = [ { receiver: rx }, { handoverBy: rx }, { note: rx } ]
  }
  const agg = await CashCount.aggregate([
    { $match: match },
    { $group: { _id: null, sum: { $sum: { $ifNull: ['$amount', 0] } }, count: { $sum: 1 } } }
  ])
  const totalAmount = Number((agg?.[0]?.sum || 0).toFixed?.(2) || 0)
  const count = Number(agg?.[0]?.count || 0)
  res.json({ amount: totalAmount, count })
}
