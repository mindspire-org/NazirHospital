import { Request, Response } from 'express'
import { z } from 'zod'
import { Types } from 'mongoose'
import { FinanceJournal } from '../models/FinanceJournal'
import { Vendor } from '../models/Vendor'
import { RecurringPayment } from '../models/RecurringPayment'

function todayIsoCutoff12(){
  const now = new Date()
  const d = new Date(now)
  if (now.getHours() >= 12) d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0,10)
}

// ========== Vendors ==========
const vendorSchema = z.object({ name: z.string().min(1), phone: z.string().optional(), address: z.string().optional() })
const vendorQuerySchema = z.object({ q: z.string().optional(), page: z.string().optional(), limit: z.string().optional() })
export async function listVendors(req: Request, res: Response){
  const parsed = vendorQuerySchema.safeParse(req.query)
  const { q, page, limit } = parsed.success ? parsed.data : {}
  const filter: any = {}
  if (q && q.trim()){
    const rx = new RegExp(q.trim(), 'i')
    filter.$or = [ { name: rx }, { phone: rx }, { address: rx } ]
  }

  // If page/limit specified, paginate; otherwise return full list for backward compatibility
  if (page || limit){
    const effectiveLimit = Math.max(1, Math.min(100, parseInt(String(limit||'10'), 10) || 10))
    const currentPage = Math.max(1, parseInt(String(page||'1'), 10) || 1)
    const skip = (currentPage - 1) * effectiveLimit
    const total = await Vendor.countDocuments(filter)
    const items = await Vendor.find(filter).sort({ name: 1 }).skip(skip).limit(effectiveLimit).lean()
    const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
    return res.json({ vendors: items, total, page: currentPage, totalPages })
  }

  const rows = await Vendor.find(filter).sort({ name: 1 }).lean()
  res.json({ vendors: rows, total: rows.length, page: 1, totalPages: 1 })
}
export async function createVendor(req: Request, res: Response){
  const data = vendorSchema.parse(req.body)
  const row = await Vendor.create(data as any)
  res.status(201).json({ vendor: row })
}
export async function updateVendor(req: Request, res: Response){
  const id = String(req.params.id)
  const data = vendorSchema.partial().parse(req.body)
  const row = await Vendor.findByIdAndUpdate(id, data, { new: true }).lean()
  if (!row) return res.status(404).json({ error: 'Vendor not found' })
  res.json({ vendor: row })
}
export async function deleteVendor(req: Request, res: Response){
  const id = String(req.params.id)
  const row = await Vendor.findByIdAndDelete(id)
  if (!row) return res.status(404).json({ error: 'Vendor not found' })
  res.json({ ok: true })
}

// ========== Trial Balance ==========
const rangeQuerySchema = z.object({ from: z.string().optional(), to: z.string().optional() })
export async function trialBalance(req: Request, res: Response){
  const q = rangeQuerySchema.parse(req.query)
  const today = todayIsoCutoff12()
  const from = q.from || '1900-01-01'
  const to = q.to || today
  const rows: any[] = await FinanceJournal.aggregate([
    { $match: { dateIso: { $gte: from, $lte: to } } },
    { $unwind: '$lines' },
    { $group: { _id: '$lines.account', debit: { $sum: { $ifNull: ['$lines.debit', 0] } }, credit: { $sum: { $ifNull: ['$lines.credit', 0] } } } },
    { $project: { _id: 0, account: '$_id', debit: 1, credit: 1, balance: { $subtract: ['$debit', '$credit'] } } },
    { $sort: { account: 1 } },
  ])
  res.json({ from, to, rows })
}

