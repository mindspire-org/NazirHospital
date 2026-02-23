import { Request, Response } from 'express'
import { createOPDEncounterSchema } from '../validators/opd'
import { HospitalDepartment } from '../models/Department'
import { HospitalDoctor } from '../models/Doctor'
import { resolveOPDPrice } from '../../corporate/utils/price'
import { HospitalEncounter } from '../models/Encounter'
import { LabPatient } from '../../lab/models/Patient'
import { CorporateCompany } from '../../corporate/models/Company'

function resolveOPDFee({ department, doctor, visitType }: any){
  const isFollowup = visitType === 'followup'
  // 1) Department-level per-doctor mapping overrides if present
  if (doctor && Array.isArray(department.doctorPrices)){
    const match = department.doctorPrices.find((p: any) => String(p.doctorId) === String(doctor._id))
    if (match && match.price != null) return { fee: match.price, source: 'department-mapping' }
  }
  if (doctor){
    if (isFollowup && doctor.opdFollowupFee != null) return { fee: doctor.opdFollowupFee, source: 'followup-doctor' }
    if (doctor.opdBaseFee != null) return { fee: doctor.opdBaseFee, source: 'doctor' }
  }
  if (isFollowup && department.opdFollowupFee != null) return { fee: department.opdFollowupFee, source: 'followup-department' }
  return { fee: department.opdBaseFee, source: 'department' }
}

export async function createEncounter(req: Request, res: Response){
  const data = createOPDEncounterSchema.parse(req.body)

  const patient = await LabPatient.findById(data.patientId).lean()
  if (!patient) return res.status(404).json({ error: 'Patient not found' })

  const department = await HospitalDepartment.findById(data.departmentId).lean()
  if (!department) return res.status(400).json({ error: 'Invalid departmentId' })

  let doctor: any = null
  if (data.doctorId){
    doctor = await HospitalDoctor.findById(data.doctorId).lean()
    if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })
  }

  const { fee, source } = resolveOPDFee({ department, doctor, visitType: data.visitType })

  const enc = await HospitalEncounter.create({
    patientId: data.patientId,
    type: 'OPD',
    status: 'in-progress',
    departmentId: data.departmentId,
    doctorId: data.doctorId,
    startAt: new Date(),
    visitType: data.visitType,
    consultationFeeResolved: fee,
    feeSource: source,
    paymentRef: data.paymentRef,
  })

  res.status(201).json({ encounter: enc })
}

export async function quotePrice(req: Request, res: Response){
  const departmentId = String((req.query as any).departmentId || '')
  const doctorId = String((req.query as any).doctorId || '')
  const visitType = String((req.query as any).visitType || 'new')
  const corporateId = String((req.query as any).corporateId || '')
  if (!departmentId) return res.status(400).json({ error: 'departmentId is required' })
  if (corporateId){
    const comp = await CorporateCompany.findById(corporateId).lean()
    if (!comp) return res.status(400).json({ error: 'Invalid corporateId' })
    if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })
  }
  const department = await HospitalDepartment.findById(departmentId).lean()
  if (!department) return res.status(400).json({ error: 'Invalid departmentId' })
  let doctor: any = null
  if (doctorId){
    doctor = await HospitalDoctor.findById(doctorId).lean()
    if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })
  }
  const { fee, source } = resolveOPDFee({ department, doctor, visitType })
  let corporate: any = null
  if (corporateId){
    try {
      const corp = await resolveOPDPrice({ companyId: corporateId, departmentId, doctorId: doctorId || undefined, visitType: visitType as any, defaultPrice: fee })
      corporate = { price: corp.price, appliedRuleId: corp.appliedRuleId, mode: corp.mode, value: corp.value }
    } catch {}
  }
  res.json({ fee, feeSource: source, corporate })
}
