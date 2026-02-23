import { Request, Response } from 'express'
import { ProcedureSession } from '../models/ProcedureSession'
import { postProcedureSessionAccrual, reverseJournalByRef } from './finance_ledger'
import { procedureSessionCreateSchema, procedureSessionQuerySchema, procedureSessionUpdateSchema } from '../validators/procedure_session'

export async function list(req: Request, res: Response){
  const parsed = procedureSessionQuerySchema.safeParse(req.query)
  const { search, labPatientId, patientMrn, phone, procedureId, from, to, page = 1, limit = 20 } = parsed.success ? parsed.data as any : { page: 1, limit: 20 }
  const filter: any = {}
  if (labPatientId) filter.labPatientId = labPatientId
  if (patientMrn) filter.patientMrn = new RegExp(`^${patientMrn}$`, 'i')
  if (phone) filter.phone = new RegExp(phone, 'i')
  if (procedureId) filter.procedureId = procedureId
  if (search){
    const rx = new RegExp(search, 'i')
    filter.$or = [ { patientName: rx }, { procedureName: rx } ]
  }
  if (from || to){
    filter.date = {}
    if (from) filter.date.$gte = new Date(from).toISOString()
    if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.date.$lte = end.toISOString() }
  }
  const pg = Math.max(1, Number(page||1))
  const lim = Math.max(1, Math.min(500, Number(limit||20)))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    ProcedureSession.find(filter).sort({ date: -1 }).skip(skip).limit(lim).lean(),
    ProcedureSession.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total||0)/lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = procedureSessionCreateSchema.parse(req.body)
  const balance = Math.max(0, Number((data.price||0)) - Number((data.discount||0)) - Number((data.paid||0)))
  const doc: any = await ProcedureSession.create({ ...data, balance })
  try {
    if (String(doc.status||'planned') === 'done'){
      await postProcedureSessionAccrual({
        sessionId: String(doc._id),
        dateIso: String((doc.date||'').slice(0,10) || new Date().toISOString().slice(0,10)),
        doctorId: doc.doctorId ? String(doc.doctorId) : undefined,
        patientName: doc.patientName || undefined,
        mrn: doc.patientMrn || undefined,
        procedureName: doc.procedureName || undefined,
        price: Number(doc.price||0),
        discount: Number(doc.discount||0),
      })
    }
  } catch {}
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const id = String(req.params.id||'')
  const patch = procedureSessionUpdateSchema.parse(req.body)
  // Recompute balance if any payment/price/discount changed
  let next = { ...patch } as any
  if (patch.price != null || patch.discount != null || patch.paid != null){
    const current: any = await ProcedureSession.findById(id).lean()
    const price = patch.price != null ? patch.price : Number(current?.price||0)
    const discount = patch.discount != null ? patch.discount : Number(current?.discount||0)
    const paid = patch.paid != null ? patch.paid : Number(current?.paid||0)
    next.balance = Math.max(0, Number(price) - Number(discount) - Number(paid))
  }
  const doc: any = await ProcedureSession.findByIdAndUpdate(id, next, { new: true }).lean()
  if (!doc) return res.status(404).json({ message: 'Not found' })
  // If session is done, refresh accrual by reversing and reposting
  try {
    if (String(doc.status||'planned') === 'done'){
      await reverseJournalByRef('aesthetic_procedure_session', id, 'Update session accrual refresh')
      await postProcedureSessionAccrual({
        sessionId: id,
        dateIso: String((doc.date||'').slice(0,10) || new Date().toISOString().slice(0,10)),
        doctorId: doc.doctorId ? String(doc.doctorId) : undefined,
        patientName: doc.patientName || undefined,
        mrn: doc.patientMrn || undefined,
        procedureName: doc.procedureName || undefined,
        price: Number(doc.price||0),
        discount: Number(doc.discount||0),
      })
    }
  } catch {}
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const id = String(req.params.id||'')
  await ProcedureSession.findByIdAndDelete(id)
  try { await reverseJournalByRef('aesthetic_procedure_session', id, 'Delete session reversal') } catch {}
  res.json({ ok: true })
}

// Payments: append a payment record and recompute paid/balance
export async function addPayment(req: Request, res: Response){
  const id = String(req.params.id||'')
  const body = (req.body || {}) as any
  const amount = Math.max(0, Number(body.amount || 0))
  if (!amount) return res.status(400).json({ message: 'amount is required' })
  const method = String(body.method || 'Cash')
  const dateIso = String(body.dateIso || new Date().toISOString())
  const note = String(body.note || '')
  const by = String(((req as any)?.user?.username || (req as any)?.user?.name || 'admin'))
  const s: any = await ProcedureSession.findById(id)
  if (!s) return res.status(404).json({ message: 'Not found' })
  s.payments = [ ...(s.payments || []), { amount, method, dateIso, note, by } ]
  s.paid = Number(s.paid || 0) + amount
  s.balance = Math.max(0, Number(s.price||0) - Number(s.discount||0) - Number(s.paid||0))
  await s.save()
  res.json(s.toObject())
}

// Payments: list payments for a session
export async function getPayments(req: Request, res: Response){
  const id = String(req.params.id||'')
  const s: any = await ProcedureSession.findById(id).lean()
  if (!s) return res.status(404).json({ message: 'Not found' })
  res.json({ payments: s.payments || [], paid: Number(s.paid||0), balance: Number(s.balance||0) })
}

// Set/update next visit date
export async function setNextVisit(req: Request, res: Response){
  const id = String(req.params.id||'')
  const body = (req.body || {}) as any
  const nextVisitDate = String(body.nextVisitDate || '')
  if (!nextVisitDate) return res.status(400).json({ message: 'nextVisitDate is required' })
  const s = await ProcedureSession.findByIdAndUpdate(id, { nextVisitDate }, { new: true }).lean()
  if (!s) return res.status(404).json({ message: 'Not found' })
  res.json(s)
}

export async function completeProcedure(req: Request, res: Response){
  const body = (req.body || {}) as any
  const patientMrn = String(body.patientMrn || '').trim()
  const procedureId = String(body.procedureId || '').trim()
  if (!patientMrn || !procedureId) return res.status(400).json({ message: 'patientMrn and procedureId are required' })

  const filter: any = { patientMrn: new RegExp(`^${patientMrn}$`, 'i'), procedureId }
  const list: any[] = await ProcedureSession.find(filter).lean()
  if (!list.length) return res.status(404).json({ message: 'No sessions found for this procedure' })

  await ProcedureSession.updateMany(filter, { $set: { procedureCompleted: true, status: 'done' } })
  const items = await ProcedureSession.find(filter).sort({ date: -1 }).lean()
  res.json({ ok: true, items })
}
