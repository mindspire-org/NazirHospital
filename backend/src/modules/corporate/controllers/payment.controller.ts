import { Request, Response } from 'express'
import { CorporatePayment } from '../models/Payment'
import { CorporateTransaction } from '../models/Transaction'
import { CorporateCompany } from '../models/Company'
import { CorporateClaim } from '../models/Claim'

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

  const companyIds = Array.from(new Set((items || []).map((p: any) => String(p.companyId || '')).filter(Boolean)))
  const companies = companyIds.length
    ? await CorporateCompany.find({ _id: { $in: companyIds as any } }).select('_id name').lean()
    : []
  const companyMap: Record<string, string> = {}
  for (const c of (companies || []) as any[]) companyMap[String(c._id)] = String(c.name || '')

  const out = (items || []).map((p: any) => ({
    ...p,
    companyName: companyMap[String(p.companyId)] || undefined,
  }))

  res.json({ items: out, total, page: pg, totalPages: Math.max(1, Math.ceil((total||0)/lim)) })
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

// Create payment for a claim with discount
export async function createForClaim(req: Request, res: Response){
  const body = req.body as any
  const companyId = String(body.companyId || '')
  const claimId = String(body.claimId || '')
  const dateIso = String(body.dateIso || new Date().toISOString().slice(0,10))
  const amount = Number(body.amount || 0)
  const discount = Number(body.discount || 0)
  
  if (!companyId) return res.status(400).json({ error: 'companyId is required' })
  if (!claimId) return res.status(400).json({ error: 'claimId is required' })
  if (!(amount > 0) && !(discount > 0)) return res.status(400).json({ error: 'amount or discount must be > 0' })

  // Verify claim exists and belongs to company
  const claim: any = await CorporateClaim.findById(claimId)
  if (!claim) return res.status(404).json({ error: 'Claim not found' })
  if (String(claim.companyId) !== String(companyId)) return res.status(400).json({ error: 'Claim does not belong to this company' })

  // Get all transactions for this claim
  const transactions: any[] = await CorporateTransaction.find({ claimId, status: { $in: ['claimed', 'partially-paid'] } }).sort({ createdAt: 1 }).lean()
  if (!transactions.length) return res.status(400).json({ error: 'No outstanding transactions found for this claim' })

  // Calculate total due across all claim transactions
  const totalDue = transactions.reduce((sum, tx) => sum + Math.max(0, Number(tx.netToCorporate || 0) - Number(tx.paidAmount || 0)), 0)
  
  // Discount reduces the claim total (forgiven amount)
  // Remaining after discount is paid by cash amount
  const remainingAfterDiscount = Math.max(0, totalDue - discount)
  
  // Validate: cash payment should cover the remaining (or can be partial for partial payment)
  // We allow partial payment - the claim will become 'partially-paid' status

  // Create payment with discount
  const payment = await CorporatePayment.create({
    companyId,
    claimId,
    dateIso,
    amount,
    discount,
    refNo: body.refNo,
    notes: body.notes,
    allocations: [],
    unallocated: amount
  })

  // Apply discount first (proportionally to all transactions)
  let remainingDiscount = discount
  if (remainingDiscount > 0) {
    for (const tx of transactions) {
      if (remainingDiscount <= 0) break
      const due = Math.max(0, Number(tx.netToCorporate || 0) - Number(tx.paidAmount || 0))
      const txDiscount = Math.min(due, remainingDiscount)
      if (txDiscount > 0) {
        // Update transaction: reduce netToCorporate by discount (forgiven)
        const txDoc: any = await CorporateTransaction.findById(tx._id)
        txDoc.netToCorporate = Math.max(0, Number(txDoc.netToCorporate || 0) - txDiscount)
        // Check if fully paid now
        if (Number(txDoc.paidAmount || 0) >= Number(txDoc.netToCorporate || 0)) {
          txDoc.status = 'paid'
        }
        await txDoc.save()
        remainingDiscount -= txDiscount
      }
    }
  }

  // Apply cash payment across transactions (oldest first)
  let remainingPayment = amount
  const updatedTransactions: any[] = []
  
  if (remainingPayment > 0) {
    // Re-fetch transactions after discount applied
    const updatedTxs: any[] = await CorporateTransaction.find({ claimId, status: { $in: ['claimed', 'partially-paid'] } }).sort({ createdAt: 1 })
    
    for (const tx of updatedTxs) {
      if (remainingPayment <= 0) break
      const due = Math.max(0, Number(tx.netToCorporate || 0) - Number(tx.paidAmount || 0))
      const apply = Math.min(due, remainingPayment, Number(payment.unallocated || 0))
      if (apply > 0) {
        const newPaid = Number(tx.paidAmount || 0) + apply
        tx.paidAmount = newPaid
        if (newPaid >= Number(tx.netToCorporate || 0)) {
          tx.status = 'paid'
        }
        await tx.save()
        payment.allocations.push({ transactionId: tx._id, amount: apply } as any)
        payment.unallocated = Math.max(0, Number(payment.unallocated || 0) - apply)
        remainingPayment -= apply
        updatedTransactions.push(tx)
      }
    }
  }

  await payment.save()

  // Update claim status based on payment
  // Re-check all claim transactions status
  const allClaimTxs: any[] = await CorporateTransaction.find({ claimId }).lean()
  const allPaid = allClaimTxs.every(tx => tx.status === 'paid')
  const somePaid = allClaimTxs.some(tx => tx.status === 'paid' || Number(tx.paidAmount || 0) > 0)
  
  if (allPaid) {
    claim.status = 'paid'
  } else if (somePaid || discount > 0) {
    claim.status = 'partially-paid'
  }
  await claim.save()

  res.status(201).json({ payment, claim, transactionsUpdated: updatedTransactions.length })
}
