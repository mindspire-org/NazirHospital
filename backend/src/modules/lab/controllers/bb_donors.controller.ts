import { Request, Response } from 'express'
import { LabBBDonor } from '../models/BBDonor'
import { bbDonorCreateSchema, bbDonorQuerySchema, bbDonorUpdateSchema } from '../validators/bb_donor'

export async function list(req: Request, res: Response){
  const parsed = bbDonorQuerySchema.safeParse(req.query)
  const { q, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (q) {
    const rx = new RegExp(q, 'i')
    filter.$or = [ { name: rx }, { phone: rx }, { cnic: rx } ]
  }
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await LabBBDonor.countDocuments(filter)
  const items = await LabBBDonor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response){
  const data = bbDonorCreateSchema.parse(req.body)
  const code = (data as any).code || `DNR-${Date.now().toString().slice(-5)}`
  const doc = await LabBBDonor.create({ code, ...data })
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const data = bbDonorUpdateSchema.parse(req.body)
  const doc = await LabBBDonor.findByIdAndUpdate(id, { $set: data }, { new: true })
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await LabBBDonor.findByIdAndDelete(id)
  res.json({ ok: true })
}
