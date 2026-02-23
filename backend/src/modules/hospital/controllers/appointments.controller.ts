import { Request, Response } from 'express'
import { HospitalDoctorSchedule } from '../models/DoctorSchedule'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalAppointment } from '../models/Appointment'
import { HospitalToken } from '../models/Token'
import { LabPatient } from '../../lab/models/Patient'
import { createAppointmentSchema, updateAppointmentSchema, updateAppointmentStatusSchema } from '../validators/appointment'
import { HospitalDepartment } from '../models/Department'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalAuditLog } from '../models/AuditLog'
import { postOpdTokenJournal } from './finance_ledger'
import { nextGlobalMrn } from '../../../common/mrn'

function toMin(hhmm: string){ const [h,m] = (hhmm||'').split(':').map(x=>parseInt(x,10)||0); return h*60+m }
function fromMin(min: number){ const h = Math.floor(min/60).toString().padStart(2,'0'); const m = (min%60).toString().padStart(2,'0'); return `${h}:${m}` }
function computeSlotIndex(startTime: string, endTime: string, slotMinutes: number, apptStart: string){
  const start = toMin(startTime), end = toMin(endTime), ap = toMin(apptStart)
  if (ap < start || ap >= end) return null
  const delta = ap - start
  if (delta % (slotMinutes||15) !== 0) return null
  return Math.floor(delta / (slotMinutes||15)) + 1
}
function computeSlotStartEnd(startTime: string, slotMinutes: number, slotNo: number){
  const start = toMin(startTime) + (slotNo-1)*(slotMinutes||15)
  return { start: fromMin(start), end: fromMin(start + (slotMinutes||15)) }
}

function normalizePhone(p?: string){
  if (!p) return ''
  const digits = String(p).replace(/\D/g,'')
  if (digits.length > 11) return digits.slice(-11)
  return digits
}


function resolveOPDFeeSimple({ department, doctor, schedule }: any){
  // Prefer schedule fee if provided
  if (schedule){
    if (schedule.fee != null) return { fee: Number(schedule.fee||0), source: 'schedule' }
    if (schedule.followupFee != null) return { fee: Number(schedule.followupFee||0), source: 'schedule-followup' }
  }
  // Department-doctor mapping (if exists on department)
  if (doctor && Array.isArray(department?.doctorPrices)){
    const match = department.doctorPrices.find((p: any) => String(p.doctorId) === String(doctor._id))
    if (match && match.price != null) return { fee: match.price, source: 'department-mapping' }
  }
  // Doctor defaults
  if (doctor && doctor.opdBaseFee != null) return { fee: doctor.opdBaseFee, source: 'doctor' }
  // Department defaults
  return { fee: Number(department?.opdBaseFee || 0), source: 'department' }
}

