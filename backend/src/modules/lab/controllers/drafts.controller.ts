import { Request, Response } from 'express'
import { LabPurchaseDraft } from '../models/PurchaseDraft'
import { LabPurchase } from '../models/Purchase'
import { LabInventoryItem } from '../models/InventoryItem'
import { labDraftCreateSchema, labDraftQuerySchema } from '../validators/draft'

function calcTotals(lines: any[], discount = 0, invoiceTaxes: any[] = []){
  const norm = lines.map(l => ({
    ...l,
    unitsPerPack: l.unitsPerPack || 1,
    packs: l.packs || 0,
    totalItems: l.totalItems || ((l.unitsPerPack || 1) * (l.packs || 0)),
    buyPerUnit: l.buyPerUnit || ((l.unitsPerPack && l.buyPerPack) ? (l.buyPerPack / l.unitsPerPack) : 0),
    salePerUnit: l.salePerUnit || ((l.unitsPerPack && l.salePerPack) ? (l.salePerPack / l.unitsPerPack) : 0),
    lineTaxType: l.lineTaxType || undefined,
    lineTaxValue: l.lineTaxValue || 0,
  }))

  const lineGrosses = norm.map(l => {
    const unitsPerPack = l.unitsPerPack || 1
    const packs = l.packs || 0
    const totalItems = l.totalItems || (unitsPerPack * packs)
    const buyPerUnit = l.buyPerUnit || ((unitsPerPack && l.buyPerPack) ? (l.buyPerPack / unitsPerPack) : 0)
    if ((l.totalItems || 0) > 0) return (buyPerUnit || 0) * (totalItems || 0)
    return (l.buyPerPack || 0) * (packs || 0)
  })
  const gross = lineGrosses.reduce((s,v)=> s + v, 0)
  const discountAmt = discount || 0
  const taxableBase = Math.max(0, gross - discountAmt)

  const lineTaxAmounts = norm.map((l, idx) => {
    const base = lineGrosses[idx]
    const t = l.lineTaxType || 'percent'
    const v = l.lineTaxValue || 0
    const amt = t === 'percent' ? (base * v / 100) : v
    return amt
  })
  const lineTaxesAmount = lineTaxAmounts.reduce((s,v)=> s + v, 0)

  const invoiceTaxesAmount = (invoiceTaxes||[]).reduce((s,t)=>{
    const base = (t.applyOn === 'gross') ? taxableBase : (taxableBase + lineTaxesAmount)
    const v = t.type === 'percent' ? (base * (t.value||0)/100) : (t.value||0)
    return s + v
  }, 0)

  const totalGross = gross || 1
  const normWithAfterTax = norm.map((l, idx) => {
    const packs = l.packs || 0
    const unitsPerPack = l.unitsPerPack || 1
    const baseGross = lineGrosses[idx]
    const lineTax = lineTaxAmounts[idx]
    const share = baseGross / totalGross
    const invTaxShare = invoiceTaxesAmount * share
    const totalForLine = baseGross + lineTax + invTaxShare
    const totalUnitsForLine = (l.totalItems || (unitsPerPack * packs) || 0)
    const buyPerUnitAfterTax = totalUnitsForLine > 0 ? (totalForLine / totalUnitsForLine) : 0
    const buyPerPackAfterTax = unitsPerPack > 0 ? (buyPerUnitAfterTax * unitsPerPack) : 0
    return {
      ...l,
      buyPerPackAfterTax: Number(buyPerPackAfterTax.toFixed(6)),
      buyPerUnitAfterTax: Number(buyPerUnitAfterTax.toFixed(6)),
    }
  })

  const totals = {
    gross: Number(gross.toFixed(2)),
    discount: Number(discountAmt.toFixed(2)),
    taxable: Number(taxableBase.toFixed(2)),
    lineTaxes: Number(lineTaxesAmount.toFixed(2)),
    invoiceTaxes: Number(invoiceTaxesAmount.toFixed(2)),
    net: Number((taxableBase + lineTaxesAmount + invoiceTaxesAmount).toFixed(2)),
  }
  return { lines: normWithAfterTax, totals }
}

