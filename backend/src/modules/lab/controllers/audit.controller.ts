import { Request, Response } from 'express'
import { LabAuditLog } from '../models/AuditLog'
import { auditCreateSchema, auditQuerySchema } from '../validators/audit'

export async function list(req: Request, res: Response){
  const parsed = auditQuerySchema.safeParse(req.query)
  const { search, action, from, to, limit, page } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (search){
    const rx = new RegExp(search, 'i')
    filter.$or = [ { actor: rx }, { action: rx }, { label: rx }, { path: rx }, { detail: rx } ]
  }
  if (action) filter.action = action
  if (from || to){
    filter.at = {}
    if (from) filter.at.$gte = new Date(from).toISOString()
    if (to) {
      const end = new Date(to); end.setHours(23,59,59,999)
      filter.at.$lte = end.toISOString()
    }
  }
  const lim = Number(limit || 10)
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    LabAuditLog.find(filter).sort({ at: -1 }).skip(skip).limit(lim).lean(),
    LabAuditLog.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = auditCreateSchema.parse(req.body)
  const doc = await LabAuditLog.create(data)
  res.status(201).json(doc)
}
