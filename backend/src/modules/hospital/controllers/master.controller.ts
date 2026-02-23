import { Request, Response } from 'express'
import { upsertDepartmentSchema, upsertDoctorSchema } from '../validators/master'
import { HospitalDepartment } from '../models/Department'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalUser } from '../models/User'
import { HospitalAuditLog } from '../models/AuditLog'
import { Types } from 'mongoose'

export async function listDepartments(_req: Request, res: Response){
  const rows = await HospitalDepartment.find().sort({ name: 1 }).lean()
  res.json({ departments: rows })
}

export async function removeDoctor(req: Request, res: Response){
  const id = req.params.id
  let d: any
  if (Types.ObjectId.isValid(id)) {
    d = await HospitalDoctor.findByIdAndDelete(id)
  } else {
    const candidates: any[] = [id]
    const n = Number(id)
    if (!Number.isNaN(n)) candidates.push(n)
    const r = await HospitalDoctor.collection.findOneAndDelete({ _id: { $in: candidates } })
    d = r?.value
  }
  if (!d) return res.status(404).json({ error: 'Doctor not found' })
  // Also remove the corresponding Hospital User if present
  try {
    const username = String(d.username || '').trim().toLowerCase()
    if (username) {
      await HospitalUser.findOneAndDelete({ username })
    }
  } catch {}
  res.json({ ok: true })
}

export async function createDepartment(req: Request, res: Response){
  const data = upsertDepartmentSchema.parse(req.body)
  const d = await HospitalDepartment.create(data)
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'department_add',
      label: 'DEPARTMENT_ADD',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Department ${d.name} (${d._id})`,
    })
  } catch {}
  res.status(201).json({ department: d })
}

export async function updateDepartment(req: Request, res: Response){
  const data = upsertDepartmentSchema.parse(req.body)
  const d = await HospitalDepartment.findByIdAndUpdate(req.params.id, data, { new: true })
  if (!d) return res.status(404).json({ error: 'Department not found' })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'department_edit',
      label: 'DEPARTMENT_EDIT',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Department ${d.name} (${d._id})`,
    })
  } catch {}
  res.json({ department: d })
}

export async function listDoctors(_req: Request, res: Response){
  const rows = await HospitalDoctor.find().sort({ name: 1 }).lean()
  res.json({ doctors: rows })
}

export async function getDoctorById(req: Request, res: Response){
  const id = req.params.id
  let d: any
  if (Types.ObjectId.isValid(id)) {
    d = await HospitalDoctor.findById(id).lean()
  } else {
    const candidates: any[] = [id]
    const n = Number(id)
    if (!Number.isNaN(n)) candidates.push(n)
    d = await HospitalDoctor.collection.findOne({ _id: { $in: candidates } })
  }
  if (!d) return res.status(404).json({ error: 'Doctor not found' })
  res.json({ doctor: d })
}

