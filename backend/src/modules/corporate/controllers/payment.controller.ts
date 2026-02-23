import { Request, Response } from 'express'
import { CorporatePayment } from '../models/Payment'
import { CorporateTransaction } from '../models/Transaction'

export async function list(req: Request, res: Response){
  const { companyId, from, to, page, limit } = req.query as any
  const q: any = {}
  if (companyId) q.companyId = companyId
  if (from || to){
    q.createdAt = {}
    if (from) q.createdAt.$gte = new Date(String(from))
    if (to) { const end = new Date(String(to)); end.setHours(23,59,59,999); q.createdAt.$lte = end }
  }
  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    CorporatePayment.find(q).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    CorporatePayment.countDocuments(q),
  ])
  res.json({ items, total, page: pg, totalPages: Math.max(1, Math.ceil((total||0)/lim)) })
}

export async function getById(req: Request, res: Response){
  const { id } = req.params as any
  const row = await CorporatePayment.findById(id).lean()
  if (!row) return res.status(404).json({ error: 'Payment not found' })
  res.json({ payment: row })
}

export async function create(req: Request, res: Response){
  const body = req.body as any
  const companyId = String(body.companyId || '')
  const dateIso = String(body.dateIso || new Date().toISOString().slice(0,10))
  const amount = Number(body.amount || 0)
  const allocations = Array.isArray(body.allocations) ? body.allocations : []
  if (!companyId) return res.status(400).json({ error: 'companyId is required' })
  if (!(amount > 0)) return res.status(400).json({ error: 'amount must be > 0' })

  // Create payment
  const payment = await CorporatePayment.create({ companyId, dateIso, amount, refNo: body.refNo, notes: body.notes, allocations: [], unallocated: amount })

  // Apply allocations best-effort
  try {
    for (const a of allocations){
      const txId = String(a?.transactionId || '')
      const alloc = Number(a?.amount || 0)
      if (!txId || !(alloc > 0)) continue
      const tx: any = await CorporateTransaction.findById(txId)
      if (!tx || String(tx.companyId) !== String(companyId)) continue
      const due = Math.max(0, Number(tx.netToCorporate || 0) - Number(tx.paidAmount || 0))
      const apply = Math.max(0, Math.min(alloc, due, Number(payment.unallocated || 0)))
      if (apply <= 0) continue
      // Update tx
      const newPaid = Number(tx.paidAmount || 0) + apply
      tx.paidAmount = newPaid
      if (newPaid >= Number(tx.netToCorporate || 0)){
        tx.status = 'paid'
      }
      await tx.save()
      // Update payment
      payment.allocations.push({ transactionId: tx._id, amount: apply } as any)
      payment.unallocated = Math.max(0, Number(payment.unallocated || 0) - apply)
    }
    await payment.save()
  } catch (e) { console.warn('Payment allocation warnings:', e) }

  res.status(201).json({ payment })
}
