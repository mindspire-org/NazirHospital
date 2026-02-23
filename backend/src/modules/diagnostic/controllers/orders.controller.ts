import { Request, Response } from 'express'

import { DiagnosticOrder } from '../models/Order'

import { DiagnosticCounter } from '../models/Counter'

import { DiagnosticAuditLog } from '../models/AuditLog'

import jwt from 'jsonwebtoken'

import { env } from '../../../config/env'

import { diagnosticOrderCreateSchema, diagnosticOrderQuerySchema, diagnosticOrderTrackUpdateSchema, diagnosticOrderUpdateSchema } from '../validators/order'

import { DiagnosticTest } from '../models/Test'

import { resolveTestPrice } from '../../corporate/utils/price'

import { CorporateTransaction } from '../../corporate/models/Transaction'

import { CorporateCompany } from '../../corporate/models/Company'

import { LabPatient } from '../../lab/models/Patient'

import { postFbrInvoiceViaSDC } from '../../hospital/services/fbr'



function getActor(req: Request){

  try {

    const auth = String(req.headers['authorization']||'')

    const token = auth.startsWith('Bearer ')? auth.slice(7) : ''

    if (!token) return {}

    const payload: any = jwt.verify(token, env.JWT_SECRET)

    return { actorId: String(payload?.sub||''), actorUsername: String(payload?.username||'') }

  } catch { return {} }

}



function getDatePartsInTimeZone(d: Date, timeZone: string){

  const parts = new Intl.DateTimeFormat('en-CA', {

    timeZone,

    year: 'numeric',

    month: '2-digit',

    day: '2-digit',

  }).formatToParts(d)

  const year = parts.find(p => p.type === 'year')?.value || String(d.getFullYear())

  const month = parts.find(p => p.type === 'month')?.value || String(d.getMonth() + 1).padStart(2, '0')

  const day = parts.find(p => p.type === 'day')?.value || String(d.getDate()).padStart(2, '0')

  return { year, month, day }

}



async function nextToken(date?: Date){

  const d = date || new Date()

  const tz = String((env as any).DIAGNOSTIC_TOKEN_TZ || 'Asia/Karachi')

  const { year: y, month: m, day } = getDatePartsInTimeZone(d, tz)

  const key = 'diagnostic_token_global'

  let c: any = await (DiagnosticCounter as any).findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })

  // If counter was (re)created, align it with existing tokens so we don't restart from 001.
  if (c && Number(c.seq) === 1) {
    try {
      const docs: any[] = await DiagnosticOrder.find({ tokenNo: { $regex: /^\d+$/ } }).select('tokenNo').lean()
      const maxSeq = (docs || []).reduce((mx: number, o: any) => {
        try {
          const n = parseInt(String(o?.tokenNo || ''), 10)
          return isNaN(n) ? mx : Math.max(mx, n)
        } catch {
          return mx
        }
      }, 0)
      if (maxSeq > 0) {
        c = await (DiagnosticCounter as any).findOneAndUpdate({ _id: key, seq: 1 }, { $set: { seq: maxSeq + 1 } }, { new: true }) || c
      }
    } catch {}
  }

  const seq = String((c?.seq) || 1)

  return seq.padStart(3,'0')

}



export async function list(req: Request, res: Response){

  const parsed = diagnosticOrderQuerySchema.safeParse(req.query)

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

    DiagnosticOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),

    DiagnosticOrder.countDocuments(filter),

  ])

  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))

  res.json({ items, total, page: pg, totalPages })

}



