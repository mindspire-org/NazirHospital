import { Request, Response } from 'express'
import { CorporateTransaction } from '../models/Transaction'
import { CorporateClaim } from '../models/Claim'

async function nextClaimNo(){
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const yyyymm = `${yyyy}${mm}`
  const count = await CorporateClaim.countDocuments({ createdAt: { $gte: new Date(`${yyyy}-${mm}-01`)} })
  const seq = String((count || 0) + 1).padStart(3,'0')
  return `CLM-${yyyymm}-${seq}`
}

export async function list(req: Request, res: Response){
  const { companyId, status, from, to, page, limit } = req.query as any
  const q: any = {}
  if (companyId) q.companyId = companyId
  if (status) q.status = status
  if (from || to){
    q.createdAt = {}
    if (from) q.createdAt.$gte = new Date(String(from))
    if (to) { const end = new Date(String(to)); end.setHours(23,59,59,999); q.createdAt.$lte = end }
  }
  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    CorporateClaim.find(q).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    CorporateClaim.countDocuments(q),
  ])
  res.json({ items, total, page: pg, totalPages: Math.max(1, Math.ceil((total||0)/lim)) })
}

export async function getById(req: Request, res: Response){
  const { id } = req.params as any
  const claim = await CorporateClaim.findById(id).lean()
  if (!claim) return res.status(404).json({ error: 'Claim not found' })
  const tx = await CorporateTransaction.find({ claimId: String(id) }).sort({ createdAt: 1 }).lean()
  res.json({ claim, transactions: tx })
}

export async function generate(req: Request, res: Response){
  const { companyId, fromDate, toDate } = req.body as any
  if (!companyId) return res.status(400).json({ error: 'companyId is required' })
  const txFilter: any = { companyId, status: 'accrued', netToCorporate: { $ne: 0 }, claimId: { $in: [null, '', undefined] } }
  // Prefer createdAt range; if fromDate/toDate provided use those as day bounds
  if (fromDate || toDate){
    txFilter.createdAt = {}
    if (fromDate) txFilter.createdAt.$gte = new Date(String(fromDate))
    if (toDate) { const end = new Date(String(toDate)); end.setHours(23,59,59,999); txFilter.createdAt.$lte = end }
  }
  const tx = await CorporateTransaction.find(txFilter).lean()
  if (!tx.length) return res.status(400).json({ error: 'No transactions to claim' })
  const total = tx.reduce((s: number, t: any)=> s + Number(t?.netToCorporate||0), 0)
  const claim = await CorporateClaim.create({
    companyId,
    claimNo: await nextClaimNo(),
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    totalAmount: total,
    totalTransactions: tx.length,
    status: 'locked',
  })
  await CorporateTransaction.updateMany({ _id: { $in: tx.map((t: any)=> t._id) } }, { $set: { status: 'claimed', claimId: String(claim._id) } })
  res.status(201).json({ claim })
}

export async function lock(req: Request, res: Response){
  const { id } = req.params as any
  const cl = await CorporateClaim.findByIdAndUpdate(id, { $set: { status: 'locked' } }, { new: true })
  if (!cl) return res.status(404).json({ error: 'Claim not found' })
  res.json({ claim: cl })
}

export async function unlock(req: Request, res: Response){
  const { id } = req.params as any
  const cl = await CorporateClaim.findById(id)
  if (!cl) return res.status(404).json({ error: 'Claim not found' })
  // Revert transactions to accrued and remove claimId
  await CorporateTransaction.updateMany({ claimId: String(id), status: 'claimed' }, { $set: { status: 'accrued', claimId: '' } })
  cl.status = 'open'
  await cl.save()
  res.json({ claim: cl })
}

export async function exportCsv(req: Request, res: Response){
  const { id } = req.params as any
  const cl = await CorporateClaim.findById(id).lean()
  if (!cl) return res.status(404).json({ error: 'Claim not found' })
  const tx = await CorporateTransaction.find({ claimId: String(id) }).sort({ createdAt: 1 }).lean()
  const headers = ['TransactionId','Date','MRN','PatientName','Service','RefType','RefId','Description','Qty','UnitPrice','CoPay','NetToCorporate','RuleId']
  const rows = [headers.join(',')]
  for (const t of tx as any[]){
    const line = [
      String(t._id||''),
      String(t.dateIso||''),
      String(t.patientMrn||''),
      String(t.patientName||''),
      String(t.serviceType||''),
      String(t.refType||''),
      String(t.refId||''),
      String(t.description||'').replace(/[,\n\r]/g,' '),
      String(t.qty||1),
      String(t.unitPrice||0),
      String(t.coPay||0),
      String(t.netToCorporate||0),
      String(t.corpRuleId||''),
    ].join(',')
    rows.push(line)
  }
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=claim_${String((cl as any)?.claimNo||id)}.csv`)
  res.send(rows.join('\n'))
}

// Remove a claim. Requires the claim to be unlocked/open.
export async function remove(req: Request, res: Response){
  const { id } = req.params as any
  const cl = await CorporateClaim.findById(id)
  if (!cl) return res.status(404).json({ error: 'Claim not found' })
  if (cl.status !== 'open'){
    return res.status(400).json({ error: 'Unlock claim before deleting' })
  }
  // Detach transactions from this claim and revert status to accrued if they were claimed
  await CorporateTransaction.updateMany(
    { claimId: String(id) },
    [{
      $set: {
        claimId: '',
        status: {
          $cond: [ { $eq: ['$status','claimed'] }, 'accrued', '$status' ]
        }
      }
    }] as any
  )
  await CorporateClaim.deleteOne({ _id: id })
  res.json({ ok: true })
}
