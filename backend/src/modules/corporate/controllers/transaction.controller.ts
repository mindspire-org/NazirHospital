import { Request, Response } from 'express'
import { CorporateTransaction } from '../models/Transaction'
import { CorporateCompany } from '../models/Company'

export async function list(req: Request, res: Response){
  const { companyId, serviceType, refType, refId, status, patientMrn, from, to, page, limit } = req.query as any
  const q: any = {}
  if (companyId) q.companyId = companyId
  if (serviceType) q.serviceType = serviceType
  if (refType) q.refType = refType
  if (refId) q.refId = refId
  if (status) q.status = status
  if (patientMrn) q.patientMrn = patientMrn
  if (from || to){
    q.createdAt = {}
    if (from) q.createdAt.$gte = new Date(String(from))
    if (to) q.createdAt.$lte = new Date(String(to))
  }

  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim

  const [rows, total] = await Promise.all([
    CorporateTransaction.find(q).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    CorporateTransaction.countDocuments(q),
  ])

  const companyIds = Array.from(new Set((rows || []).map((t: any) => String(t.companyId || '')).filter(Boolean)))
  const companies = companyIds.length
    ? await CorporateCompany.find({ _id: { $in: companyIds as any } }).select('_id name').lean()
    : []
  const companyMap: Record<string, string> = {}
  for (const c of (companies || []) as any[]) companyMap[String(c._id)] = String(c.name || '')

  const out = (rows || []).map((t: any) => ({
    ...t,
    companyName: companyMap[String(t.companyId)] || undefined,
  }))

  res.json({
    transactions: out,
    items: out,
    total,
    page: pg,
    totalPages: Math.max(1, Math.ceil((total || 0) / lim)),
  })
}