// ========== Balance Sheet ==========
const balanceSheetSchema = z.object({ asOf: z.string().optional() })
export async function balanceSheet(req: Request, res: Response){
  const q = balanceSheetSchema.parse(req.query)
  const asOf = q.asOf || todayIsoCutoff12()
  const rows: any[] = await FinanceJournal.aggregate([
    { $match: { dateIso: { $lte: asOf } } },
    { $unwind: '$lines' },
    { $group: { _id: '$lines.account', debit: { $sum: { $ifNull: ['$lines.debit', 0] } }, credit: { $sum: { $ifNull: ['$lines.credit', 0] } } } },
    { $project: { _id: 0, account: '$_id', debit: 1, credit: 1, balance: { $subtract: ['$debit', '$credit'] } } },
  ])
  const map: Record<string, number> = {}
  for (const r of rows) map[r.account] = Number(r.balance||0)
  const assetsAccounts = ['CASH','BANK','AR']
  const liabilityAccounts = ['DOCTOR_PAYABLE']
  const revenueAccounts = ['OPD_REVENUE','IPD_REVENUE','PROCEDURE_REVENUE']
  const expenseAccounts = ['DOCTOR_SHARE_EXPENSE','EXPENSE']
  const sum = (names: string[]) => names.reduce((s, n) => s + (map[n] || 0), 0)
  const assets = assetsAccounts.map(a => ({ account: a, amount: map[a] || 0 }))
  const liabilities = liabilityAccounts.map(a => ({ account: a, amount: -(map[a] || 0) }))
  const revenue = -sum(revenueAccounts)
  const expenses = sum(expenseAccounts)
  const equity = revenue - expenses
  const totalAssets = assets.reduce((s, x) => s + x.amount, 0)
  const totalLiabilities = liabilities.reduce((s, x) => s + x.amount, 0)
  const totalEquity = equity
  res.json({ asOf, assets, liabilities, equity: { account: 'RETAINED_EARNINGS', amount: totalEquity }, totals: { assets: totalAssets, liabilities: totalLiabilities, equity: totalEquity } })
}

