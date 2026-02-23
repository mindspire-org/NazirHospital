import { useEffect, useMemo, useState } from 'react'
import { diagnosticApi, labApi } from '../../utils/api'
import { DollarSign, Activity, CheckCircle, RotateCcw, Clock, FlaskConical, Bell } from 'lucide-react'
export default function Diagnostic_Dashboard(){
  const [tokensToday, setTokensToday] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [returnedCount, setReturnedCount] = useState(0)
  const [revenueTotal, setRevenueTotal] = useState(0)
  const [totalTests, setTotalTests] = useState(0)
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [weeklyLabels, setWeeklyLabels] = useState<string[]>([])
  const [weeklyTotals, setWeeklyTotals] = useState<number[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // Global filters
  const [shifts, setShifts] = useState<Array<{ id: string; name: string; start: string; end: string }>>([])
  const [filterShiftId, setFilterShiftId] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')

  const todayStr = useMemo(()=>{
    const d = new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`
  }, [])

  const effFrom = from || todayStr
  const effTo = to || todayStr
  const isFiltered = !!(from || to)

  function getShiftWindow(dateStr: string, sh?: { start: string; end: string }){
    try{
      if (!sh) return null
      const [y,m,d] = (dateStr||'').split('-').map(n=>parseInt(n||'0',10))
      const [shh,smm] = String(sh.start||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const [ehh,emm] = String(sh.end||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const start = new Date(y, (m-1), d, shh||0, smm||0, 0)
      let end = new Date(y, (m-1), d, ehh||0, emm||0, 0)
      if (end <= start) end = new Date(end.getTime() + 24*60*60*1000)
      return { start, end }
    } catch { return null }
  }

  // Effective window: time overrides; if single-day + shift, use shift window
  const effectiveWindow = useMemo(()=>{
    try{
      if (fromTime && toTime){
        return { from: `${effFrom}T${fromTime}:00`, to: `${effTo}T${toTime}:59` }
      }
      if (filterShiftId && effFrom===effTo){
        const sh = shifts.find(s=>s.id===filterShiftId)
        const win = getShiftWindow(effFrom, sh)
        if (win){
          const f = new Date(win.start.getTime() - (win.start.getTimezoneOffset()*60000)).toISOString().slice(0,19)
          const t = new Date(win.end.getTime() - (win.end.getTimezoneOffset()*60000)).toISOString().slice(0,19)
          return { from: f, to: t }
        }
      }
    } catch {}
    return { from: effFrom, to: effTo }
  }, [effFrom, effTo, fromTime, toTime, filterShiftId, shifts])

  

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const [rangeOrders, testsPage, weeklyOrders] = await Promise.all([
          diagnosticApi.listOrders({ from: effectiveWindow.from, to: effectiveWindow.to, page: 1, limit: 500 }) as any,
          diagnosticApi.listTests({ page: 1, limit: 1 }) as any,
          diagnosticApi.listOrders({ from: effectiveWindow.from, to: effectiveWindow.to, page: 1, limit: 1000 }) as any,
        ])
        if (!mounted) return
        setTokensToday(Number(rangeOrders?.total || (rangeOrders?.items||[]).length || 0))
        setTotalTests(Number(testsPage?.total || (Array.isArray(testsPage?.items) ? testsPage.items.length : 0)))
        let rev = 0, pending = 0, completed = 0, returned = 0
        const ordersArr = Array.isArray(rangeOrders?.items) ? rangeOrders.items : []
        for (const o of ordersArr){
          rev += Number(o?.net || 0)
          const items = Array.isArray(o?.items) ? o.items : []
          for (const it of items){
            if (it?.status === 'completed') completed++
            else if (it?.status === 'returned') returned++
            else pending++
          }
        }
        setRevenueTotal(rev)
        setPendingCount(pending)
        setCompletedCount(completed)
        setReturnedCount(returned)

        // Recent Sales (latest 5 by createdAt desc if available order already sorted)
        const weeklyArr = Array.isArray(weeklyOrders?.items) ? weeklyOrders.items : []
        const sorted = [...weeklyArr].sort((a:any,b:any)=> new Date(b?.createdAt||0).getTime() - new Date(a?.createdAt||0).getTime())
        setRecentSales(sorted.slice(0,5))

        // Weekly Sales aggregation (within selected window)
        const makeWeekStart = (d: Date)=>{
          const dd = new Date(d); const day = dd.getDay(); // 0=Sun
          dd.setDate(dd.getDate() - day) // week starts Sunday
          dd.setHours(0,0,0,0)
          return dd
        }
        const startSel = new Date(effectiveWindow.from)
        const endSel = new Date(effectiveWindow.to)
        const buckets: { label: string; start: Date; total: number }[] = []
        // Build buckets from start to end stepping weekly
        let cur = makeWeekStart(startSel)
        while (cur <= endSel){
          const start = new Date(cur)
          const month = start.toLocaleString(undefined, { month: 'short' })
          const label = `Wk ${month} ${String(start.getDate()).padStart(2,'0')}`
          buckets.push({ label, start, total: 0 })
          cur = new Date(start); cur.setDate(cur.getDate() + 7)
        }
        for (const o of weeklyArr){
          const dt = o?.createdAt ? new Date(o.createdAt) : null
          if (!dt) continue
          const w = makeWeekStart(dt)
          // find bucket matching same week start date
          for (const b of buckets){
            if (b.start.getFullYear()===w.getFullYear() && b.start.getMonth()===w.getMonth() && b.start.getDate()===w.getDate()){
              b.total += Number(o?.net||0)
              break
            }
          }
        }
        setWeeklyLabels(buckets.map(b=> b.label))
        setWeeklyTotals(buckets.map(b=> b.total))
      } catch {
        if (!mounted) return
        setTokensToday(0); setRevenueTotal(0); setPendingCount(0); setCompletedCount(0); setReturnedCount(0); setTotalTests(0); setRecentSales([]); setWeeklyLabels([]); setWeeklyTotals([])
      }
    })()
    return ()=>{ mounted = false }
  }, [effectiveWindow.from, effectiveWindow.to, todayStr])

  // Load shifts once (use Lab shifts as canonical for diagnostics)
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const r:any = await labApi.listShifts()
        if (!mounted) return
        const arr = (r?.items || r || []).map((x:any)=> ({ id: String(x._id||x.id), name: x.name, start: x.start, end: x.end }))
        setShifts(arr)
      } catch { setShifts([]) }
      // no shift-wise section; shifts used for global filter
    })()
    return ()=>{ mounted = false }
  }, [todayStr])

  

  // Last 7 days revenue (fixed window)
  const cards = [
    { title: 'Total Revenue', value: `PKR ${Number(revenueTotal||0).toFixed(0)}`, tone: 'border-green-300', bg: 'bg-green-50', icon: DollarSign },
    { title: isFiltered ? 'Tokens (range)' : "Today's Tokens", value: String(tokensToday), tone: 'border-emerald-300', bg: 'bg-emerald-50', icon: Activity },
    { title: 'Completed', value: String(completedCount), tone: 'border-violet-300', bg: 'bg-violet-50', icon: CheckCircle },
    { title: 'Returned', value: String(returnedCount), tone: 'border-rose-300', bg: 'bg-rose-50', icon: RotateCcw },
    { title: 'Pending', value: String(pendingCount), tone: 'border-sky-300', bg: 'bg-sky-50', icon: Clock },
    { title: 'Total Tests', value: String(totalTests), tone: 'border-amber-300', bg: 'bg-amber-50', icon: FlaskConical },
  ]

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h2 className="text-xl font-semibold text-slate-800">Diagnostic Dashboard</h2>

      {/* Filters (global) */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 ">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center gap-2">
            <label className="text-slate-600">From</label>
            <input type="date" value={from} onChange={e=> setFrom(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600">To</label>
            <input type="date" value={to} onChange={e=> setTo(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600 ">From Time</label>
            <input type="time" value={fromTime} onChange={e=> setFromTime(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600">To Time</label>
            <input type="time" value={toTime} onChange={e=> setToTime(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600">Shift</label>
            <select value={filterShiftId} onChange={e=> setFilterShiftId(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1">
              <option value="">All Shifts</option>
              {shifts.map(s=> <option key={s.id} value={s.id}>{s.name} ({s.start}-{s.end})</option>)}
            </select>
          </div>
          <button onClick={()=>{ setFrom(''); setTo(''); setFromTime(''); setToTime(''); setFilterShiftId('') }} className="ml-auto rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50">Reset</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ title, value, tone, bg, icon: Icon }) => (
          <div key={title} className={`rounded-xl border ${tone} p-4 ${bg}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-700">{title}</div>
                <div className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
              </div>
              <div className="rounded-md bg-white/70 p-2 text-slate-700 shadow-sm ">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shift-wise Cash removed; global filters above apply to all widgets */}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2 ">
          <div className="mb-2 text-sm font-medium text-slate-700 ">Weekly Sales</div>
          <MiniBars data={weeklyTotals} labels={weeklyLabels} color="#0ea5e9" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 ">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Bell className="h-4 w-4"/> Recent Sales</div>
          <ul className="space-y-2 text-sm">
            {recentSales.map((o:any, idx:number)=> (
              <li key={String(o?._id || idx)} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                <div>
                  <div className="font-medium text-slate-800 ">{formatDate(o?.createdAt)}</div>
                  <div className="text-xs text-slate-500 ">{Array.isArray(o?.items)? o.items.length : 0} item(s)</div>
                </div>
                <div className="text-right font-semibold text-slate-900 ">Rs {Number(o?.net||0).toFixed(2)}</div>
              </li>
            ))}
            {recentSales.length===0 && <li className="text-slate-500">No recent sales</li>}
          </ul>
        </div>
      </div>

      {/* Recent Sales and Weekly Sales added per request */}
    </div>
  )
}

function formatDate(iso?: string){
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

function MiniBars({ data, labels, color }: { data: number[]; labels: string[]; color: string }){
  const maxVal = Math.max(0, ...data)
  if (!maxVal) return (<div className="flex h-36 items-center justify-center text-sm text-slate-500">No data</div>)
  return (
    <div className="h-36">
      <div className="flex h-full items-end gap-2">
        {data.map((v, i)=>{
          const h = Math.max(2, Math.round((v / (maxVal || 1)) * 100))
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="relative h-28 w-full rounded bg-slate-100">
                <div className="absolute bottom-0 left-0 right-0 rounded-b" style={{ height: `${h}%`, backgroundColor: color }} />
              </div>
              <div className="mt-1 text-[10px] text-slate-500">{labels[i]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
