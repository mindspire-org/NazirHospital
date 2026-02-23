import { Request, Response } from 'express'
import { Expense } from '../models/Expense'
import { expenseCreateSchema, expenseQuerySchema } from '../validators/expense'
import { AuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response) {
  const q = expenseQuerySchema.safeParse(req.query)
  const { from, to, minAmount, search, type, user, page, limit } = q.success ? q.data as any : {}
  const filter: any = {}
  if (from || to) {
    const hasTimeFrom = /T\d{2}:\d{2}/.test(String(from || ''))
    const hasTimeTo = /T\d{2}:\d{2}/.test(String(to || ''))
    if (hasTimeFrom || hasTimeTo) {
      filter.datetime = {}
      if (from) filter.datetime.$gte = new Date(from).toISOString()
      if (to) {
        const end = new Date(to)
        if (!hasTimeTo) end.setHours(23,59,59,999)
        filter.datetime.$lte = end.toISOString()
      }
    } else {
      filter.date = {}
      if (from) filter.date.$gte = from
      if (to) filter.date.$lte = to
    }
  }
  if (minAmount) filter.amount = { $gte: minAmount }
  if (type) filter.type = type
  if (user) filter.createdBy = new RegExp(String(user), 'i')
  if (search) {
    const rx = new RegExp(search, 'i')
    filter.$or = [ { note: rx }, { type: rx } ]
  }
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await Expense.countDocuments(filter)
  const items = await Expense.find(filter).sort({ date: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response) {
  const data = expenseCreateSchema.parse(req.body)
  const date = String((data as any).date || '').slice(0,10) || new Date().toISOString().slice(0,10)
  let datetime = (data as any).datetime as string | undefined
  if (!datetime) {
    const time = String((data as any).time || '')
    try{
      const [y,m,d] = date.split('-').map(n=>parseInt(n,10))
      const [hh,mm] = (time || '00:00').split(':').map(n=>parseInt(n||'0',10))
      const dt = new Date(y, (m-1), d, hh||0, mm||0, 0)
      datetime = dt.toISOString()
    } catch {
      datetime = new Date(`${date}T00:00:00`).toISOString()
    }
  }
  const createdBy = String(((data as any).createdBy || (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || '')).trim() || undefined
  const e = await Expense.create({ ...data, date, datetime, createdBy })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Add Expense',
      label: 'ADD_EXPENSE',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${e.type || ''} — Rs ${Number(e.amount||0).toFixed(2)}${e.note? ' — '+e.note : ''}`,
    })
  } catch {}
  res.status(201).json(e)
}

export async function remove(req: Request, res: Response) {
  const id = req.params.id
  await Expense.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function summary(req: Request, res: Response){
  const q = expenseQuerySchema.safeParse(req.query)
  const { from, to } = q.success ? q.data : {}
  const match: any = {}
  if (from || to){
    const hasTimeFrom = /T\d{2}:\d{2}/.test(String(from || ''))
    const hasTimeTo = /T\d{2}:\d{2}/.test(String(to || ''))
    if (hasTimeFrom || hasTimeTo){
      match.datetime = {}
      if (from) match.datetime.$gte = new Date(from).toISOString()
      if (to){
        const end = new Date(to)
        if (!hasTimeTo) end.setHours(23,59,59,999)
        match.datetime.$lte = end.toISOString()
      }
    } else {
      match.date = {}
      if (from) match.date.$gte = from
      if (to) match.date.$lte = to
    }
  }
  const agg = await Expense.aggregate([
    { $match: match },
    { $group: { _id: null, totalAmount: { $sum: { $ifNull: ['$amount', 0] } }, count: { $sum: 1 } } }
  ])
  const totalAmount = agg[0]?.totalAmount || 0
  const count = agg[0]?.count || 0
  res.json({ totalAmount: Number(totalAmount.toFixed(2)), count })
}
