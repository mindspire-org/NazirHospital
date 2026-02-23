import { useEffect, useMemo, useState } from 'react'
import { labApi } from '../../utils/api'

export default function Lab_Reports() {
  const today = new Date()
  const lastWeek = new Date(today.getTime() - 6*24*60*60*1000)
  const iso = (d: Date)=> d.toISOString().slice(0,10)
  const [from, setFrom] = useState(iso(lastWeek))
  const [to, setTo] = useState(iso(today))
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<any>({})
  const [dailyRevenue, setDailyRevenue] = useState<Array<{ date: string; value: number }>>([])
  const [comparison, setComparison] = useState<Array<{ label: string; value: number }>>([])
  const [invStats, setInvStats] = useState<any>(null)
  const [shifts, setShifts] = useState<Array<{ id: string; name: string; start: string; end: string }>>([])
  const [filterShiftId, setFilterShiftId] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')

  // Compute effective window for global filters: time overrides shift; shift applies when single day
  const effectiveWindow = useMemo(()=>{
    try{
      if (fromTime && toTime){
        return { from: `${from}T${fromTime}:00`, to: `${to}T${toTime}:59` }
      }
      if (filterShiftId && from === to){
        const sh = shifts.find(s=>s.id===filterShiftId)
        const win = getShiftWindow(from, sh)
        if (win){
          const f = new Date(win.start.getTime() - (win.start.getTimezoneOffset()*60000)).toISOString().slice(0,19)
          const t = new Date(win.end.getTime() - (win.end.getTimezoneOffset()*60000)).toISOString().slice(0,19)
          return { from: f, to: t }
        }
      }
    } catch {}
    return { from, to }
  }, [from, to, fromTime, toTime, filterShiftId, shifts])

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      setLoading(true)
      try{
        const [res, inv]: any = await Promise.all([
          labApi.reportsSummary({ from: effectiveWindow.from, to: effectiveWindow.to }),
          labApi.inventorySummary({ limit: 1 }),
        ])
        if (!mounted) return
        setSummary(res || {})
        setDailyRevenue(res?.dailyRevenue || [])
        setComparison(res?.comparison || [])
        setInvStats(inv?.stats || null)
      }catch(e){ console.error(e); setSummary({}); setDailyRevenue([]); setComparison([]); setInvStats(null) }
      finally { setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [tick, effectiveWindow.from, effectiveWindow.to])

  const maxRev = Math.max(...dailyRevenue.map(d => d.value), 1)
  const maxComp = Math.max(...comparison.map(d => d.value), 1)

  // Load shifts once
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const res: any = await labApi.listShifts()
        if (!mounted) return
        const arr = (res?.items || res || []).map((x:any)=> ({ id: String(x._id||x.id), name: x.name, start: x.start, end: x.end }))
        setShifts(arr)
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  function getShiftWindow(dateStr: string, sh?: { start: string; end: string }){
    try{
      if (!sh) return null
      const [y,m,d] = dateStr.split('-').map(n=>parseInt(n,10))
      const [shh,smm] = String(sh.start||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const [ehh,emm] = String(sh.end||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const start = new Date(y, m-1, d, shh||0, smm||0, 0)
      let end = new Date(y, m-1, d, ehh||0, emm||0, 0)
      if (end <= start) end = new Date(end.getTime() + 24*60*60*1000)
      return { start, end }
    } catch { return null }
  }

  function fmt12(hhmm: string): string {
    try{
      if (!hhmm) return ''
      const s = String(hhmm).trim()
      if (/[ap]m/i.test(s)){
        const mm = s.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i)
        if (mm){
          const h = Math.max(1, Math.min(12, parseInt(mm[1],10) || 12))
          return `${String(h).padStart(2,'0')}:${mm[2]} ${mm[3].toUpperCase()}`
        }
        return s.replace(/(am|pm)/i, (m)=>m.toUpperCase())
      }
      const parts = s.split(':')
      if (parts.length < 2) return s
      const h = parseInt(parts[0],10)
      const m = parts[1].slice(0,2)
      if (isNaN(h)) return s
      const am = h < 12
      const h12 = (h % 12) || 12
      return `${String(h12).padStart(2,'0')}:${m} ${am ? 'AM' : 'PM'}`
    } catch { return hhmm }
  }

  

  const apply = () => setTick(t => t + 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100">Lab Summary Report</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">From</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">To</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">From Time (optional)</label>
              <input type="time" value={fromTime} onChange={e=>setFromTime(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">To Time (optional)</label>
              <input type="time" value={toTime} onChange={e=>setToTime(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </div>
          </div>
          <div className="flex items-end">
            <div className="flex flex-wrap items-center gap-2">
              <select value={filterShiftId} onChange={e=>setFilterShiftId(e.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">All Shifts</option>
                {shifts.map(s=> <option key={s.id} value={s.id}>{s.name} ({fmt12(s.start)}-{fmt12(s.end)})</option>)}
              </select>
              <button onClick={apply} className="btn">Apply</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard title="Total Tests" value={loading? '…' : `${summary.totalTests||0}`} bg="bg-sky-50" border="border-sky-200" />
        <SummaryCard title="Total Purchase Amount" value={loading? '…' : `PKR ${(summary.totalPurchasesAmount||0).toLocaleString()}`} bg="bg-emerald-50" border="border-emerald-200" />
        <SummaryCard title="Total Expenses" value={loading? '…' : `PKR ${(summary.totalExpenses||0).toLocaleString()}`} bg="bg-rose-50" border="border-rose-200" />
        <SummaryCard title="Total Revenue" value={loading? '…' : `PKR ${(summary.totalRevenue||0).toLocaleString()}`} bg="bg-indigo-50" border="border-indigo-200" />
        <SummaryCard title="Pending Results" value={loading? '…' : `${summary.pendingResults||0}`} bg="bg-cyan-50" border="border-cyan-200" />
        <SummaryCard title="Stock Value" value={loading? '…' : `PKR ${(invStats?.stockSaleValue||0).toLocaleString()}`} bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard title="Low Stock Items" value={loading? '…' : `${invStats?.lowStockCount||0}`} bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard title="Expiring Soon" value={loading? '…' : `${invStats?.expiringSoonCount||0}`} bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard title="Out of Stock" value={loading? '…' : `${invStats?.outOfStockCount||0}`} bg="bg-rose-50" border="border-rose-200" />
      </div>

      {/* Shift-wise Cash removed; global filters above apply to all widgets */}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-800">Daily Revenue</div>
          <div className="h-48 w-full rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="flex h-full items-end gap-3">
              {dailyRevenue.map(d => (
                <div key={d.date} className="flex-1 h-full flex flex-col items-center justify-end">
                  <div
                    className="mx-auto w-6 rounded-t-md bg-sky-500"
                    style={{ height: `${Math.max(8, (d.value/maxRev)*100)}%` }}
                    title={`${d.date.slice(0,10)} — PKR ${d.value.toLocaleString()}`}
                  />
                  <div className="mt-2 text-center text-xs text-slate-600">{d.date.slice(0,10)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-800">Comparison: Revenue, Expenses, Purchases</div>
          <div className="h-48 w-full rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="flex h-full items-end gap-6 justify-center">
              {comparison.map(d => (
                <div key={d.label} className="text-center h-full flex flex-col justify-end">
                  <div
                    className="mx-auto w-10 rounded-t-md bg-emerald-500"
                    style={{ height: `${Math.max(8, (d.value/maxComp)*100)}%` }}
                    title={`${d.label} — PKR ${d.value.toLocaleString()}`}
                  />
                  <div className="mt-2 text-xs text-slate-600">{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, bg, border }: { title: string; value: string; bg: string; border: string }) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4`}>
      <div className="text-xs font-medium text-slate-600">{title}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  )
}
