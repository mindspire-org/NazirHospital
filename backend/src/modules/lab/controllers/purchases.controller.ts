import { Request, Response } from 'express'
import { LabPurchase } from '../models/Purchase'
import { labPurchaseCreateSchema, labPurchaseQuerySchema } from '../validators/purchase'

export async function list(req: Request, res: Response){
  const parsed = labPurchaseQuerySchema.safeParse(req.query)
  const { from, to, search, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (from || to) {
    filter.date = {}
    if (from) filter.date.$gte = from
    if (to) filter.date.$lte = to
  }
  if (search){
    const rx = new RegExp(search, 'i')
    filter.$or = [ { invoice: rx }, { supplierName: rx }, { 'lines.name': rx } ]
  }
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await LabPurchase.countDocuments(filter)
  const items = await LabPurchase.find(filter).sort({ date: -1, invoice: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response){
  const data = labPurchaseCreateSchema.parse(req.body)
  const totalAmount = data.lines.reduce((s: number, l: any) => s + (l.buyPerPack || 0) * (l.packs || 0), 0)
  const doc = await LabPurchase.create({
    date: data.date,
    invoice: data.invoice,
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    totalAmount: Number(totalAmount.toFixed(2)),
    lines: data.lines.map((l: any) => ({
      ...l,
      totalItems: l.totalItems || (l.unitsPerPack || 1) * (l.packs || 0),
      buyPerUnit: l.buyPerUnit || ((l.unitsPerPack && l.buyPerPack) ? (l.buyPerPack / l.unitsPerPack) : 0),
      salePerUnit: l.salePerUnit || ((l.unitsPerPack && l.salePerPack) ? (l.salePerPack / l.unitsPerPack) : 0),
    }))
  })
  res.status(201).json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await LabPurchase.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function summary(req: Request, res: Response){
  const parsed = labPurchaseQuerySchema.safeParse(req.query)
  const { from, to } = parsed.success ? parsed.data : {}
  const match: any = {}
  if (from || to){
    match.date = {}
    if (from) match.date.$gte = from
    if (to) match.date.$lte = to
  }
  const agg = await LabPurchase.aggregate([
    { $match: match },
    { $group: { _id: null, totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } }, count: { $sum: 1 } } }
  ])
  const totalAmount = agg[0]?.totalAmount || 0
  const count = agg[0]?.count || 0
  res.json({ totalAmount: Number(totalAmount.toFixed(2)), count })
}
