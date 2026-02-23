import { Request, Response } from 'express'
import { z } from 'zod'
import { HospitalCashSession } from '../models/CashSession'
import { FinanceJournal } from '../models/FinanceJournal'

function todayIso(){ return new Date().toISOString().slice(0,10) }

const openSchema = z.object({ openingFloat: z.number().min(0).optional(), counterId: z.string().optional(), shiftId: z.string().optional(), shiftName: z.string().optional(), note: z.string().optional() })
export async function open(req: Request, res: Response){
  const userId = String((req as any).user?._id || (req as any).user?.id || (req as any).user?.email || '')
  const userName = String((req as any).user?.name || (req as any).user?.email || 'user')
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const data = openSchema.parse(req.body)
  // If an open session exists for this user, return it
  const existing = await HospitalCashSession.findOne({ status: 'open', userId }).sort({ createdAt: -1 }).lean()
  if (existing) return res.json({ session: existing })
  const sess = await HospitalCashSession.create({
    dateIso: todayIso(),
    status: 'open',
    userId,
    userName,
    counterId: data.counterId,
    shiftId: data.shiftId,
    shiftName: data.shiftName,
    openingFloat: Math.max(0, Number(data.openingFloat || 0)),
    note: data.note,
    startAt: new Date(),
  } as any)
  res.status(201).json({ session: sess })
}

export async function current(req: Request, res: Response){
  const userId = String((req as any).user?._id || (req as any).user?.id || (req as any).user?.email || '')
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const sess = await HospitalCashSession.findOne({ status: 'open', userId }).sort({ createdAt: -1 }).lean()
  res.json({ session: sess || null })
}

const closeSchema = z.object({ countedCash: z.number().min(0), note: z.string().optional() })
export async function close(req: Request, res: Response){
  const id = String((req.params as any)?.id || '')
  if (!id) return res.status(400).json({ error: 'id required' })
  const body = closeSchema.parse(req.body)
  const sess: any = await HospitalCashSession.findById(id)
  if (!sess) return res.status(404).json({ error: 'Session not found' })
  if (String(sess.status) === 'closed') return res.json({ session: sess })
  // Compute CASH inflow/outflow from journals with tags.sessionId
  const rows: any[] = await FinanceJournal.aggregate([
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'CASH', 'lines.tags.sessionId': id } },
    { $group: { _id: null, debit: { $sum: { $ifNull: ['$lines.debit', 0] } }, credit: { $sum: { $ifNull: ['$lines.credit', 0] } } } },
  ])
  const cashIn = Number(rows?.[0]?.debit || 0)
  const cashOut = Number(rows?.[0]?.credit || 0)
  const netCash = cashIn - cashOut
  const expectedClosing = Number(sess.openingFloat || 0) + netCash
  const overShort = Number(body.countedCash || 0) - expectedClosing
  const patch: any = {
    status: 'closed',
    countedCash: Number(body.countedCash || 0),
    cashIn, cashOut, netCash,
    expectedClosing, overShort,
    endAt: new Date(),
    note: body.note || sess.note,
  }
  const updated = await HospitalCashSession.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean()
  res.json({ session: updated })
}

const listSchema = z.object({ from: z.string().optional(), to: z.string().optional(), userId: z.string().optional() })
export async function list(req: Request, res: Response){
  const q = listSchema.parse(req.query)
  const from = q.from || '1900-01-01'
  const to = q.to || todayIso()
  const filter: any = { dateIso: { $gte: from, $lte: to } }
  if (q.userId) filter.userId = q.userId
  const rows = await HospitalCashSession.find(filter).sort({ createdAt: -1 }).limit(500).lean()
  res.json({ sessions: rows })
}
