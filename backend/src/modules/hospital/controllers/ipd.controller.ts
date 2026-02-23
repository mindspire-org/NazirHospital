import { Request, Response } from 'express'
import { createIPDAdmissionSchema, dischargeIPDSchema, transferBedSchema } from '../validators/ipd'
import { HospitalDepartment } from '../models/Department'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalEncounter } from '../models/Encounter'
import { LabPatient } from '../../lab/models/Patient'
import { HospitalBed } from '../models/Bed'
import { HospitalToken } from '../models/Token'
import { z } from 'zod'
import { HospitalCounter } from '../models/Counter'
import { HospitalAuditLog } from '../models/AuditLog'
import { CorporateCompany } from '../../corporate/models/Company'

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

export async function admit(req: Request, res: Response){
  const data = createIPDAdmissionSchema.parse(req.body)

  if ((data as any).corporateId){
    const comp = await CorporateCompany.findById(String((data as any).corporateId)).lean()
    if (!comp) return res.status(400).json({ error: 'Invalid corporateId' })
    if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })
  }

  const patient = await LabPatient.findById(data.patientId).lean()
  if (!patient) return res.status(404).json({ error: 'Patient not found' })

  const department = await HospitalDepartment.findById(data.departmentId).lean()
  if (!department) return res.status(400).json({ error: 'Invalid departmentId' })

  if (data.doctorId){
    const doctor = await HospitalDoctor.findById(data.doctorId).lean()
    if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })
  }

  // If a bed is specified, ensure it's available before creating encounter
  let bed: any = null
  if (data.bedId){
    bed = await HospitalBed.findById(data.bedId)
    if (!bed) return res.status(400).json({ error: 'Invalid bedId' })
    if (bed.status === 'occupied') return res.status(400).json({ error: 'Bed is already occupied' })
  }

  const enc = await HospitalEncounter.create({
    patientId: data.patientId,
    type: 'IPD',
    status: 'admitted',
    departmentId: data.departmentId,
    doctorId: data.doctorId,
    corporateId: (data as any).corporateId || undefined,
    corporatePreAuthNo: (data as any).corporatePreAuthNo,
    corporateCoPayPercent: (data as any).corporateCoPayPercent,
    corporateCoverageCap: (data as any).corporateCoverageCap,
    startAt: new Date(),
    wardId: data.wardId,
    bedId: data.bedId,
    deposit: data.deposit,
    admissionNo: await nextAdmissionNo(),
  })

  // Occupy bed if provided
  if (bed){
    bed.status = 'occupied'
    bed.occupiedByEncounterId = enc._id as any
    await bed.save()
  }

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'ipd_admit',
      label: 'IPD_ADMIT',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Admission ${enc.admissionNo || enc._id}`,
    })
  } catch {}

  res.status(201).json({ encounter: enc })
}

export async function discharge(req: Request, res: Response){
  const data = dischargeIPDSchema.parse(req.body)
  const id = req.params.id
  const enc = await HospitalEncounter.findById(id)
  if (!enc) return res.status(404).json({ error: 'Encounter not found' })
  if (enc.type !== 'IPD') return res.status(400).json({ error: 'Not an IPD encounter' })
  if (enc.status === 'discharged'){
    // If already discharged, allow updating discharge timestamp when provided
    if (data.endAt){
      try { enc.endAt = new Date(data.endAt) } catch {}
      await enc.save()
      return res.json({ encounter: enc })
    }
    return res.status(400).json({ error: 'Already discharged' })
  }
  enc.status = 'discharged'
  enc.endAt = data.endAt ? new Date(data.endAt) : new Date()
  await enc.save()
  // Free bed if occupied by this encounter
  if (enc.bedId){
    const bed = await HospitalBed.findById(enc.bedId)
    if (bed && String(bed.occupiedByEncounterId || '') === String(enc._id)){
      bed.status = 'available'
      bed.occupiedByEncounterId = undefined as any
      await bed.save()
    }
  }
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'ipd_discharge',
      label: 'IPD_DISCHARGE',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Admission ${enc.admissionNo || enc._id} discharged`,
    })
  } catch {}
  res.json({ encounter: enc })
}

export async function list(req: Request, res: Response){
  const q = req.query as any
  const criteria: any = { type: 'IPD' }
  const status = String(q.status || '')
  const doctorId = String(q.doctorId || '')
  const departmentId = String(q.departmentId || '')
  const from = String(q.from || '')
  const to = String(q.to || '')
  const search = String(q.q || '').trim().toLowerCase()
  const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
  const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
  const patientId = String(q.patientId || '')
  if (status) criteria.status = status
  if (doctorId) criteria.doctorId = doctorId
  if (departmentId) criteria.departmentId = departmentId
  if (patientId) criteria.patientId = patientId
  if (from || to){
    criteria.startAt = {}
    if (from) criteria.startAt.$gte = new Date(from)
    if (to) {
      const t = new Date(to)
      t.setHours(23,59,59,999)
      criteria.startAt.$lte = t
    }
  }
  let rows = await HospitalEncounter.find(criteria)
    .sort({ startAt: -1 })
    .populate('patientId', 'mrn fullName phoneNormalized cnicNormalized')
    .populate('doctorId', 'name')
    .populate('departmentId', 'name')
    .lean()
  if (search){
    rows = rows.filter((r: any)=>{
      const p = r.patientId as any
      const mrn = (p?.mrn || '').toLowerCase()
      const name = (p?.fullName || '').toLowerCase()
      return mrn.includes(search) || name.includes(search)
    })
  }
  const bedIds = Array.from(new Set((rows as any[]).map(r => r.bedId).filter(Boolean))) as string[]
  if (bedIds.length){
    const beds = await HospitalBed.find({ _id: { $in: bedIds } }).lean()
    const map = Object.fromEntries(beds.map(b => [String((b as any)._id), b])) as Record<string, any>
    rows = rows.map((r: any) => ({ ...r, bedLabel: r.bedId ? (map[String(r.bedId)]?.label) : undefined }))
  }
  const total = rows.length
  const start = (page - 1) * limit
  const paged = rows.slice(start, start + limit)
  res.json({ admissions: paged, total, page, limit })
}

