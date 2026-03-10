import { Request, Response } from 'express'
import { LabOrder } from '../models/Order'
import { LabAuditLog } from '../models/AuditLog'
import { orderCreateSchema, orderQuerySchema, orderTrackUpdateSchema } from '../validators/order'
import { LabCounter } from '../models/Counter'
import { LabResult } from '../models/Result'
import { LabInventoryItem } from '../models/InventoryItem'
import { LabTest } from '../models/Test'
import { resolveTestPrice } from '../../corporate/utils/price'
import { CorporateTransaction } from '../../corporate/models/Transaction'
import { CorporateCompany } from '../../corporate/models/Company'
import { postFbrInvoiceViaSDC } from '../../hospital/services/fbr'

async function nextToken(date?: Date){
  const d = date || new Date()
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0')
  const key = 'lab_token_global'
  const c: any = await LabCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const seq = String((c?.seq || 1)).padStart(3,'0')
  return `D${day}${m}${y}-${seq}`
}

function resolveActor(req: Request) {
  return (req as any).user?.username || (req as any).user?.name || (req as any).user?.email || 'system'
}

export async function updateToken(req: Request, res: Response){
  const tokenNo = String((req as any).params?.tokenNo || '').trim()
  if (!tokenNo) return res.status(400).json({ error: 'tokenNo is required' })

  const body: any = req.body || {}
  const nextTests = uniqStrings(Array.isArray(body.tests) ? body.tests : [])
  const discount = clampMoney(body.discount)
  const receivedWanted = clampMoney(body.receivedAmount)

  const orders: any[] = await LabOrder.find({ tokenNo }).sort({ createdAt: 1 })
  if (!orders.length) return res.status(404).json({ error: 'Token not found' })
  const isCorporateToken = Boolean(orders.some(o => String((o as any)?.corporateId || '').trim()))

  // If results exist for any order under token, block editing tests (safety)
  try {
    const ids = orders.map(o => String(o._id))
    const hasResult = await LabResult.exists({ orderId: { $in: ids } })
    if (hasResult && nextTests.length){
      return res.status(400).json({ error: 'Cannot edit tests for token after results exist. Delete results first if you must edit.' })
    }
  } catch {}

  const patientId = String(orders[0]?.patientId || '')
  const patientSnap = orders[0]?.patient || undefined
  const referringConsultant = orders[0]?.referringConsultant || undefined
  const createdAt = orders[0]?.createdAt || new Date().toISOString()

  // Rebuild orders to match nextTests, preserving tokenNo and patient snapshot
  if (!nextTests.length) return res.status(400).json({ error: 'tests are required' })

  // Compute prices from catalog (current). If you need historical prices, we can extend later.
  const testsDocs: any[] = await LabTest.find({ _id: { $in: nextTests } }).select('price').lean()
  const priceMap = new Map<string, number>(testsDocs.map((t:any)=> [String(t._id), Number(t.price||0)]))
  const prices = nextTests.map(id => Math.max(0, Number(priceMap.get(String(id)) || 0)))
  const tokenSubtotal = prices.reduce((s,n)=> s + n, 0)
  const tokenNet = Math.max(0, tokenSubtotal - discount)
  const received = isCorporateToken ? 0 : Math.min(tokenNet, receivedWanted)
  const receivable = isCorporateToken ? 0 : Math.max(0, tokenNet - received)

  // Delete old orders for token + associated results (only if no results exist; checked above)
  await LabOrder.deleteMany({ tokenNo })

  // Create new per-test rows (matching intake behavior)
  const actor = resolveActor(req)
  const payments = (!isCorporateToken && received > 0) ? [{ amount: received, at: new Date().toISOString(), note: 'Adjusted on token edit', method: 'adjustment', receivedBy: actor }] : []

  const created: any[] = []
  for (let i=0;i<nextTests.length;i++){
    const tid = nextTests[i]
    const price = prices[i] || 0
    const rowDiscount = (i === 0) ? discount : 0
    const rowNet = Math.max(0, price - rowDiscount)
    const row: any = await LabOrder.create({
      patientId,
      patient: patientSnap,
      corporateId: (orders[0] as any)?.corporateId,
      tests: [tid],
      subtotal: price,
      discount: rowDiscount,
      net: rowNet,
      tokenNo,
      status: 'received',
      createdAt,
      referringConsultant,
      receivedAmount: received,
      receivableAmount: receivable,
      payments: (i === 0) ? payments : [],
    })
    created.push(row)
  }

  // Corporate tokens should never contribute to Lab receivables
  if (isCorporateToken){
    try { await LabOrder.updateMany({ tokenNo }, { $set: { receivedAmount: 0, receivableAmount: 0 } }) } catch {}
  }

  try {
    await LabAuditLog.create({
      actor,
      action: 'Edit Token',
      label: 'LAB_EDIT_TOKEN',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${tokenNo} — tests=${nextTests.length}, discount=${discount}, received=${received}`,
    })
  } catch {}

  res.json({ tokenNo, subtotal: tokenSubtotal, discount, net: tokenNet, receivedAmount: received, receivableAmount: receivable, items: created })
}

function clampMoney(n: any){
  const x = Number(n || 0)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.round(x))
}

async function recomputeTokenTotals(tokenNo: string){
  const orders: any[] = await LabOrder.find({ tokenNo }).sort({ createdAt: 1 })
  const tokenNet = orders.reduce((s, o)=> s + clampMoney(o?.net), 0)
  const base = orders[0]
  const received = clampMoney(base?.receivedAmount)
  const receivable = Math.max(0, tokenNet - received)
  return { orders, tokenNet, received, receivable }
}

function uniqStrings(arr: any[]){
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of (arr || [])){
    const s = String(x || '').trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

export async function list(req: Request, res: Response){
  const parsed = orderQuerySchema.safeParse(req.query)
  const { q, status, from, to, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (q){
    const rx = new RegExp(String(q), 'i')
    filter.$or = [ { 'patient.fullName': rx }, { 'patient.phone': rx }, { tokenNo: rx }, { 'patient.mrn': rx } ]
  }
  if (status) filter.status = status
  if (from || to){
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.createdAt.$lte = end }
  }
  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    LabOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    LabOrder.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = orderCreateSchema.parse(req.body)
  const isCorporate = Boolean((data as any).corporateId)
  const coPayPct = Math.max(0, Math.min(100, Number((data as any)?.corporateCoPayPercent || 0)))
  if ((data as any).corporateId){
    const comp = await CorporateCompany.findById(String((data as any).corporateId)).lean()
    if (!comp) return res.status(400).json({ error: 'Invalid corporateId' })
    if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })
  }
  // Merge manual consumables with test-defined defaults
  let combinedConsumables: Array<{ item: string; qty: number }> = []
  try {
    const manual = Array.isArray((data as any).consumables) ? (data as any).consumables : []
    const testIds = Array.isArray((data as any).tests) ? (data as any).tests : []
    const tests = await LabTest.find({ _id: { $in: testIds } }).lean()
    const defaults = tests.flatMap((t: any) => Array.isArray(t?.consumables) ? t.consumables : [])
    const all = [...manual, ...defaults]
    const map = new Map<string, number>()
    for (const c of all){
      const key = String((c as any).item || '').trim().toLowerCase()
      const qty = Math.max(0, Number((c as any).qty || 0))
      if (!key || qty <= 0) continue
      map.set(key, (map.get(key) || 0) + qty)
    }
    combinedConsumables = Array.from(map.entries()).map(([item, qty]) => ({ item, qty }))
  } catch (e){ console.warn('Failed to merge test consumables', e); combinedConsumables = Array.isArray((data as any).consumables)? (data as any).consumables as any : [] }

  const tokenNo = (data as any).tokenNo || await nextToken(new Date())
  const actor = resolveActor(req)
  const existingCount = await LabOrder.countDocuments({ tokenNo })
  const isFirstRow = existingCount === 0
  // For corporate tokens: Lab should only record co-pay (patient portion) as received income.
  // Corporate portion is tracked via CorporateTransactions/claims and must not create Lab receivable.
  const initReceived = isFirstRow
    ? (isCorporate
      ? clampMoney((data as any).receivedAmount)
      : clampMoney((data as any).receivedAmount))
    : 0
  const payments = (isFirstRow && initReceived > 0)
    ? [{ amount: initReceived, at: new Date().toISOString(), note: (data as any).paymentNote || undefined, method: (data as any).paymentMethod || undefined, receivedBy: actor }]
    : []

  // If corporate: compute lab-side income as co-pay amount on list prices.
  let corpCoPayIncome = 0
  if (isCorporate && coPayPct > 0){
    try {
      const ids = Array.isArray((data as any).tests) ? (data as any).tests : []
      const docs = await LabTest.find({ _id: { $in: ids } }).select('price').lean()
      const sum = (docs || []).reduce((s: number, t: any)=> s + Math.max(0, Number(t?.price || 0)), 0)
      corpCoPayIncome = Math.max(0, sum * (coPayPct/100))
    } catch {}
  }

  const doc: any = await LabOrder.create({
    ...data,
    createdByUsername: actor,
    // Corporate tokens are billed via Corporate module; Lab ledger should only reflect co-pay (if any).
    ...(isCorporate
      ? {
          subtotal: 0,
          discount: 0,
          net: corpCoPayIncome,
          receivedAmount: isFirstRow ? Math.min(corpCoPayIncome, initReceived) : 0,
          receivableAmount: 0,
        }
      : {}),
    consumables: combinedConsumables,
    tokenNo,
    status: 'received',
    // initialize ledger only once for token
    receivedAmount: isCorporate ? (isFirstRow ? Math.min(corpCoPayIncome, initReceived) : 0) : (isFirstRow ? initReceived : 0),
    receivableAmount: 0,
    payments,
  })

  // After inserting, recompute token totals (net across all rows) and sync to all orders
  try {
    if (isCorporate){
      // Keep corporate tokens non-receivable; preserve co-pay received on first row
      const received = isFirstRow ? Math.min(corpCoPayIncome, initReceived) : 0
      await LabOrder.updateMany({ tokenNo }, { $set: { receivedAmount: received, receivableAmount: 0 } })
    } else {
      const { tokenNet, received, receivable } = await recomputeTokenTotals(tokenNo)
      await LabOrder.updateMany({ tokenNo }, { $set: { receivedAmount: received, receivableAmount: receivable } })
    }
  } catch {}

  // FBR fiscalization (Lab is paid at order creation)
  try {
    if (isCorporate) throw new Error('skip_fbr_for_corporate')
    const payload = {
      tokenNo,
      patient: (data as any).patient || undefined,
      patientName: (data as any)?.patient?.fullName || undefined,
      phone: (data as any)?.patient?.phone || undefined,
      cnic: (data as any)?.patient?.cnic || undefined,
      lines: Array.isArray((data as any).tests)
        ? (await LabTest.find({ _id: { $in: (data as any).tests } }).select('name price').lean()).map((t: any)=> ({ name: t?.name || 'Test', qty: 1, unitPrice: Number(t?.price || 0) }))
        : [],
      subtotal: Number((data as any).subtotal || (data as any).total || 0),
      discount: Number((data as any).discount || 0),
      net: Number((data as any).net || (data as any).total || 0),
    }
    const amount = Number((payload as any).net || (payload as any).subtotal || 0)
    const r: any = await postFbrInvoiceViaSDC({ module: 'LAB_ORDER_CREATE', invoiceType: 'LAB', refId: String(doc._id), amount, payload })
    if (r) {
      ;(doc as any).fbrInvoiceNo = r.fbrInvoiceNo
      ;(doc as any).fbrQrCode = r.qrCode
      ;(doc as any).fbrStatus = r.status
      ;(doc as any).fbrMode = r.mode
      ;(doc as any).fbrError = r.error
      try { await doc.save() } catch {}
    }
  } catch {}
  // Deduct consumables from inventory (best-effort)
  try {
    const cons = Array.isArray(combinedConsumables) ? combinedConsumables : []
    await Promise.all(cons.map(async (c: any) => {
      const key = String(c.item || '').trim().toLowerCase()
      const qty = Math.max(0, Number(c.qty || 0))
      if (!key || qty <= 0) return
      const it = await (LabInventoryItem as any).findOne({ key })
      if (!it) return
      const cur = Math.max(0, Number(it.onHand || 0))
      it.onHand = Math.max(0, cur - qty)
      await it.save()
    }))
  } catch (e){
    console.error('Consumable deduction failed:', e)
  }
  try {
    await LabAuditLog.create({
      actor,
      action: 'Sample Intake',
      label: 'SAMPLE_INTAKE',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${tokenNo} — ${String((data as any)?.patient?.fullName || '')}`,
    })
  } catch {}
  // Corporate: create ledger lines per test
  try {
    const companyId = (data as any).corporateId ? String((data as any).corporateId) : ''
    if (companyId){
      const testIds = Array.isArray(data.tests)? data.tests : []
      const tests = await LabTest.find({ _id: { $in: testIds } }).lean()
      const map = new Map<string, any>(tests.map(t => [String((t as any)._id), t]))
      const dateIso = new Date().toISOString().slice(0,10)
      for (const tid of testIds){
        const t = map.get(String(tid))
        const listPrice = Number(t?.price || 0)
        const corp = await resolveTestPrice({ companyId, scope: 'LAB', testId: String(tid), defaultPrice: listPrice })
        const baseCorp = Number(corp.price || 0)
        const coPayPct = Math.max(0, Math.min(100, Number((data as any)?.corporateCoPayPercent || 0)))
        const coPayAmt = Math.max(0, baseCorp * (coPayPct/100))
        let net = Math.max(0, baseCorp - coPayAmt)
        const cap = Number((data as any)?.corporateCoverageCap || 0) || 0
        if (cap > 0){
          try {
            const existing = await CorporateTransaction.find({ refType: 'lab_order', refId: String((doc as any)?._id || '') }).select('netToCorporate').lean()
            const used = (existing || []).reduce((s: number, tx: any)=> s + Number(tx?.netToCorporate||0), 0)
            const remaining = Math.max(0, cap - used)
            net = Math.max(0, Math.min(net, remaining))
          } catch {}
        }
        await CorporateTransaction.create({
          companyId,
          patientMrn: String((data as any)?.patient?.mrn || ''),
          patientName: String((data as any)?.patient?.fullName || ''),
          serviceType: 'LAB',
          refType: 'lab_order',
          refId: String((doc as any)?._id || ''),
          itemRef: String(tid),
          dateIso,
          description: `Lab Test${t?.name?`: ${t.name}`:''}`,
          qty: 1,
          unitPrice: listPrice,
          corpUnitPrice: baseCorp,
          coPay: coPayAmt,
          netToCorporate: net,
          corpRuleId: String(corp.appliedRuleId||''),
          status: 'accrued',
        })
      }
    }
  } catch (e) { console.warn('Failed to create corporate transactions for Lab order', e) }
  res.status(201).json(doc)
}

