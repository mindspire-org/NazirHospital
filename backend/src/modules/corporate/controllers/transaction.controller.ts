import { Request, Response } from 'express'
import { CorporateTransaction } from '../models/Transaction'

export async function list(req: Request, res: Response){
  const { companyId, serviceType, refType, refId, status, patientMrn, from, to } = req.query as any
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
  const rows = await CorporateTransaction.find(q).sort({ createdAt: -1 }).lean()
  res.json({ transactions: rows })
}
