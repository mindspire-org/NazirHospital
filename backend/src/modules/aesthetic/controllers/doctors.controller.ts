import { Request, Response } from 'express'
import { AestheticDoctor } from '../models/Doctor'
import { doctorCreateSchema, doctorQuerySchema, doctorUpdateSchema } from '../validators/doctor'
import { AuditLog } from '../models/AuditLog'

function getActor(req: Request){
  const u: any = (req as any).user || {}
  return { actorId: String(u.sub||''), actorUsername: String(u.username||''), actorRole: String(u.role||'') }
}

export async function list(req: Request, res: Response){
  const parsed = doctorQuerySchema.safeParse(req.query)
  const { search, page = 1, limit = 50 } = parsed.success ? parsed.data as any : { page: 1, limit: 50 }
  const filter: any = {}
  if (search) {
    const rx = new RegExp(search, 'i')
    filter.$or = [{ name: rx }, { specialty: rx }, { qualification: rx }, { phone: rx }]
  }
  const pg = Math.max(1, Number(page||1))
  const lim = Math.max(1, Math.min(500, Number(limit||50)))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    AestheticDoctor.find(filter).sort({ name: 1 }).skip(skip).limit(lim).lean(),
    AestheticDoctor.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total||0)/lim))
  res.json({ doctors: items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = doctorCreateSchema.parse(req.body)
  const doc = await AestheticDoctor.create(data)
  try {
    const actor = getActor(req) as any
    await AuditLog.create({ actor: String(actor.actorUsername||'unknown'), action: 'aesthetic.doctor.create', label: 'AESTHETIC_DOCTOR_CREATE', path: req.path, method: req.method, at: new Date().toISOString(), detail: JSON.stringify({ id: String(doc._id), name: doc.name }) })
  } catch {}
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const id = String(req.params.id||'')
  const patch = doctorUpdateSchema.parse(req.body)
  const doc = await AestheticDoctor.findByIdAndUpdate(id, patch, { new: true }).lean()
  if (!doc) return res.status(404).json({ message: 'Not found' })
  try {
    const actor = getActor(req) as any
    await AuditLog.create({ actor: String(actor.actorUsername||'unknown'), action: 'aesthetic.doctor.update', label: 'AESTHETIC_DOCTOR_UPDATE', path: req.path, method: req.method, at: new Date().toISOString(), detail: JSON.stringify({ id }) })
  } catch {}
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const id = String(req.params.id||'')
  await AestheticDoctor.findByIdAndDelete(id)
  try {
    const actor = getActor(req) as any
    await AuditLog.create({ actor: String(actor.actorUsername||'unknown'), action: 'aesthetic.doctor.delete', label: 'AESTHETIC_DOCTOR_DELETE', path: req.path, method: req.method, at: new Date().toISOString(), detail: JSON.stringify({ id }) })
  } catch {}
  res.json({ ok: true })
}
