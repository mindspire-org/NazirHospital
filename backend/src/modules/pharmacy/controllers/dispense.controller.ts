import { Request, Response } from 'express'
import { Dispense } from '../models/Dispense'
import { dispenseCreateSchema, salesQuerySchema } from '../validators/dispense'
import { InventoryItem } from '../models/InventoryItem'
import { AuditLog } from '../models/AuditLog'
import mongoose from 'mongoose'
import { postFbrInvoiceViaSDC } from '../../hospital/services/fbr'

function todayKey(){
  const d = new Date()
  const y = String(d.getFullYear()).slice(2)
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}${m}${day}`
}

export async function create(req: Request, res: Response){
  const data = dispenseCreateSchema.parse(req.body)
  const datetime = new Date().toISOString()
  const key = todayKey()
  const countToday = await Dispense.countDocuments({ billNo: new RegExp(`^B-${key}-`) })
  const billNo = `B-${key}-${String(countToday+1).padStart(3,'0')}`
  const subtotal = data.lines.reduce((s: number, l: { unitPrice: number; qty: number })=> s + l.unitPrice*l.qty, 0)
  const lineDiscount = Number((data as any).lineDiscountTotal || 0)
  const billDiscount = ((Math.max(0, subtotal - lineDiscount)) * (data.discountPct || 0)) / 100
  const total = subtotal - lineDiscount - billDiscount
  const linesWithCost: any[] = []
  let profit = 0
  for (const line of data.lines){
    let item: any = null
    const id = String(line.medicineId || '').trim()
    const name = String(line.name || '').trim()
    if (id && mongoose.isValidObjectId(id)) item = await InventoryItem.findById(id).lean()
    if (!item && name) item = await InventoryItem.findOne({ key: name.toLowerCase() }).lean()
    if (!item && id) item = await InventoryItem.findOne({ lastMedicineId: id }).lean()
    const costPerUnit = Number(item?.avgCostPerUnit || item?.lastBuyPerUnitAfterTax || item?.lastBuyPerUnit || 0)
    linesWithCost.push({ ...line, costPerUnit, discountRs: Number((line as any)?.discountRs||0) })
    profit += (Number(line.unitPrice||0) - costPerUnit) * Number(line.qty||0)
  }
  // subtract discount from profit (discount reduces revenue)
  profit -= Number(lineDiscount || 0)
  profit -= Number(billDiscount || 0)
  const doc: any = await Dispense.create({
    datetime,
    billNo,
    customerId: (data as any).customerId || undefined,
    customer: data.customer || 'Walk-in',
    payment: data.payment,
    discountPct: data.discountPct || 0,
    lineDiscountTotal: lineDiscount,
    subtotal: Number(subtotal.toFixed(2)),
    total: Number(total.toFixed(2)),
    lines: linesWithCost,
    profit: Number(profit.toFixed(2)),
    createdBy: String((data as any)?.createdBy || '').trim() || undefined,
  })

  // FBR fiscalization (Pharmacy POS checkout)
  try {
    const payload = {
      billNo,
      customer: doc.customer,
      payment: doc.payment,
      lines: Array.isArray(doc.lines) ? doc.lines.map((l: any)=> ({ name: l.name || 'Item', qty: Number(l.qty||0)||1, unitPrice: Number(l.unitPrice||0) })) : [],
      subtotal: Number(doc.subtotal || 0),
      discount: Number((doc as any).lineDiscountTotal || 0) + ((Math.max(0, Number(doc.subtotal||0) - Number((doc as any).lineDiscountTotal||0))) * (Number(doc.discountPct||0) / 100)),
      net: Number(doc.total || 0),
    }
    const r: any = await postFbrInvoiceViaSDC({ module: 'PHARMACY_POS_CREATE', invoiceType: 'PHARMACY', refId: String(doc._id), amount: Number(doc.total||0), payload })
    if (r) {
      ;(doc as any).fbrInvoiceNo = r.fbrInvoiceNo
      ;(doc as any).fbrQrCode = r.qrCode
      ;(doc as any).fbrStatus = r.status
      ;(doc as any).fbrMode = r.mode
      ;(doc as any).fbrError = r.error
      try { await doc.save() } catch {}
    }
  } catch {}

  for (const line of data.lines){
    try {
      const id = String(line.medicineId || '').trim()
      const name = String(line.name || '').trim()
      let item: any = null
      if (id && mongoose.isValidObjectId(id)){
        item = await InventoryItem.findById(id)
      }
      if (!item && name){
        const key = name.toLowerCase()
        item = await InventoryItem.findOne({ key })
      }
      if (!item && id){
        item = await InventoryItem.findOne({ lastMedicineId: id })
      }
      if (!item) continue
      const dec = Number(line.qty || 0)
      item.onHand = Math.max(0, Number(item.onHand || 0) - dec)
      if (line.unitPrice != null) {
        item.lastSalePerUnit = Number(line.unitPrice)
      }
      await item.save()
    } catch (e) {
    }
  }
  try {
    const actor = String((data as any)?.createdBy || (req as any).user?.name || (req as any).user?.email || 'system')
    await AuditLog.create({
      actor,
      action: 'Sale',
      label: 'SALE',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Bill ${doc.billNo} — ${doc.customer} — Rs ${Number(doc.total||0).toFixed(2)}`,
    })
  } catch {}
  res.status(201).json(doc)
}

export async function list(req: Request, res: Response){
  const parsed = salesQuerySchema.safeParse(req.query)
  const { bill, customer, customerId, payment, medicine, user, from, to, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (bill) filter.billNo = new RegExp(bill, 'i')
  if (customer) filter.customer = new RegExp(customer, 'i')
  if (customerId) filter.customerId = customerId
  if (payment && payment !== 'Any') filter.payment = payment
  if (medicine) filter['lines.name'] = new RegExp(medicine, 'i')
  if (user) filter.createdBy = new RegExp(user, 'i')
  if (from || to){
    filter.datetime = {}
    if (from) filter.datetime.$gte = new Date(from).toISOString()
    if (to) {
      const hasTime = /T\d{2}:\d{2}/.test(String(to))
      const end = new Date(to)
      if (!hasTime) end.setHours(23,59,59,999)
      filter.datetime.$lte = end.toISOString()
    }
  }
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await Dispense.countDocuments(filter)
  const items = await Dispense.find(filter).sort({ datetime: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function summary(req: Request, res: Response){
  const parsed = salesQuerySchema.safeParse(req.query)
  const { payment, from, to } = parsed.success ? parsed.data : {}
  const match: any = {}
  if (payment && payment !== 'Any') match.payment = payment
  if (from || to){
    match.datetime = {}
    if (from) match.datetime.$gte = new Date(from).toISOString()
    if (to) {
      const hasTime = /T\d{2}:\d{2}/.test(String(to))
      const end = new Date(to)
      if (!hasTime) end.setHours(23,59,59,999)
      match.datetime.$lte = end.toISOString()
    }
  }
  const agg = await Dispense.aggregate([
    { $match: match },
    { $group: { _id: null, totalAmount: { $sum: { $ifNull: ['$total', 0] } }, totalProfit: { $sum: { $ifNull: ['$profit', 0] } }, count: { $sum: 1 } } }
  ])
  const totalAmount = agg[0]?.totalAmount || 0
  const totalProfit = agg[0]?.totalProfit || 0
  const count = agg[0]?.count || 0
  res.json({ totalAmount: Number(totalAmount.toFixed(2)), totalProfit: Number(totalProfit.toFixed(2)), count })
}
