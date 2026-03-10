import { Types } from 'mongoose'
import { FinanceJournal, JournalLine } from '../models/FinanceJournal'
import { HospitalDoctor } from '../models/Doctor'

function todayIso(){
  const now = new Date()
  return now.toISOString().slice(0,10)
}

function toOid(id?: string){
  try { return id ? new Types.ObjectId(id) : undefined } catch { return undefined }
}

function round2(n: number){
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export async function computeDoctorBalance(doctorId: string){
  const M = Types
  const rows: any[] = await FinanceJournal.aggregate([
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE', 'lines.tags.doctorId': new M.ObjectId(doctorId) } },
    { $group: { _id: null, credits: { $sum: { $ifNull: ['$lines.credit', 0] } }, debits: { $sum: { $ifNull: ['$lines.debit', 0] } } } },
  ])
  const credits = Number(rows?.[0]?.credits || 0)
  const debits = Number(rows?.[0]?.debits || 0)
  return round2(credits - debits)
}

export async function createDoctorPayout(doctorId: string, amount: number, method: 'Cash'|'Bank' = 'Cash', memo?: string, sessionId?: string){
  const dateIso = todayIso()
  const tags: any = { doctorId: toOid(doctorId) }
  if (sessionId) tags.sessionId = String(sessionId)
  const lines: JournalLine[] = [
    { account: 'DOCTOR_PAYABLE', debit: amount, tags },
    { account: method === 'Bank' ? 'BANK' : 'CASH', credit: amount, tags },
  ]
  return await FinanceJournal.create({ dateIso, refType: 'doctor_payout', refId: doctorId, memo: memo || 'Doctor payout', lines })
}

export async function manualDoctorEarning(data: { doctorId: string; departmentId?: string; amount: number; revenueAccount?: 'OPD_REVENUE'|'PROCEDURE_REVENUE'|'IPD_REVENUE'; paidMethod?: 'Cash'|'Bank'|'AR'; memo?: string; sharePercent?: number; patientName?: string; mrn?: string }){
  const dateIso = todayIso()
  // Interpret amount as the final doctor earning to accrue
  const doctorAmount = round2(Math.max(data.amount || 0, 0))
  const tagsBase: any = { }
  if (data.doctorId) tagsBase.doctorId = toOid(data.doctorId)
  if (data.departmentId) tagsBase.departmentId = toOid(data.departmentId)
  if (data.patientName) tagsBase.patientName = data.patientName
  if (data.mrn) tagsBase.mrn = data.mrn

  const lines: JournalLine[] = [
    { account: 'DOCTOR_SHARE_EXPENSE', debit: doctorAmount, tags: { ...tagsBase } },
    { account: 'DOCTOR_PAYABLE', credit: doctorAmount, tags: { ...tagsBase } },
  ]
  return await FinanceJournal.create({ dateIso, refType: 'manual_doctor_earning', refId: data.doctorId, memo: data.memo, lines })
}

export async function postOpdTokenJournal(args: { tokenId: string; dateIso: string; fee: number; doctorId?: string; departmentId?: string; patientId?: string; patientName?: string; mrn?: string; tokenNo?: string; paidMethod?: 'Cash'|'Bank'|'AR'; sessionId?: string; createdByUsername?: string }){
  // Idempotency with reversals: if latest OPD exists after the latest reversal, reuse it; otherwise allow a fresh post
  const lastOpd: any = await FinanceJournal.findOne({ refType: 'opd_token', refId: args.tokenId }).sort({ createdAt: -1 }).lean()
  const lastRev: any = await FinanceJournal.findOne({ refType: 'opd_token_reversal', refId: args.tokenId }).sort({ createdAt: -1 }).lean()
  if (lastOpd && (!lastRev || new Date(lastOpd.createdAt) > new Date(lastRev.createdAt))) return lastOpd as any
  const doc: any = args.doctorId ? await HospitalDoctor.findById(args.doctorId).lean() : null
  const percent = (doc as any)?.shares ?? 100
  const share = round2((args.fee || 0) * (Math.max(percent,0) / 100))
  const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')
  const tagsBase: any = { }
  if (args.doctorId) tagsBase.doctorId = toOid(args.doctorId)
  if (args.departmentId) tagsBase.departmentId = toOid(args.departmentId)
  if (args.tokenId) tagsBase.tokenId = toOid(args.tokenId)
  if (args.patientId) tagsBase.patientId = toOid(args.patientId)
  if (args.patientName) tagsBase.patientName = args.patientName
  if (args.mrn) tagsBase.mrn = args.mrn
  if (args.sessionId) tagsBase.sessionId = String(args.sessionId)
  if (args.createdByUsername) tagsBase.createdByUsername = args.createdByUsername

  const lines: JournalLine[] = [
    { account: debitAccount, debit: args.fee, tags: { ...tagsBase } },
    { account: 'OPD_REVENUE', credit: args.fee, tags: { ...tagsBase } },
    { account: 'DOCTOR_SHARE_EXPENSE', debit: share, tags: { ...tagsBase } },
    { account: 'DOCTOR_PAYABLE', credit: share, tags: { ...tagsBase } },
  ]
  const memo = `OPD Token ${args.tokenNo ? ('#'+args.tokenNo) : ''}`.trim()
  return await FinanceJournal.create({ dateIso: args.dateIso || todayIso(), refType: 'opd_token', refId: args.tokenId, memo, lines })
}

export async function reverseJournalByRef(refType: string, refId: string, memo?: string){
  const base: any = { refType, refId }
  const latestBase: any = await FinanceJournal.findOne(base).sort({ createdAt: -1 }).lean()
  if (!latestBase) return null

  // Idempotency: if a reversal already exists and it's newer than the latest base journal,
  // do not create another reversal.
  try {
    const lastRev: any = await FinanceJournal.findOne({ refType: `${refType}_reversal`, refId }).sort({ createdAt: -1 }).lean()
    if (lastRev && new Date(lastRev.createdAt) >= new Date(latestBase.createdAt)) return lastRev as any
  } catch {}

  const revLines: JournalLine[] = []
  for (const l of (latestBase.lines || [])){
    revLines.push({ account: l.account, debit: l.credit || 0, credit: l.debit || 0, tags: l.tags })
  }
  const r = await FinanceJournal.create({ dateIso: todayIso(), refType: `${refType}_reversal`, refId, memo: memo || `Reversal for ${refType}:${refId}` , lines: revLines })
  return r
}

export async function reverseJournalById(journalId: string, memo?: string){
  const j: any = await FinanceJournal.findById(journalId).lean()
  if (!j) return null
  const revLines: JournalLine[] = []
  for (const l of (j.lines || [])){
    revLines.push({ account: l.account, debit: l.credit || 0, credit: l.debit || 0, tags: l.tags })
  }
  const r = await FinanceJournal.create({ dateIso: todayIso(), refType: `${j.refType || 'journal'}_reversal`, refId: String(j._id), memo: memo || `Reversal for journal ${j._id}` , lines: revLines })
  return r
}
