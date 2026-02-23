import { Request, Response } from 'express'
import { HospitalEquipment } from '../models/Equipment'
import { HospitalEquipmentPPM } from '../models/EquipmentPPM'
import { HospitalEquipmentCalibration } from '../models/EquipmentCalibration'
import { HospitalEquipmentBreakdown } from '../models/EquipmentBreakdown'
import { HospitalEquipmentCondemnation } from '../models/EquipmentCondemnation'
import { createCalibrationSchema, createCondemnationSchema, createEquipmentSchema, createPPMSchema, createBreakdownSchema, equipmentDueSchema, kpiQuerySchema, listCalibrationSchema, listCondemnationsSchema, listEquipmentSchema, listPPMSchema, listBreakdownsSchema, updateCalibrationSchema, updateCondemnationSchema, updateEquipmentSchema, updatePPMSchema, updateBreakdownSchema } from '../validators/equipment'

function addMonths(iso: string, months: number){
  try {
    const [y,m,d] = iso.split('-').map(n=>parseInt(n,10));
    const dt = new Date(Date.UTC(y, (m-1)+months, d||1))
    const yy = dt.getUTCFullYear(); const mm = String(dt.getUTCMonth()+1).padStart(2,'0'); const dd = String(dt.getUTCDate()).padStart(2,'0')
    return `${yy}-${mm}-${dd}`
  } catch { return iso }
}

