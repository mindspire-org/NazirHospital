import { Request, Response } from 'express'
import { HospitalDoctorSchedule } from '../models/DoctorSchedule'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalDepartment } from '../models/Department'
import { createDoctorScheduleSchema, updateDoctorScheduleSchema, applyWeeklyPatternSchema } from '../validators/doctor_schedule'

function toMin(hhmm: string){ const [h,m] = hhmm.split(':').map(x=>parseInt(x,10)||0); return h*60+m }
function fromMin(min: number){ const h = Math.floor(min/60).toString().padStart(2,'0'); const m = (min%60).toString().padStart(2,'0'); return `${h}:${m}` }
function toIso(d: Date){ return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10) }
function startOfWeekMonday(dateIso?: string){
  const base = dateIso ? new Date(dateIso+'T00:00:00') : new Date()
  const dow = base.getDay() // 0 Sun ... 6 Sat
  const offset = (dow + 6) % 7 // Monday=0
  const d = new Date(base)
  d.setDate(base.getDate() - offset)
  return d
}

export async function create(req: Request, res: Response){
  try{
    const data = createDoctorScheduleSchema.parse(req.body)
    // Validate doctor and department existence
    const doc = await HospitalDoctor.findById(data.doctorId).lean()
    if (!doc) return res.status(400).json({ error: 'Invalid doctorId' })
    if (data.departmentId){
      const dep = await HospitalDepartment.findById(data.departmentId).lean()
      if (!dep) return res.status(400).json({ error: 'Invalid departmentId' })
    }
    // Validate timings
    const start = toMin(data.startTime)
    const end = toMin(data.endTime)
    if (!(start < end)) return res.status(400).json({ error: 'endTime must be after startTime' })
    const row = await HospitalDoctorSchedule.create({ ...data })
    res.status(201).json({ schedule: row })
  }catch(e: any){
    if (e?.code === 11000) return res.status(409).json({ error: 'Overlapping or duplicate schedule' })
    if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function list(req: Request, res: Response){
  try{
    const q = req.query as any
    const crit: any = {}
    if (q.doctorId) crit.doctorId = q.doctorId
    if (q.departmentId) crit.departmentId = q.departmentId
    if (q.date) crit.dateIso = q.date
    const rows = await HospitalDoctorSchedule.find(crit).sort({ dateIso: 1, startTime: 1 }).lean()
    res.json({ schedules: rows })
  }catch{ res.status(500).json({ error: 'Internal Server Error' }) }
}

export async function update(req: Request, res: Response){
  try{
    const id = String(req.params.id)
    const data = updateDoctorScheduleSchema.parse(req.body)
    if (data.startTime && data.endTime){
      const s = toMin(data.startTime), e = toMin(data.endTime)
      if (!(s<e)) return res.status(400).json({ error: 'endTime must be after startTime' })
    }
    const row = await HospitalDoctorSchedule.findByIdAndUpdate(id, { $set: data }, { new: true })
    if (!row) return res.status(404).json({ error: 'Schedule not found' })
    res.json({ schedule: row })
  }catch(e: any){
    if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function remove(req: Request, res: Response){
  try{
    const id = String(req.params.id)
    const row = await HospitalDoctorSchedule.findByIdAndDelete(id)
    if (!row) return res.status(404).json({ error: 'Schedule not found' })
    res.json({ ok: true })
  }catch{ res.status(500).json({ error: 'Internal Server Error' }) }
}

export async function applyWeeklyPattern(req: Request, res: Response){
  try{
    const payload = applyWeeklyPatternSchema.parse(req.body)
    const doctor = await HospitalDoctor.findById(payload.doctorId).lean()
    if (!doctor) return res.status(400).json({ error: 'Invalid doctorId' })
    if (payload.departmentId){
      const dep = await HospitalDepartment.findById(payload.departmentId).lean()
      if (!dep) return res.status(400).json({ error: 'Invalid departmentId' })
    }

    const sow = startOfWeekMonday(payload.anchorDate)
    const ops: any[] = []
    for (let w=0; w<payload.weeks; w++){
      const base = new Date(sow)
      base.setDate(sow.getDate() + w*7)
      for (const d of payload.days){
        if (!d.enabled) continue
        const start = d.startTime ? toMin(d.startTime) : null
        const end = d.endTime ? toMin(d.endTime) : null
        if (start==null || end==null || !(start < end)) continue
        const dt = new Date(base)
        dt.setDate(base.getDate() + Number(d.day||0))
        const dateIso = toIso(dt)
        const doc: any = {
          doctorId: payload.doctorId,
          departmentId: payload.departmentId || undefined,
          dateIso,
          startTime: d.startTime!,
          endTime: d.endTime!,
          slotMinutes: Math.max(5, Number(d.slotMinutes || 15)),
          fee: (d as any).fee != null ? Number(d.fee) : undefined,
          followupFee: (d as any).followupFee != null ? Number(d.followupFee) : undefined,
          notes: d.notes || undefined,
        }
        ops.push({
          updateOne: {
            filter: { doctorId: payload.doctorId, dateIso, startTime: d.startTime!, endTime: d.endTime! },
            update: { $set: { ...doc } },
            upsert: true,
          }
        })
      }
    }

    if (ops.length === 0) return res.status(400).json({ error: 'No valid days to apply' })
    const result = await HospitalDoctorSchedule.bulkWrite(ops, { ordered: false })
    const upserts = (result as any).upsertedCount || 0
    const modified = (result as any).modifiedCount || 0
    res.status(201).json({ ok: true, created: upserts, updated: modified, totalAffected: upserts + modified })
  }catch(e: any){
    if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export function computeSlotIndex(startTime: string, endTime: string, slotMinutes: number, apptStart: string){
  const start = toMin(startTime), end = toMin(endTime), ap = toMin(apptStart)
  if (ap < start || ap >= end) return null
  const delta = ap - start
  if (delta % slotMinutes !== 0) return null
  return Math.floor(delta / slotMinutes) + 1
}

export function computeSlotStartEnd(startTime: string, slotMinutes: number, slotNo: number){
  const start = toMin(startTime) + (slotNo-1)*slotMinutes
  return { start: fromMin(start), end: fromMin(start + slotMinutes) }
}