export async function getById(req: Request, res: Response){
  const { id } = req.params as any
  let enc: any = await HospitalEncounter.findById(String(id))
    .populate('patientId', 'mrn fullName phoneNormalized cnicNormalized address gender age')
    .populate('doctorId', 'name')
    .populate('departmentId', 'name')
    .lean()
  if (!enc) return res.status(404).json({ error: 'Encounter not found' })
  if (enc.type !== 'IPD') return res.status(400).json({ error: 'Not an IPD encounter' })
  if (enc.bedId){
    const bed = await HospitalBed.findById(enc.bedId).lean()
    if (bed) enc = { ...enc, bedLabel: (bed as any).label }
  }
  return res.json({ encounter: enc })
}

export async function transferBed(req: Request, res: Response){
  const id = req.params.id
  const data = transferBedSchema.parse(req.body)
  const enc = await HospitalEncounter.findById(id)
  if (!enc) return res.status(404).json({ error: 'Encounter not found' })
  if (enc.type !== 'IPD') return res.status(400).json({ error: 'Not an IPD encounter' })
  if (enc.status === 'discharged') return res.status(400).json({ error: 'Encounter already discharged' })
  const newBed = await HospitalBed.findById(data.newBedId)
  if (!newBed) return res.status(400).json({ error: 'Invalid newBedId' })
  if (newBed.status === 'occupied') return res.status(400).json({ error: 'New bed is already occupied' })
  // Free old bed if it was occupied by this encounter
  if (enc.bedId){
    const oldBed = await HospitalBed.findById(enc.bedId)
    if (oldBed && String(oldBed.occupiedByEncounterId || '') === String(enc._id)){
      oldBed.status = 'available'
      oldBed.occupiedByEncounterId = undefined as any
      await oldBed.save()
    }
  }
  // Occupy new bed and update encounter
  enc.bedId = String(newBed._id)
  await enc.save()
  newBed.status = 'occupied'
  newBed.occupiedByEncounterId = enc._id as any
  await newBed.save()
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'ipd_transfer_bed',
      label: 'IPD_TRANSFER_BED',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Admission ${enc.admissionNo || enc._id} -> new bed ${newBed.label || data.newBedId}`,
    })
  } catch {}
  res.json({ encounter: enc })
}

export async function admitFromToken(req: Request, res: Response){
  const schema = z.object({
    tokenId: z.string().min(1),
    bedId: z.string().optional(),
    deposit: z.number().optional(),
    departmentId: z.string().optional(),
    doctorId: z.string().optional(),
    markTokenCompleted: z.boolean().optional(),
  })
  const data = schema.parse(req.body)
  const tok = await HospitalToken.findById(data.tokenId)
  if (!tok) return res.status(404).json({ error: 'Token not found' })
  // Validate token-associated corporate company if present
  try {
    const corpId = (tok as any)?.corporateId ? String((tok as any).corporateId) : ''
    if (corpId){
      const comp = await CorporateCompany.findById(corpId).lean()
      if (!comp) return res.status(400).json({ error: 'Invalid corporateId on token' })
      if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })
    }
  } catch {}
  const patientId = (tok as any).patientId as any
  if (!patientId) return res.status(400).json({ error: 'Token has no patientId' })
  const patient = await LabPatient.findById(patientId).lean()
  if (!patient) return res.status(404).json({ error: 'Patient not found' })
  // Department/doctor derive from token unless overridden
  const departmentId = data.departmentId || String((tok as any).departmentId || '')
  const doctorId = data.doctorId || (tok as any).doctorId || undefined
  if (!departmentId) return res.status(400).json({ error: 'departmentId is required (token missing and not provided)' })
  const department = await HospitalDepartment.findById(departmentId).lean()
  if (!department) return res.status(400).json({ error: 'Invalid departmentId' })
  if (doctorId){
    const doc = await HospitalDoctor.findById(doctorId).lean()
    if (!doc) return res.status(400).json({ error: 'Invalid doctorId' })
  }
  // Validate bed if provided
  let bed: any = null
  if (data.bedId){
    bed = await HospitalBed.findById(data.bedId)
    if (!bed) return res.status(400).json({ error: 'Invalid bedId' })
    if (bed.status === 'occupied') return res.status(400).json({ error: 'Bed is already occupied' })
  }
  // Create IPD encounter
  const enc = await HospitalEncounter.create({
    patientId,
    type: 'IPD',
    status: 'admitted',
    departmentId,
    doctorId,
    corporateId: ((tok as any)?.corporateId) || undefined,
    startAt: new Date(),
    bedId: data.bedId,
    deposit: data.deposit,
    admissionNo: await nextAdmissionNo(),
  })
  if (bed){
    bed.status = 'occupied'
    bed.occupiedByEncounterId = enc._id as any
    await bed.save()
  }
  // Optionally mark OPD token completed
  const mark = data.markTokenCompleted !== false
  if (mark){
    ;(tok as any).status = 'completed'
    await tok.save()
  }
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'ipd_admit_from_token',
      label: 'IPD_ADMIT_FROM_TOKEN',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${String((tok as any)?._id || data.tokenId)} -> Admission ${enc.admissionNo || enc._id}`,
    })
  } catch {}
  res.status(201).json({ encounter: enc, token: tok })
}
