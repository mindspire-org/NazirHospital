import { Request, Response } from 'express'
import { z } from 'zod'
import { BiometricMapping } from '../models/BiometricMapping'

const upsertSchema = z.object({
  deviceId: z.string().min(1),
  enrollId: z.string().min(1),
  staffId: z.string().min(1),
  active: z.boolean().optional(),
})

export async function list(req: Request, res: Response){
  const deviceId = String(req.query.deviceId || '')
  const enrollId = String(req.query.enrollId || '')
  const staffId = String(req.query.staffId || '')
  const filter: any = {}
  if (deviceId) filter.deviceId = deviceId
  if (enrollId) filter.enrollId = enrollId
  if (staffId) filter.staffId = staffId
  const items = await BiometricMapping.find(filter).sort({ deviceId: 1, enrollId: 1 }).lean()
  res.json({ items })
}

export async function upsert(req: Request, res: Response){
  const data = upsertSchema.parse(req.body)
  const key = { deviceId: data.deviceId, enrollId: data.enrollId }
  const patch: any = { staffId: data.staffId }
  if (typeof data.active === 'boolean') patch.active = data.active
  const doc = await BiometricMapping.findOneAndUpdate(key, { $set: patch }, { new: true, upsert: true })
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await BiometricMapping.findByIdAndDelete(id)
  res.json({ ok: true })
}
