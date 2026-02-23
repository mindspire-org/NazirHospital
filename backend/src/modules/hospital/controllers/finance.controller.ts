import { Request, Response } from 'express'
import { z } from 'zod'
import { FinanceJournal } from '../models/FinanceJournal'
import { createDoctorPayout, manualDoctorEarning, computeDoctorBalance, reverseJournalById } from './finance_ledger'
import { HospitalCashSession } from '../models/CashSession'

const manualDoctorEarningSchema = z.object({
  doctorId: z.string().min(1),
  departmentId: z.string().optional(),
  amount: z.number().positive(),
  revenueAccount: z.enum(['OPD_REVENUE','PROCEDURE_REVENUE','IPD_REVENUE']).optional(),
  paidMethod: z.enum(['Cash','Bank','AR']).optional(),
  memo: z.string().optional(),
  sharePercent: z.number().min(0).max(100).optional(),
  patientName: z.string().optional(),
  mrn: z.string().optional(),
})

const doctorPayoutSchema = z.object({
  doctorId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['Cash','Bank']).default('Cash'),
  memo: z.string().optional(),
})

export async function postManualDoctorEarning(req: Request, res: Response){
  const data = manualDoctorEarningSchema.parse(req.body)
  const j = await manualDoctorEarning(data)
  res.status(201).json({ journal: j })
}

export async function reverseJournal(req: Request, res: Response){
  const id = String(req.params.id)
  const memo = String((req.body as any)?.memo || '')
  const r = await reverseJournalById(id, memo)
  if (!r) return res.status(404).json({ error: 'Journal not found' })
  res.json({ reversed: r })
}

