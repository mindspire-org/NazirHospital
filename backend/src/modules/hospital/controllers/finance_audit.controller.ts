import { Request, Response } from 'express'
import { FinanceAuditLog } from '../models/FinanceAuditLog'
import { auditCreateSchema, auditQuerySchema } from '../validators/audit'

export async function list(req: Request, res: Response){
  const parsed = auditQuerySchema.safeParse(req.query)
  const { search, action, from, to, limit, page } = parsed.success ? (parsed.data as any) : {}
  const filter: any = {}
  if (search){
    const rx = new RegExp(search, 'i')
    filter.$or = [ { actor: rx }, { action: rx }, { label: rx }, { path: rx }, { detail: rx } ]
  }
  if (action) filter.action = action
  if (from || to){
    filter.at = {}
    if (from) filter.at.$gte = new Date(from).toISOString()
    if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.at.$lte = end.toISOString() }
  }
  const lim = Number(limit || 10)
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    FinanceAuditLog.find(filter).sort({ at: -1 }).skip(skip).limit(lim).lean(),
    FinanceAuditLog.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const parsed = auditCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid audit payload' })
  const data = parsed.data as any
  try {
    const doc = await FinanceAuditLog.create({
      actor: data.actor || (req as any).user?.name || (req as any).user?.email || 'system',
      action: data.action,
      label: data.label,
      method: data.method || req.method,
      path: data.path || req.originalUrl,
      at: data.at,
      detail: data.detail,
    })
    return res.status(201).json({ log: doc })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create audit log' })
  }
}
