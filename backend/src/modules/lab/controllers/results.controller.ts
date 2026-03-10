import { Request, Response } from 'express'
import { LabResult } from '../models/Result'
import { resultCreateSchema, resultQuerySchema, resultUpdateSchema } from '../validators/result'

function resolveActor(req: Request) {
  return (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
}

export async function list(req: Request, res: Response){
  const parsed = resultQuerySchema.safeParse(req.query)
  const { orderId, from, to, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (orderId) filter.orderId = orderId
  if (from || to){
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.createdAt.$lte = end }
  }
  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    LabResult.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    LabResult.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = resultCreateSchema.parse(req.body)
  const actor = resolveActor(req)
  const doc = await LabResult.create({ ...data, submittedBy: actor })
  res.status(201).json(doc)
}

export async function get(req: Request, res: Response){
  const { id } = req.params
  const doc = await LabResult.findById(id).lean()
  if (!doc) return res.status(404).json({ message: 'Result not found' })
  res.json(doc)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const patch = resultUpdateSchema.parse(req.body)
  const actor = resolveActor(req)
  const set: any = { ...patch }
  if ((patch as any).reportStatus === 'approved') {
    if (!set.approvedBy) set.approvedBy = actor
    if (!set.approvedAt) set.approvedAt = new Date()
  }
  const doc = await LabResult.findByIdAndUpdate(id, { $set: set }, { new: true })
  if (!doc) return res.status(404).json({ message: 'Result not found' })
  res.json(doc)
}
