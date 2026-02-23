import { Request, Response } from 'express'
import { Return } from '../models/Return'
import { returnCreateSchema, returnQuerySchema } from '../validators/returns'
import { Purchase } from '../models/Purchase'
import { InventoryItem } from '../models/InventoryItem'
import { ApiError } from '../../../common/errors/ApiError'
import mongoose from 'mongoose'
import { AuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response){
  const parsed = returnQuerySchema.safeParse(req.query)
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
    if (to) {
      const end = new Date(to); end.setHours(23,59,59,999)
      filter.datetime.$lte = end.toISOString()
    }
  }
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await Return.countDocuments(filter)
  const items = await Return.find(filter).sort({ datetime: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response){
  const data = returnCreateSchema.parse(req.body)

  if (data.type === 'Customer'){
    return res.status(400).json({ error: 'Customer returns are not supported in Aesthetic' })
  }

  if (data.type === 'Supplier'){
    // Find the purchase by invoice number (reference)
    const purchase = await Purchase.findOne({ invoice: data.reference })
    if (!purchase) throw new ApiError(404, 'Purchase not found for invoice')

    // Build quick lookup by id/name
    const lineByName = new Map<string, any>()
    const lineById = new Map<string, any>()
    for (const l of (purchase as any).lines || []){
      if (l.name) lineByName.set(String(l.name).trim().toLowerCase(), l)
      if (l.medicineId) lineById.set(String(l.medicineId), l)
    }

    const computedReturnLines: { medicineId:string; name:string; qty:number; amount:number }[] = []
    for (const r of data.lines){
      const id = String(r.medicineId || '').trim()
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
      // Recalculate packs approximately
      const unitsPerPack = Number(pLine.unitsPerPack || 1)
      if (unitsPerPack > 0) pLine.packs = Math.floor(Number(pLine.totalItems || 0) / unitsPerPack)
      // Compute amount using after-tax unit if available
      const unitCost = Number(pLine.buyPerUnitAfterTax || pLine.buyPerUnit || (pLine.unitsPerPack && pLine.buyPerPack ? (pLine.buyPerPack / pLine.unitsPerPack) : 0) || 0)
      const lineAmount = unitCost * qtyToReturn
      computedReturnLines.push({ medicineId: id || String(pLine.medicineId || ''), name: pLine.name, qty: qtyToReturn, amount: Number(lineAmount.toFixed(2)) })
    }

    // Remove zero-items lines
    (purchase as any).lines = ((purchase as any).lines || []).filter((l: any) => Number(l.totalItems || 0) > 0)
    // Recompute purchase total from per-unit after-tax * items
    const newTotal = ((purchase as any).lines || []).reduce((s: number, l: any) => {
      const unitCost = Number(l.buyPerUnitAfterTax || l.buyPerUnit || (l.unitsPerPack && l.buyPerPack ? (l.buyPerPack / l.unitsPerPack) : 0) || 0)
      return s + unitCost * Number(l.totalItems || 0)
    }, 0)
    purchase.totalAmount = Number(newTotal.toFixed(2))
    await purchase.save()

    // Decrease inventory onHand for returned items
    for (const r of data.lines){
      try {
        const id = String(r.medicineId || '').trim()
        const name = String(r.name || '').trim()
        let item: any = null
        if (id && mongoose.isValidObjectId(id)) item = await InventoryItem.findById(id)
        if (!item && name) item = await InventoryItem.findOne({ key: name.toLowerCase() })
        if (!item && id) item = await InventoryItem.findOne({ lastMedicineId: id })
        if (!item) continue
        const dec = Number(r.qty || 0)
        item.onHand = Math.max(0, Number(item.onHand || 0) - dec)
        await item.save()
      } catch {}
    }

    // Create return record
    const items = computedReturnLines.reduce((s, l) => s + (l.qty || 0), 0)
    const total = computedReturnLines.reduce((s, l) => s + (l.amount || 0), 0)
    const doc = await Return.create({
      type: 'Supplier',
      datetime: data.datetime,
      reference: purchase.invoice,
      party: String((purchase as any).supplierName || ''),
      items,
      total: Number(total.toFixed(2)),
      lines: computedReturnLines,
    })
    try {
      const actor = (req as any).user?.name || (req as any).user?.email || 'system'
      await AuditLog.create({
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

  // Default behavior (Supplier or other types): create a Return record only
  const items = data.lines.reduce((s, l) => s + (l.qty || 0), 0)
  const total = data.lines.reduce((s, l) => s + (l.amount || 0), 0)
  const doc = await Return.create({
    type: data.type,
    datetime: data.datetime,
    reference: data.reference,
    party: data.party,
    items,
    total,
    lines: data.lines,
  })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
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
