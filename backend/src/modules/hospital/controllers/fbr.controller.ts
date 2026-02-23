import { Request, Response } from 'express'
import { FbrSettings } from '../models/FbrSettings'
import { fbrSettingsUpdateSchema } from '../validators/fbr'
import { encryptText } from '../../../common/utils/crypto'
import { HospitalAuditLog } from '../models/AuditLog'
import { MockFbrLog } from '../models/MockFbrLog'
import { postFbrInvoice } from '../services/fbr'
import mongoose from 'mongoose'

export async function getSettings(req: Request, res: Response) {
  const { hospitalId = '', branchCode = '' } = (req.query || {}) as any
  const filter: any = {
    hospitalId: String(hospitalId || ''),
    branchCode: String(branchCode || '')
  }

  let s: any = await FbrSettings.findOne(filter).lean()
  if (!s) {
    s = (await FbrSettings.create({ hospitalId: hospitalId || undefined, branchCode: branchCode || undefined })).toObject()
  }

  res.json({
    hospitalId: s.hospitalId || '',
    branchCode: s.branchCode || '',
    isEnabled: !!s.isEnabled,
    environment: (s.environment === 'production' ? 'production' : 'sandbox'),
    ntn: s.ntn || '',
    strn: s.strn || '',
    posId: s.posId || '',
    sandboxPosId: s.sandboxPosId || '',
    sandboxCode: s.sandboxCode || '',
    productionPosId: s.productionPosId || '',
    productionCode: s.productionCode || '',
    businessName: s.businessName || '',
    invoicePrefix: s.invoicePrefix || 'HSP',
    applyModules: Array.isArray(s.applyModules) ? s.applyModules : ['OPD', 'PHARMACY', 'LAB', 'IPD', 'DIAGNOSTIC', 'AESTHETIC'],
    hasToken: Boolean(s.apiTokenEncrypted),
    apiTokenMasked: s.apiTokenEncrypted ? '********' : '',
    updatedAt: (s as any).updatedAt,
  })
}

export async function listLogs(req: Request, res: Response) {
  const { q, module, status, environment, invoiceType, from, to, page = '1', limit = '20' } = (req.query || {}) as any
  const filter: any = {}
  if (q) {
    const rx = new RegExp(String(q), 'i')
    filter.$or = [{ fbrInvoiceNo: rx }, { refId: rx }, { module: rx }, { invoiceType: rx }]
  }
  if (module) {
    // Backend field 'module' is granular (e.g. pharmacy-sale), 'invoiceType' is category (e.g. PHARMACY)
    // We support filtering by either.
    filter.$or = [{ module: String(module) }, { invoiceType: String(module).toUpperCase() }]
  }
  if (status) filter.status = String(status)
  if (environment) filter.fbrMode = String(environment).toUpperCase()
  if (invoiceType) filter.invoiceType = String(invoiceType).toUpperCase()
  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(String(from))
    if (to) { const end = new Date(String(to)); end.setHours(23, 59, 59, 999); filter.createdAt.$lte = end }
  }
  const l = Math.max(1, Math.min(200, Number(limit || 20)))
  const p = Math.max(1, Number(page || 1))
  const skip = (p - 1) * l
  const [items, total] = await Promise.all([
    (MockFbrLog as any).find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
    (MockFbrLog as any).countDocuments(filter),
  ])
  res.json({ items, total, page: p, totalPages: Math.max(1, Math.ceil((total || 0) / l)) })
}

export async function summary(req: Request, res: Response) {
  const { module, status, environment, invoiceType, from, to } = (req.query || {}) as any
  const match: any = {}
  if (module) match.module = String(module)
  if (status) match.status = String(status)
  if (environment) match.fbrMode = String(environment).toUpperCase()
  if (invoiceType) match.invoiceType = String(invoiceType).toUpperCase()
  if (from || to) {
    match.createdAt = {}
    if (from) match.createdAt.$gte = new Date(String(from))
    if (to) { const end = new Date(String(to)); end.setHours(23, 59, 59, 999); match.createdAt.$lte = end }
  }
  const daily = await (MockFbrLog as any).aggregate([
    { $match: match },
    { $project: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amount: { $ifNull: ['$amount', 0] }, status: 1 } },
    { $group: { _id: '$date', count: { $sum: 1 }, amount: { $sum: '$amount' }, success: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } } } },
    { $sort: { _id: 1 } },
  ])
  const totals = await (MockFbrLog as any).aggregate([
    { $match: match },
    { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: { $ifNull: ['$amount', 0] } }, success: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } } } },
  ])
  const t = totals[0] || { count: 0, amount: 0, success: 0, failed: 0 }
  res.json({ daily, totals: { invoices: t.count || 0, amount: Number((t.amount || 0).toFixed?.(2) || (t.amount || 0)), success: t.success || 0, failed: t.failed || 0 } })
}

