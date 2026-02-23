import { Request, Response } from 'express'
import { HospitalExpense } from '../models/Expense'
import { FinanceJournal } from '../models/FinanceJournal'
import { HospitalCashSession } from '../models/CashSession'
import { createExpenseSchema, listExpenseSchema } from '../validators/expense'

export async function list(req: Request, res: Response){
  const q = listExpenseSchema.safeParse(req.query)
  const today = new Date().toISOString().slice(0,10)
  const from = q.success && q.data.from ? q.data.from : today
  const to = q.success && q.data.to ? q.data.to : today
  const rows = await HospitalExpense.find({ dateIso: { $gte: from, $lte: to } })
    .populate('departmentId', 'name')
    .sort({ dateIso: -1, createdAt: -1 })
    .lean()
  const normalized = (rows as any[]).map(r => {
    const dep = r.departmentId && typeof r.departmentId === 'object' ? r.departmentId : null
    const departmentName = dep?.name ? String(dep.name) : ''
    const departmentId = dep?._id ? String(dep._id) : (r.departmentId ? String(r.departmentId) : undefined)
    return { ...r, departmentId, departmentName }
  })
  const total = normalized.reduce((s, r) => s + (r.amount || 0), 0)
  res.json({ expenses: normalized, total })
}

export async function create(req: Request, res: Response){
  const data = createExpenseSchema.parse(req.body)
  const actor = String(
    (req as any).user?.name ||
    (req as any).user?.username ||
    (req as any).user?.email ||
    (req as any).user?._id ||
    'system'
  )
  const row = await HospitalExpense.create({ ...data, createdBy: actor })
  // Finance Journal: record expense; if method is Cash, tag sessionId for drawer reconciliation
  try{
    const dateIso = String((row as any)?.dateIso || data.dateIso || new Date().toISOString().slice(0,10))
    const method = String((row as any)?.method || data.method || '').toLowerCase()
    const isCash = method === 'cash'
    let sessionId: string | undefined = undefined
    if (isCash){
      try{
        const userId = String((req as any).user?._id || (req as any).user?.id || (req as any).user?.email || '')
        if (userId){
          const sess: any = await HospitalCashSession.findOne({ status: 'open', userId }).sort({ createdAt: -1 }).lean()
          if (sess) sessionId = String(sess._id)
        }
      } catch {}
    }
    const tags: any = { departmentId: (row as any)?.departmentId ? String((row as any)?.departmentId) : undefined }
    if (sessionId) tags.sessionId = sessionId
    const creditAccount = isCash ? 'CASH' : 'BANK'
    const lines = [
      { account: 'EXPENSE', debit: Number((row as any)?.amount || data.amount || 0), tags },
      { account: creditAccount, credit: Number((row as any)?.amount || data.amount || 0), tags },
    ] as any
    await FinanceJournal.create({ dateIso, refType: 'expense', refId: String((row as any)?._id || ''), memo: (row as any)?.note || (data as any)?.note || 'Expense', lines })
  } catch {}
  res.status(201).json({ expense: row })
}

export async function remove(req: Request, res: Response){
  const id = req.params.id
  const row = await HospitalExpense.findByIdAndDelete(id)
  if (!row) return res.status(404).json({ error: 'Expense not found' })
  res.json({ ok: true })
}
