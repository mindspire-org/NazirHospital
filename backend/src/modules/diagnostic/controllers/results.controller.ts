import { Request, Response } from 'express'
import { DiagnosticResult } from '../models/Result'
import { DiagnosticOrder } from '../models/Order'
import { DiagnosticAuditLog } from '../models/AuditLog'
import jwt from 'jsonwebtoken'
import { env } from '../../../config/env'
import { resultCreateSchema, resultQuerySchema, resultUpdateSchema } from '../validators/result'

function getActor(req: Request){
  try {
    const auth = String(req.headers['authorization']||'')
    const token = auth.startsWith('Bearer ')? auth.slice(7) : ''
    if (!token) return {}
    const payload: any = jwt.verify(token, env.JWT_SECRET)
    return { actorId: String(payload?.sub||''), actorUsername: String(payload?.username||'') }
  } catch { return {} }
}

export async function list(req: Request, res: Response){
  const parsed = resultQuerySchema.safeParse(req.query)
  const { orderId, testId, status, q, from, to, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (orderId) filter.orderId = orderId
  if (testId) filter.testId = testId
  if (status) filter.status = status
  if (q){
    const rx = new RegExp(String(q), 'i')
    filter.$or = [ { 'patient.fullName': rx }, { tokenNo: rx }, { testName: rx } ]
  }
  if (from || to){
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.createdAt.$lte = end }
  }
  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    DiagnosticResult.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    DiagnosticResult.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = resultCreateSchema.parse(req.body)
  const doc = await DiagnosticResult.create(data)
  try {
    // Mark corresponding order item as completed
    const order: any = await DiagnosticOrder.findById(data.orderId)
    if (order){
      if (!Array.isArray(order.items)) order.items = []
      const item = order.items.find((x: any)=> String(x.testId) === String(data.testId))
      if (item){ item.status = 'completed'; item.reportingTime = data.reportedAt || new Date().toISOString() }
      // Derive order.status
      const statuses = (order.items || []).map((i: any)=> i.status)
      if (statuses.includes('returned')) order.status = 'returned'
      else if (statuses.length>0 && statuses.every((s: any)=> s==='completed')) order.status = 'completed'
      else order.status = 'received'
      await order.save()
    }
  } catch {}
  try {
    const actor = getActor(req) as any
    await DiagnosticAuditLog.create({
      action: 'result.create',
      subjectType: 'Result',
      subjectId: String((doc as any)?._id||''),
      message: `Created result for ${data.testName} (${data.testId}) token ${data.tokenNo||'-'}`,
      data: { orderId: data.orderId, testId: data.testId, status: data.status||'draft' },
      actorId: actor.actorId,
      actorUsername: actor.actorUsername,
      ip: req.ip,
      userAgent: String(req.headers['user-agent']||''),
    })
  } catch {}
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const patch = resultUpdateSchema.parse(req.body)
  const doc = await DiagnosticResult.findByIdAndUpdate(id, { $set: patch }, { new: true })
  if (!doc) return res.status(404).json({ message: 'Result not found' })
  try {
    // If result finalized, ensure order item is completed
    if (patch.status === 'final' || doc.status === 'final'){
      const order: any = await DiagnosticOrder.findById(doc.orderId)
      if (order){
        if (!Array.isArray(order.items)) order.items = []
        const item = order.items.find((x: any)=> String(x.testId) === String(doc.testId))
        if (item){ item.status = 'completed'; item.reportingTime = patch.reportedAt || doc.reportedAt || new Date().toISOString() }
        const statuses = (order.items || []).map((i: any)=> i.status)
        if (statuses.includes('returned')) order.status = 'returned'
        else if (statuses.length>0 && statuses.every((s: any)=> s==='completed')) order.status = 'completed'
        else order.status = 'received'
        await order.save()
      }
    }
  } catch {}
  try {
    const actor = getActor(req) as any
    const action = (patch.status === 'final' || doc.status === 'final') ? 'result.finalize' : 'result.update'
    await DiagnosticAuditLog.create({
      action,
      subjectType: 'Result',
      subjectId: String((doc as any)?._id||''),
      message: `${action} for ${doc.testName} (${doc.testId}) token ${doc.tokenNo||'-'}`,
      data: { patch },
      actorId: actor.actorId,
      actorUsername: actor.actorUsername,
      ip: req.ip,
      userAgent: String(req.headers['user-agent']||''),
    })
  } catch {}
  res.json(doc)
}

export async function get(req: Request, res: Response){
  const { id } = req.params
  const doc = await DiagnosticResult.findById(id).lean()
  if (!doc) return res.status(404).json({ message: 'Result not found' })
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  const doc = await DiagnosticResult.findByIdAndDelete(id)
  if (!doc) return res.status(404).json({ message: 'Result not found' })
  try {
    // Revert corresponding order item back to received
    const order: any = await DiagnosticOrder.findById(doc.orderId)
    if (order){
      if (!Array.isArray(order.items)) order.items = []
      const item = order.items.find((x: any)=> String(x.testId) === String(doc.testId))
      if (item){ item.status = 'received'; item.reportingTime = undefined }
      const statuses = (order.items || []).map((i: any)=> i.status)
      if (statuses.includes('returned')) order.status = 'returned'
      else if (statuses.length>0 && statuses.every((s: any)=> s==='completed')) order.status = 'completed'
      else order.status = 'received'
      await order.save()
    }
  } catch {}
  try {
    const actor = getActor(req) as any
    await DiagnosticAuditLog.create({
      action: 'result.delete',
      subjectType: 'Result',
      subjectId: String((doc as any)?._id||''),
      message: `Deleted result for ${doc.testName} (${doc.testId}) token ${doc.tokenNo||'-'}`,
      data: { orderId: doc.orderId, testId: doc.testId },
      actorId: actor.actorId,
      actorUsername: actor.actorUsername,
      ip: req.ip,
      userAgent: String(req.headers['user-agent']||''),
    })
  } catch {}
  res.json({ success: true })
}
