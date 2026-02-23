import { Request, Response } from 'express'
import { LabReturn } from '../models/Return'
import { labReturnCreateSchema, labReturnQuerySchema, labReturnUndoSchema } from '../validators/return'
import { LabPurchase } from '../models/Purchase'
import { LabInventoryItem } from '../models/InventoryItem'
import mongoose from 'mongoose'
import { ApiError } from '../../../common/errors/ApiError'
import { LabAuditLog } from '../models/AuditLog'
import { LabOrder } from '../models/Order'
import { LabTest } from '../models/Test'

export async function list(req: Request, res: Response){
  const parsed = labReturnQuerySchema.safeParse(req.query)
  const { type, from, to, party, reference, search, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (type) filter.type = type
  if (party) filter.party = new RegExp(party, 'i')
  if (reference) filter.reference = new RegExp(reference, 'i')
  if (search) {
    const rx = new RegExp(search, 'i')
    filter.$or = [ { party: rx }, { reference: rx } ]
  }
  if (from || to) {
    filter.datetime = {}
    if (from) filter.datetime.$gte = new Date(from).toISOString()
    if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.datetime.$lte = end.toISOString() }
  }
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await LabReturn.countDocuments(filter)
  const items = await LabReturn.find(filter).sort({ datetime: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response){
  const data = labReturnCreateSchema.parse(req.body)

  if (data.type === 'Customer'){
    // Find order by tokenNo reference or by id
    let order: any = await LabOrder.findOne({ tokenNo: data.reference })
    if (!order && mongoose.isValidObjectId(data.reference)) order = await LabOrder.findById(data.reference)
    if (!order) throw new ApiError(404, 'Order not found for reference')
    const wasReturned = String(order.status) === 'returned'

    // Resolve test names for return lines (qty 1 each)
    const testIds: string[] = Array.isArray(order.tests) ? order.tests.map((t:any)=>String(t)) : []
    const testDocs = testIds.length ? await LabTest.find({ _id: { $in: testIds } }).select('name').lean() : []
    const nameMap = new Map<string,string>(testDocs.map((t:any)=>[String(t._id), String(t.name||'')]))

    const selTid = (data as any).testId ? String((data as any).testId) : undefined
    let computedReturnLines: { itemId?: string; name:string; qty:number; amount:number }[]
    if (selTid && testIds.includes(selTid)){
      // Per-test return
      const existing: string[] = Array.isArray(order.returnedTests) ? order.returnedTests.map((t:any)=>String(t)) : []
      const nextSet = new Set<string>([...existing, selTid])
      order.returnedTests = Array.from(nextSet)
      // If all tests returned, flip order status to 'returned'
      if (order.returnedTests.length >= testIds.length) order.status = 'returned'
      computedReturnLines = [{ itemId: String(selTid), name: nameMap.get(String(selTid)) || String(selTid), qty: 1, amount: 0 }]
    } else {
      // Fallback: whole-order return
      computedReturnLines = testIds.map((tid: any) => ({ itemId: String(tid), name: nameMap.get(String(tid)) || String(tid), qty: 1, amount: 0 }))
      order.status = 'returned'
      order.returnedTests = [...testIds]
    }

    await order.save()
    // Inventory: on whole-order returned transition, restore consumables once
    try {
      if (String(order.status) === 'returned' && !wasReturned){
        const cons: any[] = Array.isArray((order as any)?.consumables) ? (order as any).consumables : []
        await Promise.all(cons.map(async (c: any) => {
          const key = String(c.item || '').trim().toLowerCase()
          const qty = Math.max(0, Number(c.qty || 0))
          if (!key || qty <= 0) return
          const it = await LabInventoryItem.findOne({ key })
          if (!it) return
          const cur = Math.max(0, Number((it as any).onHand || 0))
          ;(it as any).onHand = cur + qty
          await it.save()
        }))
      }
    } catch {}

    // Create return record
    const items = computedReturnLines.reduce((s: number, l: { qty: number }) => s + (Number(l.qty) || 0), 0)
    const total = 0
    const token = String(order.tokenNo || data.reference || '')
    const party = String(order?.patient?.fullName || data.party || '')
    const doc = await LabReturn.create({
      type: 'Customer',
      datetime: data.datetime,
      reference: token,
      party,
      note: (data as any).note || '',
      items,
      total,
      lines: computedReturnLines,
    })
    try {
      const actor = (req as any).user?.name || (req as any).user?.email || 'system'
      await LabAuditLog.create({
        actor,
        action: 'Customer Return',
        label: 'RETURN_CUSTOMER',
        method: 'POST',
        path: req.originalUrl,
        at: new Date().toISOString(),
        detail: `Token ${token} — ${party}`,
      })
    } catch {}
    return res.status(201).json({ ok: true, order: { id: order._id, status: order.status }, return: doc })
  }

  if (data.type === 'Supplier'){
    // Find the purchase by invoice number (reference)
    const purchase: any = await LabPurchase.findOne({ invoice: data.reference })
    if (!purchase) throw new ApiError(404, 'Purchase not found for invoice')

    // Build quick lookup by id/name
    const lineByName = new Map<string, any>()
    const lineById = new Map<string, any>()
    for (const l of (purchase?.lines || [])){
      if (l.name) lineByName.set(String(l.name).trim().toLowerCase(), l)
      if ((l as any).itemId) lineById.set(String((l as any).itemId), l)
    }

    const computedReturnLines: { itemId?:string; name:string; qty:number; amount:number }[] = []
    for (const r of data.lines){
      const id = String((r as any).itemId || '').trim()
      const name = String(r.name || '').trim()
      const key = name.toLowerCase()
      const pLine = (id && lineById.get(id)) || lineByName.get(key)
      if (!pLine) throw new ApiError(400, `Item not found in purchase: ${name || id}`)
      const qtyToReturn = Number(r.qty || 0)
      if (qtyToReturn <= 0) continue
      const current = Number(pLine.totalItems || 0)
      if (qtyToReturn > current) throw new ApiError(400, `Return qty exceeds purchased qty for ${pLine.name}`)
      // Decrease purchase quantities
      pLine.totalItems = current - qtyToReturn
      const unitsPerPack = Number(pLine.unitsPerPack || 1)
      if (unitsPerPack > 0) pLine.packs = Math.floor(Number(pLine.totalItems || 0) / unitsPerPack)
      // Compute amount using after-tax unit if available
      const unitCost = Number(pLine.buyPerUnitAfterTax || pLine.buyPerUnit || (pLine.unitsPerPack && pLine.buyPerPack ? (pLine.buyPerPack / pLine.unitsPerPack) : 0) || 0)
      const lineAmount = unitCost * qtyToReturn
      computedReturnLines.push({ itemId: id || String((pLine as any).itemId || ''), name: pLine.name, qty: qtyToReturn, amount: Number(lineAmount.toFixed(2)) })
    }

    // Remove zero-items lines
    purchase.lines = (purchase.lines || []).filter((l: any) => Number(l.totalItems || 0) > 0)
    // Recompute purchase total from per-unit after-tax * items
    const newTotal = (purchase.lines || []).reduce((s: number, l: any) => {
      const unitCost = Number(l.buyPerUnitAfterTax || l.buyPerUnit || (l.unitsPerPack && l.buyPerPack ? (l.buyPerPack / l.unitsPerPack) : 0) || 0)
      return s + unitCost * Number(l.totalItems || 0)
    }, 0)
    purchase.totalAmount = Number(newTotal.toFixed(2))
    await purchase.save()

    // Decrease inventory onHand for returned items
    for (const r of data.lines){
      try {
        const id = String((r as any).itemId || '').trim()
        const name = String(r.name || '').trim()
        let item: any = null
        if (id && mongoose.isValidObjectId(id)) item = await LabInventoryItem.findById(id)
        if (!item && name) item = await LabInventoryItem.findOne({ key: name.toLowerCase() })
        if (!item && id) item = await LabInventoryItem.findOne({ lastItemId: id })
        if (!item) continue
        const dec = Number(r.qty || 0)
        item.onHand = Math.max(0, Number(item.onHand || 0) - dec)
        await item.save()
      } catch {}
    }

    // Create return record
    const items = computedReturnLines.reduce((s: number, l: { qty: number }) => s + (Number(l.qty) || 0), 0)
    const total = computedReturnLines.reduce((s: number, l: { amount: number }) => s + (Number(l.amount) || 0), 0)
    const doc = await LabReturn.create({
      type: 'Supplier',
      datetime: data.datetime,
      reference: purchase.invoice,
      party: String(purchase.supplierName || ''),
      note: (data as any).note || '',
      items,
      total: Number(total.toFixed(2)),
      lines: computedReturnLines,
    })
    try {
      const actor = (req as any).user?.name || (req as any).user?.email || 'system'
      await LabAuditLog.create({
        actor,
        action: 'Supplier Return',
        label: 'RETURN_SUPPLIER',
        method: 'POST',
        path: req.originalUrl,
        at: new Date().toISOString(),
        detail: `Invoice ${purchase.invoice} — ${doc.party} — Rs ${Number(doc.total||0).toFixed(2)}`,
      })
    } catch {}
    return res.status(201).json({ ok: true, purchase: { invoice: purchase.invoice, totalAmount: purchase.totalAmount }, return: doc })
  }

  // Default behavior: just persist as-is
  const items = (data.lines || []).reduce((s, l) => s + (l.qty || 0), 0)
  const total = (data.lines || []).reduce((s, l) => s + (l.amount || 0), 0)
  const doc = await LabReturn.create({
    type: data.type,
    datetime: data.datetime,
    reference: data.reference,
    party: data.party,
    note: (data as any).note || '',
    items,
    total,
    lines: data.lines,
  })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: `${data.type} Return`,
      label: `RETURN_${String(data.type||'').toUpperCase()}`,
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${data.reference || ''} — ${data.party || ''} — Rs ${Number(total||0).toFixed(2)}`,
    })
  } catch {}
  return res.status(201).json(doc)
}

export async function undo(req: Request, res: Response){
  const body = labReturnUndoSchema.parse(req.body)
  // Find order by tokenNo reference or id
  let order: any = await LabOrder.findOne({ tokenNo: body.reference })
  if (!order && mongoose.isValidObjectId(body.reference)) order = await LabOrder.findById(body.reference)
  if (!order) throw new ApiError(404, 'Order not found for reference')
  const wasReturned = String(order.status) === 'returned'
  // Resolve target test id
  let tid = String((body as any).testId || '').trim()
  let tname = String((body as any).testName || '').trim()
  if (!tid){
    const ids: string[] = Array.isArray(order.tests) ? order.tests.map((t:any)=>String(t)) : []
    const testDocs = ids.length ? await LabTest.find({ _id: { $in: ids } }).select('name').lean() : []
    const byName = new Map<string,string>(testDocs.map((t:any)=>[String(t.name||'').toLowerCase(), String(t._id)]))
    const found = byName.get(tname.toLowerCase())
    if (!found) throw new ApiError(400, 'Test not found in order by name for undo')
    tid = String(found)
  }
  if (!tname){
    try {
      const t = await LabTest.findById(tid).select('name').lean()
      tname = String((t as any)?.name || '')
    } catch {}
  }
  const before: string[] = Array.isArray(order.returnedTests) ? order.returnedTests.map((t:any)=>String(t)) : []
  if (!before.includes(tid)){
    return res.status(200).json({ ok: true, order: { id: order._id, status: order.status, returnedTests: before } })
  }
  const after = before.filter(x => x !== tid)
  order.returnedTests = after
  if (order.status === 'returned' && after.length < (Array.isArray(order.tests) ? order.tests.length : 0)){
    order.status = 'received'
  }
  await order.save()

  // Inventory: if transitioning from returned -> received, re-deduct previously restored consumables
  try {
    if (wasReturned && String(order.status) !== 'returned'){
      const cons: any[] = Array.isArray((order as any)?.consumables) ? (order as any).consumables : []
      await Promise.all(cons.map(async (c: any) => {
        const key = String(c.item || '').trim().toLowerCase()
        const qty = Math.max(0, Number(c.qty || 0))
        if (!key || qty <= 0) return
        const it = await LabInventoryItem.findOne({ key })
        if (!it) return
        const cur = Math.max(0, Number((it as any).onHand || 0))
        ;(it as any).onHand = Math.max(0, cur - qty)
        await it.save()
      }))
    }
  } catch {}

  // Remove matching line from the latest customer return doc for this token
  try {
    const token = String(order.tokenNo || body.reference)
    let doc: any = await LabReturn.findOne({ type: 'Customer', reference: token, 'lines.itemId': tid }).sort({ createdAt: -1 })
    if (!doc && tname){
      doc = await LabReturn.findOne({ type: 'Customer', reference: token, 'lines.name': tname }).sort({ createdAt: -1 })
    }
    if (doc){
      const origLines = Array.isArray(doc.lines) ? doc.lines : []
      const filtered = origLines.filter((l: any) => String(l.itemId || '') !== String(tid) && String(l.name || '') !== String(tname))
      if (filtered.length === 0){
        await doc.deleteOne()
      } else {
        doc.lines = filtered
        doc.items = filtered.reduce((s: number, l: any) => s + Number(l.qty || 0), 0)
        doc.total = filtered.reduce((s: number, l: any) => s + Number(l.amount || 0), 0)
        await doc.save()
      }
    }
  } catch {}

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Undo Return',
      label: 'RETURN_UNDO',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${String(order.tokenNo || body.reference)} — Test ${tid}${body.note ? ` — ${body.note}` : ''}`,
    })
  } catch {}

  return res.json({ ok: true, order: { id: order._id, status: order.status, returnedTests: order.returnedTests } })
}