export async function receivePayment(req: Request, res: Response){
  const tokenNo = String((req as any).params?.tokenNo || '').trim()
  if (!tokenNo) return res.status(400).json({ error: 'tokenNo is required' })
  try {
    const anyCorporate = await LabOrder.exists({ tokenNo, corporateId: { $exists: true, $ne: null } })
    if (anyCorporate) return res.status(400).json({ error: 'Cannot receive cash payment for corporate token' })
  } catch {}
  const amount = clampMoney((req as any).body?.amount)
  const note = String((req as any).body?.note || '').trim() || undefined
  const method = String((req as any).body?.method || '').trim() || undefined
  if (amount <= 0) return res.status(400).json({ error: 'amount must be > 0' })

  const actor = resolveActor(req)
  const { orders, tokenNet, received: already } = await recomputeTokenTotals(tokenNo)
  if (!orders.length) return res.status(404).json({ error: 'Token not found' })

  const nextReceived = Math.min(tokenNet, already + amount)
  const deltaApplied = Math.max(0, nextReceived - already)
  const nextReceivable = Math.max(0, tokenNet - nextReceived)
  if (deltaApplied <= 0) return res.status(400).json({ error: 'Nothing receivable for this token' })

  const payment = { amount: deltaApplied, at: new Date().toISOString(), note, method, receivedBy: actor }
  await LabOrder.updateMany(
    { tokenNo },
    {
      $set: { receivedAmount: nextReceived, receivableAmount: nextReceivable },
      $push: { payments: payment },
    },
  )

  try {
    await LabAuditLog.create({
      actor,
      action: 'Receive Payment',
      label: 'LAB_RECEIVE_PAYMENT',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${tokenNo} — Received ${deltaApplied}`,
    })
  } catch {}

  const updated = await LabOrder.find({ tokenNo }).sort({ createdAt: 1 }).lean()
  res.json({ tokenNo, receivedAmount: nextReceived, receivableAmount: nextReceivable, payment, items: updated })
}

export async function updateTrack(req: Request, res: Response){
  const { id } = req.params
  const patch = orderTrackUpdateSchema.parse(req.body)
  const before: any = await LabOrder.findById(id).lean()
  const doc = await LabOrder.findByIdAndUpdate(id, { $set: patch }, { new: true })
  if (!doc) return res.status(404).json({ message: 'Order not found' })
  // Corporate: on returned, create reversals for all items
  try {
    if ((patch as any).status === 'returned' && String(before?.status) !== 'returned'){
      const existing: any[] = await CorporateTransaction.find({ refType: 'lab_order', refId: String(id), status: { $ne: 'reversed' } }).lean()
      for (const tx of existing){
        try { await CorporateTransaction.findByIdAndUpdate(String(tx._id), { $set: { status: 'reversed' } }) } catch {}
        try {
          await CorporateTransaction.create({
            companyId: tx.companyId,
            patientMrn: tx.patientMrn,
            patientName: tx.patientName,
            serviceType: tx.serviceType,
            refType: tx.refType,
            refId: tx.refId,
            itemRef: tx.itemRef,
            dateIso: new Date().toISOString().slice(0,10),
            description: `Reversal: ${tx.description || 'Lab Test'}`,
            qty: tx.qty,
            unitPrice: -Math.abs(Number(tx.unitPrice||0)),
            corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),
            coPay: -Math.abs(Number(tx.coPay||0)),
            netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),
            corpRuleId: tx.corpRuleId,
            status: 'accrued',
            reversalOf: String(tx._id),
          })
        } catch (e) { console.warn('Failed to create corporate reversal for Lab order', e) }
      }
    }
  } catch (e) { console.warn('Corporate reversal (lab updateTrack) failed', e) }
  // Inventory: on returned, restore consumables once per transition
  try {
    if ((patch as any).status === 'returned' && String(before?.status) !== 'returned'){
      const cons: any[] = Array.isArray((doc as any)?.consumables) ? (doc as any).consumables : []
      await Promise.all(cons.map(async (c: any) => {
        const key = String(c.item || '').trim().toLowerCase()
        const qty = Math.max(0, Number(c.qty || 0))
        if (!key || qty <= 0) return
        const it = await (LabInventoryItem as any).findOne({ key })
        if (!it) return
        const cur = Math.max(0, Number(it.onHand || 0))
        it.onHand = cur + qty
        await it.save()
      }))
    }
  } catch (e) { console.warn('Inventory restore (lab updateTrack) failed', e) }
  try {
    const actor = resolveActor(req)
    const keys = ['status','sampleTime','reportingTime']
    const changed = keys.filter(k => (patch as any)[k] != null).map(k => `${k}=${(patch as any)[k]}`).join(', ')
    await LabAuditLog.create({
      actor,
      action: 'Tracking Update',
      label: 'TRACKING_UPDATE',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Order ${id}${changed ? ' — ' + changed : ''}`,
    })
  } catch {}
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  // Remove associated results first to avoid orphans
  await LabResult.deleteMany({ orderId: id })
  // Corporate: create reversals before deleting the order
  try {
    const existing: any[] = await CorporateTransaction.find({ refType: 'lab_order', refId: String(id), status: { $ne: 'reversed' } }).lean()
    for (const tx of existing){
      try { await CorporateTransaction.findByIdAndUpdate(String(tx._id), { $set: { status: 'reversed' } }) } catch {}
      try {
        await CorporateTransaction.create({
          companyId: tx.companyId,
          patientMrn: tx.patientMrn,
          patientName: tx.patientName,
          serviceType: tx.serviceType,
          refType: tx.refType,
          refId: tx.refId,
          itemRef: tx.itemRef,
          dateIso: new Date().toISOString().slice(0,10),
          description: `Reversal: ${tx.description || 'Lab Test'}`,
          qty: tx.qty,
          unitPrice: -Math.abs(Number(tx.unitPrice||0)),
          corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),
          coPay: -Math.abs(Number(tx.coPay||0)),
          netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),
          corpRuleId: tx.corpRuleId,
          status: 'accrued',
          reversalOf: String(tx._id),
        })
      } catch (e) { console.warn('Failed to create corporate reversal for Lab order (delete)', e) }
    }
  } catch (e) { console.warn('Corporate reversal lookup failed for Lab order delete', e) }
  const doc = await LabOrder.findByIdAndDelete(id)
  if (!doc) return res.status(404).json({ message: 'Order not found' })
  try {
    const actor = resolveActor(req)
    await LabAuditLog.create({
      actor,
      action: 'Delete Sample',
      label: 'DELETE_SAMPLE',
      method: 'DELETE',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${String((doc as any)?.tokenNo || id)} — ${String((doc as any)?.patient?.fullName || '')}`,
    })
  } catch {}
  res.json({ success: true })
}
