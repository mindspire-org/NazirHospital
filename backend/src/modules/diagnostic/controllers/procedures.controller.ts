import { Request, Response } from 'express'
import { DiagnosticProcedure } from '../models/Procedure'
import { diagnosticProcedureCreateSchema, diagnosticProcedureQuerySchema, diagnosticProcedureUpdateSchema } from '../validators/procedure'

export async function list(req: Request, res: Response) {
  const parsed = diagnosticProcedureQuerySchema.safeParse(req.query)
  const { q, status, page, limit } = parsed.success ? (parsed.data as any) : {}

  const filter: any = {}
  if (q) {
    const rx = new RegExp(String(q), 'i')
    filter.$or = [{ name: rx }, { department: rx }]
  }
  if (status) filter.status = status

  const lim = Math.min(1000, Number(limit || 100))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim

  const [items, total] = await Promise.all([
    DiagnosticProcedure.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    DiagnosticProcedure.countDocuments(filter),
  ])

  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response) {
  const data = diagnosticProcedureCreateSchema.parse(req.body)
  const doc = await DiagnosticProcedure.create(data)
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const patch = diagnosticProcedureUpdateSchema.parse(req.body)
  const doc = await DiagnosticProcedure.findByIdAndUpdate(id, patch, { new: true })
  if (!doc) return res.status(404).json({ message: 'Procedure not found' })
  res.json(doc)
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params
  await DiagnosticProcedure.findByIdAndDelete(id)
  res.json({ ok: true })
}