export async function list(req: Request, res: Response){
  const parsed = labDraftQuerySchema.safeParse(req.query)
  const { from, to, search, limit } = parsed.success ? parsed.data : ({} as any)
  const filter: any = {}
  if (from || to){
    filter.date = {}
    if (from) filter.date.$gte = from
    if (to) filter.date.$lte = to
  }
  if (search){
    const rx = new RegExp(search, 'i')
    filter.$or = [{ invoice: rx }, { supplierName: rx }, { 'lines.name': rx }]
  }
  const items = await LabPurchaseDraft.find(filter).sort({ createdAt: -1 }).limit(limit || 200).lean()
  res.json({ items })
}

export async function create(req: Request, res: Response){
  const data = labDraftCreateSchema.parse(req.body)
  const { lines, totals } = calcTotals(data.lines, (data as any).discount || 0, data.invoiceTaxes || [])
  const doc = await LabPurchaseDraft.create({
    date: data.date,
    invoice: data.invoice,
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    invoiceTaxes: data.invoiceTaxes || [],
    totals,
    lines,
  })
  res.status(201).json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await LabPurchaseDraft.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function approve(req: Request, res: Response){
  const { id } = req.params
  const draft: any = await LabPurchaseDraft.findById(id).lean()
  if (!draft) return res.status(404).json({ error: 'Draft not found' })

  for (const l of (draft.lines || [])){
    const name = String(l.name||'').trim()
    if (!name) continue
    const key = name.toLowerCase()
    const unitsPerPack = l.unitsPerPack || 1
    const packs = l.packs || 0
    const addQty = (l.totalItems != null) ? l.totalItems : (unitsPerPack * (l.packs || 0))
    const salePerUnit = (unitsPerPack && l.salePerPack) ? (l.salePerPack / unitsPerPack) : 0
    const expiry = l.expiry

    const prev: any = await LabInventoryItem.findOne({ key }).lean()
    const prevOnHand = Number(prev?.onHand || 0)
    const prevAvg = Number(prev?.avgCostPerUnit || 0)
    const costPerUnit = Number(l.buyPerUnitAfterTax || l.buyPerUnit || ((unitsPerPack && l.buyPerPack) ? (l.buyPerPack / unitsPerPack) : 0) || 0)
    const newQty = Math.max(0, prevOnHand + (addQty || 0))
    const newAvg = newQty > 0 ? (((prevAvg * prevOnHand) + (costPerUnit * (addQty || 0))) / newQty) : prevAvg

    const update: any = {
      $setOnInsert: { key, name },
      $inc: { onHand: addQty || 0 },
      $set: {
        unitsPerPack: unitsPerPack || 1,
        lastInvoice: draft.invoice || '-',
        lastSupplier: draft.supplierName || '-',
        lastSupplierId: draft.supplierId || undefined,
        lastInvoiceDate: draft.date || undefined,
        lastExpiry: expiry || undefined,
        lastPacksReceived: packs || 0,
        lastTotalItemsReceived: addQty || 0,
        lastBuyPerPack: l.buyPerPack || 0,
        lastBuyPerUnit: l.buyPerUnit || (unitsPerPack? (l.buyPerPack||0)/unitsPerPack : 0),
        lastBuyPerPackAfterTax: l.buyPerPackAfterTax || 0,
        lastBuyPerUnitAfterTax: l.buyPerUnitAfterTax || 0,
        lastSalePerPack: l.salePerPack || 0,
        lastLineTaxType: l.lineTaxType || undefined,
        lastLineTaxValue: l.lineTaxValue || 0,
        lastItemId: l.itemId || undefined,
        avgCostPerUnit: Number(newAvg.toFixed(6)),
      }
    }
    if (l.category) update.$set.category = l.category
    if (l.genericName) update.$set.genericName = l.genericName
    if (l.minStock != null) update.$set.minStock = l.minStock
    if (salePerUnit) update.$set.lastSalePerUnit = salePerUnit
    if (expiry){
      update.$min = { ...(update.$min||{}), earliestExpiry: expiry }
    }
    await LabInventoryItem.findOneAndUpdate({ key }, update, { upsert: true, new: true })
  }

  const totalAmount = draft?.totals?.net ?? ((draft.lines||[]).reduce((s:any,l:any)=> s + (l.buyPerPack||0)*(l.packs||0), 0))
  const purchase = await LabPurchase.create({
    date: draft.date,
    invoice: draft.invoice,
    supplierId: draft.supplierId,
    supplierName: draft.supplierName,
    totals: draft.totals,
    totalAmount: Number(totalAmount || 0),
    lines: draft.lines || [],
  })

  await LabPurchaseDraft.deleteOne({ _id: id })
  res.json({ ok: true, purchaseId: purchase?._id })
}
