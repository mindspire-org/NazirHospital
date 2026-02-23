import { Request, Response } from 'express'
import { HoldSale } from '../models/HoldSale'
import { holdSaleCreateSchema } from '../validators/hold_sale'

export async function list(req: Request, res: Response){
  const items = await HoldSale.find({}).sort({ createdAt: -1 }).limit(200).lean()
  res.json({ items })
}

export async function getOne(req: Request, res: Response){
  const id = String(req.params.id || '')
  const doc = await HoldSale.findById(id).lean()
  if (!doc) return res.status(404).json({ message: 'Not found' })
  res.json(doc)
}

export async function create(req: Request, res: Response){
  const data = holdSaleCreateSchema.parse(req.body)
  const createdAtIso = new Date().toISOString()
  const createdBy = (req as any).user?.username || (req as any).user?.name || 'pos'
  const doc = await HoldSale.create({ createdAtIso, createdBy, billDiscountPct: data.billDiscountPct || 0, lines: data.lines })
  res.status(201).json(doc)
}

export async function remove(req: Request, res: Response){
  const id = String(req.params.id || '')
  await HoldSale.findByIdAndDelete(id)
  res.json({ ok: true })
}
