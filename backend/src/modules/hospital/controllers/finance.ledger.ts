import { Types } from 'mongoose'
import { FinanceJournal, JournalLine } from '../models/FinanceJournal'
import { HospitalDoctor } from '../models/Doctor'

function todayIso(){
  return new Date().toISOString().slice(0,10)
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

export async function createDoctorPayout(doctorId: string, amount: number, method: 'Cash'|'Bank' = 'Cash', memo?: string){
  const dateIso = todayIso()
  const tags = { doctorId: toOid(doctorId) }
  const lines: JournalLine[] = [
    { account: 'DOCTOR_PAYABLE', debit: amount, tags },
    { account: method === 'Bank' ? 'BANK' : 'CASH', credit: amount, tags },
  ]
  return await FinanceJournal.create({ dateIso, refType: 'doctor_payout', refId: doctorId, memo: memo || 'Doctor payout', lines })
}

export async function manualDoctorEarning(data: { doctorId: string; departmentId?: string; amount: number; revenueAccount?: 'OPD_REVENUE'|'PROCEDURE_REVENUE'|'IPD_REVENUE'; paidMethod?: 'Cash'|'Bank'|'AR'; memo?: string; sharePercent?: number }){
  const dateIso = todayIso()
  const doc: any = data.doctorId ? await HospitalDoctor.findById(data.doctorId).lean() : null
  const percent = typeof data.sharePercent === 'number' ? data.sharePercent : ((doc as any)?.shares ?? 100)
  const share = round2((data.amount || 0) * (Math.max(percent,0) / 100))
  const debitAccount = data.paidMethod === 'Bank' ? 'BANK' : (data.paidMethod === 'AR' ? 'AR' : 'CASH')
  const revenueAccount = data.revenueAccount || 'OPD_REVENUE'
  const tagsBase: any = { }
  if (data.doctorId) tagsBase.doctorId = toOid(data.doctorId)
  if (data.departmentId) tagsBase.departmentId = toOid(data.departmentId)

  const lines: JournalLine[] = [
    { account: debitAccount, debit: data.amount, tags: { ...tagsBase } },
    { account: revenueAccount, credit: data.amount, tags: { ...tagsBase } },
    { account: 'DOCTOR_SHARE_EXPENSE', debit: share, tags: { ...tagsBase } },
    { account: 'DOCTOR_PAYABLE', credit: share, tags: { ...tagsBase } },
  ]
  return await FinanceJournal.create({ dateIso, refType: 'manual_doctor_earning', refId: data.doctorId, memo: data.memo, lines })
}

export async function postOpdTokenJournal(args: { tokenId: string; dateIso: string; fee: number; doctorId?: string; departmentId?: string; patientId?: string; tokenNo?: string; paidMethod?: 'Cash'|'Bank'|'AR' }){
  const doc: any = args.doctorId ? await HospitalDoctor.findById(args.doctorId).lean() : null
  const percent = (doc as any)?.shares ?? 100
  const share = round2((args.fee || 0) * (Math.max(percent,0) / 100))
  const debitAccount = args.paidMethod === 'Bank' ? 'BANK' : (args.paidMethod === 'Cash' ? 'CASH' : 'AR')
  const tagsBase: any = { }
  if (args.doctorId) tagsBase.doctorId = toOid(args.doctorId)
  if (args.departmentId) tagsBase.departmentId = toOid(args.departmentId)
  if (args.tokenId) tagsBase.tokenId = toOid(args.tokenId)
  if (args.patientId) tagsBase.patientId = toOid(args.patientId)

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
  const list = await FinanceJournal.find(base).lean()
  if (!list.length) return null
  const revLines: JournalLine[] = []
  for (const j of list){
    for (const l of (j.lines || [])){
      revLines.push({ account: l.account, debit: l.credit || 0, credit: l.debit || 0, tags: l.tags })
    }
  }
  const r = await FinanceJournal.create({ dateIso: todayIso(), refType: `${refType}_reversal`, refId, memo: memo || `Reversal for ${refType}:${refId}` , lines: revLines })
  return r
}
