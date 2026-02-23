import { Request, Response } from 'express'
import { HospitalStoreCategory } from '../models/StoreCategory'
import { HospitalStoreUnit } from '../models/StoreUnit'
import { HospitalStoreLocation } from '../models/StoreLocation'
import { HospitalStoreItem } from '../models/StoreItem'
import { HospitalStoreLot } from '../models/StoreLot'
import { HospitalStoreTxn } from '../models/StoreTxn'
import { createStoreCategorySchema, createStoreItemSchema, createStoreLocationSchema, createStoreUnitSchema, listStoreItemsSchema, listStoreLotsSchema, listStoreMasterSchema, listStoreTxnsSchema, receiveStoreSchema, updateStoreCategorySchema, updateStoreItemSchema, updateStoreLocationSchema, updateStoreUnitSchema, issueStoreSchema, transferStoreSchema, adjustStoreSchema, storeWorthSchema, storeLowStockSchema, storeExpiringSchema, storeLedgerSchema } from '../validators/store'

function escRx(s: string){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

async function listMaster(model: any, req: Request, res: Response){
  const q = listStoreMasterSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { q: search, active, page = 1, limit = 200 } = q.data
  const criteria: any = {}
  if (search){
    const rx = new RegExp(escRx(search), 'i')
    criteria.$or = [{ name: rx }, { description: rx }, { abbr: rx }]
  }
  if (active != null) criteria.active = active
  const items = await model.find(criteria).sort({ name: 1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await model.countDocuments(criteria)
  res.json({ items, total, page, limit })
}

// Categories
export async function listCategories(req: Request, res: Response){ return listMaster(HospitalStoreCategory, req, res) }
export async function createCategory(req: Request, res: Response){
  const data = createStoreCategorySchema.parse(req.body)
  const row = await HospitalStoreCategory.create(data)
  res.status(201).json({ category: row })
}
export async function updateCategory(req: Request, res: Response){
  const patch = updateStoreCategorySchema.parse(req.body)
  const row = await HospitalStoreCategory.findByIdAndUpdate(req.params.id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Category not found' })
  res.json({ category: row })
}
export async function removeCategory(req: Request, res: Response){
  await HospitalStoreCategory.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
}

// Units
export async function listUnits(req: Request, res: Response){ return listMaster(HospitalStoreUnit, req, res) }
export async function createUnit(req: Request, res: Response){
  const data = createStoreUnitSchema.parse(req.body)
  const row = await HospitalStoreUnit.create(data)
  res.status(201).json({ unit: row })
}
export async function updateUnit(req: Request, res: Response){
  const patch = updateStoreUnitSchema.parse(req.body)
  const row = await HospitalStoreUnit.findByIdAndUpdate(req.params.id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Unit not found' })
  res.json({ unit: row })
}
export async function removeUnit(req: Request, res: Response){
  await HospitalStoreUnit.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
}

// Locations
export async function listLocations(req: Request, res: Response){ return listMaster(HospitalStoreLocation, req, res) }
export async function createLocation(req: Request, res: Response){
  const data = createStoreLocationSchema.parse(req.body)
  const row = await HospitalStoreLocation.create(data)
  res.status(201).json({ location: row })
}
export async function updateLocation(req: Request, res: Response){
  const patch = updateStoreLocationSchema.parse(req.body)
  const row = await HospitalStoreLocation.findByIdAndUpdate(req.params.id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Location not found' })
  res.json({ location: row })
}
export async function removeLocation(req: Request, res: Response){
  await HospitalStoreLocation.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
}

// Items
export async function listItems(req: Request, res: Response){
  const q = listStoreItemsSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { q: search, categoryId, active, page = 1, limit = 200 } = q.data
  const criteria: any = {}
  if (search){
    const rx = new RegExp(escRx(search), 'i')
    criteria.$or = [{ name: rx }, { code: rx }]
  }
  if (categoryId) criteria.categoryId = categoryId
  if (active != null) criteria.active = active
  const items = await HospitalStoreItem.find(criteria)
    .sort({ name: 1 })
    .skip((page-1)*limit)
    .limit(limit)
    .lean()
  const total = await HospitalStoreItem.countDocuments(criteria)
  res.json({ items, total, page, limit })
}

export async function createItem(req: Request, res: Response){
  const data = createStoreItemSchema.parse(req.body)
  const row = await HospitalStoreItem.create(data)
  res.status(201).json({ item: row })
}

export async function updateItem(req: Request, res: Response){
  const patch = updateStoreItemSchema.parse(req.body)
  const row = await HospitalStoreItem.findByIdAndUpdate(req.params.id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Item not found' })
  res.json({ item: row })
}

export async function removeItem(req: Request, res: Response){
  await HospitalStoreItem.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
}

// Lots & stock
export async function listLots(req: Request, res: Response){
  const q = listStoreLotsSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { itemId, locationId, expFrom, expTo, page = 1, limit = 500 } = q.data
  const criteria: any = {}
  if (itemId) criteria.itemId = itemId
  if (locationId) criteria.locationId = locationId
  if (expFrom || expTo) criteria.expiryDate = { ...(expFrom?{ $gte: expFrom }:{}), ...(expTo?{ $lte: expTo }:{}) }
  const lots = await HospitalStoreLot.find(criteria).sort({ expiryDate: 1, receivedAt: 1, createdAt: 1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await HospitalStoreLot.countDocuments(criteria)
  res.json({ items: lots, total, page, limit })
}

export async function stockSummary(req: Request, res: Response){
  const locationId = String(req.query.locationId || '')
  const itemId = String(req.query.itemId || '')
  const match: any = {}
  if (locationId) match.locationId = locationId
  if (itemId) match.itemId = itemId

  const rows = await HospitalStoreLot.aggregate([
    { $match: match },
    { $group: { _id: { itemId: '$itemId', locationId: '$locationId' }, qtyOnHand: { $sum: '$qtyOnHand' }, worth: { $sum: { $multiply: ['$qtyOnHand', '$unitCost'] } } } },
    { $sort: { 'worth': -1 } },
  ])

  res.json({ items: rows.map(r => ({ itemId: String(r._id.itemId), locationId: String(r._id.locationId), qtyOnHand: r.qtyOnHand || 0, worth: Number((r.worth || 0).toFixed(2)) })) })
}

// Transactions
export async function listTxns(req: Request, res: Response){
  const q = listStoreTxnsSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { type, itemId, locationId, from, to, page = 1, limit = 200 } = q.data
  const criteria: any = {}
  if (type) criteria.type = type
  if (from || to) criteria.date = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  if (locationId) criteria.$or = [{ fromLocationId: locationId }, { toLocationId: locationId }]
  if (itemId) criteria['lines.itemId'] = itemId
  const rows = await HospitalStoreTxn.find(criteria).sort({ date: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await HospitalStoreTxn.countDocuments(criteria)
  res.json({ items: rows, total, page, limit })
}

async function fifoConsume(opts: { itemId: string; locationId: string; qty: number }){
  let remaining = opts.qty
  const consumed: Array<{ lotId: string; qty: number; unitCost: number; lotNo: string; expiryDate: string }> = []

  const lots = await HospitalStoreLot.find({ itemId: opts.itemId, locationId: opts.locationId, qtyOnHand: { $gt: 0 } })
    .sort({ receivedAt: 1, createdAt: 1 })

  for (const lot of lots){
    if (remaining <= 0) break
    const take = Math.min(remaining, lot.qtyOnHand)
    lot.qtyOnHand = lot.qtyOnHand - take
    await lot.save()
    consumed.push({ lotId: String(lot._id), qty: take, unitCost: lot.unitCost, lotNo: lot.lotNo, expiryDate: lot.expiryDate })
    remaining -= take
  }

  if (remaining > 0){
    throw new Error('Insufficient stock for FIFO issue')
  }

  return consumed
}

export async function receive(req: Request, res: Response){
  const data = receiveStoreSchema.parse(req.body)

  const linesOut: any[] = []
  for (const l of data.lines){
    const lot = await HospitalStoreLot.findOneAndUpdate(
      { itemId: l.itemId, locationId: data.locationId, lotNo: l.lotNo, expiryDate: l.expiryDate },
      { $setOnInsert: { itemId: l.itemId, locationId: data.locationId, vendorId: data.vendorId, receivedAt: data.date, lotNo: l.lotNo, expiryDate: l.expiryDate, unitCost: l.unitCost, qtyOnHand: 0 }, $set: { unitCost: l.unitCost }, $inc: { qtyOnHand: l.qty } },
      { upsert: true, new: true }
    )
    linesOut.push({ itemId: l.itemId, lotId: String(lot?._id), qty: l.qty, unitCost: l.unitCost, lotNo: l.lotNo, expiryDate: l.expiryDate })
  }

  const txn = await HospitalStoreTxn.create({
    type: 'RECEIVE',
    date: data.date,
    referenceNo: data.referenceNo,
    notes: data.notes,
    toLocationId: data.locationId,
    lines: linesOut,
  })

  res.status(201).json({ txn })
}

export async function issue(req: Request, res: Response){
  const data = issueStoreSchema.parse(req.body)

  const allLines: any[] = []
  for (const l of data.lines){
    const consumed = await fifoConsume({ itemId: l.itemId, locationId: data.locationId, qty: l.qty })
    for (const c of consumed){
      allLines.push({ itemId: l.itemId, lotId: c.lotId, qty: c.qty, unitCost: c.unitCost, lotNo: c.lotNo, expiryDate: c.expiryDate })
    }
  }

  const txn = await HospitalStoreTxn.create({
    type: 'ISSUE',
    date: data.date,
    referenceNo: data.referenceNo,
    notes: data.notes,
    fromLocationId: data.locationId,
    departmentId: data.departmentId,
    encounterId: data.encounterId,
    lines: allLines,
  })

  res.status(201).json({ txn })
}

export async function transfer(req: Request, res: Response){
  const data = transferStoreSchema.parse(req.body)
  if (data.fromLocationId === data.toLocationId) return res.status(400).json({ error: 'fromLocationId and toLocationId must be different' })

  const allLines: any[] = []
  for (const l of data.lines){
    const consumed = await fifoConsume({ itemId: l.itemId, locationId: data.fromLocationId, qty: l.qty })
    for (const c of consumed){
      const lot = await HospitalStoreLot.findOneAndUpdate(
        { itemId: l.itemId, locationId: data.toLocationId, lotNo: c.lotNo, expiryDate: c.expiryDate },
        { $setOnInsert: { itemId: l.itemId, locationId: data.toLocationId, receivedAt: data.date, lotNo: c.lotNo, expiryDate: c.expiryDate, unitCost: c.unitCost, qtyOnHand: 0 }, $set: { unitCost: c.unitCost }, $inc: { qtyOnHand: c.qty } },
        { upsert: true, new: true }
      )
      allLines.push({ itemId: l.itemId, lotId: String(lot?._id), qty: c.qty, unitCost: c.unitCost, lotNo: c.lotNo, expiryDate: c.expiryDate })
    }
  }

  const txn = await HospitalStoreTxn.create({
    type: 'TRANSFER',
    date: data.date,
    referenceNo: data.referenceNo,
    notes: data.notes,
    fromLocationId: data.fromLocationId,
    toLocationId: data.toLocationId,
    lines: allLines,
  })

  res.status(201).json({ txn })
}

export async function adjust(req: Request, res: Response){
  const data = adjustStoreSchema.parse(req.body)

  const linesOut: any[] = []
  for (const l of data.lines){
    if (l.qty === 0) continue

    // For adjustments we require explicit lotNo/expiryDate (batch tracking mandatory)
    if (l.qty > 0){
      const lot = await HospitalStoreLot.findOneAndUpdate(
        { itemId: l.itemId, locationId: data.locationId, lotNo: l.lotNo, expiryDate: l.expiryDate },
        { $setOnInsert: { itemId: l.itemId, locationId: data.locationId, receivedAt: data.date, lotNo: l.lotNo, expiryDate: l.expiryDate, unitCost: l.unitCost || 0, qtyOnHand: 0 }, $set: { ...(l.unitCost!=null?{ unitCost: l.unitCost }:{}), receivedAt: data.date }, $inc: { qtyOnHand: l.qty } },
        { upsert: true, new: true }
      )
      linesOut.push({ itemId: l.itemId, lotId: String(lot?._id), qty: l.qty, unitCost: lot?.unitCost, lotNo: l.lotNo, expiryDate: l.expiryDate })
    } else {
      const lot = await HospitalStoreLot.findOne({ itemId: l.itemId, locationId: data.locationId, lotNo: l.lotNo, expiryDate: l.expiryDate })
      if (!lot) return res.status(400).json({ error: 'Lot not found for negative adjustment' })
      if (lot.qtyOnHand + l.qty < 0) return res.status(400).json({ error: 'Insufficient stock for negative adjustment' })
      lot.qtyOnHand = lot.qtyOnHand + l.qty
      await lot.save()
      linesOut.push({ itemId: l.itemId, lotId: String(lot._id), qty: l.qty, unitCost: lot.unitCost, lotNo: lot.lotNo, expiryDate: lot.expiryDate })
    }
  }

  const txn = await HospitalStoreTxn.create({
    type: 'ADJUSTMENT',
    date: data.date,
    referenceNo: data.referenceNo,
    notes: data.notes,
    toLocationId: data.locationId,
    lines: linesOut,
  })

  res.status(201).json({ txn })
}

// Reports
export async function inventoryWorth(req: Request, res: Response){
  const q = storeWorthSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { locationId, asOf } = q.data

  const criteria: any = {}
  if (locationId) criteria.locationId = locationId
  if (asOf) criteria.receivedAt = { $lte: asOf }

  const rows = await HospitalStoreLot.aggregate([
    { $match: criteria },
    { $group: { _id: { itemId: '$itemId', locationId: '$locationId' }, qtyOnHand: { $sum: '$qtyOnHand' }, worth: { $sum: { $multiply: ['$qtyOnHand', '$unitCost'] } } } },
    { $sort: { worth: -1 } },
  ])

  const totalWorth = rows.reduce((s, r) => s + (r.worth || 0), 0)
  res.json({
    items: rows.map(r => ({ itemId: String(r._id.itemId), locationId: String(r._id.locationId), qtyOnHand: r.qtyOnHand || 0, worth: Number((r.worth || 0).toFixed(2)) })),
    totalWorth: Number(totalWorth.toFixed(2)),
  })
}

export async function lowStock(req: Request, res: Response){
  const q = storeLowStockSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { q: search, onlyLow, page = 1, limit = 200 } = q.data

  const itemCriteria: any = {}
  if (search){
    const rx = new RegExp(escRx(search), 'i')
    itemCriteria.$or = [{ name: rx }, { code: rx }]
  }

  const items = await HospitalStoreItem.find(itemCriteria).sort({ name: 1 }).skip((page-1)*limit).limit(limit).lean()
  const itemIds = items.map(i => i._id)

  const stock = await HospitalStoreLot.aggregate([
    { $match: { itemId: { $in: itemIds } } },
    { $group: { _id: '$itemId', qtyOnHand: { $sum: '$qtyOnHand' } } },
  ])
  const stockMap = new Map<string, number>(stock.map(s => [String(s._id), s.qtyOnHand || 0]))

  let rows = items.map(it => {
    const qty = stockMap.get(String(it._id)) || 0
    const reorderLevel = (it.reorderLevel != null) ? it.reorderLevel : it.minStock
    const isLow = (reorderLevel != null) ? qty <= reorderLevel : false
    return { item: it, qtyOnHand: qty, reorderLevel, isLow }
  })

  if (onlyLow) rows = rows.filter(r => r.isLow)

  res.json({ items: rows })
}

export async function expiring(req: Request, res: Response){
  const q = storeExpiringSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { locationId, from, to, page = 1, limit = 200 } = q.data

  const criteria: any = { qtyOnHand: { $gt: 0 }, expiryDate: { ...(from?{ $gte: from }:{}), $lte: to } }
  if (locationId) criteria.locationId = locationId

  const lots = await HospitalStoreLot.find(criteria)
    .sort({ expiryDate: 1, receivedAt: 1 })
    .skip((page-1)*limit)
    .limit(limit)
    .lean()
  const total = await HospitalStoreLot.countDocuments(criteria)

  res.json({ items: lots, total, page, limit })
}

export async function ledger(req: Request, res: Response){
  const q = storeLedgerSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { itemId, locationId, from, to, page = 1, limit = 200 } = q.data

  const criteria: any = {}
  if (from || to) criteria.date = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  if (itemId) criteria['lines.itemId'] = itemId
  if (locationId) criteria.$or = [{ fromLocationId: locationId }, { toLocationId: locationId }]

  const txns = await HospitalStoreTxn.find(criteria).sort({ date: 1, createdAt: 1 }).skip((page-1)*limit).limit(limit).lean()

  // Flatten with running balance per item/location requested
  const balanceByKey = new Map<string, number>()
  const rows: any[] = []

  for (const t of txns){
    for (const l of (t.lines || [])){
      const loc = (t.type === 'RECEIVE' || t.type === 'ADJUSTMENT') ? t.toLocationId : (t.type === 'ISSUE' ? t.fromLocationId : undefined)
      const fromLoc = t.fromLocationId
      const toLoc = t.toLocationId

      // Determine sign based on txn type and requested location
      const applyForLocs: Array<{ locationId: any; delta: number }> = []

      if (t.type === 'RECEIVE') applyForLocs.push({ locationId: toLoc, delta: l.qty })
      if (t.type === 'ISSUE') applyForLocs.push({ locationId: fromLoc, delta: -l.qty })
      if (t.type === 'TRANSFER'){
        applyForLocs.push({ locationId: fromLoc, delta: -l.qty })
        applyForLocs.push({ locationId: toLoc, delta: l.qty })
      }
      if (t.type === 'ADJUSTMENT') applyForLocs.push({ locationId: toLoc, delta: l.qty })

      for (const a of applyForLocs){
        if (locationId && String(a.locationId || '') !== String(locationId)) continue
        const key = `${String(l.itemId)}::${String(a.locationId || '')}`
        const prev = balanceByKey.get(key) || 0
        const next = prev + (a.delta || 0)
        balanceByKey.set(key, next)
        rows.push({
          date: t.date,
          type: t.type,
          txnId: String(t._id),
          itemId: String(l.itemId),
          locationId: String(a.locationId || ''),
          lotId: l.lotId ? String(l.lotId) : undefined,
          lotNo: l.lotNo,
          expiryDate: l.expiryDate,
          qty: a.delta,
          unitCost: l.unitCost,
          balance: next,
          referenceNo: t.referenceNo,
          notes: t.notes,
          departmentId: t.departmentId,
          encounterId: t.encounterId,
        })
      }
    }
  }

  res.json({ items: rows })
}
