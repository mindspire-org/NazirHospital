import { Request, Response } from 'express'
import { LabOrder } from '../models/Order'
import { LabExpense } from '../models/Expense'
import { LabPurchase } from '../models/Purchase'

function parseDateOnly(s?: string){
  if (!s) return undefined
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d
}

function rangeFromQuery(q: any){
  const now = new Date()
  const defTo = new Date(now)
  defTo.setHours(23,59,59,999)
  const defFrom = new Date(now)
  defFrom.setDate(defFrom.getDate()-6)
  defFrom.setHours(0,0,0,0)
  const from = parseDateOnly(q.from) || defFrom
  const to = parseDateOnly(q.to) || defTo
  to.setHours(23,59,59,999)
  return { from, to }
}

function monthBounds(date = new Date()){
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth()+1, 0)
  end.setHours(23,59,59,999)
  return { start, end }
}

export async function summary(req: Request, res: Response){
  const { from, to } = rangeFromQuery(req.query)

  const [ordersInRange, expensesInRange, purchasesAll] = await Promise.all([
    LabOrder.find({ createdAt: { $gte: from, $lte: to } }).select('createdAt tests net status').lean(),
    LabExpense.find({}).lean(), // we'll filter by date below since it's a string
    LabPurchase.find({}).lean(), // filter by string date like expenses
  ])

  const totalOrders = ordersInRange.length
  const totalTests = ordersInRange.reduce((s:any,o:any)=> s + (Array.isArray(o.tests)? o.tests.length : 0), 0)
  const totalRevenue = ordersInRange.reduce((s:any,o:any)=> s + Number(o.net||0), 0)
  const pendingResults = ordersInRange.reduce((s:any,o:any)=> s + (o.status==='received' ? 1 : 0), 0)
  const approvedResults = ordersInRange.reduce((s:any,o:any)=> s + (o.status==='completed' ? 1 : 0), 0)

  // Daily revenue breakdown
  const fmt = (d: Date)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const revByDay = new Map<string, number>()
  ordersInRange.forEach(o=>{
    const d = new Date(o.createdAt as any)
    const key = fmt(d)
    revByDay.set(key, (revByDay.get(key)||0) + Number(o.net||0))
  })
  // ensure every day in range present with 0
  for (let d = new Date(from); d <= to; d = new Date(d.getTime()+24*60*60*1000)){
    const key = fmt(d)
    if (!revByDay.has(key)) revByDay.set(key, 0)
  }
  const dailyRevenue = Array.from(revByDay.entries()).sort((a,b)=> a[0]<b[0]? -1 : 1).map(([date,value])=>({ date, value }))

  // Expenses filter by date string
  const expFromTo = expensesInRange.filter(e=>{
    const d = parseDateOnly((e as any).date)
    return !!d && d >= from && d <= to
  })
  const totalExpenses = expFromTo.reduce((s:any,e:any)=> s + Number(e.amount||0), 0)

  // Purchases filter by date string
  const purFromTo = purchasesAll.filter(p=>{
    const d = parseDateOnly((p as any).date)
    return !!d && d >= from && d <= to
  })
  const totalPurchases = purFromTo.length
  const totalPurchasesAmount = purFromTo.reduce((s:any,p:any)=> s + Number((p.totals?.net ?? p.totalAmount) || 0), 0)

  res.json({
    from: from.toISOString(),
    to: to.toISOString(),
    totalTests,
    totalOrders,
    totalExpenses: Number(totalExpenses.toFixed(2)),
    totalRevenue: Number(totalRevenue.toFixed(2)),
    pendingResults,
    approvedResults,
    totalPurchases,
    totalPurchasesAmount: Number(totalPurchasesAmount.toFixed(2)),
    dailyRevenue,
    comparison: [
      { label: 'Revenue', value: Number(totalRevenue.toFixed(2)) },
      { label: 'Expenses', value: Number(totalExpenses.toFixed(2)) },
      { label: 'Purchases', value: Number(totalPurchasesAmount.toFixed(2)) },
    ],
  })
}
