import { Request, Response } from 'express'
import { LabBBBag } from '../models/BBBag'
import { bbBagCreateSchema, bbBagQuerySchema, bbBagUpdateSchema } from '../validators/bb_bag'

export async function list(req: Request, res: Response){
  const parsed = bbBagQuerySchema.safeParse(req.query)
  const { q, status, type, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (q) {
    const rx = new RegExp(q, 'i')
    filter.$or = [ { bagId: rx }, { donorName: rx } ]
  }
  if (status) filter.status = status
  if (type) filter.bloodType = type
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await LabBBBag.countDocuments(filter)
  const items = await LabBBBag.find(filter).sort({ createdAt: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response){
  const data = bbBagCreateSchema.parse(req.body)
  const doc = await LabBBBag.create(data)
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const data = bbBagUpdateSchema.parse(req.body)
  const doc = await LabBBBag.findByIdAndUpdate(id, { $set: data }, { new: true })
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await LabBBBag.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function summary(req: Request, res: Response){
  const total = await LabBBBag.countDocuments({})
  const items = await LabBBBag.find({}, { bloodType: 1, expiryDate: 1 }).lean()
  const now = Date.now()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  let expiringSoon = 0
  const counts: Record<string, number> = {}
  for (const b of items){
    const t = (b as any).bloodType || ''
    if (t) counts[t] = (counts[t] || 0) + 1
    const exp = (b as any).expiryDate
    if (exp){
      const d = new Date(exp).getTime()
      const diff = d - now
      if (diff >= 0 && diff <= sevenDays) expiringSoon++
    }
  }
  const critical = ['O-','AB-']
  const shortages = critical.filter(g => (counts[g] || 0) === 0)
  res.json({ total, expiringSoon, shortages, countsByType: counts })
}
