import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, DollarSign, Users, BedSingle, Activity, RefreshCw, Clock, CalendarClock, Filter, RotateCcw, BarChart3 } from 'lucide-react'
import { hospitalApi, financeApi, labApi } from '../../utils/api'

function iso(d: Date){ return d.toISOString().slice(0,10) }
function startOfMonth(d: Date){ const x = new Date(d); x.setDate(1); return x }
function money(x: any){ const n = Number(x||0); return isFinite(n) ? n : 0 }
// (Removed salaries range calc util per request)

// Daily grouped bars removed; simplified to two-bars component below.

function TwoBars({ revenue, expense }: { revenue: number; expense: number }){
  const w = 320
  const h = 160
  const pad = 24
  const max = Math.max(1, revenue, expense)
  const bw = (w - pad*2 - 16) / 2
  const base = h - pad
  const rh = (revenue/max) * (h - pad*2)
  const eh = (expense/max) * (h - pad*2)
  const rx = pad
  const ex = pad + bw + 16
  const fmt = (n:number)=> `Rs ${Math.round(n).toLocaleString('en-PK')}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <rect x={rx} y={base - rh} width={bw} height={rh} fill="#10b981" rx={3}>
        <title>{fmt(revenue)}</title>
      </rect>
      <rect x={ex} y={base - eh} width={bw} height={eh} fill="#ef4444" rx={3}>
        <title>{fmt(expense)}</title>
      </rect>
    </svg>
  )
}

export default function Hospital_Dashboard() {
  const [loading, setLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string>('—')
  const [fromDate, setFromDate] = useState<string>(iso(startOfMonth(new Date())))
  const [toDate, setToDate] = useState<string>(iso(new Date()))
  const [fromTime, setFromTime] = useState<string>('')
  const [toTime, setToTime] = useState<string>('')
  const [stats, setStats] = useState({
    tokens: 0,
    admissions: 0,
    discharges: 0,
    activeIpd: 0,
    bedsAvailable: 0,
    occupancy: 0,
    present: 0,
    late: 0,
  })
  // tokens state not needed for widgets; using counts from fetched arrays directly
  const [expenses, setExpenses] = useState<any[]>([])
  const [ipdPayments, setIpdPayments] = useState<any[]>([])
  const [doctorEarnRows, setDoctorEarnRows] = useState<any[]>([])
  const [doctorPayoutsTotal, setDoctorPayoutsTotal] = useState<number>(0)
  const [opdRevenueAmt, setOpdRevenueAmt] = useState<number>(0)
  const [ipdRevenueAmt, setIpdRevenueAmt] = useState<number>(0)
  const REFRESH_MS = 15000

  // Shifts for global filter
  const [shifts, setShifts] = useState<Array<{ id: string; name: string; start: string; end: string }>>([])
  const [filterShiftId, setFilterShiftId] = useState<string>('')

  useEffect(() => { load() }, [fromDate, toDate, fromTime, toTime, filterShiftId])

  function getEffectiveWindow(){
    // If custom time range is provided, it overrides shift
    const hasTime = !!(fromTime && toTime)
    if (hasTime){
      try{
        const [fy,fm,fd] = fromDate.split('-').map(n=>parseInt(n||'0',10))
        const [ty,tm,td] = toDate.split('-').map(n=>parseInt(n||'0',10))
        const [fh,fmin] = fromTime.split(':').map(n=>parseInt(n||'0',10))
        const [th,tmin] = toTime.split(':').map(n=>parseInt(n||'0',10))
        const start = new Date(fy,(fm-1),fd,fh||0,fmin||0,0)
        let end = new Date(ty,(tm-1),td,th||0,tmin||0,0)
        if (end <= start) end = new Date(end.getTime() + 24*60*60*1000)
        return { start, end }
      }catch{ return null }
    }
    if (filterShiftId){
      const sh = shifts.find(s=> s.id===filterShiftId)
      const win = getShiftWindow(toDate, sh)
      return win
    }
    return null
  }

  function toTimeMs(x:any){
    const s = String(x?.receivedAt||x?.dateIso||x?.date||x?.createdAt||'')
    const t = new Date(s).getTime()
    return Number.isFinite(t) ? t : NaN
  }

  async function load(){
    setLoading(true)
    try {
      const [tokensRes, expensesRes, staffRes, bedsAllRes, bedsOccRes, attRes, shiftsRes, ipdAdmsRes, doctorsRes, trialRes] = await Promise.all([
        hospitalApi.listTokens({ from: fromDate, to: toDate }) as any,
        hospitalApi.listExpenses({ from: fromDate, to: toDate }) as any,
        hospitalApi.listStaff() as any,
        hospitalApi.listBeds() as any,
        hospitalApi.listBeds({ status: 'occupied' }) as any,
        hospitalApi.listAttendance({ from: fromDate, to: toDate, limit: 5000 }) as any,
        hospitalApi.listShifts() as any,
        hospitalApi.listIPDAdmissions({ from: fromDate, to: toDate, limit: 500 }) as any,
        hospitalApi.listDoctors() as any,
        financeApi.trialBalance({ from: fromDate, to: toDate }) as any,
      ])
      let tokensArr: any[] = tokensRes?.tokens || tokensRes?.items || tokensRes || []
      let expensesArr: any[] = expensesRes?.expenses || expensesRes?.items || expensesRes || []
      let staffArr: any[] = staffRes?.staff || staffRes?.items || staffRes || []
      const allBeds: any[] = bedsAllRes?.beds || []
      const occBeds: any[] = bedsOccRes?.beds || []
      let attendance: any[] = attRes?.items || []
      let shifts: any[] = (shiftsRes?.items || shiftsRes || [])
      const ipdAdms: any[] = ipdAdmsRes?.admissions || ipdAdmsRes?.items || ipdAdmsRes || []

      // Apply global time window if enabled
      const win = getEffectiveWindow()
      if (win){
        const inWin = (x:any)=>{ const t = toTimeMs(x); return Number.isFinite(t) && t >= win.start.getTime() && t < win.end.getTime() }
        tokensArr = tokensArr.filter(inWin)
        expensesArr = expensesArr.filter(inWin)
      }
      setExpenses(expensesArr)
      setDoctorEarnRows([])

      // Fallback to Lab source if no hospital attendance
      if ((attendance?.length||0) === 0){
        try {
          const [attLab, shiftsLab, staffLab] = await Promise.all([
            labApi.listAttendance({ from: fromDate, to: toDate, limit: 5000 }) as any,
            labApi.listShifts() as any,
            labApi.listStaff({ limit: 1000 }) as any,
          ])
          attendance = (attLab?.items || attLab || [])
          shifts = (shiftsLab?.items || shiftsLab || [])
          staffArr = (staffLab?.items || [])
            .map((x:any)=> ({ _id: x._id, id: x._id, name: x.name, role: x.position || 'other', phone: x.phone, salary: x.salary, shiftId: x.shiftId, active: x.status !== 'inactive' }))
        } catch {}
      }

      // Doctor payouts sum across all doctors in range
      try {
        const doctors: any[] = (doctorsRes?.doctors || doctorsRes?.items || doctorsRes || []).map((d:any)=> ({ id: String(d._id||d.id) }))
        const payoutsLists = await Promise.all(doctors.map(async d => {
          try { const r:any = await financeApi.doctorPayouts(d.id, 200); return (r?.payouts || []) } catch { return [] }
        }))
        let payouts = ([] as any[]).concat(...payoutsLists)
        if (win){
          const inWin = (x:any)=>{ const t = toTimeMs(x); return Number.isFinite(t) && t >= win.start.getTime() && t < win.end.getTime() }
          payouts = payouts.filter(inWin)
        } else {
          payouts = payouts.filter(p=>{ const dt = String(p.dateIso||p.date||p.createdAt||'').slice(0,10); return dt>=fromDate && dt<=toDate })
        }
        const total = payouts
          .reduce((s,p)=> s + money(p.amount), 0)
        setDoctorPayoutsTotal(total)
      } catch { setDoctorPayoutsTotal(0) }

      const ipdPaysArrays = await Promise.all(ipdAdms.slice(0, 200).map(async (a:any)=>{
        const id = String(a._id||a.id||a.encounterId||'')
        if (!id) return [] as any[]
        try {
          const r: any = await hospitalApi.listIpdPayments(id)
          const items: any[] = (r?.items || r?.payments || r || [])
          return items
        } catch { return [] as any[] }
      }))
      let ipdPayFlat = ([] as any[]).concat(...ipdPaysArrays)
      if (win){
        const inWin = (x:any)=>{ const t = toTimeMs(x); return Number.isFinite(t) && t >= win.start.getTime() && t < win.end.getTime() }
        ipdPayFlat = ipdPayFlat.filter(inWin)
      }
      setIpdPayments(ipdPayFlat)

      // Revenue (from FinanceJournal trial balance)
      try {
        const rows: any[] = (trialRes?.rows || [])
        const byAcc: Record<string, any> = {}
        for (const r of rows) byAcc[String(r.account)] = r
        const revOf = (acc: string) => money(-(byAcc[acc]?.balance || 0))
        setOpdRevenueAmt(revOf('OPD_REVENUE'))
        setIpdRevenueAmt(revOf('IPD_REVENUE'))
      } catch { setOpdRevenueAmt(0); setIpdRevenueAmt(0) }

      const totalBeds = allBeds.length
      const occupied = occBeds.length
      const bedsAvailable = Math.max(0, totalBeds - occupied)
      const occupancy = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0

      const todayStr = toDate
      const dateOf = (x:any) => String(x?.date || x?.dateIso || x?.createdAt || '').slice(0,10)
      const presentToday = attendance.filter(a => dateOf(a) === todayStr && (String(a.status||'').toLowerCase()==='present' || !!a.clockIn)).length
      const shiftMap: Record<string, any> = {}
      for (const sh of shifts){ shiftMap[String(sh._id || sh.id)] = sh }
      const staffMap: Record<string, any> = {}
      for (const st of staffArr){ staffMap[String(st._id || st.id)] = st }
      function toMin(hm?: string){ if(!hm) return null; const [h,m] = String(hm).split(':').map((n:any)=>parseInt(n||'0')); return isFinite(h) ? (h*60 + (m||0)) : null }
      let lateToday = 0
      for (const a of attendance){
        if (dateOf(a) !== todayStr || String(a.status||'').toLowerCase() !== 'present' || !a.clockIn) continue
        const sid = String(a.shiftId || staffMap[a.staffId]?.shiftId || '')
        const sh = shiftMap[sid]
        const smin = toMin(sh?.start), inMin = toMin(a.clockIn)
        if (smin!=null && inMin!=null && inMin > smin) lateToday++
      }

      setStats({ tokens: tokensArr.length, admissions: ipdAdms.length, discharges: (ipdAdmsRes?.admissions||[]).filter((a:any)=>a.status==='discharged').length, activeIpd: occupied, bedsAvailable, occupancy, present: presentToday, late: lateToday })
      setUpdatedAt(new Date().toLocaleString())
    } finally { setLoading(false) }
  }

  // Department map no longer needed after removing dept-wise widget
  // IPD revenue derived from backend trial balance
  const expensesTotal = useMemo(()=> expenses.reduce((s,e)=> s + money(e.amount), 0), [expenses])
  const doctorPayouts = useMemo(()=> (doctorEarnRows||[]).filter((r:any)=>{
    const t = String(r.type||'').toLowerCase()
    return t==='payout' || money(r.amount)<0
  }).reduce((s:any,r:any)=> s + Math.abs(money(r.amount)), 0), [doctorEarnRows])
  const doctorPayoutsCard = useMemo(()=> doctorPayoutsTotal>0 ? doctorPayoutsTotal : doctorPayouts, [doctorPayoutsTotal, doctorPayouts])
  // Salaries widget removed per request

  const totalRevenue = useMemo(()=> opdRevenueAmt + ipdRevenueAmt, [opdRevenueAmt, ipdRevenueAmt])
  const recentIpdPayments = useMemo(()=> {
    const getDate = (p:any)=> new Date(String(p.receivedAt||p.dateIso||p.date||p.createdAt||'') || 0).getTime()
    return [...ipdPayments].sort((a,b)=> getDate(b) - getDate(a)).slice(0, 10)
  }, [ipdPayments])

  // Removed per request: day-wise arrays for grouped bars

  const cards = [
    { title: 'Tokens', value: String(stats.tokens), tone: 'bg-emerald-50 border-emerald-200', icon: Activity },
    { title: 'Admissions', value: String(stats.admissions), tone: 'bg-violet-50 border-violet-200', icon: TrendingUp },
    { title: 'Discharges', value: String(stats.discharges), tone: 'bg-amber-50 border-amber-200', icon: CalendarClock },
    { title: 'Active IPD Patients', value: String(stats.activeIpd), tone: 'bg-sky-50 border-sky-200', icon: Users },
    { title: 'Beds Available', value: String(stats.bedsAvailable), tone: 'bg-cyan-50 border-cyan-200', icon: BedSingle },
    { title: 'OPD Revenue', value: `Rs ${opdRevenueAmt.toFixed(0)}`, tone: 'bg-green-50 border-green-200', icon: DollarSign },
    { title: 'IPD Revenue', value: `Rs ${ipdRevenueAmt.toFixed(0)}`, tone: 'bg-green-50 border-green-200', icon: DollarSign },
    { title: 'Total Revenue', value: `Rs ${totalRevenue.toFixed(0)}`, tone: 'bg-green-50 border-green-200', icon: DollarSign },
    { title: 'Expenses', value: `Rs ${expensesTotal.toFixed(0)}`, tone: 'bg-rose-50 border-rose-200', icon: DollarSign },
    { title: 'Doctor Payouts', value: `Rs ${doctorPayoutsCard.toFixed(0)}`, tone: 'bg-amber-50 border-amber-200', icon: DollarSign },
    { title: 'Staff Present (Today)', value: String(stats.present), tone: 'bg-yellow-50 border-yellow-200', icon: Users },
    { title: 'Late Staff (Today)', value: String(stats.late), tone: 'bg-slate-50 border-slate-200', icon: Clock },
  ]

  // Auto-refresh for real-time chart and widgets
  useEffect(()=>{
    const id = setInterval(async ()=>{
      await load()
    }, Math.max(3000, REFRESH_MS))
    return () => clearInterval(id)
  }, [fromDate, toDate])

  useEffect(()=>{
    const onVis = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Load shifts once for global filter (fallback to Lab if needed)
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const r: any = await hospitalApi.listShifts()
        if (!mounted) return
        const arr = (r?.items || r || []).map((x:any)=> ({ id: String(x._id||x.id), name: x.name, start: x.start, end: x.end }))
        if (arr.length === 0){
          try{
            const rl: any = await labApi.listShifts()
            const arr2 = (rl?.items || rl || []).map((x:any)=> ({ id: String(x._id||x.id), name: x.name, start: x.start, end: x.end }))
            setShifts(arr2)
          } catch { setShifts([]) }
        } else { setShifts(arr) }
      } catch { setShifts([]) }
    })()
    return ()=>{ mounted = false }
  }, [])

  function getShiftWindow(dateStr: string, sh?: { start: string; end: string }){
    try{
      if (!sh) return null
      const [y,m,d] = dateStr.split('-').map(n=>parseInt(n||'0',10))
      const [shh,smm] = String(sh.start||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const [ehh,emm] = String(sh.end||'00:00').split(':').map(n=>parseInt(n||'0',10))
      const start = new Date(y, (m-1), d, shh||0, smm||0, 0)
      let end = new Date(y, (m-1), d, ehh||0, emm||0, 0)
      if (end <= start) end = new Date(end.getTime() + 24*60*60*1000)
      return { start, end }
    } catch { return null }
  }

  

  return (
    <div className="space-y-6">
      

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-800 font-semibold"><Filter className="h-4 w-4" /> Filters</div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <label className="flex items-center gap-2 text-sm"><span className="w-16 text-slate-600">From</span>
            <input type="date" value={fromDate} onChange={e=> setFromDate(e.target.value)} className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm"><span className="w-16 text-slate-600">To</span>
            <input type="date" value={toDate} onChange={e=> setToDate(e.target.value)} className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm"><span className="w-20 text-slate-600">Shift</span>
            <select value={filterShiftId} onChange={e=> setFilterShiftId(e.target.value)} className="input min-w-[160px]">
              <option value="">All day</option>
              {shifts.map(s=> <option key={s.id} value={s.id}>{s.name} ({s.start}-{s.end})</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm"><span className="w-20 text-slate-600">From Time</span>
            <input type="time" value={fromTime} onChange={e=>{ setFromTime(e.target.value); if (e.target.value) setFilterShiftId('') }} className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm"><span className="w-20 text-slate-600">To Time</span>
            <input type="time" value={toTime} onChange={e=>{ setToTime(e.target.value); if (e.target.value) setFilterShiftId('') }} className="input" />
          </label>
          <div className="flex items-center gap-2">
            <button onClick={()=>{ setFromDate(iso(startOfMonth(new Date()))); setToDate(iso(new Date())); setFilterShiftId(''); setFromTime(''); setToTime('') }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4" /> Reset</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ title, value, tone, icon: Icon }) => (
          <div key={title} className={`rounded-xl border ${tone} p-4`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">{title}</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
              </div>
              <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-800 font-semibold"><BarChart3 className="h-4 w-4" /> Revenue vs Expenses</div>
          <div className="overflow-x-auto">
            <TwoBars revenue={totalRevenue} expense={expensesTotal} />
          </div>
          <div className="mt-2 text-xs text-slate-600">Green: Revenue, Red: Expenses</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-slate-800 font-semibold">Recent IPD Transactions</div>
          <div className="divide-y">
            {recentIpdPayments.length === 0 && (
              <div className="text-sm text-slate-500">No IPD payments in the selected range.</div>
            )}
            {recentIpdPayments.map((p:any, i:number)=>{
              const when = String(p.receivedAt||p.dateIso||p.date||p.createdAt||'').replace('T',' ').slice(0,19)
              const method = p.method || p.paymentMethod || '—'
              const ref = p.refNo || p.ref || ''
              return (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-800">Rs {money(p.amount).toFixed(0)}</div>
                    <div className="text-xs text-slate-500">{when} • {method}{ref?` • ${ref}`:''}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 text-xs text-slate-500">
        <Clock className="h-4 w-4" />
        <span>Last updated: {updatedAt}</span>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading?'animate-spin':''}`} /> Refresh
        </button>
      </div>
    </div>
  )
}
