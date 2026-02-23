import { Request, Response } from 'express'
import { isValidObjectId } from 'mongoose'
import { HospitalIpdReferral } from '../models/IpdReferral'
import { LabPatient } from '../../lab/models/Patient'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalDepartment } from '../models/Department'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalBed } from '../models/Bed'
import { HospitalCounter } from '../models/Counter'
import { HospitalToken } from '../models/Token'
import { admitFromReferralSchema, createIpdReferralSchema, updateIpdReferralSchema, updateIpdReferralStatusSchema } from '../validators/ipd_referral'

async function nextReferralSerial(){
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const yyyymm = `${yyyy}${mm}`
  const key = `ipd_ref_${yyyymm}`
  const c = await HospitalCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const seq = String((c as any)?.seq || 1).padStart(5,'0')
  return `REF-${yyyymm}-${seq}`
}

async function nextTokenNo(){
  const dateIso = new Date().toISOString().slice(0,10)
  const key = `opd_token_${dateIso}`
  const c = await HospitalCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const seq = String((c as any)?.seq || 1).padStart(3,'0')
  return { tokenNo: seq, dateIso }
}

async function nextAdmissionNo(){
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const yyyymm = `${yyyy}${mm}`
  const key = `ipd_adm_${yyyymm}`
  const c = await HospitalCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const seq = String((c as any)?.seq || 1).padStart(3,'0')
  return `ADM-${yyyymm}-${seq}`
}

export async function create(req: Request, res: Response){
  const data = createIpdReferralSchema.parse(req.body)
  const patient = await LabPatient.findById(data.patientId).lean()
  if (!patient) return res.status(404).json({ error: 'Patient not found' })

  let departmentName: string | undefined
  let doctorName: string | undefined
  let referredBy: any = undefined
  if (data.referredByDoctorId && isValidObjectId(data.referredByDoctorId)){
    const d = await HospitalDoctor.findById(data.referredByDoctorId).lean()
    if (d) referredBy = { doctorId: String((d as any)._id), doctorName: (d as any).name }
  }
  if (data.referredTo?.departmentId && isValidObjectId(data.referredTo.departmentId)){
    const dep = await HospitalDepartment.findById(data.referredTo.departmentId).lean()
    departmentName = (dep as any)?.name
  }
  if (data.referredTo?.doctorId && isValidObjectId(data.referredTo.doctorId)){
    const doc = await HospitalDoctor.findById(data.referredTo.doctorId).lean()
    doctorName = (doc as any)?.name
  }

  const serial = await nextReferralSerial()

  const row = await HospitalIpdReferral.create({
    serial,
    status: 'New',
    patientId: data.patientId,
    patientSnapshot: {
      mrn: (patient as any).mrn,
      fullName: (patient as any).fullName,
      fatherHusbandName: (patient as any).fatherName,
      cnic: (patient as any).cnicNormalized,
      phone: (patient as any).phoneNormalized,
      gender: (patient as any).gender,
      address: (patient as any).address,
    },
    referredBy,
    referredTo: {
      departmentId: data.referredTo?.departmentId,
      departmentName,
      doctorId: data.referredTo?.doctorId,
      doctorName,
    },
    referralDate: data.referralDate ? new Date(data.referralDate) : undefined,
    referralTime: data.referralTime,
    reasonOfReferral: data.reasonOfReferral,
    provisionalDiagnosis: data.provisionalDiagnosis,
    vitals: data.vitals,
    condition: data.condition,
    remarks: data.remarks,
    signStamp: data.signStamp,
    statusHistory: [{ action: 'create', note: '', at: new Date() }],
  })
  res.status(201).json({ referral: row })
}

export async function list(req: Request, res: Response){
  const q = req.query as any
  const crit: any = {}
  if (q.status) crit.status = String(q.status)
  if (q.departmentId) crit['referredTo.departmentId'] = String(q.departmentId)
  if (q.doctorId) crit['referredTo.doctorId'] = String(q.doctorId)
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

  let rows = await HospitalIpdReferral.find(crit).sort({ createdAt: -1 }).lean()
  const search = String(q.q || '').trim().toLowerCase()
  if (search){
    rows = rows.filter((r: any)=>{
      const p = r.patientSnapshot || {}
      const s = `${r.serial||''} ${(p.mrn||'')} ${(p.fullName||'')}`.toLowerCase()
      return s.includes(search)
    })
  }
  const total = rows.length
  const start = (page-1)*limit
  const paged = rows.slice(start, start+limit)
  res.json({ referrals: paged, total, page, limit })
}

