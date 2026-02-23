import { Request, Response } from 'express'
import { HospitalSettings } from '../models/Settings'
import { settingsUpdateSchema } from '../validators/settings'
import { HospitalAuditLog } from '../models/AuditLog'

export async function get(_req: Request, res: Response) {
  let s = await HospitalSettings.findOne().lean()
  if (!s) s = (await HospitalSettings.create({})).toObject()
  res.json(s)
}

export async function update(req: Request, res: Response) {
  const data = settingsUpdateSchema.parse(req.body)
  const s = await HospitalSettings.findOneAndUpdate({}, { $set: data }, { new: true, upsert: true })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'hospital_settings_update',
      label: 'SETTINGS_UPDATE',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: 'Hospital settings updated',
    })
  } catch {}
  res.json(s)
}
