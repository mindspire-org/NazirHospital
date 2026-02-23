import { Request, Response } from 'express'
import { AestheticToken } from '../models/Token'
import { ProcedureSession } from '../models/ProcedureSession'
import { AestheticCounter } from '../models/Counter'
import { AestheticDoctorSchedule } from '../models/DoctorSchedule'
import { AestheticAppointment } from '../models/Appointment'
import { LabPatient } from '../../lab/models/Patient'
import { nextGlobalMrn } from '../../../common/mrn'
import { postOpdTokenJournal, postProcedurePaymentJournal } from './finance_ledger'
import { postFbrInvoiceViaSDC } from '../../hospital/services/fbr'

function dateKey(dateIso?: string) {
  const d = dateIso ? new Date(dateIso) : new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${dd}`
}

async function allocNumber(dateIso?: string) {
  const key = 'aesthetic_tok_global'
  let c: any = await AestheticCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })

  // If counter was (re)created, align it with existing tokens so we don't restart from 1.
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

function normDigits(s?: string) { return (s || '').replace(/\D+/g, '') }
function normLower(s?: string) { return (s || '').trim().toLowerCase().replace(/\s+/g, ' ') }

function toMin(hhmm: string) {
  const [h, m] = (hhmm || '').split(':').map(x => parseInt(x, 10) || 0)
  return (h * 60) + m
}
function fromMin(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, '0')
  const m = (min % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}
function computeSlotIndex(startTime: string, endTime: string, slotMinutes: number, apptStart: string) {
  const start = toMin(startTime), end = toMin(endTime), ap = toMin(apptStart)
  if (ap < start || ap >= end) return null
  const delta = ap - start
  if (delta % (slotMinutes || 15) !== 0) return null
  return Math.floor(delta / (slotMinutes || 15)) + 1
}
function computeSlotStartEnd(startTime: string, slotMinutes: number, slotNo: number) {
  const start = toMin(startTime) + (slotNo - 1) * (slotMinutes || 15)
  return { start: fromMin(start), end: fromMin(start + (slotMinutes || 15)) }
}

async function ensureLabPatient(body: any) {
  const name = String(body.patientName || '')
  const guardianName = String(body.guardianName || '')
  const phoneN = normDigits(body.phone)
  const cnicN = normDigits(body.cnic)
  const nameN = normLower(name)
  const fatherN = normLower(guardianName)
  const mrnRaw = String(body.mrNumber || '').trim()
  if (mrnRaw) {
    const byMrn: any = await LabPatient.findOne({ mrn: mrnRaw }).lean()
    if (byMrn) {
      const patch: any = {}
      if (phoneN && byMrn.phoneNormalized !== phoneN) patch.phoneNormalized = phoneN
      if (cnicN && byMrn.cnicNormalized !== cnicN) patch.cnicNormalized = cnicN
      if (Object.keys(patch).length) await LabPatient.findByIdAndUpdate(byMrn._id, { $set: patch })
      return (await LabPatient.findById(byMrn._id).lean()) as any
    }
  }
  if (cnicN) {
    const pat: any = await LabPatient.findOne({ cnicNormalized: cnicN }).lean()
    if (pat) {
      if (phoneN && pat.phoneNormalized !== phoneN) await LabPatient.findByIdAndUpdate(pat._id, { $set: { phoneNormalized: phoneN } })
      return await LabPatient.findById(pat._id).lean()
    }
  }
  if (nameN && fatherN) {
    const rxName = new RegExp(`^${nameN.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i')
    const rxFath = new RegExp(`^${fatherN.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i')
    const matches: any[] = await LabPatient.find({ fullName: rxName, fatherName: rxFath }).lean()
    if (matches.length === 1) {
      const m = matches[0]
      const patch: any = {}
      if (phoneN && m.phoneNormalized !== phoneN) patch.phoneNormalized = phoneN
      if (cnicN && m.cnicNormalized !== cnicN) patch.cnicNormalized = cnicN
      if (Object.keys(patch).length) await LabPatient.findByIdAndUpdate(m._id, { $set: patch })
      return await LabPatient.findById(m._id).lean()
    }
  }
  if (phoneN) {
    const phoneMatches: any[] = await LabPatient.find({ phoneNormalized: phoneN }).lean()
    if (phoneMatches.length === 1) {
      const m = phoneMatches[0]
      const nameMatches = !!nameN && normLower(m.fullName) === nameN
      const fatherMatches = !fatherN || normLower(m.fatherName as any) === fatherN
      if (nameMatches && fatherMatches) return m
    } else if (phoneMatches.length > 1) {
      const exact = phoneMatches.find(pm => normLower(pm.fullName) === nameN && (!fatherN || normLower(pm.fatherName as any) === fatherN))
      if (exact) return exact
    }
  }
  const mrn = await nextGlobalMrn()
  const nowIso = new Date().toISOString()
  const created = await LabPatient.create({
    mrn,
    fullName: name || 'Unknown',
    fatherName: guardianName || undefined,
    phoneNormalized: phoneN || undefined,
    cnicNormalized: cnicN || undefined,
    gender: body.gender,
    age: body.age,
    guardianRel: body.guardianRelation,
    address: body.address,
    createdAtIso: nowIso,
  })
  return created.toObject()
}

export async function nextNumber(req: Request, res: Response) {
  const date = String((req.query as any).date || '') || new Date().toISOString().slice(0, 10)
  const key = 'aesthetic_tok_global'
  const c: any = await AestheticCounter.findById(key).lean()
  const next = (c?.seq || 0) + 1
  res.json({ next })
}

export async function create(req: Request, res: Response) {
  const body = (req.body || {}) as any
  const nowIso = new Date().toISOString()
  const dateIso = typeof body.date === 'string' && body.date ? body.date : nowIso
  let number = await allocNumber(dateIso)
  const fee = Number(body.fee || 0)
  const discount = Number(body.discount || 0)
  let payable = body.payable != null ? Number(body.payable) : Math.max(fee - discount, 0)

  let labPatient: any | undefined
  try {
    labPatient = await ensureLabPatient(body)
  } catch { }

  const resolvedMrn = String(labPatient?.mrn || '').trim() || undefined

  // Optional: schedule slot linkage (slot-wise tokens)
  let scheduleId: string | undefined
  let slotNo: number | undefined
  let slotStart: string | undefined
  let slotEnd: string | undefined

  if (body.scheduleId) {
    const sid = String(body.scheduleId)
    const sched: any = await AestheticDoctorSchedule.findById(sid).lean()
    if (!sched) return res.status(400).json({ error: 'Invalid scheduleId' })
    // If doctor is provided, ensure schedule belongs to doctor
    if (body.doctorId && String(sched.doctorId) !== String(body.doctorId)) {
      return res.status(400).json({ error: 'Schedule does not belong to selected doctor' })
    }
    scheduleId = sid
    const slotMinutes = Math.max(5, Number(sched.slotMinutes || 15))
    const apptStart = typeof body.apptStart === 'string' ? String(body.apptStart) : ''
    if (apptStart) {
      const idx = computeSlotIndex(String(sched.startTime), String(sched.endTime), slotMinutes, apptStart)
      if (!idx) return res.status(400).json({ error: 'apptStart outside schedule or not aligned to slot' })
      const clash = await AestheticToken.findOne({ scheduleId: sid, slotNo: idx, status: { $nin: ['returned', 'cancelled'] } }).lean()
      if (clash) return res.status(409).json({ error: 'Selected slot already booked' })
      const clashAppt = await AestheticAppointment.findOne({ scheduleId: sid, slotNo: idx, status: { $in: ['booked', 'confirmed', 'checked-in'] } }).lean()
      if (clashAppt) return res.status(409).json({ error: 'Selected slot already booked (appointment)' })
      slotNo = idx
      const se = computeSlotStartEnd(String(sched.startTime), slotMinutes, idx)
      slotStart = se.start
      slotEnd = se.end
    } else {
      const totalSlots = Math.floor((toMin(String(sched.endTime)) - toMin(String(sched.startTime))) / slotMinutes)
      const taken: any[] = await AestheticToken.find({ scheduleId: sid, status: { $nin: ['returned', 'cancelled'] } }).select('slotNo').lean()
      const appts: any[] = await AestheticAppointment.find({ scheduleId: sid, status: { $in: ['booked', 'confirmed', 'checked-in'] } }).select('slotNo').lean()
      const used = new Set<number>([
        ...((taken || []).map((t: any) => Number(t.slotNo || 0))),
        ...((appts || []).map((a: any) => Number(a.slotNo || 0))),
      ])
      let idx = 0
      for (let i = 1; i <= totalSlots; i++) { if (!used.has(i)) { idx = i; break } }
      if (!idx) return res.status(409).json({ error: 'No free slot available in this schedule' })
      slotNo = idx
      const se = computeSlotStartEnd(String(sched.startTime), slotMinutes, idx)
      slotStart = se.start
      slotEnd = se.end
    }

    // Make token number slot-wise (matches hospital behavior)
    number = slotNo
  }

  // Optional: If linked to a procedure session, treat today's deposit as payable and update session ledger
  let procedureSessionId: string | undefined
  let procedurePrice: number | undefined
  let procedureDiscount: number | undefined
  let procedurePaidToday: number | undefined
  let procedurePaidToDate: number | undefined
  let procedureBalanceAfter: number | undefined
  let procedureDoctorId: string | undefined
  let procedureName: string | undefined

  if (body.procedureSessionId) {
    const sid = String(body.procedureSessionId)
    const s: any = await ProcedureSession.findById(sid)
    if (s) {
      const deposit = Math.max(0, Number(body.depositToday || body.payable || 0))
      if (deposit > 0) {
        const by = String(((req as any)?.user?.username || (req as any)?.user?.name || 'admin'))
        const pay = { amount: deposit, method: String(body.method || 'Cash'), dateIso: nowIso, note: String(body.note || ''), by }
        s.payments = [...(s.payments || []), pay]
        s.paid = Number(s.paid || 0) + deposit
        s.balance = Math.max(0, Number(s.price || 0) - Number(s.discount || 0) - Number(s.paid || 0))
        await s.save()
      }
      procedureSessionId = sid
      procedurePrice = Number(s.price || 0)
      procedureDiscount = Number(s.discount || 0)
      procedurePaidToday = Math.max(0, Number(body.depositToday || 0))
      procedurePaidToDate = Number(s.paid || 0)
      procedureBalanceAfter = Number(s.balance || 0)
      payable = procedurePaidToday ?? payable
      procedureDoctorId = s.doctorId ? String(s.doctorId) : undefined
      procedureName = s.procedureName ? String(s.procedureName) : undefined
    }
  }

  const doc = await AestheticToken.create({
    number,
    date: dateIso,
    patientName: body.patientName,
    phone: body.phone,
    mrNumber: resolvedMrn || (String(body.mrNumber || '').trim() || undefined),
    age: body.age,
    gender: body.gender,
    address: body.address,
    guardianRelation: body.guardianRelation,
    guardianName: body.guardianName,
    cnic: body.cnic,
    doctorId: body.doctorId,
    apptDate: body.apptDate,
    scheduleId,
    slotNo,
    fee,
    discount,
    payable,
    procedureSessionId,
    procedurePrice,
    procedureDiscount,
    procedurePaidToday,
    procedurePaidToDate,
    procedureBalanceAfter,
    status: body.status || 'queued',
    createdAtIso: nowIso,
  })

  // FBR fiscalization (Aesthetic token is paid at creation)
  try {
    const payload: any = {
      refType: 'aesthetic_token',
      tokenId: String((doc as any)._id),
      tokenNo: String(number),
      dateIso,
      doctorId: body.doctorId ? String(body.doctorId) : undefined,
      patient: {
        mrn: String((doc as any)?.mrNumber || ''),
        name: String(body.patientName || ''),
        phone: String(body.phone || ''),
      },
      subtotal: Number(payable || 0),
      discount: Number(discount || 0),
      net: Number(payable || 0),
      lines: [
        {
          itemCode: 'AESTHETIC_TOKEN',
          name: procedureSessionId ? `Procedure: ${procedureName || 'Session'}` : 'Aesthetic Consultation',
          qty: 1,
          unitPrice: Number(payable || 0),
          net: Number(payable || 0),
        },
      ],
    }
    const r: any = await postFbrInvoiceViaSDC({ module: 'AESTHETIC_TOKEN_CREATE', invoiceType: 'AESTHETIC' as any, refId: String((doc as any)._id), amount: Number(payable || 0), payload })
    if (r) {
      ;(doc as any).fbrInvoiceNo = r.fbrInvoiceNo
      ;(doc as any).fbrQrCode = r.qrCode
      ;(doc as any).fbrStatus = r.status
      ;(doc as any).fbrMode = r.mode
      ;(doc as any).fbrError = r.error
      try { await (doc as any).save() } catch {}
    }
  } catch {}

  // Finance
  // - If this token is linked to a procedure session, treat depositToday as a procedure payment and post doctor share to the procedure doctor.
  // - Otherwise, post OPD token revenue/doctor share to the selected OPD doctor.
  try {
    if (procedureSessionId && procedurePaidToday && procedurePaidToday > 0) {
      await postProcedurePaymentJournal({
        tokenId: String((doc as any)._id),
        dateIso: String(dateIso).slice(0, 10),
        amount: Math.max(0, Number(procedurePaidToday || 0)),
        procedureSessionId: String(procedureSessionId),
        doctorId: procedureDoctorId,
        patientName: String(body.patientName || ''),
        mrn: String((doc as any)?.mrNumber || ''),
        procedureName,
        paidMethod: 'Cash',
      })
    } else if (body.doctorId && fee > 0) {
      await postOpdTokenJournal({
        tokenId: String((doc as any)._id),
        dateIso: String(dateIso).slice(0, 10),
        fee: Math.max(0, Number(fee || 0)),
        doctorId: String(body.doctorId),
        patientName: String(body.patientName || ''),
        mrn: String((doc as any)?.mrNumber || ''),
        tokenNo: String((doc as any)?.number || ''),
        paidMethod: 'Cash',
      })
    }
  } catch (e) {
    console.warn('Aesthetic finance posting failed', e)
  }
  res.status(201).json({ token: doc })
}

export async function list(req: Request, res: Response) {
  const q = (req.query || {}) as any
  const from = String(q.from || '')
  const to = String(q.to || '')
  const doctorId = String(q.doctorId || '')
  const scheduleId = String(q.scheduleId || '')
  const status = String(q.status || '')
  const search = String(q.search || '')
  const page = Math.max(1, Number(q.page || 1))
  const limit = Math.max(1, Math.min(200, Number(q.limit || 50)))

  const filter: any = {}
  if (from || to) {
    const fromIso = (from ? new Date(from + 'T00:00:00.000Z') : new Date(0)).toISOString()
    const toIso = (to ? new Date(to + 'T23:59:59.999Z') : new Date()).toISOString()
    filter.date = { $gte: fromIso, $lte: toIso }
  }
  if (doctorId) filter.doctorId = doctorId
  if (scheduleId) filter.scheduleId = scheduleId
  if (status) filter.status = status
  if (search) {
    const rx = new RegExp(search.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')
    const num = Number.isFinite(Number(search)) ? Number(search) : undefined
    filter.$or = [
      { patientName: rx },
      { phone: rx },
      ...(num != null ? [{ number: num }] : []),
    ]
  }

  const total = await AestheticToken.countDocuments(filter)
  const items = await AestheticToken.find(filter).sort({ date: -1, number: -1 }).skip((page - 1) * limit).limit(limit).lean()
  res.json({ items, total, totalPages: Math.max(1, Math.ceil(total / limit)) })
}

export async function update(req: Request, res: Response) {
  const id = String(req.params.id || '')
  const body = (req.body || {}) as any
  const patch: any = {}

  // Allow limited fields to be edited from UI
  const numFields = ['fee', 'discount', 'payable']
  for (const k of numFields) {
    if (body[k] != null && Number.isFinite(Number(body[k]))) patch[k] = Number(body[k])
  }
  const strFields = ['patientName', 'phone', 'mrNumber', 'age', 'gender', 'address', 'guardianRelation', 'guardianName', 'cnic', 'doctorId', 'apptDate']
  for (const k of strFields) {
    if (body[k] != null) patch[k] = String(body[k])
  }

  if (!Object.keys(patch).length) return res.status(400).json({ error: 'No fields to update' })
  const doc: any = await AestheticToken.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean()
  if (!doc) return res.status(404).json({ error: 'Token not found' })
  res.json({ token: doc })
}

export async function updateStatus(req: Request, res: Response) {
  const id = String(req.params.id || '')
  const status = String((req.body as any)?.status || '')
  if (!['queued', 'in-progress', 'completed', 'returned', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  const doc: any = await AestheticToken.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean()
  if (!doc) return res.status(404).json({ error: 'Token not found' })
  res.json({ token: doc })
}

export async function remove(req: Request, res: Response) {
  const id = String(req.params.id || '')
  await AestheticToken.findByIdAndDelete(id)
  res.json({ ok: true })
}
