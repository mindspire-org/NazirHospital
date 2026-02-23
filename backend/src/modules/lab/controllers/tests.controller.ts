import { Request, Response } from 'express'
import { LabTest } from '../models/Test'
import { testCreateSchema, testQuerySchema, testUpdateSchema } from '../validators/test'

export async function list(req: Request, res: Response){
  const q = testQuerySchema.safeParse(req.query)
  const { q: search, page, limit } = q.success ? q.data as any : {}
  const filter: any = {}
  if (search){
    const rx = new RegExp(String(search), 'i')
    filter.$or = [ { name: rx }, { parameter: rx }, { unit: rx } ]
  }
  const lim = Math.min(1000, Number(limit || 50))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    LabTest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    LabTest.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total||0)/lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = testCreateSchema.parse(req.body)
  const doc = await LabTest.create(data)
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const patch = testUpdateSchema.parse(req.body)
  const doc = await LabTest.findByIdAndUpdate(id, patch, { new: true })
  if (!doc) return res.status(404).json({ message: 'Test not found' })
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await LabTest.findByIdAndDelete(id)
  res.json({ ok: true })
}
