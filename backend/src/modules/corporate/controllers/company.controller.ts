import { Request, Response } from 'express'
import { CorporateCompany } from '../models/Company'

export async function list(_req: Request, res: Response){
  const rows = await CorporateCompany.find({}).sort({ name: 1 }).lean()
  res.json({ companies: rows })
}

export async function create(req: Request, res: Response){
  const data = req.body || {}
  if (!data.name) return res.status(400).json({ error: 'name is required' })
  const doc = await CorporateCompany.create({
    name: String(data.name),
    code: data.code,
    contactName: data.contactName,
    phone: data.phone,
    email: data.email,
    address: data.address,
    terms: data.terms,
    billingCycle: data.billingCycle,
    active: data.active !== false,
  })
  res.status(201).json({ company: doc })
}

export async function update(req: Request, res: Response){
  const { id } = req.params as any
  const data = req.body || {}
  const patch: any = { ...data }
  const doc = await CorporateCompany.findByIdAndUpdate(id, patch, { new: true })
  if (!doc) return res.status(404).json({ error: 'Company not found' })
  res.json({ company: doc })
}

export async function remove(req: Request, res: Response){
  const { id } = req.params as any
  await CorporateCompany.findByIdAndDelete(id)
  res.json({ ok: true })
}
