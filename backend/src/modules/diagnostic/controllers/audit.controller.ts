import { Request, Response } from 'express'
import { DiagnosticAuditLog } from '../models/AuditLog'
import { auditLogCreateSchema, auditLogQuerySchema } from '../validators/audit'

export async function list(req: Request, res: Response){
  const parsed = auditLogQuerySchema.safeParse(req.query)
  const { search, action, subjectType, subjectId, actorUsername, from, to, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (action) filter.action = action
  if (subjectType) filter.subjectType = subjectType
  if (subjectId) filter.subjectId = subjectId
  if (actorUsername) filter.actorUsername = actorUsername
  if (search){
    const rx = new RegExp(String(search), 'i')
    filter.$or = [ { message: rx }, { action: rx }, { subjectType: rx }, { subjectId: rx }, { actorUsername: rx } ]
  }
  if (from || to){
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.createdAt.$lte = end }
  }
  const lim = Math.min(500, Number(limit || 50))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    DiagnosticAuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    DiagnosticAuditLog.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const payload = auditLogCreateSchema.parse(req.body)
  const doc = await DiagnosticAuditLog.create(payload)
  res.status(201).json(doc)
}
