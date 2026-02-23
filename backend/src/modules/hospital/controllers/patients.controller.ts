import { Request, Response } from 'express'
import { LabPatient } from '../../lab/models/Patient'

function normalizePhone(p?: string){
  if (!p) return ''
  const digits = String(p).replace(/\D/g, '')
  // normalize to last 10 or 11 digits commonly used
  if (digits.length > 11) return digits.slice(-11)
  return digits
}

export async function search(req: Request, res: Response){
  const q = req.query as any
  const mrn = String(q.mrn || '').trim()
  const name = String(q.name || '').trim()
  const fatherName = String(q.fatherName || '').trim()
  const phone = normalizePhone(String(q.phone || ''))
  const limit = Math.max(1, Math.min(50, parseInt(String(q.limit || '10')) || 10))

  const criteria: any[] = []
  if (mrn) criteria.push({ mrn: { $regex: new RegExp(mrn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } })
  if (name) criteria.push({ fullName: { $regex: new RegExp(name, 'i') } })
  if (fatherName) criteria.push({ fatherName: { $regex: new RegExp(fatherName, 'i') } })
  if (phone) criteria.push({ phoneNormalized: { $regex: new RegExp('^' + phone) } })

  const filter = criteria.length ? { $and: criteria } : {}
  const pats = await LabPatient.find(filter).limit(limit).lean()
  res.json({ patients: pats })
}
