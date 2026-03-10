import { useEffect, useMemo, useState } from 'react'
import { diagnosticApi, labApi } from '../../utils/api'
import { DollarSign, Activity, CheckCircle, Clock, Bell, Building2, Wallet, TrendingUp, Search } from 'lucide-react'
import { fmt12 } from '../../utils/timeFormat'

function money(n: any){
  const v = Number(n || 0)
  return `PKR ${Math.round(v).toLocaleString()}`
}

function badgeTone(type: 'cash' | 'corporate'){
  return type === 'corporate'
    ? 'bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:ring-violet-800'
    : 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'
}
export default function Diagnostic_Dashboard(){
  const [tokensToday, setTokensToday] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [returnedCount, setReturnedCount] = useState(0)
  const [revenueTotal, setRevenueTotal] = useState(0)
  const [revenueCash, setRevenueCash] = useState(0)
  const [revenueCorporateCopay, setRevenueCorporateCopay] = useState(0)
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
  const isFiltered = !!(from || to || fromTime || toTime || filterShiftId)

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
        const [rangeOrders, weeklyOrders] = await Promise.all([
          diagnosticApi.listOrders({ from: effectiveWindow.from, to: effectiveWindow.to, page: 1, limit: 500 }) as any,
          diagnosticApi.listOrders({ from: effectiveWindow.from, to: effectiveWindow.to, page: 1, limit: 1000 }) as any,
        ])
        if (!mounted) return
        setTokensToday(Number(rangeOrders?.total || (rangeOrders?.items||[]).length || 0))
        let rev = 0, revCash = 0, revCorp = 0, pending = 0, completed = 0, returned = 0
        const ordersArr = Array.isArray(rangeOrders?.items) ? rangeOrders.items : []
        for (const o of ordersArr){
          const net = Number(o?.net || 0)
          rev += net
          const isCorp = Boolean(o?.corporateId) || String(o?.billingType||'') === 'corporate'
          if (isCorp) revCorp += net
          else revCash += net
          const items = Array.isArray(o?.items) ? o.items : []
          for (const it of items){
            if (it?.status === 'completed') completed++
            else if (it?.status === 'returned') returned++
            else pending++
          }
        }
        setRevenueTotal(rev)
        setRevenueCash(revCash)
        setRevenueCorporateCopay(revCorp)
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
        setTokensToday(0); setRevenueTotal(0); setRevenueCash(0); setRevenueCorporateCopay(0); setPendingCount(0); setCompletedCount(0); setReturnedCount(0); setRecentSales([]); setWeeklyLabels([]); setWeeklyTotals([])
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
  const statusTotal = Math.max(0, pendingCount + completedCount + returnedCount)
  const cards = [
    { title: 'Total Revenue', value: money(revenueTotal), hint: 'Cash + Corporate co-pay', tone: 'border-emerald-200 dark:border-emerald-900/40', bg: 'bg-emerald-50/70 dark:bg-slate-900', icon: DollarSign },
    { title: 'Cash Revenue', value: money(revenueCash), hint: 'Cash tokens only', tone: 'border-sky-200 dark:border-slate-800', bg: 'bg-sky-50/70 dark:bg-slate-900', icon: Wallet },
    { title: 'Corporate Co-pay', value: money(revenueCorporateCopay), hint: 'Corporate tokens (co-pay only)', tone: 'border-violet-200 dark:border-violet-900/40', bg: 'bg-violet-50/70 dark:bg-slate-900', icon: Building2 },
    { title: isFiltered ? 'Tokens (range)' : "Today's Tokens", value: String(tokensToday), hint: 'Tokens created', tone: 'border-indigo-200 dark:border-slate-800', bg: 'bg-indigo-50/70 dark:bg-slate-900', icon: Activity },
    { title: 'Completed', value: String(completedCount), hint: statusTotal ? `${Math.round((completedCount/statusTotal)*100)}%` : '—', tone: 'border-emerald-200 dark:border-slate-800', bg: 'bg-emerald-50/50 dark:bg-slate-900', icon: CheckCircle },
    { title: 'Pending', value: String(pendingCount), hint: statusTotal ? `${Math.round((pendingCount/statusTotal)*100)}%` : '—', tone: 'border-amber-200 dark:border-slate-800', bg: 'bg-amber-50/60 dark:bg-slate-900', icon: Clock },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Diagnostic Dashboard</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isFiltered ? 'Showing filtered results' : 'Showing today\'s overview'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <TrendingUp className="h-3.5 w-3.5" />
            Window: {String(effectiveWindow.from).slice(0,10)} → {String(effectiveWindow.to).slice(0,10)}
          </div>
        </div>
      </div>

      {/* Filters (global) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            <Search className="h-4 w-4" />
            Filters
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">From</div>
              <input type="date" value={from} onChange={e=> setFrom(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">To</div>
              <input type="date" value={to} onChange={e=> setTo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">From Time</div>
              <input type="time" value={fromTime} onChange={e=> setFromTime(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">To Time</div>
              <input type="time" value={toTime} onChange={e=> setToTime(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">Shift</div>
              <select value={filterShiftId} onChange={e=> setFilterShiftId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <option value="">All Shifts</option>
                {shifts.map(s=> <option key={s.id} value={s.id}>{s.name} ({fmt12(s.start)}-{fmt12(s.end)})</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={()=>{ setFrom(''); setTo(''); setFromTime(''); setToTime(''); setFilterShiftId('') }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Reset</button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map(({ title, value, hint, tone, bg, icon: Icon }: any) => (
          <div key={title} className={`rounded-2xl border ${tone} ${bg} p-4 shadow-sm`}> 
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</div>
                <div className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{value}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shift-wise Cash removed; global filters above apply to all widgets */}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Weekly Sales</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Net (cash + co-pay)</div>
          </div>
          <WeeklyBars data={weeklyTotals} labels={weeklyLabels} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200"><Bell className="h-4 w-4"/> Recent Activity</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Last 5</div>
          </div>
          <ul className="space-y-2 text-sm">
            {recentSales.map((o:any, idx:number)=>{
              const isCorp = Boolean(o?.corporateId) || String(o?.billingType||'') === 'corporate'
              const bt: 'cash' | 'corporate' = isCorp ? 'corporate' : 'cash'
              return (
                <li key={String(o?._id || idx)} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-medium text-slate-900 dark:text-slate-100">Token {String(o?.tokenNo || '-')}</div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${badgeTone(bt)}`}>
                          {bt === 'corporate' ? <Building2 className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
                          {bt === 'corporate' ? 'Corporate' : 'Cash'}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{o?.patient?.fullName || '—'} • {formatDate(o?.createdAt)}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{Array.isArray(o?.items)? o.items.length : 0} test(s)</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{money(o?.net||0)}</div>
                    </div>
                  </div>
                </li>
              )
            })}
            {recentSales.length===0 && <li className="text-slate-500 dark:text-slate-400">No recent activity</li>}
          </ul>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">Status Breakdown</div>
          <StatusBreakdown pending={pendingCount} completed={completedCount} returned={returnedCount} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">Quick Notes</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Revenue includes:
            <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <div>1) Cash diagnostic tokens</div>
              <div>2) Corporate tokens: only co-pay (if any)</div>
            </div>
          </div>
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

function WeeklyBars({ data, labels }: { data: number[]; labels: string[] }){
  const maxVal = Math.max(0, ...data)
  if (!maxVal) return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex h-44 items-center justify-center text-sm text-slate-500">No data</div>
    </div>
  )

  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxVal * (ticks - i)) / ticks))

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="grid grid-cols-[56px_1fr] gap-3">
        <div className="relative h-44">
          <div className="absolute inset-0 flex flex-col justify-between py-1 text-[11px] text-slate-500 dark:text-slate-400">
            {tickVals.map((t, idx) => (
              <div key={idx} className="leading-none">{t.toLocaleString()}</div>
            ))}
          </div>
        </div>

        <div className="relative h-44">
          <div className="absolute inset-0 flex flex-col justify-between">
            {tickVals.map((_, idx) => (
              <div key={idx} className="h-0 border-t border-dashed border-slate-200 dark:border-slate-800" />
            ))}
          </div>

          <div className="absolute inset-0 flex items-end gap-6 px-4 pb-4">
            {data.map((v, i) => {
              const h = Math.max(2, Math.round((Number(v || 0) / (maxVal || 1)) * 100))
              return (
                <div key={i} className="flex-1">
                  <div className="relative h-36">
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-2xl shadow-sm"
                      style={{
                        height: `${h}%`,
                        background: 'linear-gradient(180deg, rgba(56,189,248,0.95) 0%, rgba(147,197,253,0.55) 100%)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-[56px_1fr] gap-3">
        <div />
        <div className="flex items-center gap-6 px-4">
          {labels.map((lb, i) => (
            <div key={i} className="flex-1 text-center text-[11px] text-slate-500 dark:text-slate-400">{lb}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusBreakdown({ pending, completed, returned }: { pending: number; completed: number; returned: number }){
  const total = Math.max(0, pending + completed + returned)
  if (!total) return (<div className="flex h-16 items-center justify-center text-sm text-slate-500">No data</div>)
  const pPct = Math.max(0, Math.round((pending/total) * 100))
  const cPct = Math.max(0, Math.round((completed/total) * 100))
  const rPct = Math.max(0, 100 - pPct - cPct)
  return (
    <div className="space-y-3">
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="flex h-full w-full">
          <div style={{ width: `${cPct}%` }} className="h-full bg-emerald-300" />
          <div style={{ width: `${pPct}%` }} className="h-full bg-amber-300" />
          <div style={{ width: `${rPct}%` }} className="h-full bg-rose-300" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
          <div className="text-slate-500 dark:text-slate-400">Completed</div>
          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{completed} ({cPct}%)</div>
        </div>
        <div className="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
          <div className="text-slate-500 dark:text-slate-400">Pending</div>
          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{pending} ({pPct}%)</div>
        </div>
        <div className="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
          <div className="text-slate-500 dark:text-slate-400">Returned</div>
          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{returned} ({rPct}%)</div>
        </div>
      </div>
    </div>
  )
}
