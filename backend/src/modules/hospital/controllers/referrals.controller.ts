import { Request, Response } from 'express'
import { HospitalReferral } from '../models/Referral'
import { HospitalEncounter } from '../models/Encounter'
import { createReferralSchema, updateReferralStatusSchema } from '../validators/referral'

export async function create(req: Request, res: Response){
  const data = createReferralSchema.parse(req.body)
  const enc = await HospitalEncounter.findById(data.encounterId)
  if (!enc) return res.status(404).json({ error: 'Encounter not found' })
  const ref = await HospitalReferral.create({
    type: data.type,
    status: 'pending',
    patientId: enc.patientId,
    encounterId: data.encounterId,
    doctorId: data.doctorId,
    prescriptionId: data.prescriptionId,
    tests: data.tests || [],
    notes: data.notes || '',
  })
  res.status(201).json({ referral: ref })
}

export async function list(req: Request, res: Response){
  const q = req.query as any
  const crit: any = {}
  if (q.type) crit.type = String(q.type)
  if (q.status) crit.status = String(q.status)
  if (q.doctorId) crit.doctorId = String(q.doctorId)
  const from = q.from ? new Date(String(q.from)) : null
  const to = q.to ? new Date(String(q.to)) : null
  if (to) to.setHours(23,59,59,999)
  if (from || to) {
    crit.createdAt = {}
    if (from) crit.createdAt.$gte = from
    if (to) crit.createdAt.$lte = to
  }
  const page = q.page ? Math.max(1, parseInt(String(q.page))) : 1
  const limit = q.limit ? Math.max(1, Math.min(200, parseInt(String(q.limit)))) : 50

  const total = await HospitalReferral.countDocuments(crit)
  const rows = await HospitalReferral.find(crit)
    .sort({ createdAt: -1 })
    .skip((page-1)*limit)
    .limit(limit)
    .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
    .populate({ path: 'doctorId', select: 'name' })
    .lean()
  res.json({ referrals: rows, total, page, limit })
}

export async function updateStatus(req: Request, res: Response){
  const { id } = req.params as any
  const data = updateReferralStatusSchema.parse(req.body)
  const row = await HospitalReferral.findByIdAndUpdate(String(id), { $set: { status: data.status } }, { new: true })
    .populate({ path: 'encounterId', select: 'doctorId patientId startAt', populate: [{ path: 'doctorId', select: 'name' }, { path: 'patientId', select: 'fullName mrn' }] })
    .populate({ path: 'doctorId', select: 'name' })
    .lean()
  if (!row) return res.status(404).json({ error: 'Referral not found' })
  res.json({ referral: row })
}

export async function remove(req: Request, res: Response){
  const { id } = req.params as any
  const row = await HospitalReferral.findByIdAndDelete(String(id))
  if (!row) return res.status(404).json({ error: 'Referral not found' })
  res.json({ ok: true })
}
