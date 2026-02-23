import { Request, Response } from 'express' 
import { Purchase } from '../models/Purchase'
function parseDate(s?: string){
  if (!s) return undefined
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d
}

export async function summary(req: Request, res: Response){
  const search = (req.query.search as string) || ''
  const limit = Number(req.query.limit || 500)

  const invoices: any[] = await Purchase.find({}, { lines: 1, invoice: 1, supplierName: 1, date: 1 }).sort({ date: -1 }).limit(5000).lean()
  const map = new Map<string, any>()

  for (const inv of invoices){
    for (const l of (inv.lines || [])){
      const key = (l.name || '').trim().toLowerCase()
      if (!key) continue
      const packs = l.packs || 0
      const unitsPerPack = l.unitsPerPack || 1
      const totalItems = (l.totalItems != null) ? l.totalItems : (unitsPerPack * packs)
      const salePerUnit = (unitsPerPack && l.salePerPack) ? (l.salePerPack / unitsPerPack) : 0
      const existing = map.get(key)
      const expiry = l.expiry
      const rec = existing ? { ...existing } : {
        name: l.name || '-',
        category: l.category || '-',
        unitsPerPack: unitsPerPack || 1,
        minStock: (l.minStock != null) ? l.minStock : undefined,
        onHand: 0,
        earliestExpiry: expiry || undefined,
        lastInvoice: inv.invoice || '-',
        lastSupplier: inv.supplierName || '-',
        lastGenericName: l.genericName || undefined,
        lastSalePerUnit: salePerUnit,
      }
      rec.onHand = (rec.onHand || 0) + totalItems
      if (expiry){
        const prev = parseDate(rec.earliestExpiry)
        const cur = parseDate(expiry)
        if (!prev || (cur && cur < prev)) rec.earliestExpiry = expiry
      }
      // update fields from latest invoice (sorted by date desc)
      rec.lastInvoice = rec.lastInvoice || (inv.invoice || '-')
      rec.lastSupplier = rec.lastSupplier || (inv.supplierName || '-')
      if (!rec.category && l.category) rec.category = l.category
      if (rec.minStock == null && l.minStock != null) rec.minStock = l.minStock
      if (!rec.lastGenericName && l.genericName) rec.lastGenericName = l.genericName
      if (salePerUnit) rec.lastSalePerUnit = salePerUnit
      map.set(key, rec)
    }
  }

  let items = Array.from(map.values())
  if (search){
    const rx = new RegExp(search, 'i')
    items = items.filter(it => rx.test(it.name))
  }
  if (limit) items = items.slice(0, limit)

  const now = new Date()
  const soon = new Date(now.getTime() + 30*24*60*60*1000)
  const stockSaleValue = items.reduce((s,it)=> s + (it.onHand || 0) * (it.lastSalePerUnit || 0), 0)
  const lowStockCount = items.reduce((s,it)=> s + ((it.minStock != null && (it.onHand || 0) <= it.minStock) ? 1 : 0), 0)
  const outOfStockCount = items.reduce((s,it)=> s + (((it.onHand || 0) <= 0) ? 1 : 0), 0)
  const expiringSoonCount = items.reduce((s,it)=>{
    const d = parseDate(it.earliestExpiry)
    if (!d) return s
    return s + (d <= soon ? 1 : 0)
  }, 0)

  res.json({
    items,
    stats: {
      stockSaleValue: Number(stockSaleValue.toFixed(2)),
      lowStockCount,
      outOfStockCount,
      expiringSoonCount,
    }
  })
}