export async function listDoctorEarnings(req: Request, res: Response){
  const doctorId = (req.query as any)?.doctorId ? String((req.query as any).doctorId) : undefined
  const from = String((req.query as any)?.from || '')
  const to = String((req.query as any)?.to || '')
  const M = require('mongoose')
  const matchDate = (from && to) ? { dateIso: { $gte: from, $lte: to } } : {}
  const matchDoctor = doctorId ? { 'lines.tags.doctorId': new M.Types.ObjectId(doctorId) } : {}
  const rows = await FinanceJournal.aggregate([
    { $match: { ...matchDate, refType: { $in: ['opd_token','manual_doctor_earning'] } } },
    { $addFields: { allLines: '$lines' } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE', ...(doctorId? matchDoctor : {}) } },
    { $lookup: {
        from: 'hospital_finance_journals',
        let: { origId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$refId', { $toString: '$$origId' }] } } },
        ],
        as: 'reversals'
      }
    },
    { $addFields: { _revCount: { $size: '$reversals' } } },
    { $match: { _revCount: { $eq: 0 } } },
    { $addFields: { _tidStr: { $toString: '$lines.tags.tokenId' } } },
    { $lookup: {
        from: 'hospital_finance_journals',
        let: { tidStr: '$_tidStr' },
        pipeline: [
          { $match: { $expr: { $and: [ { $eq: ['$refType','opd_token_reversal'] }, { $eq: ['$refId','$$tidStr'] } ] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: 'revForToken'
      }
    },
    { $addFields: { _lastRev: { $arrayElemAt: ['$revForToken', 0] } } },
    { $addFields: { _keep: { $or: [ { $eq: ['$_lastRev', null] }, { $gt: ['$createdAt', '$_lastRev.createdAt'] } ] } } },
    { $match: { _keep: { $eq: true } } },
    { $lookup: {
        from: 'hospital_tokens',
        let: { tidStr: '$_tidStr' },
        pipeline: [
          { $match: { $expr: { $eq: [ { $toString: '$_id' }, '$$tidStr' ] } } },
          { $project: { patientName: 1, mrn: 1, tokenNo: 1, fee: 1, discount: 1 } }
        ],
        as: 'tok'
      }
    },
    { $addFields: { token: { $arrayElemAt: ['$tok', 0] } } },
    { $addFields: {
        revenueLine: {
          $arrayElemAt: [
            { $filter: { input: '$allLines', as: 'l', cond: { $in: ['$$l.account', ['OPD_REVENUE','IPD_REVENUE','PROCEDURE_REVENUE']] } } },
            0
          ]
        }
      }
    },
    { $project: { 
        _id: 1, dateIso: 1, refType: 1, refId: 1, memo: 1, line: '$lines', revenueAccount: '$revenueLine.account',
        patientName: { $ifNull: ['$token.patientName', '$lines.tags.patientName'] },
        mrn: { $ifNull: ['$token.mrn', '$lines.tags.mrn'] },
        tokenNo: '$token.tokenNo',
        fee: '$token.fee',
        discount: '$token.discount'
      } 
    },
    { $sort: { dateIso: -1, _id: -1 } },
    { $limit: 500 },
  ])
  const items = rows.map((r: any) => {
    const doctorAmount = Number(r.line?.credit || 0)
    const isOpd = r.refType === 'opd_token'
    const fee = Number(r?.fee ?? 0)
    const discount = Number(r?.discount ?? 0)
    const gross = (Number.isFinite(fee) ? fee : 0) + (Number.isFinite(discount) ? discount : 0)
    const sharePercent = (isOpd && fee > 0) ? ((doctorAmount / fee) * 100) : null
    return ({
      id: String(r._id),
      dateIso: r.dateIso,
      doctorId: r.line?.tags?.doctorId ? String(r.line.tags.doctorId) : undefined,
      departmentId: r.line?.tags?.departmentId ? String(r.line.tags.departmentId) : undefined,
      tokenId: r.line?.tags?.tokenId ? String(r.line.tags.tokenId) : undefined,
      type: r.refType === 'opd_token' ? 'OPD' : (r.revenueAccount === 'PROCEDURE_REVENUE' ? 'Procedure' : (r.revenueAccount === 'IPD_REVENUE' ? 'IPD' : 'OPD')),
      amount: doctorAmount,
      memo: r.memo,
      patientName: r.patientName,
      mrn: r.mrn,
      tokenNo: r.tokenNo,
      fee: Number.isFinite(fee) ? fee : undefined,
      discount: Number.isFinite(discount) ? discount : undefined,
      gross: Number.isFinite(gross) ? gross : undefined,
      sharePercent: sharePercent != null ? sharePercent : null,
    })
  })
  res.json({ earnings: items })
}

export async function postDoctorPayout(req: Request, res: Response){
  const data = doctorPayoutSchema.parse(req.body)
  let sessionId: string | undefined = undefined
  try{
    if (data.method === 'Cash'){
      const userId = String((req as any).user?._id || (req as any).user?.id || (req as any).user?.email || '')
      if (userId){
        const sess: any = await HospitalCashSession.findOne({ status: 'open', userId }).sort({ createdAt: -1 }).lean()
        if (sess) sessionId = String(sess._id)
      }
    }
  } catch {}
  const j = await createDoctorPayout(data.doctorId, data.amount, data.method, data.memo, sessionId)
  res.status(201).json({ journal: j })
}

export async function getDoctorBalance(req: Request, res: Response){
  const id = String(req.params.id)
  const balance = await computeDoctorBalance(id)
  res.json({ doctorId: id, payable: balance })
}

export async function listDoctorPayouts(req: Request, res: Response){
  const id = String(req.params.id)
  const limit = Math.min(parseInt(String((req.query as any)?.limit || '20')) || 20, 100)
  const rows = await FinanceJournal.find({ refType: 'doctor_payout', refId: id }).sort({ createdAt: -1 }).limit(limit).lean()
  const items = rows.map((j: any) => {
    const cash = (j.lines || [])
      .filter((l: any) => l.account === 'CASH' || l.account === 'BANK')
      .reduce((s: number, l: any) => s + (l.credit || 0), 0)
    const amount = cash || (j.lines || [])
      .filter((l: any) => l.account === 'DOCTOR_PAYABLE')
      .reduce((s: number, l: any) => s + (l.debit || 0), 0)
    return { id: String(j._id), refId: j.refId, dateIso: j.dateIso, memo: j.memo, amount }
  })
  res.json({ payouts: items })
}

export async function doctorAccruals(req: Request, res: Response){
  const id = String(req.params.id)
  const from = String((req.query as any)?.from || '')
  const to = String((req.query as any)?.to || '')
  if (!from || !to) return res.status(400).json({ error: 'from and to (YYYY-MM-DD) required' })
  const rows = await FinanceJournal.aggregate([
    { $match: { dateIso: { $gte: from, $lte: to } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE', 'lines.tags.doctorId': { $exists: true } } },
    { $group: {
      _id: '$lines.tags.doctorId',
      accruals: { $sum: { $ifNull: ['$lines.credit', 0] } },
      debits: { $sum: { $ifNull: ['$lines.debit', 0] } },
    }},
    { $project: { _id: 0, accruals: 1, debits: 1 } }
  ])
  const accruals = Number(rows?.[0]?.accruals || 0)
  const debits = Number(rows?.[0]?.debits || 0)
  const suggested = Math.max(accruals - debits, 0)
  res.json({ doctorId: id, from, to, accruals, debits, suggested })
}
