import { Request, Response } from 'express'
import { CorporateRateRule } from '../models/RateRule'

export async function list(req: Request, res: Response){
  const { companyId, scope } = req.query as any
  const q: any = {}
  if (companyId) q.companyId = companyId
  if (scope) q.scope = scope
  const rows = await CorporateRateRule.find(q).sort({ priority: 1, createdAt: 1 }).lean()
  res.json({ rules: rows })
}

export async function create(req: Request, res: Response){
  const data = req.body || {}
  if (!data.companyId) return res.status(400).json({ error: 'companyId is required' })
  if (!data.scope) return res.status(400).json({ error: 'scope is required' })
  if (!data.ruleType) return res.status(400).json({ error: 'ruleType is required' })
  if (!data.mode) return res.status(400).json({ error: 'mode is required' })
  if (data.value == null) return res.status(400).json({ error: 'value is required' })
  const doc = await CorporateRateRule.create({
    companyId: data.companyId,
    scope: data.scope,
    ruleType: data.ruleType,
    refId: data.refId,
    visitType: data.visitType || 'any',
    mode: data.mode,
    value: Number(data.value),
    priority: Number(data.priority || 100),
    effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
    effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
    active: data.active !== false,
  })
  res.status(201).json({ rule: doc })
}

export async function update(req: Request, res: Response){
  const { id } = req.params as any
  const data = req.body || {}
  const patch: any = { ...data }
  if (data.effectiveFrom) patch.effectiveFrom = new Date(data.effectiveFrom)
  if (data.effectiveTo) patch.effectiveTo = new Date(data.effectiveTo)
  const doc = await CorporateRateRule.findByIdAndUpdate(id, patch, { new: true })
  if (!doc) return res.status(404).json({ error: 'Rule not found' })
  res.json({ rule: doc })
}

export async function remove(req: Request, res: Response){
  const { id } = req.params as any
  await CorporateRateRule.findByIdAndDelete(id)
  res.json({ ok: true })
}
