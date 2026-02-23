import { Request, Response } from 'express'
import { z } from 'zod'
import { BiometricEvent } from '../models/BiometricEvent'

const qSchema = z.object({
  deviceId: z.string().optional(),
  enrollId: z.string().optional(),
  staffId: z.string().optional(),
  date: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export async function list(req: Request, res: Response){
  const parsed = qSchema.safeParse(req.query)
  const { deviceId, enrollId, staffId, date, from, to, type, page, limit } = parsed.success ? (parsed.data as any) : {}
  const filter: any = {}
  if (deviceId) filter.deviceId = deviceId
  if (enrollId) filter.enrollId = enrollId
  if (staffId) filter.staffId = staffId
  if (date) filter.date = date
  if (from || to) {
    filter.date = filter.date || {}
    if (from) filter.date.$gte = from
    if (to) filter.date.$lte = to
  }
  if (type) filter.type = type

  const effectiveLimit = Number(limit || 50)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit

  const total = await BiometricEvent.countDocuments(filter)
  const items = await BiometricEvent.find(filter)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(effectiveLimit)
    .lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function listUnknown(req: Request, res: Response){
  const effectiveLimit = Math.min(500, Math.max(1, Number(req.query.limit || 100)))
  const items = await BiometricEvent.find({ type: 'unknown_enroll' })
    .sort({ timestamp: -1 })
    .limit(effectiveLimit)
    .lean()
  res.json({ items })
}
