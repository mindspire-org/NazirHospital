import { CorporateRateRule } from '../models/RateRule'

function inRange(now: Date, from?: Date, to?: Date){
  if (from && now < from) return false
  if (to && now > to) return false
  return true
}

export async function resolveTestPrice(params: { companyId: string; scope: 'LAB'|'DIAG'; testId: string; defaultPrice: number }){
  const { companyId, scope, testId } = params
  const defaultPrice = Number(params.defaultPrice || 0)
  const now = new Date()
  const rules = await CorporateRateRule.find({ companyId, scope, active: true }).lean()
  const candidates = (rules || []).filter(r => inRange(now, r.effectiveFrom as any, r.effectiveTo as any))
  const byTest = candidates.filter(r => r.ruleType === 'test' && r.refId && String(r.refId) === String(testId))
  const byDefault = candidates.filter(r => r.ruleType === 'default')
  const sort = (a: any,b: any)=> (Number(a.priority||100) - Number(b.priority||100))
  const pick = (arr: any[])=> arr.sort(sort)[0]
  const rule = pick(byTest) || pick(byDefault)
  if (!rule) return { price: defaultPrice, appliedRuleId: '', mode: 'none', value: 0 }
  let price = defaultPrice
  if (rule.mode === 'fixedPrice') price = Number(rule.value || 0)
  else if (rule.mode === 'percentDiscount') price = Math.max(0, defaultPrice * (1 - Number(rule.value||0)/100))
  else if (rule.mode === 'fixedDiscount') price = Math.max(0, defaultPrice - Number(rule.value||0))
  return { price, appliedRuleId: String((rule as any)._id || ''), mode: rule.mode, value: Number(rule.value||0) }
}

export async function resolveIPDPrice(params: { companyId: string; itemType: 'bed'|'procedure'|'medication'|'service'; refId?: string; bedCategory?: string; defaultPrice: number }){
  const { companyId, itemType } = params
  const defaultPrice = Number(params.defaultPrice || 0)
  const now = new Date()
  const rules = await CorporateRateRule.find({ companyId, scope: 'IPD', active: true }).lean()
  const candidates = (rules || []).filter(r => inRange(now, r.effectiveFrom as any, r.effectiveTo as any))
  let match: any[] = []
  if (itemType === 'bed' && params.bedCategory){
    match = candidates.filter(r => r.ruleType === 'bedCategory' && r.refId && String(r.refId) === String(params.bedCategory))
  } else if (itemType === 'procedure' && params.refId){
    match = candidates.filter(r => r.ruleType === 'procedure' && r.refId && String(r.refId) === String(params.refId))
  } else if ((itemType === 'service' || itemType === 'medication') && params.refId){
    match = candidates.filter(r => r.ruleType === 'service' && r.refId && String(r.refId) === String(params.refId))
  }
  const byDefault = candidates.filter(r => r.ruleType === 'default')
  const sort = (a: any,b: any)=> (Number(a.priority||100) - Number(b.priority||100))
  const pick = (arr: any[])=> arr.sort(sort)[0]
  const rule = pick(match) || pick(byDefault)
  if (!rule) return { price: defaultPrice, appliedRuleId: '', mode: 'none', value: 0 }
  let price = defaultPrice
  if (rule.mode === 'fixedPrice') price = Number(rule.value || 0)
  else if (rule.mode === 'percentDiscount') price = Math.max(0, defaultPrice * (1 - Number(rule.value||0)/100))
  else if (rule.mode === 'fixedDiscount') price = Math.max(0, defaultPrice - Number(rule.value||0))
  return { price, appliedRuleId: String((rule as any)._id || ''), mode: rule.mode, value: Number(rule.value||0) }
}

export async function resolveOPDPrice(params: { companyId: string; departmentId?: string; doctorId?: string; visitType?: 'new'|'followup'; defaultPrice: number }){
  const { companyId, departmentId, doctorId } = params
  const visitType = params.visitType || 'new'
  const defaultPrice = Number(params.defaultPrice || 0)
  const now = new Date()
  const rules = await CorporateRateRule.find({ companyId, scope: 'OPD', active: true }).lean()
  const candidates = (rules || []).filter(r => inRange(now, r.effectiveFrom as any, r.effectiveTo as any) && (r.visitType === 'any' || r.visitType === visitType))
  const byDoctor = candidates.filter(r => r.ruleType === 'doctor' && r.refId && doctorId && String(r.refId) === String(doctorId))
  const byDept = candidates.filter(r => r.ruleType === 'department' && r.refId && departmentId && String(r.refId) === String(departmentId))
  const byDefault = candidates.filter(r => r.ruleType === 'default')
  const sort = (a: any,b: any)=> (Number(a.priority||100) - Number(b.priority||100))
  const pick = (arr: any[])=> arr.sort(sort)[0]
  const rule = pick(byDoctor) || pick(byDept) || pick(byDefault)
  if (!rule){
    return { price: defaultPrice, appliedRuleId: '', mode: 'none', value: 0 }
  }
  let price = defaultPrice
  if (rule.mode === 'fixedPrice') price = Number(rule.value || 0)
  else if (rule.mode === 'percentDiscount') price = Math.max(0, defaultPrice * (1 - Number(rule.value||0)/100))
  else if (rule.mode === 'fixedDiscount') price = Math.max(0, defaultPrice - Number(rule.value||0))
  return { price, appliedRuleId: String((rule as any)._id || ''), mode: rule.mode, value: Number(rule.value||0) }
}
