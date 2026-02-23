import { Request, Response } from 'express'
import { AestheticDoctorSchedule } from '../models/DoctorSchedule'
import { AestheticDoctor } from '../models/Doctor'
import { AestheticAppointment } from '../models/Appointment'
import { AestheticToken } from '../models/Token'
import { AestheticCounter } from '../models/Counter'
import { LabPatient } from '../../lab/models/Patient'
import { nextGlobalMrn } from '../../../common/mrn'
import { createAppointmentSchema, updateAppointmentSchema, updateAppointmentStatusSchema } from '../validators/appointment'
import { computeSlotIndex, computeSlotStartEnd } from './doctor_schedule.controller'

function toMin(hhmm: string){ const [h,m] = (hhmm||'').split(':').map(x=>parseInt(x,10)||0); return h*60+m }

function normalizePhone(p?: string){
  if (!p) return ''
  const digits = String(p).replace(/\D/g,'')
  if (digits.length > 11) return digits.slice(-11)
  return digits
}

async function allocTokenNumber(){
  const key = 'aesthetic_tok_global'
  let c: any = await AestheticCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  if (c && Number(c.seq) === 1) {
    try {
      const docs: any[] = await AestheticToken.find({ number: { $type: 'number' } }).select('number').lean()
      const maxSeq = (docs || []).reduce((mx: number, t: any) => {
        const n = Number(t?.number || 0)
        return Number.isFinite(n) ? Math.max(mx, n) : mx
      }, 0)
      if (maxSeq > 0) {
        c = await AestheticCounter.findOneAndUpdate({ _id: key, seq: 1 }, { $set: { seq: maxSeq + 1 } }, { new: true }) || c
      }
    } catch {}
  }
  return Number((c as any)?.seq || 1) || 1
}

export async function create(req: Request, res: Response){
  try{
    const data = createAppointmentSchema.parse(req.body)

    const doctor = await AestheticDoctor.findById(data.doctorId).lean()
    if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })

    const sched: any = await AestheticDoctorSchedule.findById(data.scheduleId).lean()
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

    const totalSlots = Math.floor((toMin(sched.endTime) - toMin(sched.startTime)) / slotMinutes)
    if (slotNo < 1 || slotNo > totalSlots) return res.status(400).json({ error: 'slotNo out of range for schedule' })

    const clashAppt = await AestheticAppointment.findOne({ scheduleId: sched._id, slotNo, status: { $in: ['booked','confirmed','checked-in'] } }).lean()
    if (clashAppt) return res.status(409).json({ error: 'Selected slot already booked' })

    const clashTok = await AestheticToken.findOne({ scheduleId: String(sched._id), slotNo, status: { $nin: ['returned','cancelled'] } }).lean() as any
    if (clashTok) return res.status(409).json({ error: 'Selected slot already booked' })

    let patient: any = null
    if ((data as any).patientId){
      patient = await LabPatient.findById((data as any).patientId).lean()
      if (!patient) return res.status(404).json({ error: 'Patient not found' })
    } else if ((data as any).mrn){
      patient = await LabPatient.findOne({ mrn: (data as any).mrn }).lean()
      if (!patient) return res.status(404).json({ error: 'Patient not found' })
    }

    const se = computeSlotStartEnd(sched.startTime, slotMinutes, slotNo)

    const appt = await AestheticAppointment.create({
      dateIso: String(sched.dateIso),
      doctorId: String(data.doctorId),
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
    const rows = await AestheticAppointment.find(crit)
      .sort({ dateIso: 1, slotNo: 1, createdAt: 1 })
      .lean()
    res.json({ appointments: rows })
  }catch{ res.status(500).json({ error: 'Internal Server Error' }) }
}