export async function create(req: Request, res: Response){
  try{
    const data = createAppointmentSchema.parse(req.body)
    // Validate doctor and schedule
    const doctor = await HospitalDoctor.findById(data.doctorId).lean()
    if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })
    const sched: any = await HospitalDoctorSchedule.findById(data.scheduleId).lean()
    if (!sched) return res.status(400).json({ error: 'Invalid scheduleId' })
    if (String(sched.doctorId) !== String(data.doctorId)) return res.status(400).json({ error: 'Schedule does not belong to selected doctor' })
    const slotMinutes = Number(sched.slotMinutes || 15)

    let slotNo: number | null = null
    if (data.apptStart) {
      const idx = computeSlotIndex(sched.startTime, sched.endTime, slotMinutes, data.apptStart)
      if (!idx) return res.status(400).json({ error: 'apptStart outside schedule or not aligned to slot' })
      slotNo = idx
    } else if (data.slotNo) {
      slotNo = Number(data.slotNo)
    } else {
      return res.status(400).json({ error: 'Provide apptStart or slotNo' })
    }

    // Bounds check
    const totalSlots = Math.floor((toMin(sched.endTime) - toMin(sched.startTime)) / slotMinutes)
    if (slotNo < 1 || slotNo > totalSlots) return res.status(400).json({ error: 'slotNo out of range for schedule' })

    // Ensure slot free (consider both appointments and tokens)
    const clashAppt = await HospitalAppointment.findOne({ scheduleId: sched._id, slotNo, status: { $in: ['booked','confirmed','checked-in'] } }).lean()
    if (clashAppt) return res.status(409).json({ error: 'Selected slot already booked' })
    const clashTok = await HospitalToken.findOne({ scheduleId: sched._id, slotNo, status: { $nin: ['returned','cancelled'] } }).lean()
    if (clashTok) return res.status(409).json({ error: 'Selected slot already booked' })

    // Resolve patient link (do not create MRN for new)
    let patient: any = null
    if ((data as any).patientId){
      patient = await LabPatient.findById((data as any).patientId).lean()
      if (!patient) return res.status(404).json({ error: 'Patient not found' })
    } else if ((data as any).mrn){
      patient = await LabPatient.findOne({ mrn: (data as any).mrn }).lean()
      if (!patient) return res.status(404).json({ error: 'Patient not found' })
    }

    const se = computeSlotStartEnd(sched.startTime, slotMinutes, slotNo)

    const appt = await HospitalAppointment.create({
      dateIso: String(sched.dateIso),
      doctorId: String(data.doctorId),
      departmentId: data.departmentId || String(sched.departmentId||'' ) || undefined,
      scheduleId: String(sched._id),
      slotNo,
      slotStart: se.start,
      slotEnd: se.end,
      patientId: patient?._id || undefined,
      mrn: patient?.mrn || undefined,
      patientName: patient ? patient.fullName : (data.patientName || undefined),
      phoneNormalized: patient ? (patient.phoneNormalized || undefined) : normalizePhone((data as any).phone),
      gender: patient ? (patient.gender || undefined) : ((data as any).gender || undefined),
      age: patient ? (patient.age || undefined) : ((data as any).age || undefined),
      notes: (data as any).notes || undefined,
      status: 'booked',
    })

    res.status(201).json({ appointment: appt })
  }catch(e: any){
    if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
    if (e?.code === 11000) return res.status(409).json({ error: 'Duplicate appointment' })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function list(req: Request, res: Response){
  try{
    const q = req.query as any
    const crit: any = {}
    if (q.date) crit.dateIso = String(q.date)
    if (q.doctorId) crit.doctorId = String(q.doctorId)
    if (q.scheduleId) crit.scheduleId = String(q.scheduleId)
    if (q.status) crit.status = String(q.status)
    const rows = await HospitalAppointment.find(crit)
      .sort({ dateIso: 1, slotNo: 1, createdAt: 1 })
      .lean()
    res.json({ appointments: rows })
  }catch{ res.status(500).json({ error: 'Internal Server Error' }) }
}

export async function update(req: Request, res: Response){
  try{
    const id = String(req.params.id)
    const data = updateAppointmentSchema.parse(req.body)
    const existing: any = await HospitalAppointment.findById(id).lean()
    if (!existing) return res.status(404).json({ error: 'Appointment not found' })
    if (existing.status === 'cancelled') return res.status(400).json({ error: 'Cancelled appointment cannot be edited' })
    if (existing.tokenId) return res.status(400).json({ error: 'Converted appointment cannot be edited' })

    const patch: any = {}

    // patient snapshot edits
    if (data.patientName != null) patch.patientName = data.patientName
    if ((data as any).phone != null) patch.phoneNormalized = normalizePhone((data as any).phone)
    if (data.gender != null) patch.gender = data.gender
    if (data.age != null) patch.age = data.age
    if (data.notes != null) patch.notes = data.notes

    // reschedule edits
    const nextDoctorId = data.doctorId != null ? String(data.doctorId) : String(existing.doctorId || '')
    const nextScheduleId = data.scheduleId != null ? String(data.scheduleId) : String(existing.scheduleId || '')
    const wantsScheduleChange = (data.doctorId != null) || (data.scheduleId != null) || (data.apptStart != null) || (data.slotNo != null)

    if (wantsScheduleChange){
      if (!nextDoctorId) return res.status(400).json({ error: 'doctorId required for reschedule' })
      if (!nextScheduleId) return res.status(400).json({ error: 'scheduleId required for reschedule' })

      const doctor = await HospitalDoctor.findById(nextDoctorId).lean()
      if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })

      const sched: any = await HospitalDoctorSchedule.findById(nextScheduleId).lean()
      if (!sched) return res.status(400).json({ error: 'Invalid scheduleId' })
      if (String(sched.doctorId) !== String(nextDoctorId)) return res.status(400).json({ error: 'Schedule does not belong to selected doctor' })

      const slotMinutes = Number(sched.slotMinutes || 15)
      let slotNo: number | null = null
      if (data.apptStart) {
        const idx = computeSlotIndex(sched.startTime, sched.endTime, slotMinutes, data.apptStart)
        if (!idx) return res.status(400).json({ error: 'apptStart outside schedule or not aligned to slot' })
        slotNo = idx
      } else if (data.slotNo != null) {
        slotNo = Number(data.slotNo)
      } else if (existing.slotNo != null && String(existing.scheduleId||'') === String(nextScheduleId)) {
        slotNo = Number(existing.slotNo)
      } else {
        return res.status(400).json({ error: 'Provide apptStart or slotNo' })
      }

      const totalSlots = Math.floor((toMin(sched.endTime) - toMin(sched.startTime)) / slotMinutes)
      if (slotNo < 1 || slotNo > totalSlots) return res.status(400).json({ error: 'slotNo out of range for schedule' })

      const clashAppt = await HospitalAppointment.findOne({ _id: { $ne: existing._id }, scheduleId: sched._id, slotNo, status: { $in: ['booked','confirmed','checked-in'] } }).lean()
      if (clashAppt) return res.status(409).json({ error: 'Selected slot already booked' })
      const clashTok = await HospitalToken.findOne({ scheduleId: sched._id, slotNo, status: { $nin: ['returned','cancelled'] } }).lean()
      if (clashTok) return res.status(409).json({ error: 'Selected slot already booked' })

      const se = computeSlotStartEnd(sched.startTime, slotMinutes, slotNo)
      patch.doctorId = nextDoctorId
      patch.scheduleId = String(sched._id)
      patch.departmentId = String((sched as any).departmentId || existing.departmentId || '') || undefined
      patch.dateIso = String((sched as any).dateIso || existing.dateIso || '')
      patch.slotNo = slotNo
      patch.slotStart = se.start
      patch.slotEnd = se.end
    }

    const row = await HospitalAppointment.findByIdAndUpdate(id, { $set: patch }, { new: true })
    if (!row) return res.status(404).json({ error: 'Appointment not found' })
    res.json({ appointment: row })
  }catch(e:any){ if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' }); res.status(500).json({ error: 'Internal Server Error' }) }
}

