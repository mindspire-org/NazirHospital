import { Request, Response } from 'express'
import { ProcedureCatalog } from '../models/ProcedureCatalog'
import { procedureCatalogCreateSchema, procedureCatalogQuerySchema, procedureCatalogUpdateSchema } from '../validators/procedure_catalog'

export async function list(req: Request, res: Response){
  const parsed = procedureCatalogQuerySchema.safeParse(req.query)
  const { search, page = 1, limit = 50 } = parsed.success ? parsed.data as any : { page: 1, limit: 50 }
  const filter: any = {}
  const s = String(search||'').trim()
  const useText = s.length >= 2
  if (s){
    if (useText){
      filter.$text = { $search: s }
    } else {
      filter.name = { $regex: new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
    }
  }
  const pg = Math.max(1, Number(page||1))
  const lim = Math.max(1, Math.min(500, Number(limit||50)))
  const skip = (pg - 1) * lim
  const baseFind = useText
    ? ProcedureCatalog.find(filter, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    : ProcedureCatalog.find(filter).sort({ createdAt: -1 })
  const [items, total] = await Promise.all([
    baseFind.skip(skip).limit(lim).lean(),
    ProcedureCatalog.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total||0)/lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = procedureCatalogCreateSchema.parse(req.body)
  const doc = await ProcedureCatalog.create({ ...data, createdAtIso: new Date().toISOString() })
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const id = String(req.params.id||'')
  const patch = procedureCatalogUpdateSchema.parse(req.body)
  const doc = await ProcedureCatalog.findByIdAndUpdate(id, patch, { new: true }).lean()
  if (!doc) return res.status(404).json({ message: 'Not found' })
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const id = String(req.params.id||'')
  await ProcedureCatalog.findByIdAndDelete(id)
  res.json({ ok: true })
}
