import { Request, Response } from 'express'
import { ConsentTemplate } from '../models/ConsentTemplate'
import { consentTemplateCreateSchema, consentTemplateUpdateSchema, consentTemplateQuerySchema } from '../validators/consent_template'

export async function list(req: Request, res: Response){
  const parsed = consentTemplateQuerySchema.safeParse(req.query)
  const { search, page = 1, limit = 20 } = parsed.success ? parsed.data as any : { page: 1, limit: 20 }
  const filter: any = {}
  if (search) filter.name = { $regex: new RegExp(search, 'i') }
  const pg = Math.max(1, Number(page||1))
  const lim = Math.max(1, Math.min(500, Number(limit||20)))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    ConsentTemplate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    ConsentTemplate.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total||0)/lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = consentTemplateCreateSchema.parse(req.body)
  const doc = await ConsentTemplate.create({ ...data, createdAtIso: new Date().toISOString(), createdBy: (req as any)?.user?.email || (req as any)?.user?.name || 'system' })
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const id = String(req.params.id||'')
  const patch = consentTemplateUpdateSchema.parse(req.body)
  const doc = await ConsentTemplate.findByIdAndUpdate(id, patch, { new: true }).lean()
  if (!doc) return res.status(404).json({ message: 'Template not found' })
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const id = String(req.params.id||'')
  await ConsentTemplate.findByIdAndDelete(id)
  res.json({ ok: true })
}