export async function create(req: Request, res: Response){

  const data = diagnosticOrderCreateSchema.parse(req.body)

  if ((data as any).corporateId){

    const comp = await CorporateCompany.findById(String((data as any).corporateId)).lean()

    if (!comp) return res.status(400).json({ error: 'Invalid corporateId' })

    if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })

  }

  const tokenNo = (data as any).tokenNo || await nextToken(new Date())

  const items = (data.tests || []).map(tid => ({ testId: tid, status: 'received' as const }))

  // Always sync snapshot MRN from shared patient table (Lab_Patient)
  try {
    const pid = String((data as any)?.patientId || '').trim()
    if (pid) {
      const pat: any = await LabPatient.findById(pid).select('mrn').lean()
      if (pat?.mrn) {
        ;(data as any).patient = { ...(data as any).patient, mrn: String(pat.mrn) }
      }
    }
  } catch {}

  const doc: any = await DiagnosticOrder.create({ ...data, items, tokenNo, status: 'received' })

  // FBR fiscalization (Diagnostic is paid at order creation)
  try {
    const payload = {
      tokenNo,
      patient: (data as any).patient || undefined,
      patientName: (data as any)?.patient?.fullName || undefined,
      phone: (data as any)?.patient?.phone || undefined,
      cnic: (data as any)?.patient?.cnic || undefined,
      lines: Array.isArray((data as any).tests)
        ? (await DiagnosticTest.find({ _id: { $in: (data as any).tests } }).select('name price').lean()).map((t: any)=> ({ name: t?.name || 'Test', qty: 1, unitPrice: Number(t?.price || 0) }))
        : [],
      subtotal: Number((data as any).subtotal || (data as any).total || 0),
      discount: Number((data as any).discount || 0),
      net: Number((data as any).net || (data as any).total || 0),
    }
    const amount = Number((payload as any).net || (payload as any).subtotal || 0)
    const r: any = await postFbrInvoiceViaSDC({ module: 'DIAGNOSTIC_ORDER_CREATE', invoiceType: 'DIAGNOSTIC' as any, refId: String(doc._id), amount, payload })
    if (r) {
      ;(doc as any).fbrInvoiceNo = r.fbrInvoiceNo
      ;(doc as any).fbrQrCode = r.qrCode
      ;(doc as any).fbrStatus = r.status
      ;(doc as any).fbrMode = r.mode
      ;(doc as any).fbrError = r.error
      try { await doc.save() } catch {}
    }
  } catch {}

  try {

    const actor = getActor(req) as any

    await DiagnosticAuditLog.create({

      action: 'order.create',

      subjectType: 'Order',

      subjectId: String((doc as any)?._id||''),

      message: `Created order ${tokenNo} for ${data?.patient?.fullName || '-'}`,

      data: { tests: data.tests||[], tokenNo },

      actorId: actor.actorId,

      actorUsername: actor.actorUsername,

      ip: req.ip,

      userAgent: String(req.headers['user-agent']||''),

    })

  } catch {}

  // Corporate: create ledger lines per diagnostic test

  try {

    const companyId = (data as any).corporateId ? String((data as any).corporateId) : ''

    if (companyId){

      const testIds = Array.isArray(data.tests)? data.tests : []

      const tests = await DiagnosticTest.find({ _id: { $in: testIds } }).lean()

      const map = new Map<string, any>(tests.map(t => [String((t as any)._id), t]))

      const dateIso = new Date().toISOString().slice(0,10)

      for (const tid of testIds){

        const t = map.get(String(tid))

        const listPrice = Number(t?.price || 0)

        const corp = await resolveTestPrice({ companyId, scope: 'DIAG', testId: String(tid), defaultPrice: listPrice })

        const baseCorp = Number(corp.price || 0)

        const coPayPct = Math.max(0, Math.min(100, Number((data as any)?.corporateCoPayPercent || 0)))

        const coPayAmt = Math.max(0, baseCorp * (coPayPct/100))

        let net = Math.max(0, baseCorp - coPayAmt)

        const cap = Number((data as any)?.corporateCoverageCap || 0) || 0

        if (cap > 0){

          try {

            const existing = await CorporateTransaction.find({ refType: 'diag_order', refId: String((doc as any)?._id || '') }).select('netToCorporate').lean()

            const used = (existing || []).reduce((s: number, tx: any)=> s + Number(tx?.netToCorporate||0), 0)

            const remaining = Math.max(0, cap - used)

            net = Math.max(0, Math.min(net, remaining))

          } catch {}

        }

        await CorporateTransaction.create({

          companyId,

          patientMrn: String((data as any)?.patient?.mrn || ''),

          patientName: String((data as any)?.patient?.fullName || ''),

          serviceType: 'DIAG',

          refType: 'diag_order',

          refId: String((doc as any)?._id || ''),

          itemRef: String(tid),

          dateIso,

          description: `Diagnostic Test${t?.name?`: ${t.name}`:''}`,

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

  } catch (e) { console.warn('Failed to create corporate transactions for Diagnostic order', e) }

  res.status(201).json(doc)

}



export async function updateTrack(req: Request, res: Response){

  const { id } = req.params

  const patch = diagnosticOrderTrackUpdateSchema.parse(req.body)

  const doc = await DiagnosticOrder.findByIdAndUpdate(id, { $set: patch }, { new: true })

  if (!doc) return res.status(404).json({ message: 'Order not found' })

  // Corporate: if whole order returned, create reversals for all items

  try {

    if ((patch as any).status === 'returned'){

      const existing: any[] = await CorporateTransaction.find({ refType: 'diag_order', refId: String(id), status: { $ne: 'reversed' } }).lean()

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

            description: `Reversal: ${tx.description || 'Diagnostic Test'}`,

            qty: tx.qty,

            unitPrice: -Math.abs(Number(tx.unitPrice||0)),

            corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),

            coPay: -Math.abs(Number(tx.coPay||0)),

            netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),

            corpRuleId: tx.corpRuleId,

            status: 'accrued',

            reversalOf: String(tx._id),

          })

        } catch (e) { console.warn('Failed to create corporate reversal for Diagnostic order', e) }

      }

    }

  } catch (e) { console.warn('Corporate reversal (diagnostic updateTrack) failed', e) }

  try {

    const actor = getActor(req) as any

    await DiagnosticAuditLog.create({

      action: 'order.track.update',

      subjectType: 'Order',

      subjectId: String((doc as any)?._id||''),

      message: `Updated order tracking ${doc.tokenNo || id}`,

      data: { patch },

      actorId: actor.actorId,

      actorUsername: actor.actorUsername,

      ip: req.ip,

      userAgent: String(req.headers['user-agent']||''),

    })

  } catch {}

  res.json(doc)

}