export async function update(req: Request, res: Response){
  try{
    const id = String(req.params.id)
    const data = updateAppointmentSchema.parse(req.body)
    const existing: any = await AestheticAppointment.findById(id).lean()
    if (!existing) return res.status(404).json({ error: 'Appointment not found' })
    if (existing.status === 'cancelled') return res.status(400).json({ error: 'Cancelled appointment cannot be edited' })
    if (existing.tokenId) return res.status(400).json({ error: 'Converted appointment cannot be edited' })

    const patch: any = {}

    if (data.patientName != null) patch.patientName = data.patientName
    if ((data as any).phone != null) patch.phoneNormalized = normalizePhone((data as any).phone)
    if (data.gender != null) patch.gender = data.gender
    if (data.age != null) patch.age = data.age
    if (data.notes != null) patch.notes = data.notes

    const nextDoctorId = data.doctorId != null ? String(data.doctorId) : String(existing.doctorId || '')
    const nextScheduleId = data.scheduleId != null ? String(data.scheduleId) : String(existing.scheduleId || '')
    const wantsScheduleChange = (data.doctorId != null) || (data.scheduleId != null) || (data.apptStart != null) || (data.slotNo != null)

    if (wantsScheduleChange){
      if (!nextDoctorId) return res.status(400).json({ error: 'doctorId required for reschedule' })
      if (!nextScheduleId) return res.status(400).json({ error: 'scheduleId required for reschedule' })

      const doctor = await AestheticDoctor.findById(nextDoctorId).lean()
      if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })

      const sched: any = await AestheticDoctorSchedule.findById(nextScheduleId).lean()
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

      const clashAppt = await AestheticAppointment.findOne({ _id: { $ne: existing._id }, scheduleId: sched._id, slotNo, status: { $in: ['booked','confirmed','checked-in'] } }).lean()
      if (clashAppt) return res.status(409).json({ error: 'Selected slot already booked' })

      const clashTok = await AestheticToken.findOne({ scheduleId: String(sched._id), slotNo, status: { $nin: ['returned','cancelled'] } }).lean() as any
      if (clashTok) return res.status(409).json({ error: 'Selected slot already booked' })

      const se = computeSlotStartEnd(sched.startTime, slotMinutes, slotNo)
      patch.doctorId = nextDoctorId
      patch.scheduleId = String(sched._id)
      patch.dateIso = String((sched as any).dateIso || existing.dateIso || '')
      patch.slotNo = slotNo
      patch.slotStart = se.start
      patch.slotEnd = se.end
    }

    const row = await AestheticAppointment.findByIdAndUpdate(id, { $set: patch }, { new: true })
    if (!row) return res.status(404).json({ error: 'Appointment not found' })
    res.json({ appointment: row })
  }catch(e:any){
    if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function updateStatus(req: Request, res: Response){
  try{
    const id = String(req.params.id)
    const { status } = updateAppointmentStatusSchema.parse(req.body)
    const row = await AestheticAppointment.findByIdAndUpdate(id, { $set: { status } }, { new: true })
    if (!row) return res.status(404).json({ error: 'Appointment not found' })
    res.json({ appointment: row })
  }catch(e:any){
    if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function remove(req: Request, res: Response){
  try{
    const id = String(req.params.id)
    const row = await AestheticAppointment.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Appointment not found' })
    res.json({ ok: true })
  }catch{ res.status(500).json({ error: 'Internal Server Error' }) }
}

export async function convertToToken(req: Request, res: Response){
  try{
    const id = String(req.params.id)
    const appt: any = await AestheticAppointment.findById(id).lean()
    if (!appt) return res.status(404).json({ error: 'Appointment not found' })
    if (appt.status === 'cancelled') return res.status(400).json({ error: 'Cancelled appointment cannot be converted' })
    if (!appt.scheduleId || !appt.slotNo) return res.status(400).json({ error: 'Appointment missing schedule/slot' })

    if (appt.tokenId){
      const tok = await AestheticToken.findById(String(appt.tokenId)).lean()
      if (tok) return res.json({ token: tok, appointment: appt })
    }

    const clashTok = await AestheticToken.findOne({ scheduleId: String(appt.scheduleId), slotNo: appt.slotNo, status: { $nin: ['returned','cancelled'] } }).lean() as any
    if (clashTok) return res.status(409).json({ error: 'Slot already has a token' })

    const sched: any = await AestheticDoctorSchedule.findById(appt.scheduleId).lean()
    if (!sched) return res.status(400).json({ error: 'Invalid schedule' })

    // Resolve or create patient (assign MRN only at conversion time)
    let patient: any = null
    if (appt.patientId){
      patient = await LabPatient.findById(appt.patientId)
      if (!patient) return res.status(404).json({ error: 'Linked patient not found' })
    } else if (appt.mrn){
      patient = await LabPatient.findOne({ mrn: String(appt.mrn) })
    }
    if (!patient){
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

    // Slot-wise token numbering (match hospital behavior)
    const number = Number(appt.slotNo)
    const token = await AestheticToken.create({
      number,
      date: new Date().toISOString(),
      patientName: patient?.fullName || appt.patientName,
      phone: appt.phoneNormalized,
      mrNumber: patient?.mrn || appt.mrn,
      age: patient?.age || appt.age,
      gender: patient?.gender || appt.gender,
      doctorId: String(appt.doctorId||''),
      apptDate: String(appt.dateIso||''),
      scheduleId: String(appt.scheduleId),
      slotNo: Number(appt.slotNo),
      fee: 0,
      discount: 0,
      payable: 0,
      status: 'queued',
      createdAtIso: new Date().toISOString(),
    } as any)

    await AestheticAppointment.findByIdAndUpdate(appt._id, { $set: { tokenId: (token as any)._id, patientId: String(patient?._id || ''), mrn: String(patient?.mrn || appt.mrn || '') } })

    res.status(201).json({ token, appointment: { ...appt, tokenId: (token as any)._id } })
  }catch{ res.status(500).json({ error: 'Internal Server Error' }) }
}