export async function getById(req: Request, res: Response){
  const { id } = req.params as any
  const row = await HospitalIpdReferral.findById(String(id)).lean()
  if (!row) return res.status(404).json({ error: 'Referral not found' })
  res.json({ referral: row })
}

export async function update(req: Request, res: Response){
  const { id } = req.params as any
  const data = updateIpdReferralSchema.parse(req.body)
  const patch: any = { ...data }
  if (data.referralDate) patch.referralDate = new Date(data.referralDate)
  const row = await HospitalIpdReferral.findByIdAndUpdate(String(id), { $set: patch }, { new: true }).lean()
  if (!row) return res.status(404).json({ error: 'Referral not found' })
  res.json({ referral: row })
}

export async function updateStatus(req: Request, res: Response){
  const { id } = req.params as any
  const data = updateIpdReferralStatusSchema.parse(req.body)
  const map: any = { accept: 'Accepted', reject: 'Rejected', reopen: 'New' }
  const status = map[data.action]
  const row = await HospitalIpdReferral.findByIdAndUpdate(String(id), { $set: { status }, $push: { statusHistory: { at: new Date(), action: data.action, note: data.note } } }, { new: true }).lean()
  if (!row) return res.status(404).json({ error: 'Referral not found' })
  res.json({ referral: row })
}

export async function admit(req: Request, res: Response){
  const { id } = req.params as any
  const data = admitFromReferralSchema.parse(req.body)
  const ref = await HospitalIpdReferral.findById(String(id))
  if (!ref) return res.status(404).json({ error: 'Referral not found' })
  if ((ref as any).status === 'Admitted') return res.status(400).json({ error: 'Already admitted' })
  const patientId = String((ref as any).patientId)
  if (!patientId) return res.status(400).json({ error: 'Referral missing patientId' })

  // Validate department and doctor
  if (!isValidObjectId(data.departmentId)) return res.status(400).json({ error: 'Invalid departmentId' })
  const dep = await HospitalDepartment.findById(data.departmentId).lean()
  if (!dep) return res.status(400).json({ error: 'Invalid departmentId' })
  if (data.doctorId){
    if (!isValidObjectId(data.doctorId)) return res.status(400).json({ error: 'Invalid doctorId' })
    const doc = await HospitalDoctor.findById(data.doctorId).lean()
    if (!doc) return res.status(400).json({ error: 'Invalid doctorId' })
  }
  // Validate bed
  let bed: any = null
  if (data.bedId){
    if (!isValidObjectId(data.bedId)) return res.status(400).json({ error: 'Invalid bedId' })
    bed = await HospitalBed.findById(data.bedId)
    if (!bed) return res.status(400).json({ error: 'Invalid bedId' })
    if (bed.status === 'occupied') return res.status(400).json({ error: 'Bed is already occupied' })
  }

  const enc = await HospitalEncounter.create({
    patientId,
    type: 'IPD',
    status: 'admitted',
    departmentId: data.departmentId,
    doctorId: data.doctorId,
    startAt: new Date(),
    wardId: data.wardId,
    bedId: data.bedId,
    deposit: data.deposit,
    admissionNo: await nextAdmissionNo(),
  })

  if (bed){
    bed.status = 'occupied'
    bed.occupiedByEncounterId = enc._id as any
    await bed.save()
  }

  ;(ref as any).status = 'Admitted'
  ;(ref as any).admittedEncounterId = enc._id as any
  ;(ref as any).statusHistory = ([...(ref as any).statusHistory || [], { at: new Date(), action: 'admit', note: '' }])
  await ref.save()

  // Also generate a token so it appears in token history
  try {
    const { tokenNo, dateIso } = await nextTokenNo()
    const pat = await LabPatient.findById(patientId).lean()
    const fee = (data as any).tokenFee != null ? Number((data as any).tokenFee) : (bed ? (bed as any).charges : undefined)
    await HospitalToken.create({
      dateIso,
      tokenNo,
      patientId,
      mrn: (pat as any)?.mrn,
      patientName: (pat as any)?.fullName,
      departmentId: data.departmentId,
      doctorId: data.doctorId,
      encounterId: enc._id as any,
      fee,
      status: 'completed',
    })
  } catch (e) {
    // do not fail admission if token creation fails
    console.warn('Failed to create token for IPD referral admit', e)
  }

  res.status(201).json({ encounter: enc, referral: ref })
}