export async function retry(req: Request, res: Response) {
  const { id } = req.params
  if (!mongoose.isValidObjectId(String(id))) return res.status(400).json({ error: 'Invalid id' })
  const s: any = await FbrSettings.findOne({}).lean()
  if (!s || s.environment !== 'sandbox') return res.status(403).json({ error: 'Retry allowed only in sandbox environment' })
  const log: any = await (MockFbrLog as any).findById(id).lean()
  if (!log) return res.status(404).json({ error: 'Log not found' })
  const r = await postFbrInvoice({ module: log.module, invoiceType: (log.invoiceType || 'OPD') as any, refId: String(log.refId), amount: Number(log.amount || 0), payload: log.payload })
  res.json({ retried: !!r, fbr: r })
}

export async function upsertSettings(req: Request, res: Response) {
  const body = fbrSettingsUpdateSchema.parse(req.body)
  const hospitalId = String((body as any).hospitalId || (req.query as any)?.hospitalId || '')
  const branchCode = String((body as any).branchCode || (req.query as any)?.branchCode || '')

  const $set: any = {}
  if (typeof body.isEnabled === 'boolean') $set.isEnabled = body.isEnabled
  if (body.environment) $set.environment = body.environment
  if (body.ntn !== undefined) $set.ntn = body.ntn
  if (body.strn !== undefined) $set.strn = body.strn
  if (body.posId !== undefined) $set.posId = body.posId
  if ((body as any).sandboxPosId !== undefined) $set.sandboxPosId = (body as any).sandboxPosId
  if ((body as any).sandboxCode !== undefined) $set.sandboxCode = (body as any).sandboxCode
  if ((body as any).productionPosId !== undefined) $set.productionPosId = (body as any).productionPosId
  if ((body as any).productionCode !== undefined) $set.productionCode = (body as any).productionCode
  if (body.businessName !== undefined) $set.businessName = body.businessName
  if (body.invoicePrefix !== undefined) $set.invoicePrefix = body.invoicePrefix
  if (body.applyModules) $set.applyModules = body.applyModules
  if (body.apiToken !== undefined && body.apiToken !== '') {
    $set.apiTokenEncrypted = encryptText(body.apiToken)
  }
  if (hospitalId !== undefined) $set.hospitalId = hospitalId
  if (branchCode !== undefined) $set.branchCode = branchCode

  const s: any = await FbrSettings.findOneAndUpdate(
    { hospitalId: hospitalId, branchCode: branchCode },
    { $set: $set },
    { new: true, upsert: true }
  )

  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await HospitalAuditLog.create({
      actor,
      action: 'fbr_settings_update',
      label: 'FBR_SETTINGS_UPDATE',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: 'FBR settings updated',
    })
  } catch { }

  res.json({
    hospitalId: s.hospitalId || '',
    branchCode: s.branchCode || '',
    isEnabled: !!s.isEnabled,
    environment: (s.environment === 'production' ? 'production' : 'sandbox'),
    ntn: s.ntn || '',
    strn: s.strn || '',
    posId: s.posId || '',
    sandboxPosId: s.sandboxPosId || '',
    sandboxCode: s.sandboxCode || '',
    productionPosId: s.productionPosId || '',
    productionCode: s.productionCode || '',
    businessName: s.businessName || '',
    invoicePrefix: s.invoicePrefix || 'HSP',
    applyModules: Array.isArray(s.applyModules) ? s.applyModules : ['OPD', 'PHARMACY', 'LAB', 'IPD', 'DIAGNOSTIC', 'AESTHETIC'],
    hasToken: Boolean(s.apiTokenEncrypted),
    apiTokenMasked: s.apiTokenEncrypted ? '********' : '',
    updatedAt: (s as any).updatedAt,
  })
}
