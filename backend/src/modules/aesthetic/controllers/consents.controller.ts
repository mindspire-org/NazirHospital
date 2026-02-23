import { Request, Response } from 'express'
import { ConsentRecord } from '../models/ConsentRecord'
import { consentCreateSchema, consentQuerySchema } from '../validators/consent'

export async function list(req: Request, res: Response){
  const parsed = consentQuerySchema.safeParse(req.query)
  const { search, templateId, patientMrn, labPatientId, from, to, page = 1, limit = 20 } = parsed.success ? parsed.data as any : { page: 1, limit: 20 }
  const filter: any = {}
  if (templateId) filter.templateId = templateId
  if (patientMrn) filter.patientMrn = new RegExp(`^${patientMrn}$`, 'i')
  if (labPatientId) filter.labPatientId = labPatientId
  if (search){
    const rx = new RegExp(search, 'i')
    filter.$or = [ { patientName: rx }, { templateName: rx } ]
  }
  if (from || to){
    filter.signedAt = {}
    if (from) filter.signedAt.$gte = new Date(from).toISOString()
    if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.signedAt.$lte = end.toISOString() }
  }
  const pg = Math.max(1, Number(page||1))
  const lim = Math.max(1, Math.min(500, Number(limit||20)))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    ConsentRecord.find(filter).sort({ signedAt: -1 }).skip(skip).limit(lim).lean(),
    ConsentRecord.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total||0)/lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = consentCreateSchema.parse(req.body)
  const doc = await ConsentRecord.create({ ...data, actor: data.actor || ((req as any)?.user?.email || (req as any)?.user?.name || 'system') })
  res.status(201).json(doc)
}