export async function createDoctor(req: Request, res: Response){
  const data = upsertDoctorSchema.parse(req.body)
  const { password, ...docData } = (data as any)
  // If username provided, ensure it doesn't conflict before creating doctor
  try {
    if (docData.username && typeof docData.username === 'string') {
      const username = docData.username.trim().toLowerCase()
      if (username) {
        const existing = await HospitalUser.findOne({ username }).lean()
        if (existing) return res.status(409).json({ error: 'Username already exists' })
        // normalize username on the doctor record as well
        docData.username = username
      }
    }
  } catch {}
  const d = await HospitalDoctor.create(docData)
  // Auto-create a corresponding Hospital User for the doctor if username is provided
  try {
    if (docData.username && typeof docData.username === 'string') {
      const username = docData.username.trim().toLowerCase()
      if (username) {
        const existing = await HospitalUser.findOne({ username }).lean()
        if (!existing) {
          await HospitalUser.create({
            username,
            role: 'Doctor',
            fullName: docData.name,
            phone: docData.phone,
            active: docData.active ?? true,
            passwordHash: password || '123',
            phoneNormalized: docData.phone ? docData.phone.replace(/\D+/g,'') : undefined,
          })
        }
      }
    }
  } catch {}
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'doctor_add',
      label: 'DOCTOR_ADD',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Doctor ${d.name} (${d._id})`,
    })
  } catch {}
  res.status(201).json({ doctor: d })
}

export async function updateDoctor(req: Request, res: Response){
  const data = upsertDoctorSchema.parse(req.body)
  const { password, ...patch } = (data as any)
  const id = req.params.id
  let prev: any
  if (Types.ObjectId.isValid(id)) {
    prev = await HospitalDoctor.findById(id).lean()
  } else {
    const candidates: any[] = [id]
    const n = Number(id)
    if (!Number.isNaN(n)) candidates.push(n)
    prev = await HospitalDoctor.collection.findOne({ _id: { $in: candidates } })
  }
  if (!prev) return res.status(404).json({ error: 'Doctor not found' })

  // Normalize username if provided and check for conflicts
  let normalizedUsername: string | undefined
  if (Object.prototype.hasOwnProperty.call(patch, 'username') && typeof patch.username === 'string') {
    normalizedUsername = patch.username.trim().toLowerCase()
    patch.username = normalizedUsername as any
    const prevUsername = String(prev.username || '').trim().toLowerCase()
    if (normalizedUsername && normalizedUsername !== prevUsername) {
      const conflict = await HospitalUser.findOne({ username: normalizedUsername }).lean()
      if (conflict) return res.status(409).json({ error: 'Username already exists' })
    }
  }

  let d: any
  if (Types.ObjectId.isValid(id)) {
    d = await HospitalDoctor.findByIdAndUpdate(id, patch, { new: true })
  } else {
    const candidates: any[] = [id]
    const n = Number(id)
    if (!Number.isNaN(n)) candidates.push(n)
    const upd = await HospitalDoctor.collection.updateOne({ _id: { $in: candidates } }, { $set: patch })
    if (!upd.matchedCount) return res.status(404).json({ error: 'Doctor not found' })
    d = await HospitalDoctor.collection.findOne({ _id: { $in: candidates } })
  }
  if (!d) return res.status(404).json({ error: 'Doctor not found' })

  // Sync corresponding Hospital User account
  try {
    const finalUsername = String(d.username || '').trim().toLowerCase()
    const prevUsername = String(prev.username || '').trim().toLowerCase()
    if (finalUsername) {
      if (prevUsername && prevUsername !== finalUsername) {
        // rename existing user if exists, otherwise create
        const u: any = await HospitalUser.findOne({ username: prevUsername })
        if (u) {
          u.username = finalUsername
          u.fullName = d.name
          u.phone = d.phone
          if (password) u.passwordHash = password
          u.active = d.active ?? true
          u.phoneNormalized = d.phone ? String(d.phone).replace(/\D+/g,'') : undefined
          await u.save()
        } else {
          const createDoc: any = {
            username: finalUsername,
            role: 'Doctor',
            fullName: d.name,
            phone: d.phone,
            active: d.active ?? true,
            phoneNormalized: d.phone ? String(d.phone).replace(/\D+/g,'') : undefined,
          }
          if (password) createDoc.passwordHash = password
          await HospitalUser.create(createDoc)
        }
      } else {
        // same username or previously none: upsert/update
        const update: any = {
          role: 'Doctor',
          fullName: d.name,
          phone: d.phone,
          active: d.active ?? true,
          phoneNormalized: d.phone ? String(d.phone).replace(/\D+/g,'') : undefined,
        }
        if (password) update.passwordHash = password
        await HospitalUser.findOneAndUpdate(
          { username: finalUsername },
          { $set: update },
          { upsert: true, new: true }
        )
      }
    } else if (prevUsername) {
      // Username removed: delete previous user
      await HospitalUser.findOneAndDelete({ username: prevUsername })
    }
  } catch {}
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'doctor_edit',
      label: 'DOCTOR_EDIT',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Doctor ${d.name} (${d._id})`,
    })
  } catch {}
  res.json({ doctor: d })
}

export async function removeDepartment(req: Request, res: Response){
  const id = req.params.id
  const d = await HospitalDepartment.findByIdAndDelete(id)
  if (!d) return res.status(404).json({ error: 'Department not found' })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'department_delete',
      label: 'DEPARTMENT_DELETE',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Department ${d.name} (${d._id})`,
    })
  } catch {}
  res.json({ ok: true })
}
