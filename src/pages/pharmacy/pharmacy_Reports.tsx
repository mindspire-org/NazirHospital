import { useEffect, useMemo, useState } from 'react'
import { pharmacyApi } from '../../utils/api'
import { Download, Printer } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'


export default function Pharmacy_Reports() {
  const todayStr = new Date().toISOString().slice(0,10)
  const startMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10)
  const [from, setFrom] = useState(startMonthStr)
  const [to, setTo] = useState(todayStr)
  const [tick, setTick] = useState(0)
  const [shifts, setShifts] = useState<Array<{ id: string; name: string; start: string; end: string }>>([])
  const [filterShiftId, setFilterShiftId] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')

  type Summary = {
    totalSales: number
    totalPurchases: number
    totalExpenses: number
    totalProfit: number
    monthlyProfit: number
    cashSales: number
    creditSales: number
    thisMonthSales: number
    totalInventory: number
    lowStock: number
    outOfStock: number
    stockValue: number
  }

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const res: any = await pharmacyApi.listShifts()
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
      const [sy, sm, sd] = dateStr.split('-').map(n=>parseInt(n,10))
      const [shh, smm] = String(sh.start||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const [ehh, emm] = String(sh.end||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const start = new Date(sy, (sm-1), sd, shh||0, smm||0, 0)
      let end = new Date(sy, (sm-1), sd, ehh||0, emm||0, 0)
      if (end <= start) end = new Date(end.getTime() + 24*60*60*1000)
      return { start, end }
    } catch { return null }
  }

  // Global effective window: time overrides; if single-day and shift selected, use shift window
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

  function startOfWeek(d: Date) {
    const x = weekStart(d)
    return fmt(x)
  }

  function startOfMonth(d: Date) {
    return fmt(new Date(d.getFullYear(), d.getMonth(), 1))
  }

  const setRangeToday = () => {
    setFrom(todayStr)
    setTo(todayStr)
    setTick(t => t + 1)
  }

  const setRangeThisWeek = () => {
    const d = new Date()
    setFrom(startOfWeek(d))
    setTo(todayStr)
    setTick(t => t + 1)
  }

  const setRangeThisMonth = () => {
    const d = new Date()
    setFrom(startOfMonth(d))
    setTo(todayStr)
    setTick(t => t + 1)
  }

  const downloadTextFile = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const printClosingSheet = () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset='utf-8' />
          <title>Daily Closing Sheet - ${pharmacyName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f8fafc; }
            .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 32px; text-align: center; color: white; }
            .logo { font-size: 28px; font-weight: 900; margin-bottom: 8px; letter-spacing: -0.5px; }
            .pharmacy-name { font-size: 16px; opacity: 0.95; font-weight: 500; }
            .subtitle { font-size: 14px; opacity: 0.85; margin-top: 4px; }
            .content { padding: 32px; }
            .title { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
            .date-range { color: #64748b; font-size: 14px; margin-bottom: 24px; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            .row { display: flex; justify-content: space-between; padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; }
            .row:nth-child(odd) { background: #f8fafc; }
            .row-label { color: #475569; font-size: 15px; }
            .row-value { font-weight: 700; color: #1e293b; font-size: 15px; }
            .highlight { background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color: white; padding: 16px; border-radius: 12px; margin: 16px 0; }
            .highlight .row-label { color: white; opacity: 0.95; font-size: 16px; }
            .highlight .row-value { color: white; font-size: 18px; font-weight: 900; }
            .breakdown { background: #f1f5f9; padding: 16px; border-radius: 12px; margin-top: 16px; }
            .footer { text-align: center; padding: 24px; border-top: 2px solid #e2e8f0; color: #64748b; font-size: 12px; }
            .footer-brand { font-weight: 700; background: linear-gradient(135deg, #0ea5e9, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 14px; margin-bottom: 4px; }
            @media print { body { padding: 0; background: white; } .container { box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">HealthSpire</div>
              <div class="pharmacy-name">${pharmacyName}</div>
              <div class="subtitle">Daily Closing Sheet</div>
            </div>
            <div class="content">
              <div class="title">Financial Summary</div>
              <div class="date-range">Period: ${from} to ${to}</div>
              
              <div class="section">
                <div class="section-title">Revenue & Expenses</div>
                <div class="row">
                  <span class="row-label">Total Sales</span>
                  <span class="row-value">PKR ${summary.totalSales.toLocaleString()}</span>
                </div>
                <div class="row">
                  <span class="row-label">Total Purchases</span>
                  <span class="row-value">PKR ${summary.totalPurchases.toLocaleString()}</span>
                </div>
                <div class="row">
                  <span class="row-label">Total Expenses</span>
                  <span class="row-value">PKR ${summary.totalExpenses.toLocaleString()}</span>
                </div>
              </div>

              <div class="highlight">
                <div class="row" style="margin: 0;">
                  <span class="row-label">Net Profit</span>
                  <span class="row-value">PKR ${summary.totalProfit.toLocaleString()}</span>
                </div>
              </div>

              <div class="breakdown">
                <div class="section-title" style="border-color: #cbd5e1;">Sales Breakdown</div>
                <div class="row" style="background: white;">
                  <span class="row-label">Cash Sales</span>
                  <span class="row-value">PKR ${summary.cashSales.toLocaleString()}</span>
                </div>
                <div class="row" style="background: white;">
                  <span class="row-label">Credit Sales</span>
                  <span class="row-value">PKR ${summary.creditSales.toLocaleString()}</span>
                </div>
                <div class="row" style="background: white;">
                  <span class="row-label">Stock Value</span>
                  <span class="row-value">PKR ${summary.stockValue.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div class="footer">
              <div class="footer-brand">HealthSpire Pharmacy Manegment System</div>
              <div>Generated on ${new Date().toLocaleString()}</div>
            </div>
          </div>
        </body>
      </html>
    `

    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    document.body.appendChild(frame)

    const doc = frame.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
    frame.onload = () => {
      try {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
      } finally {
        setTimeout(() => {
          try { document.body.removeChild(frame) } catch {}
        }, 200)
      }
    }
  }
  const [summary, setSummary] = useState<Summary>({
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    totalProfit: 0,
    monthlyProfit: 0,
    cashSales: 0,
    creditSales: 0,
    thisMonthSales: 0,
    totalInventory: 0,
    lowStock: 0,
    outOfStock: 0,
    stockValue: 0,
  })

  const [weeklySales, setWeeklySales] = useState<Array<{ week: string; value: number }>>([])
  const [comparison, setComparison] = useState<Array<{ label: string; value: number }>>([])
  const [pharmacyName, setPharmacyName] = useState('Pharmacy')
  // Chart theming that reacts to theme toggle
  const [darkTheme, setDarkTheme] = useState<boolean>(
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  )
  useEffect(() => {
    if (typeof document === 'undefined') return
    const el = document.documentElement
    const update = () => setDarkTheme(el.classList.contains('dark'))
    update()
    const obs = new MutationObserver(update)
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  const tickColor = darkTheme ? '#cbd5e1' : '#64748b'
  const gridColor = darkTheme ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.35)'
  const dcsContainer = darkTheme
    ? 'rounded-2xl border-2 border-slate-700 bg-linear-to-br from-slate-900 to-slate-800 p-6 shadow-lg'
    : 'rounded-2xl border-2 border-slate-200 bg-linear-to-br from-white to-sky-50/30 p-6 shadow-lg'
  const innerPanelClass = darkTheme
    ? 'mt-6 rounded-2xl border-2 border-slate-700 bg-slate-800/70 backdrop-blur-sm p-6 shadow-inner'
    : 'mt-6 rounded-2xl border-2 border-slate-200 bg-white/70 backdrop-blur-sm p-6 shadow-inner'
  const rowBg = (light: string) => `rounded-xl ${darkTheme ? 'bg-slate-800' : light} p-4`

  function fmt(d: Date){
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const day = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${day}`
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

  function weekStart(date: Date){
    const d = new Date(date)
    const day = d.getDay() // 0 Sun ... 6 Sat
    const diff = (day === 0 ? -6 : 1 - day) // Monday as start
    d.setDate(d.getDate() + diff)
    d.setHours(0,0,0,0)
    return d
  }

  useEffect(()=>{
    let mounted = true
    async function load(){
      try {
        const dateFrom = String(effectiveWindow.from).slice(0,10)
        const dateTo = String(effectiveWindow.to).slice(0,10)
        const [sales, cash, credit, inv, pur, exp, settings] = await Promise.all([
          pharmacyApi.salesSummary({ from: effectiveWindow.from, to: effectiveWindow.to }),
          pharmacyApi.salesSummary({ payment: 'Cash', from: effectiveWindow.from, to: effectiveWindow.to }),
          pharmacyApi.salesSummary({ payment: 'Credit', from: effectiveWindow.from, to: effectiveWindow.to }),
          pharmacyApi.inventorySummary(),
          pharmacyApi.purchasesSummary({ from: dateFrom, to: dateTo }),
          pharmacyApi.expensesSummary({ from: effectiveWindow.from, to: effectiveWindow.to }),
          pharmacyApi.getSettings().catch(() => ({ pharmacyName: 'Pharmacy' })),
        ])
        if (!mounted) return
        setPharmacyName((settings as any)?.pharmacyName || 'Pharmacy')
        const [sales2, cash2, credit2, inv2, pur2, exp2] = [sales, cash, credit, inv, pur, exp]
        const lastDay = new Date(to)
        const startMonth = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1)
        const monthSales: any = await pharmacyApi.salesSummary({ from: fmt(startMonth), to })

        const totalSales = Number(sales2?.totalAmount || 0)
        const totalPurchases = Number((pur2 as any)?.totalAmount || 0)
        const totalExpenses = Number((exp2 as any)?.totalAmount || 0)
        const totalProfit = Number((totalSales - totalPurchases - totalExpenses).toFixed(2))
        const monthlyProfit = Number((Number(monthSales?.totalProfit || 0)).toFixed(2))
        const cashSales = Number((cash2 as any)?.totalAmount || 0)
        const creditSales = Number((credit2 as any)?.totalAmount || 0)
        const thisMonthSales = Number((monthSales as any)?.totalAmount || 0)
        const stats = (inv2 as any)?.stats || {}
        setSummary({
          totalSales,
          totalPurchases,
          totalExpenses,
          totalProfit,
          monthlyProfit,
          cashSales,
          creditSales,
          thisMonthSales,
          totalInventory: Number(stats?.totalInventoryOnHand || 0),
          lowStock: Number(stats?.lowStockCount || 0),
          outOfStock: Number(stats?.outOfStockCount || 0),
          stockValue: Number(stats?.stockSaleValue || 0),
        })
        setComparison([
          { label: 'Sales', value: totalSales },
          { label: 'Purchases', value: totalPurchases },
          { label: 'Expenses', value: totalExpenses },
        ])
      } catch (e) { console.error(e) }

      try {
        const list: any = await pharmacyApi.listSales({ from: effectiveWindow.from, to: effectiveWindow.to, limit: 500 })
        const dayMap = new Map<string, number>()
        for (const s of (list?.items || [])){
          const d = String(s.datetime || '').slice(0,10)
          dayMap.set(d, (dayMap.get(d) || 0) + Number(s.total || 0))
        }
        // Aggregate to weeks (Mon-Sun)
        const start = new Date(from)
        const end = new Date(to)
        const firstWeek = weekStart(start)
        const weeks: Array<{ week: string; value: number }> = []
        for (let wk = new Date(firstWeek); wk <= end; wk.setDate(wk.getDate()+7)){
          const weekKey = fmt(wk)
          let sum = 0
          for (let i=0;i<7;i++){
            const d = new Date(wk); d.setDate(d.getDate()+i)
            if (d > end) break
            const k = fmt(d)
            sum += Number(dayMap.get(k) || 0)
          }
          weeks.push({ week: weekKey, value: Number(sum.toFixed(2)) })
        }
        if (mounted) setWeeklySales(weeks)
      } catch (e) { console.error(e) }

    }
    load()
    return ()=>{ mounted = false }
  }, [tick, effectiveWindow.from, effectiveWindow.to])

  const maxWeekly = Math.max(...weeklySales.map((d) => d.value), 1)
  const maxComp = Math.max(...comparison.map(d => d.value), 1)

  function formatShort(n: number){
    if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n/1_000).toFixed(1)}k`
    return String(Math.round(n))
  }

  const apply = () => setTick(t => t + 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold text-slate-800">Daily Summary Report</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm text-slate-700">From</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">To</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">From Time (optional)</label>
              <input type="time" value={fromTime} onChange={e=>setFromTime(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">To Time (optional)</label>
              <input type="time" value={toTime} onChange={e=>setToTime(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex items-end">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={setRangeToday} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">Today</button>
              <button type="button" onClick={setRangeThisWeek} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">This Week</button>
              <button type="button" onClick={setRangeThisMonth} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">This Month</button>
              <select value={filterShiftId} onChange={e=>setFilterShiftId(e.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">All Shifts</option>
                {shifts.map(s=> <option key={s.id} value={s.id}>{s.name} ({fmt12(s.start)}-{fmt12(s.end)})</option>)}
              </select>
              <button onClick={apply} className="btn">Apply</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Sales" value={`PKR ${summary.totalSales.toLocaleString(undefined,{maximumFractionDigits:3})}`} bg="bg-emerald-50" border="border-emerald-200" />
        <SummaryCard title="Total Purchases" value={`PKR ${summary.totalPurchases.toLocaleString()}`} bg="bg-sky-50" border="border-sky-200" />
        <SummaryCard title="Total Expenses" value={`PKR ${summary.totalExpenses.toLocaleString()}`} bg="bg-rose-50" border="border-rose-200" />
        <SummaryCard title="Total Profit" value={`PKR ${summary.totalProfit.toLocaleString(undefined,{maximumFractionDigits:3})}`} bg="bg-indigo-50" border="border-indigo-200" />
        <SummaryCard title="Monthly Profit (Gross Margin)" value={`PKR ${summary.monthlyProfit.toLocaleString()}`} bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard title="Cash Sales" value={`PKR ${summary.cashSales.toLocaleString()}`} bg="bg-green-50" border="border-green-200" />
        <SummaryCard title="This Month's Sales" value={`PKR ${summary.thisMonthSales.toLocaleString(undefined,{maximumFractionDigits:3})}`} bg="bg-fuchsia-50" border="border-fuchsia-200" />
        <SummaryCard title="Credit Sales" value={`PKR ${summary.creditSales.toLocaleString()}`} bg="bg-yellow-50" border="border-yellow-200" />
        <SummaryCard title="Total Inventory" value={`PKR ${summary.totalInventory}`} bg="bg-cyan-50" border="border-cyan-200" />
        <SummaryCard title="Low Stock Items" value={`PKR ${summary.lowStock}`} bg="bg-yellow-50" border="border-yellow-200" />
        <SummaryCard title="Out of Stock Items" value={`PKR ${summary.outOfStock}`} bg="bg-rose-50" border="border-rose-200" />
        <SummaryCard title="Total Stock Value" value={`PKR ${summary.stockValue.toLocaleString()}`} bg="bg-teal-50" border="border-teal-200" />
      </div>

      {/* Shift-wise Cash removed; global filters apply above */}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-800">Weekly Sales</div>
          <div className="h-56 w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-3 shadow-sm" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                data={weeklySales.map(d => ({
                  week: `Wk ${new Date(d.week).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}`,
                  value: d.value,
                }))}
                margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="weeklySalesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                    <stop offset="60%" stopColor="#0ea5e9" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: tickColor }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: tickColor }}
                  tickFormatter={(v: number) => formatShort(v)}
                  domain={[0, Math.ceil(maxWeekly * 1.1)]}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(2,132,199,0.08)' }}
                  content={(tp) => {
                    const { active, payload, label } = tp
                    if (!active || !payload?.length) return null
                    const val = Number((payload?.[0] as any)?.value || 0)
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
                        <div className="font-semibold text-slate-800">{String(label ?? '')}</div>
                        <div className="mt-1 text-slate-600">Sales: <span className="font-bold text-sky-700">PKR {val.toLocaleString()}</span></div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="url(#weeklySalesFill)"
                  radius={[12, 12, 8, 8]}
                  stroke="#0ea5e9"
                  strokeOpacity={0.25}
                  isAnimationActive
                  animationDuration={900}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 font-medium text-slate-800">Comparison: Sales, Purchases, Expenses</div>
          <div className="h-56 w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-3 shadow-sm" style={{ minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                data={comparison}
                margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="cmpSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="cmpPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="cmpExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: tickColor }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: tickColor }}
                  tickFormatter={(v: number) => formatShort(v)}
                  domain={[0, Math.ceil(maxComp * 1.1)]}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(15,23,42,0.06)' }}
                  content={(tp) => {
                    const { active, payload, label } = tp
                    if (!active || !payload?.length) return null
                    const val = Number((payload?.[0] as any)?.value || 0)
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
                        <div className="font-semibold text-slate-800">{String(label ?? '')}</div>
                        <div className="mt-1 text-slate-600">Amount: <span className="font-bold">PKR {val.toLocaleString()}</span></div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[12, 12, 8, 8]}
                  isAnimationActive
                  animationDuration={900}
                  shape={(props: any) => {
                    const { x, y, width, height, payload } = props
                    const id = String(payload?.label || '')
                    const fill = id === 'Sales' ? 'url(#cmpSales)' : id === 'Purchases' ? 'url(#cmpPurchases)' : 'url(#cmpExpenses)'
                    return <rect x={x} y={y} width={width} height={height} rx={12} ry={12} fill={fill} />
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={dcsContainer}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-indigo-600 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white">
                  <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-black bg-linear-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">Daily Closing Sheet</div>
                <div className="mt-1 text-sm font-medium text-slate-600">Financial summary for the selected period</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              type="button" 
              onClick={printClosingSheet} 
              className="inline-flex items-center gap-2 rounded-xl border-2 border-sky-200 bg-white px-4 py-2.5 font-semibold text-sky-700 shadow-sm hover:bg-sky-50 hover:border-sky-300 transition-all"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              onClick={() => {
                const text = [
                  `====================================`,
                  `HealthSpire - ${pharmacyName}`,
                  `Daily Closing Sheet`,
                  `====================================`,
                  ``,
                  `Period: ${from} to ${to}`,
                  `Generated: ${new Date().toLocaleString()}`,
                  ``,
                  `REVENUE & EXPENSES`,
                  `----------------------------------`,
                  `Total Sales:      PKR ${summary.totalSales.toLocaleString()}`,
                  `Total Purchases:  PKR ${summary.totalPurchases.toLocaleString()}`,
                  `Total Expenses:   PKR ${summary.totalExpenses.toLocaleString()}`,
                  ``,
                  `NET PROFIT:       PKR ${summary.totalProfit.toLocaleString()}`,
                  ``,
                  `SALES BREAKDOWN`,
                  `----------------------------------`,
                  `Cash Sales:       PKR ${summary.cashSales.toLocaleString()}`,
                  `Credit Sales:     PKR ${summary.creditSales.toLocaleString()}`,
                  `Stock Value:      PKR ${summary.stockValue.toLocaleString()}`,
                  ``,
                  `====================================`,
                  `HealthSpire Pharmacy Manegment System`,
                  `====================================`,
                ].join('\n')
                downloadTextFile(`closing-sheet-${pharmacyName.replace(/\s+/g, '-')}-${from}-to-${to}.txt`, text)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-sky-600 to-indigo-600 px-4 py-2.5 font-bold text-white shadow-lg hover:from-sky-700 hover:to-indigo-700 transition-all"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>

        <div className={innerPanelClass}>
          <div className="mb-4 flex items-center justify-between border-b-2 border-slate-200 pb-3">
            <div>
              <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Financial Summary</div>
              <div className="mt-1 text-xs text-slate-500">Period: <span className="font-semibold text-slate-700">{from} to {to}</span></div>
            </div>
            <div className="rounded-lg bg-linear-to-br from-sky-100 to-indigo-100 px-3 py-1.5">
              <div className="text-xs font-semibold text-sky-700">HealthSpire</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className={rowBg('bg-linear-to-r from-emerald-50 to-teal-50')}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">💰 Total Sales</span>
                <span className="text-lg font-bold text-emerald-700">PKR {summary.totalSales.toLocaleString()}</span>
              </div>
            </div>
            
            <div className={rowBg('bg-linear-to-r from-blue-50 to-sky-50')}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">📦 Total Purchases</span>
                <span className="text-lg font-bold text-blue-700">PKR {summary.totalPurchases.toLocaleString()}</span>
              </div>
            </div>
            
            <div className={rowBg('bg-linear-to-r from-rose-50 to-pink-50')}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">💸 Total Expenses</span>
                <span className="text-lg font-bold text-rose-700">PKR {summary.totalExpenses.toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-linear-to-r from-sky-600 to-indigo-600 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">🎯 Net Profit</span>
                <span className="text-2xl font-black text-white">{summary.totalProfit >= 0 ? '+' : ''}PKR {summary.totalProfit.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sales Breakdown</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-slate-700/50">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">💵 Cash Sales</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">PKR {summary.cashSales.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-slate-700/50">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">💳 Credit Sales</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">PKR {summary.creditSales.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-slate-700/50">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">📊 Stock Value</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">PKR {summary.stockValue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, bg, border }: { title: string; value: string; bg: string; border: string }) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 dark:border-slate-700 dark:bg-slate-800`}>
      <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{title}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  )
}