// Breakdowns
export async function listBreakdowns(req: Request, res: Response){
  const q = listBreakdownsSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { equipmentId, status, from, to, page = 1, limit = 200 } = q.data
  const criteria: any = {}
  if (equipmentId) criteria.equipmentId = equipmentId
  if (status) criteria.status = status
  if (from || to) criteria.reportedAt = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  const docs = await HospitalEquipmentBreakdown.find(criteria).sort({ reportedAt: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await HospitalEquipmentBreakdown.countDocuments(criteria)
  res.json({ items: docs, total, page, limit })
}

export async function createBreakdown(req: Request, res: Response){
  const data = createBreakdownSchema.parse(req.body)
  const row = await HospitalEquipmentBreakdown.create(data)
  // Optionally set equipment status to UnderMaintenance when opening
  try {
    const eq = await HospitalEquipment.findById(data.equipmentId)
    if (eq && data.status === 'Open'){
      eq.status = 'UnderMaintenance' as any
      await eq.save()
    }
  } catch {}
  res.status(201).json({ breakdown: row })
}

export async function updateBreakdown(req: Request, res: Response){
  const id = req.params.id
  const patch = updateBreakdownSchema.parse(req.body)
  const row = await HospitalEquipmentBreakdown.findByIdAndUpdate(id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Breakdown not found' })
  // If closed and equipment was under maintenance, set back to Working (conservative)
  try {
    if (row.status === 'Closed'){
      const eq = await HospitalEquipment.findById(row.equipmentId)
      if (eq && eq.status === 'UnderMaintenance'){
        eq.status = 'Working' as any
        await eq.save()
      }
    }
  } catch {}
  res.json({ breakdown: row })
}

// Condemnations
export async function listCondemnations(req: Request, res: Response){
  const q = listCondemnationsSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { equipmentId, status, from, to, page = 1, limit = 200 } = q.data
  const criteria: any = {}
  if (equipmentId) criteria.equipmentId = equipmentId
  if (status) criteria.status = status
  if (from || to) criteria.proposedAt = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  const docs = await HospitalEquipmentCondemnation.find(criteria).sort({ proposedAt: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await HospitalEquipmentCondemnation.countDocuments(criteria)
  res.json({ items: docs, total, page, limit })
}

export async function createCondemnation(req: Request, res: Response){
  const data = createCondemnationSchema.parse(req.body)
  const row = await HospitalEquipmentCondemnation.create(data)
  // If approved/disposed, set equipment status to Condemned
  try {
    const eq = await HospitalEquipment.findById(data.equipmentId)
    if (eq && (data.status === 'Approved' || data.status === 'Disposed')){
      eq.status = 'Condemned' as any
      await eq.save()
    }
  } catch {}
  res.status(201).json({ condemnation: row })
}

export async function updateCondemnation(req: Request, res: Response){
  const id = req.params.id
  const patch = updateCondemnationSchema.parse(req.body)
  const row = await HospitalEquipmentCondemnation.findByIdAndUpdate(id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Condemnation not found' })
  try {
    if (row.status === 'Approved' || row.status === 'Disposed'){
      const eq = await HospitalEquipment.findById(row.equipmentId)
      if (eq){ eq.status = 'Condemned' as any; await eq.save() }
    }
  } catch {}
  res.json({ condemnation: row })
}

// KPIs & Reports
export async function kpis(req: Request, res: Response){
  const q = kpiQuerySchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { from, to } = q.data
  // Define range in YYYY-MM-DD string space
  const range: any = (field: string) => (from || to) ? ({ [field]: { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }}) : {}

  // PPM compliance: performed in range / due in range
  const duePpmCount = await HospitalEquipment.countDocuments({ ...range('nextPpmDue') })
  const ppmDoneCount = await HospitalEquipmentPPM.countDocuments({ ...range('performedAt') })
  const ppmCompliance = duePpmCount ? (ppmDoneCount / duePpmCount) : 1

  // Calibration compliance
  const dueCalibCount = await HospitalEquipment.countDocuments({ ...range('nextCalibDue'), requiresCalibration: true })
  const calibDoneCount = await HospitalEquipmentCalibration.countDocuments({ ...range('performedAt') })
  const calibrationCompliance = dueCalibCount ? (calibDoneCount / dueCalibCount) : 1

  // Breakdown MTBF and Downtime%
  const bdCriteria: any = {}
  if (from || to) bdCriteria.reportedAt = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  const breakdowns = await HospitalEquipmentBreakdown.find(bdCriteria).lean()
  const byEq = new Map<string, any[]>()
  for (const b of breakdowns){
    const k = String(b.equipmentId)
    if (!byEq.has(k)) byEq.set(k, [])
    byEq.get(k)!.push(b)
  }
  let intervals: number[] = []
  let downtimeDays = 0
  for (const arr of byEq.values()){
    arr.sort((a:any,b:any)=> String(a.reportedAt).localeCompare(String(b.reportedAt)))
    for (let i=1;i<arr.length;i++){
      const prev = new Date(arr[i-1].reportedAt as any)
      const curr = new Date(arr[i].reportedAt as any)
      const diff = (curr.getTime()-prev.getTime())/(1000*3600*24)
      if (isFinite(diff) && diff>0) intervals.push(diff)
    }
  }
  for (const b of breakdowns){
    if (b.reportedAt && b.restoredAt){
      const a = new Date(b.reportedAt as any), c = new Date(b.restoredAt as any)
      const diff = (c.getTime()-a.getTime())/(1000*3600*24)
      if (isFinite(diff) && diff>0) downtimeDays += diff
    }
  }
  const daysInRange = (()=>{ if (!from || !to) return 0; const a=new Date(from), b=new Date(to); return Math.max(1, (b.getTime()-a.getTime())/(1000*3600*24)+1) })()
  const mtbfDays = intervals.length ? (intervals.reduce((x,y)=>x+y,0)/intervals.length) : null
  const downtimePercent = daysInRange? (downtimeDays / daysInRange) : null

  res.json({
    ppm: { due: duePpmCount, done: ppmDoneCount, compliance: ppmCompliance },
    calibration: { due: dueCalibCount, done: calibDoneCount, compliance: calibrationCompliance },
    breakdowns: { count: breakdowns.length, mtbfDays, downtimeDays, downtimePercent },
  })
}

export async function list(req: Request, res: Response){
  const q = listEquipmentSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { q: search, category, status, departmentId, from, to, page = 1, limit = 200 } = q.data
  const criteria: any = {}
  if (category) criteria.category = category
  if (status) criteria.status = status
  if (departmentId) criteria.locationDepartmentId = departmentId
  if (from || to) criteria.purchaseDate = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  if (search){
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    criteria.$or = [ 'name','code','category','make','model','serialNo' ].map(k => ({ [k]: rx }))
  }
  const docs = await HospitalEquipment.find(criteria)
    .sort({ createdAt: -1 })
    .skip((page-1)*limit)
    .limit(limit)
    .lean()
  const total = await HospitalEquipment.countDocuments(criteria)
  res.json({ items: docs, total, page, limit })
}

export async function create(req: Request, res: Response){
  const data = createEquipmentSchema.parse(req.body)
  const body: any = { ...data }
  // Auto-compute due dates
  if (!body.nextPpmDue && body.ppmFrequencyMonths && (body.installDate || body.purchaseDate)){
    body.nextPpmDue = addMonths(String(body.installDate || body.purchaseDate), Number(body.ppmFrequencyMonths))
  }
  if (!body.nextCalibDue && body.requiresCalibration && body.calibFrequencyMonths && (body.installDate || body.purchaseDate)){
    body.nextCalibDue = addMonths(String(body.installDate || body.purchaseDate), Number(body.calibFrequencyMonths))
  }
  const row = await HospitalEquipment.create(body)
  res.status(201).json({ equipment: row })
}

export async function update(req: Request, res: Response){
  const id = req.params.id
  const patch = updateEquipmentSchema.parse(req.body)
  const row = await HospitalEquipment.findByIdAndUpdate(id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Equipment not found' })
  res.json({ equipment: row })
}

export async function remove(req: Request, res: Response){
  const id = req.params.id
  const row = await HospitalEquipment.findByIdAndDelete(id)
  if (!row) return res.status(404).json({ error: 'Equipment not found' })
  res.json({ ok: true })
}

export async function listPPM(req: Request, res: Response){
  const q = listPPMSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { equipmentId, from, to, page = 1, limit = 200 } = q.data
  const criteria: any = {}
  if (equipmentId) criteria.equipmentId = equipmentId
  if (from || to) criteria.performedAt = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  const docs = await HospitalEquipmentPPM.find(criteria).sort({ performedAt: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await HospitalEquipmentPPM.countDocuments(criteria)
  res.json({ items: docs, total, page, limit })
}

export async function createPPM(req: Request, res: Response){
  const data = createPPMSchema.parse(req.body)
  const row = await HospitalEquipmentPPM.create(data)
  // Update equipment last/next
  try {
    const eq = await HospitalEquipment.findById(data.equipmentId)
    if (eq){
      eq.lastPpmDoneAt = data.performedAt as any
      if (data.nextDue) eq.nextPpmDue = data.nextDue as any
      else if (eq.ppmFrequencyMonths && data.performedAt){
        eq.nextPpmDue = addMonths(String(data.performedAt), Number(eq.ppmFrequencyMonths)) as any
      }
      await eq.save()
    }
  } catch {}
  res.status(201).json({ ppm: row })
}

export async function listCalibration(req: Request, res: Response){
  const q = listCalibrationSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { equipmentId, from, to, page = 1, limit = 200 } = q.data
  const criteria: any = {}
  if (equipmentId) criteria.equipmentId = equipmentId
  if (from || to) criteria.performedAt = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  const docs = await HospitalEquipmentCalibration.find(criteria).sort({ performedAt: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await HospitalEquipmentCalibration.countDocuments(criteria)
  res.json({ items: docs, total, page, limit })
}

export async function createCalibration(req: Request, res: Response){
  const data = createCalibrationSchema.parse(req.body)
  const row = await HospitalEquipmentCalibration.create(data)
  // Update equipment last/next
  try {
    const eq = await HospitalEquipment.findById(data.equipmentId)
    if (eq){
      eq.lastCalibDoneAt = data.performedAt as any
      if (data.nextDue) eq.nextCalibDue = data.nextDue as any
      else if (eq.calibFrequencyMonths && data.performedAt){
        eq.nextCalibDue = addMonths(String(data.performedAt), Number(eq.calibFrequencyMonths)) as any
      }
      await eq.save()
    }
  } catch {}
  res.status(201).json({ calibration: row })
}

export async function duePPM(req: Request, res: Response){
  const q = equipmentDueSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { from, to } = q.data
  const criteria: any = {}
  if (from || to) {
    criteria.nextPpmDue = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  } else {
    // Default: list equipment that has a due PPM date defined
    criteria.nextPpmDue = { $exists: true, $ne: null }
  }
  const items = await HospitalEquipment.find(criteria).sort({ nextPpmDue: 1 }).lean()
  res.json({ items })
}

export async function dueCalibration(req: Request, res: Response){
  const q = equipmentDueSchema.safeParse(req.query)
  if (!q.success) return res.status(400).json({ error: 'Invalid query' })
  const { from, to } = q.data
  const criteria: any = { }
  if (from || to) {
    criteria.nextCalibDue = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  } else {
    // Default: list equipment requiring calibration with a due date defined
    criteria.nextCalibDue = { $exists: true, $ne: null }
  }
  const items = await HospitalEquipment.find(criteria).sort({ nextCalibDue: 1 }).lean()
  res.json({ items })
}
