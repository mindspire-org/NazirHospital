import { Request, Response } from 'express'
import { InventoryItem } from '../models/InventoryItem'
import { AuditLog } from '../models/AuditLog'

export async function list(req: Request, res: Response){
  const search = (req.query.search as string) || ''
  const limit = Number(req.query.limit || 10)
  const page = Math.max(1, Number((req.query.page as any) || 1))
  const filter: any = {}
  if (search){
    const rx = new RegExp(search, 'i')
    filter.$or = [{ name: rx }, { category: rx }, { genericName: rx }]
  }
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    InventoryItem.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    InventoryItem.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)))
  res.json({ items, total, page, totalPages })
}

export async function summary(req: Request, res: Response){
  const search = (req.query.search as string) || ''
  const limit = Number(req.query.limit || 500)

  function parseDate(s?: string){
    if (!s) return undefined as Date | undefined
    const d = new Date(s)
    return isNaN(d.getTime()) ? undefined : d
  }

  const filter: any = {}
  if (search){
    const rx = new RegExp(search, 'i')
    filter.$or = [{ name: rx }, { category: rx }, { genericName: rx }]
  }
  // Use current inventory collection for accurate onHand and pricing
  const allItems = await InventoryItem.find(filter).lean()
  const now = new Date()
  const soon = new Date(now.getTime() + 30*24*60*60*1000)
  const stockSaleValue = allItems.reduce((s:any,it:any)=> s + (Number(it.onHand||0) * Number(it.lastSalePerUnit||0)), 0)
  const lowStockCount = allItems.reduce((s:any,it:any)=> s + ((it.minStock != null && (Number(it.onHand||0) <= Number(it.minStock))) ? 1 : 0), 0)
  const outOfStockCount = allItems.reduce((s:any,it:any)=> s + (((Number(it.onHand||0) <= 0)) ? 1 : 0), 0)
  const expiringSoonCount = allItems.reduce((s:any,it:any)=>{
    const d = parseDate(it.earliestExpiry)
    if (!d) return s
    return s + (d <= soon ? 1 : 0)
  }, 0)
  const totalInventoryOnHand = allItems.reduce((s:any,it:any)=> s + Number(it.onHand||0), 0)
  const distinctCount = allItems.length
  const expiringSoonItems = allItems
    .filter((it:any)=>{ const d = parseDate(it.earliestExpiry); return !!d && d <= soon })
    .sort((a:any,b:any)=>{
      const da = parseDate(a.earliestExpiry)?.getTime() || 0
      const db = parseDate(b.earliestExpiry)?.getTime() || 0
      return da - db
    })
    .slice(0, 5)
    .map((it:any)=> ({ name: it.name, earliestExpiry: it.earliestExpiry, onHand: it.onHand }))

  const items = (limit? allItems.slice(0, limit): allItems).map(it=>({
    name: it.name,
    category: it.category,
    unitsPerPack: it.unitsPerPack,
    minStock: it.minStock,
    onHand: it.onHand,
    earliestExpiry: it.earliestExpiry,
    lastInvoice: it.lastInvoice,
    lastSupplier: it.lastSupplier,
    lastGenericName: it.genericName,
    lastSalePerUnit: it.lastSalePerUnit,
  }))

  res.json({
    items,
    stats: {
      stockSaleValue: Number(stockSaleValue.toFixed(2)),
      lowStockCount,
      outOfStockCount,
      expiringSoonCount,
      totalInventoryOnHand: Number(totalInventoryOnHand),
      distinctCount,
    },
    expiringSoonItems,
  })
}

export async function remove(req: Request, res: Response){
  const { key } = req.params
  const norm = String(key || '').trim().toLowerCase()
  if (!norm) return res.status(400).json({ error: 'Key required' })
  const before: any = await InventoryItem.findOne({ key: norm }).lean()
  await InventoryItem.findOneAndDelete({ key: norm })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Delete Inventory',
      label: 'DELETE_INVENTORY',
      method: 'DELETE',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${before?.name || ''} — key:${norm}`,
    })
  } catch {}
  res.json({ ok: true })
}

export async function update(req: Request, res: Response){
  const { key } = req.params
  const norm = String(key || '').trim().toLowerCase()
  if (!norm) return res.status(400).json({ error: 'Key required' })

  const {
    name,
    genericName,
    category,
    unitsPerPack,
    minStock,
    onHand,
    salePerUnit,
    expiry,
    invoice,
    date,
    supplierId,
    supplierName,
  } = (req.body || {})

  const doc = await InventoryItem.findOne({ key: norm })
  if (!doc) return res.status(404).json({ error: 'Item not found' })

  if (typeof name === 'string' && name.trim()){
    doc.name = name.trim()
    doc.key = name.trim().toLowerCase()
  }
  if (genericName !== undefined) doc.genericName = genericName || undefined
  if (category !== undefined) doc.category = category || undefined
  if (unitsPerPack !== undefined) doc.unitsPerPack = Math.max(1, Number(unitsPerPack)||1)
  if (minStock !== undefined && minStock !== '') doc.minStock = Number(minStock)
  if (onHand !== undefined && onHand !== '') doc.onHand = Number(onHand)
  if (salePerUnit !== undefined && salePerUnit !== ''){
    doc.lastSalePerUnit = Number(salePerUnit)
    if (doc.unitsPerPack && doc.unitsPerPack>0){
      doc.lastSalePerPack = Number((Number(salePerUnit) * doc.unitsPerPack).toFixed(6))
    }
  }
  if (invoice !== undefined) doc.lastInvoice = String(invoice||'')
  if (date !== undefined) doc.lastInvoiceDate = String(date||'')
  if (supplierId !== undefined) doc.lastSupplierId = supplierId || undefined
  if (supplierName !== undefined) doc.lastSupplier = supplierName || undefined
  if (expiry){
    const e = String(expiry)
    doc.lastExpiry = e
    // maintain earliestExpiry as min
    const prev = doc.earliestExpiry ? new Date(doc.earliestExpiry) : undefined
    const cur = new Date(e)
    if (!prev || (cur < prev)) doc.earliestExpiry = e
  }

  try {
    await doc.save()
  } catch (err: any){
    return res.status(400).json({ error: err?.message || 'Update failed' })
  }
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await AuditLog.create({
      actor,
      action: 'Edit Inventory',
      label: 'EDIT_INVENTORY',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `${doc.name || ''} — key:${doc.key}`,
    })
  } catch {}
  res.json({ ok: true })
}
