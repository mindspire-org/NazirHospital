import { Request, Response } from 'express'
import { Attendance } from '../models/Attendance'
import { attendanceQuerySchema, attendanceUpsertSchema } from '../validators/attendance'

export async function list(req: Request, res: Response) {
  const parsed = attendanceQuerySchema.safeParse(req.query)
  const { date, from, to, shiftId, staffId, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (date) filter.date = date
  if (from || to) {
    filter.date = filter.date || {}
    if (from) filter.date.$gte = from
    if (to) filter.date.$lte = to
  }
  if (shiftId) filter.shiftId = shiftId
  if (staffId) filter.staffId = staffId
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await Attendance.countDocuments(filter)
  const items = await Attendance.find(filter)
    .sort({ date: -1, staffId: 1 })
    .skip(skip)
    .limit(effectiveLimit)
    .lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function upsert(req: Request, res: Response) {
  const data = attendanceUpsertSchema.parse(req.body)
  const key = { staffId: data.staffId, date: data.date, shiftId: data.shiftId || undefined }
  const doc = await Attendance.findOneAndUpdate(key, { $set: data }, { new: true, upsert: true })
  res.json(doc)
}
