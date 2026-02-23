import { Request, Response } from 'express'
import { DiagnosticSettings } from '../models/Settings'
import { diagnosticSettingsUpdateSchema } from '../validators/settings'

export async function get(_req: Request, res: Response) {
  let s = await DiagnosticSettings.findOne().lean()
  if (!s) s = (await DiagnosticSettings.create({})).toObject()
  res.json(s)
}

export async function update(req: Request, res: Response) {
  const data = diagnosticSettingsUpdateSchema.parse(req.body)
  const s = await DiagnosticSettings.findOneAndUpdate({}, { $set: data }, { new: true, upsert: true })
  res.json(s)
}
