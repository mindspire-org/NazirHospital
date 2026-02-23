import { Request, Response } from 'express'
import { CorporateTransaction } from '../models/Transaction'
import { CorporateCompany } from '../models/Company'

export async function outstanding(req: Request, res: Response){
  const { companyId } = req.query as any
  const match: any = { netToCorporate: { $ne: 0 } }
  if (companyId) match.companyId = companyId
  const pipeline: any[] = [
    { $match: match },
    { $group: { _id: '$companyId', amount: { $sum: { $subtract: [ { $ifNull: ['$netToCorporate', 0] }, { $ifNull: ['$paidAmount', 0] } ] } }, accrued: { $sum: { $cond: [ { $eq: ['$status','accrued'] }, { $subtract: [ { $ifNull: ['$netToCorporate', 0] }, { $ifNull: ['$paidAmount', 0] } ] }, 0 ] } }, claimed: { $sum: { $cond: [ { $eq: ['$status','claimed'] }, { $subtract: [ { $ifNull: ['$netToCorporate', 0] }, { $ifNull: ['$paidAmount', 0] } ] }, 0 ] } } } },
    { $sort: { amount: -1 } }
  ]
  const rows = await (CorporateTransaction as any).aggregate(pipeline)
  const companies = await CorporateCompany.find({ _id: { $in: rows.map((r: any)=> r._id) } }).lean()
  const cmap = new Map<string, any>(companies.map((c: any)=> [String(c._id), c]))
  const result = rows.map((r: any)=> ({ companyId: String(r._id), companyName: cmap.get(String(r._id))?.name || '', outstanding: r.amount, accrued: r.accrued, claimed: r.claimed }))
  res.json({ rows: result })
}

export async function aging(req: Request, res: Response){
  const { companyId } = req.query as any
  const match: any = { status: { $in: ['accrued','claimed'] } }
  if (companyId) match.companyId = companyId
  const tx = await CorporateTransaction.find(match).select('companyId createdAt netToCorporate paidAmount').lean()
  const buckets = [ { key: '0-30', min: 0, max: 30 }, { key: '31-60', min: 31, max: 60 }, { key: '61-90', min: 61, max: 90 }, { key: '90+', min: 91, max: 100000 } ]
  const today = new Date()
  const agg = new Map<string, { [k: string]: number }>()
  function addRow(cid: string, bucket: string, amt: number){
    const row = agg.get(cid) || {}
    row[bucket] = (row[bucket] || 0) + amt
    agg.set(cid, row)
  }
  for (const t of tx as any[]){
    const due = Math.max(0, Number(t.netToCorporate || 0) - Number(t.paidAmount || 0))
    if (due <= 0) continue
    const days = Math.floor((today.getTime() - new Date(t.createdAt).getTime()) / (1000*60*60*24))
    const b = buckets.find(b => days >= b.min && days <= b.max)!
    addRow(String(t.companyId), b.key, due)
  }
  const companies = await CorporateCompany.find({ _id: { $in: Array.from(agg.keys()) } }).lean()
  const cmap = new Map<string, any>(companies.map((c: any)=> [String(c._id), c]))
  const rows = Array.from(agg.entries()).map(([cid, data]) => ({ companyId: cid, companyName: cmap.get(cid)?.name || '', ...buckets.reduce((acc, b)=> ({ ...acc, [b.key]: data[b.key] || 0 }), {}) }))
  res.json({ rows })
}
