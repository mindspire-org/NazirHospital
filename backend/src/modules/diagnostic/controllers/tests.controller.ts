import { Request, Response } from 'express'
import { DiagnosticTest } from '../models/Test'
import { diagnosticTestCreateSchema, diagnosticTestQuerySchema, diagnosticTestUpdateSchema } from '../validators/test'

export async function list(req: Request, res: Response){
  const q = diagnosticTestQuerySchema.safeParse(req.query)
  const { q: search, status, page, limit, lite } = q.success ? q.data as any : {}
  const filter: any = {}
  if (search){
    const rx = new RegExp(String(search), 'i')
    filter.$or = [ { name: rx }, { category: rx } ]
  }
  if (status) filter.status = status
  const lim = Math.min(1000, Number(limit || 100))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const query = DiagnosticTest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim)
  if (lite) query.select('name price category status createdAt updatedAt')
  const [items, total] = await Promise.all([
    query.lean(),
    DiagnosticTest.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total||0)/lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function get(req: Request, res: Response){
  const { id } = req.params
  const doc = await DiagnosticTest.findById(id).lean()
  if (!doc) return res.status(404).json({ message: 'Test not found' })
  res.json(doc)
}

export async function create(req: Request, res: Response){
  const data = diagnosticTestCreateSchema.parse(req.body)
  const doc = await DiagnosticTest.create(data)
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const patch = diagnosticTestUpdateSchema.parse(req.body)
  const doc = await DiagnosticTest.findByIdAndUpdate(id, patch, { new: true })
  if (!doc) return res.status(404).json({ message: 'Test not found' })
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await DiagnosticTest.findByIdAndDelete(id)
  res.json({ ok: true })
}