export async function remove(req: Request, res: Response){

  const { id } = req.params

  const doc = await DiagnosticOrder.findByIdAndDelete(id)

  if (!doc) return res.status(404).json({ message: 'Order not found' })

  // Corporate: reversal for all items of this order

  try {

    const existing: any[] = await CorporateTransaction.find({ refType: 'diag_order', refId: String(id), status: { $ne: 'reversed' } }).lean()

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

          description: `Reversal: ${tx.description || 'Diagnostic Test'}`,

          qty: tx.qty,

          unitPrice: -Math.abs(Number(tx.unitPrice||0)),

          corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),

          coPay: -Math.abs(Number(tx.coPay||0)),

          netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),

          corpRuleId: tx.corpRuleId,

          status: 'accrued',

          reversalOf: String(tx._id),

        })

      } catch (e) { console.warn('Failed to create corporate reversal for Diagnostic order (delete)', e) }

    }

  } catch (e) { console.warn('Corporate reversal lookup failed for Diagnostic order delete', e) }

  try {

    const actor = getActor(req) as any

    await DiagnosticAuditLog.create({

      action: 'order.delete',

      subjectType: 'Order',

      subjectId: String((doc as any)?._id||id),

      message: `Deleted order ${doc?.tokenNo || id}`,

      data: { tests: (doc as any)?.tests || [] },

      actorId: actor.actorId,

      actorUsername: actor.actorUsername,

      ip: req.ip,

      userAgent: String(req.headers['user-agent']||''),

    })

  } catch {}

  res.json({ success: true })

}



export async function update(req: Request, res: Response){

  const { id } = req.params

  const patch = diagnosticOrderUpdateSchema.parse(req.body)

  const doc = await DiagnosticOrder.findByIdAndUpdate(id, { $set: patch }, { new: true })

  if (!doc) return res.status(404).json({ message: 'Order not found' })

  try {

    const actor = getActor(req) as any

    await DiagnosticAuditLog.create({

      action: 'order.update',

      subjectType: 'Order',

      subjectId: String((doc as any)?._id||id),

      message: `Updated order ${doc?.tokenNo || id}`,

      data: { patch },

      actorId: actor.actorId,

      actorUsername: actor.actorUsername,

      ip: req.ip,

      userAgent: String(req.headers['user-agent']||''),

    })

  } catch {}

  res.json(doc)

}



// Update a single test item (per-test tracking) within an order

