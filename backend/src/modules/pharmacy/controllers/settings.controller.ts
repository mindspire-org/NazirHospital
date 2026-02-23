import { Request, Response } from 'express'
import { Settings } from '../models/Settings'
import { settingsUpdateSchema } from '../validators/settings'

export async function get(_req: Request, res: Response) {
  let s = await Settings.findOne().lean()
  if (!s) s = (await Settings.create({})).toObject()
  res.json(s)
}

export async function update(req: Request, res: Response) {
  const data = settingsUpdateSchema.parse(req.body)
  const s = await Settings.findOneAndUpdate({}, { $set: data }, { new: true, upsert: true })
  res.json(s)
}