// ========== Ledger ==========
const ledgerSchema = z.object({ account: z.string().min(1), from: z.string().optional(), to: z.string().optional() })
export async function accountLedger(req: Request, res: Response){
  const q = ledgerSchema.parse(req.query)
  const today = todayIsoCutoff12()
  const from = q.from || '1900-01-01'
  const to = q.to || today
  const rows: any[] = await FinanceJournal.aggregate([
    { $match: { dateIso: { $gte: from, $lte: to } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': q.account } },
    { $project: { dateIso: 1, refType: 1, refId: 1, memo: 1, debit: '$lines.debit', credit: '$lines.credit' } },
    { $sort: { dateIso: 1, _id: 1 } },
  ])
  let running = 0
  const entries = rows.map(r => ({ ...r, running: (running += (Number(r.debit||0) - Number(r.credit||0))) }))
  res.json({ account: q.account, from, to, entries })
}

// ========== Vouchers (basic journals) ==========
const voucherSchema = z.object({
  dateIso: z.string().optional(),
  type: z.enum(['receipt','payment','journal']).default('journal'),
  memo: z.string().optional(),
  lines: z.array(z.object({ account: z.string().min(1), debit: z.number().optional(), credit: z.number().optional(), tags: z.any().optional() })).min(2),
})
export async function createVoucher(req: Request, res: Response){
  const data = voucherSchema.parse(req.body)
  const dateIso = data.dateIso || todayIsoCutoff12()
  const refType = `voucher_${data.type}`
  const j = await FinanceJournal.create({ dateIso, refType, memo: data.memo, lines: data.lines })
  res.status(201).json({ voucher: j })
}
export async function listVouchers(req: Request, res: Response){
  const q = rangeQuerySchema.parse(req.query)
  const today = todayIsoCutoff12()
  const from = q.from || '1900-01-01'
  const to = q.to || today
  const rows = await FinanceJournal.find({ dateIso: { $gte: from, $lte: to }, refType: { $regex: '^voucher_' } }).sort({ dateIso: -1, createdAt: -1 }).limit(500).lean()
  res.json({ vouchers: rows })
}

// ========== Recurring Payments ==========
const recurringSchema = z.object({
  name: z.string().min(1),
  memo: z.string().optional(),
  amount: z.number().min(0),
  accountDebit: z.string().min(1),
  accountCredit: z.string().min(1),
  vendorId: z.string().optional(),
  frequency: z.enum(['daily','weekly','monthly']).default('monthly'),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  nextRun: z.string().optional(),
  active: z.boolean().optional(),
})
export async function listRecurring(_req: Request, res: Response){
  const rows = await RecurringPayment.find({}).sort({ createdAt: -1 }).lean()
  res.json({ recurring: rows })
}
export async function createRecurring(req: Request, res: Response){
  const data = recurringSchema.parse(req.body)
  const nextRun = data.nextRun || data.startDate
  const row = await RecurringPayment.create({ ...data, nextRun })
  res.status(201).json({ recurring: row })
}
export async function updateRecurring(req: Request, res: Response){
  const id = String(req.params.id)
  const data = recurringSchema.partial().parse(req.body)
  const row = await RecurringPayment.findByIdAndUpdate(id, data, { new: true }).lean()
  if (!row) return res.status(404).json({ error: 'Recurring payment not found' })
  res.json({ recurring: row })
}
export async function deleteRecurring(req: Request, res: Response){
  const id = String(req.params.id)
  const row = await RecurringPayment.findByIdAndDelete(id)
  if (!row) return res.status(404).json({ error: 'Recurring payment not found' })
  res.json({ ok: true })
}
function addDays(dateIso: string, days: number){ const d = new Date(dateIso+'T00:00:00'); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10) }
function addMonths(dateIso: string, months: number){ const d = new Date(dateIso+'T00:00:00'); d.setMonth(d.getMonth()+months); return d.toISOString().slice(0,10) }
export async function runRecurring(req: Request, res: Response){
  const id = String(req.params.id)
  const row: any = await RecurringPayment.findById(id).lean()
  if (!row) return res.status(404).json({ error: 'Recurring payment not found' })
  if (row.active === false) return res.status(400).json({ error: 'Recurring payment inactive' })
  const dateIso = String(row.nextRun || todayIsoCutoff12())
  const lines = [
    { account: String(row.accountDebit), debit: Number(row.amount||0), tags: row.vendorId ? { vendorId: new Types.ObjectId(String(row.vendorId)) } : undefined },
    { account: String(row.accountCredit), credit: Number(row.amount||0), tags: row.vendorId ? { vendorId: new Types.ObjectId(String(row.vendorId)) } : undefined },
  ] as any
  const j = await FinanceJournal.create({ dateIso, refType: 'voucher_recurring', refId: String(row._id), memo: row.memo || row.name, lines })
  let next = dateIso
  if (row.frequency === 'daily') next = addDays(dateIso, 1)
  else if (row.frequency === 'weekly') next = addDays(dateIso, 7)
  else next = addMonths(dateIso, 1)
  await RecurringPayment.findByIdAndUpdate(row._id, { nextRun: next })
  res.json({ journal: j, nextRun: next })
}

// ========== Combined cash/bank summary across modules ==========
export async function combinedCashBank(req: Request, res: Response){
  const q = rangeQuerySchema.parse(req.query)
  const today = todayIsoCutoff12()
  const from = q.from || '1900-01-01'
  const to = q.to || today
  const agg = async (collection: any) => {
    const rows: any[] = await collection.aggregate([
      { $match: { dateIso: { $gte: from, $lte: to } } },
      { $unwind: '$lines' },
      { $match: { 'lines.account': { $in: ['CASH','BANK'] } } },
      { $group: { _id: '$lines.account', debit: { $sum: { $ifNull: ['$lines.debit', 0] } }, credit: { $sum: { $ifNull: ['$lines.credit', 0] } } } },
      { $project: { _id: 0, account: '$_id', inflow: '$credit', outflow: '$debit', net: { $subtract: ['$credit', '$debit'] } } },
    ])
    const map: any = Object.fromEntries(rows.map(r => [r.account, r]))
    return {
      cash: map.CASH || { account: 'CASH', inflow: 0, outflow: 0, net: 0 },
      bank: map.BANK || { account: 'BANK', inflow: 0, outflow: 0, net: 0 },
    }
  }
  const hospital = await agg(FinanceJournal)
  let aesthetic = { cash: { account: 'CASH', inflow: 0, outflow: 0, net: 0 }, bank: { account: 'BANK', inflow: 0, outflow: 0, net: 0 } }
  try {
    const { AestheticFinanceJournal } = require('../../aesthetic/models/FinanceJournal')
    aesthetic = await agg(AestheticFinanceJournal)
  } catch {}
  res.json({ from, to, hospital, diagnostic: aesthetic, pharmacy: { cash: { account: 'CASH', inflow: 0, outflow: 0, net: 0 }, bank: { account: 'BANK', inflow: 0, outflow: 0, net: 0 } }, lab: { cash: { account: 'CASH', inflow: 0, outflow: 0, net: 0 }, bank: { account: 'BANK', inflow: 0, outflow: 0, net: 0 } } })
}