export async function updateItemTrack(req: Request, res: Response){

  const { id, testId } = req.params as any

  const patch = diagnosticOrderTrackUpdateSchema.parse(req.body)

  const doc: any = await DiagnosticOrder.findById(id)

  if (!doc) return res.status(404).json({ message: 'Order not found' })

  if (!Array.isArray(doc.items)) doc.items = []

  let item = doc.items.find((x: any)=> String(x.testId) === String(testId))

  if (!item){

    item = { testId: String(testId), status: 'received' }

    doc.items.push(item)

    if (!Array.isArray(doc.tests)) doc.tests = []

    if (!doc.tests.includes(String(testId))) doc.tests.push(String(testId))

  }

  if (patch.sampleTime !== undefined) item.sampleTime = patch.sampleTime

  if (patch.reportingTime !== undefined) item.reportingTime = patch.reportingTime

  if (patch.status !== undefined) item.status = patch.status

  // Derive order.status from items (if any returned -> returned; else if all completed -> completed; else received)

  const statuses = (doc.items || []).map((i: any)=> i.status)

  if (statuses.includes('returned')) doc.status = 'returned'

  else if (statuses.length>0 && statuses.every((s: any)=> s==='completed')) doc.status = 'completed'

  else doc.status = 'received'

  // Keep returnedTests in sync with items

  doc.returnedTests = (doc.items || []).filter((i: any)=> i.status === 'returned').map((i: any)=> String(i.testId))

  await doc.save()

  // Corporate: if this item is returned, create a reversal only for that test

  try {

    if ((patch as any).status === 'returned'){

      const existing: any[] = await CorporateTransaction.find({ refType: 'diag_order', refId: String(id), itemRef: String(testId), status: { $ne: 'reversed' } }).lean()

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

            description: `Reversal: ${tx.description || 'Diagnostic Test'}`,

            qty: tx.qty,

            unitPrice: -Math.abs(Number(tx.unitPrice||0)),

            corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),

            coPay: -Math.abs(Number(tx.coPay||0)),

            netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),

            corpRuleId: tx.corpRuleId,

            status: 'accrued',

            reversalOf: String(tx._id),

          })

        } catch (e) { console.warn('Failed to create corporate reversal for Diagnostic item', e) }

      }

    }

  } catch (e) { console.warn('Corporate reversal (diagnostic updateItemTrack) failed', e) }

  try {

    const actor = getActor(req) as any

    await DiagnosticAuditLog.create({

      action: 'order.item.update',

      subjectType: 'Order',

      subjectId: String((doc as any)?._id||id),

      message: `Updated item ${testId} for order ${doc?.tokenNo || id}`,

      data: { testId, patch, orderStatus: doc.status },

      actorId: actor.actorId,

      actorUsername: actor.actorUsername,

      ip: req.ip,

      userAgent: String(req.headers['user-agent']||''),

    })

  } catch {}

  res.json(doc)

}



// Remove a single test item from an order

export async function removeItem(req: Request, res: Response){

  const { id, testId } = req.params as any

  const doc: any = await DiagnosticOrder.findById(id)

  if (!doc) return res.status(404).json({ message: 'Order not found' })

  const beforeCount = (doc.items || []).length

  doc.items = (doc.items || []).filter((x: any)=> String(x.testId) !== String(testId))

  doc.tests = (doc.tests || []).filter((t: any)=> String(t) !== String(testId))

  if ((doc.tests || []).length === 0){

    await doc.deleteOne()

    try {

      const actor = getActor(req) as any

      await DiagnosticAuditLog.create({

        action: 'order.item.remove',

        subjectType: 'Order',

        subjectId: String(id),

        message: `Removed item ${testId} and deleted order ${doc?.tokenNo || id}`,

        data: { testId, deletedOrder: true },

        actorId: actor.actorId,

        actorUsername: actor.actorUsername,

        ip: req.ip,

        userAgent: String(req.headers['user-agent']||''),

      })

    } catch {}

    return res.json({ success: true, deletedOrder: true })

  }

  if (beforeCount !== (doc.items||[]).length){

    const statuses = (doc.items || []).map((i: any)=> i.status)

    if (statuses.includes('returned')) doc.status = 'returned'

    else if (statuses.length>0 && statuses.every((s: any)=> s==='completed')) doc.status = 'completed'

    else doc.status = 'received'

  }

  // Sync returnedTests after removal

  doc.returnedTests = (doc.items || []).filter((i: any)=> i.status === 'returned').map((i: any)=> String(i.testId))

  await doc.save()

  // Corporate: reversal for this specific item removal

  try {

    const existing: any[] = await CorporateTransaction.find({ refType: 'diag_order', refId: String(id), itemRef: String(testId), status: { $ne: 'reversed' } }).lean()

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

          description: `Reversal: ${tx.description || 'Diagnostic Test'}`,

          qty: tx.qty,

          unitPrice: -Math.abs(Number(tx.unitPrice||0)),

          corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),

          coPay: -Math.abs(Number(tx.coPay||0)),

          netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),

          corpRuleId: tx.corpRuleId,

          status: 'accrued',

          reversalOf: String(tx._id),

        })

      } catch (e) { console.warn('Failed to create corporate reversal for Diagnostic item removal', e) }

    }

  } catch (e) { console.warn('Corporate reversal (diagnostic removeItem) failed', e) }

  try {

    const actor = getActor(req) as any

    await DiagnosticAuditLog.create({

      action: 'order.item.remove',

      subjectType: 'Order',

      subjectId: String(id),

      message: `Removed item ${testId} from order ${doc?.tokenNo || id}`,

      data: { testId, orderStatus: doc.status },

      actorId: actor.actorId,

      actorUsername: actor.actorUsername,

      ip: req.ip,

      userAgent: String(req.headers['user-agent']||''),

    })

  } catch {}

  res.json({ success: true, order: doc })

}