export async function updateStatus(req: Request, res: Response){
  try{
    const id = String(req.params.id)
    const { status } = updateAppointmentStatusSchema.parse(req.body)
    const row = await HospitalAppointment.findByIdAndUpdate(id, { $set: { status } }, { new: true })
    if (!row) return res.status(404).json({ error: 'Appointment not found' })
    res.json({ appointment: row })
  }catch(e:any){ if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' }); res.status(500).json({ error: 'Internal Server Error' }) }
}

export async function remove(req: Request, res: Response){
  try{
    const id = String(req.params.id)
    const row = await HospitalAppointment.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Appointment not found' })
    res.json({ ok: true })
  }catch{ res.status(500).json({ error: 'Internal Server Error' }) }
}

export async function convertToToken(req: Request, res: Response){
  try{
    const id = String(req.params.id)
    const appt: any = await HospitalAppointment.findById(id).lean()
    if (!appt) return res.status(404).json({ error: 'Appointment not found' })
    if (appt.status === 'cancelled') return res.status(400).json({ error: 'Cancelled appointment cannot be converted' })
    if (!appt.scheduleId || !appt.slotNo) return res.status(400).json({ error: 'Appointment missing schedule/slot' })

    // If already converted
    if (appt.tokenId){
      const tok = await HospitalToken.findById(String(appt.tokenId)).lean()
      if (tok) return res.json({ token: tok, appointment: appt })
    }

    // Ensure slot not already taken by a token
    const clashTok = await HospitalToken.findOne({ scheduleId: appt.scheduleId, slotNo: appt.slotNo, status: { $nin: ['returned','cancelled'] } }).lean()
    if (clashTok) return res.status(409).json({ error: 'Slot already has a token' })

    // Load schedule, doctor, department
    const sched: any = await HospitalDoctorSchedule.findById(appt.scheduleId).lean()
    if (!sched) return res.status(400).json({ error: 'Invalid schedule' })
    const doctor: any = appt.doctorId ? await HospitalDoctor.findById(appt.doctorId).lean() : null
    const depCandidate =
      appt.departmentId ||
      sched.departmentId ||
      doctor?.primaryDepartmentId ||
      (Array.isArray(doctor?.departmentIds) ? doctor.departmentIds[0] : undefined)
    const departmentId = String(depCandidate || '')
    if (!departmentId) return res.status(400).json({ error: 'Department not set on schedule/appointment' })
    const department = await HospitalDepartment.findById(departmentId).lean()
    if (!department) return res.status(400).json({ error: 'Invalid departmentId' })

    // Resolve or create patient
    let patient: any = null
    if (appt.patientId){
      patient = await LabPatient.findById(appt.patientId)
      if (!patient) return res.status(404).json({ error: 'Linked patient not found' })
    } else {
      const mrn = await nextGlobalMrn()
      patient = await LabPatient.create({
        mrn,
        fullName: appt.patientName || 'Patient',
        phoneNormalized: appt.phoneNormalized || undefined,
        gender: appt.gender || undefined,
        age: appt.age || undefined,
        createdAtIso: new Date().toISOString(),
      })
    }

    // Create encounter
    const enc = await HospitalEncounter.create({
      patientId: patient._id,
      type: 'OPD',
      status: 'in-progress',
      departmentId,
      doctorId: appt.doctorId || undefined,
      startAt: new Date(),
      visitType: 'new',
      consultationFeeResolved: 0,
      feeSource: '',
    })

    // Resolve fee
    const feeInfo = resolveOPDFeeSimple({ department, doctor, schedule: sched })
    const finalFee = Math.max(0, Number(feeInfo.fee||0))

    const tokenNo = String(appt.slotNo)
    const dateIso = String(sched.dateIso)

    // Create token
    const tok = await HospitalToken.create({
      dateIso,
      tokenNo,
      patientId: patient._id,
      mrn: patient.mrn,
      patientName: patient.fullName,
      departmentId,
      doctorId: appt.doctorId || undefined,
      encounterId: enc._id,
      fee: finalFee,
      discount: 0,
      status: 'queued',
      scheduleId: appt.scheduleId,
      slotNo: appt.slotNo,
      slotStart: appt.slotStart || undefined,
      slotEnd: appt.slotEnd || undefined,
    })

    // Patch encounter fee resolution
    try { await HospitalEncounter.findByIdAndUpdate(enc._id, { $set: { consultationFeeResolved: finalFee, feeSource: feeInfo.source || 'schedule' } }) } catch {}

    // Finance journal
    try {
      await postOpdTokenJournal({
        tokenId: String((tok as any)._id),
        dateIso,
        fee: finalFee,
        doctorId: appt.doctorId || undefined,
        departmentId,
        patientId: String((patient as any)?._id || ''),
        patientName: String((patient as any)?.fullName || ''),
        mrn: String((patient as any)?.mrn || ''),
        tokenNo,
      })
    } catch (e) { console.warn('Finance posting failed for appointment convert', e) }

    // Link appointment and set status checked-in
    let updatedAppt: any = null
    try {
      updatedAppt = await HospitalAppointment.findByIdAndUpdate(id, { $set: { tokenId: (tok as any)._id, status: 'checked-in' } }, { new: true }).lean()
    } catch {}

    // Audit
    try {
      const actor = (req as any).user?.name || (req as any).user?.email || 'system'
      await HospitalAuditLog.create({
        actor,
        action: 'appointment_convert_token',
        label: 'APPT_CONVERT_TOKEN',
        method: req.method,
        path: req.originalUrl,
        at: new Date().toISOString(),
        detail: `Appointment -> Token #${tokenNo} — MRN ${patient.mrn} — Dept ${(department as any)?.name || departmentId} — Doctor ${(doctor as any)?.name || 'N/A'} — Fee ${finalFee}`,
      })
    } catch {}

    res.status(201).json({ token: tok, appointment: updatedAppt || appt })
  }catch(e: any){
    const msg = String(e?.message || '')
    console.warn('convertToToken failed', { msg, name: e?.name, code: e?.code, stack: e?.stack })
    if (msg.includes('E11000')) return res.status(409).json({ error: 'Duplicate token for this slot' })
    // If a downstream validation throws, surface it
    if (msg) return res.status(400).json({ error: msg })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
