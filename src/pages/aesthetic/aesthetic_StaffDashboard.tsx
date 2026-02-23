import { useEffect, useMemo, useState } from 'react'
import { aestheticApi } from '../../utils/api'
import { Users, CalendarCheck2, CalendarX2, CalendarRange, Wallet, Clock, RefreshCw, PieChart, BarChart3, Filter, RotateCcw } from 'lucide-react'

function fmt(n?: number){ return (Number(n||0)).toLocaleString() }
function iso(d: Date){ return d.toISOString().slice(0,10) }
function startOfMonth(d: Date){ const x = new Date(d); x.setDate(1); return x }

// Tiny inline SVG line chart
function LineSpark({ data, color = '#0ea5e9' }: { data: number[]; color?: string }){
  const w = 220, h = 56, pad = 6
  const max = Math.max(1, ...data)
  const step = (w - pad*2) / Math.max(1, data.length-1)
  const points = data.map((v, i) => [pad + i*step, h-pad - (v/max)*(h-pad*2)])
  const d = points.map((p,i)=> (i? 'L':'M') + p[0] + ' ' + p[1]).join(' ')
  const area = d + ` L ${w-pad} ${h-pad} L ${pad} ${h-pad} Z`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-90">
      <path d={area} fill={color+'20'} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// Tiny inline bar chart
function Bars({ values, color = '#111827' }: { values: number[]; color?: string }){
  const w = 280, h = 120, pad = 8
  const max = Math.max(1, ...values)
  const bw = (w - pad*2) / Math.max(1, values.length)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {values.map((v,i)=>{
        const bh = (v/max) * (h - pad*2)
        const x = pad + i*bw
        const y = h - pad - bh
        return <rect key={i} x={x+2} y={y} width={bw-4} height={bh} fill={color} rx={3} />
      })}
    </svg>
  )
}

export default function Aesthetic_StaffDashboard(){
  const [loading, setLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string>('—')
  const [staff, setStaff] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [att, setAtt] = useState<any[]>([])
  const [fromDate, setFromDate] = useState<string>(iso(startOfMonth(new Date())))
  const [toDate, setToDate] = useState<string>(iso(new Date()))
  const [selectedShiftId, setSelectedShiftId] = useState<string>('')
  const [live, setLive] = useState<boolean>(true)
  const [refreshMs, setRefreshMs] = useState<number>(15000)
  const [tick, setTick] = useState<number>(0)
  const [earningsSum, setEarningsSum] = useState<number>(0)

  useEffect(()=>{ loadMeta() }, [])
  useEffect(()=>{ reloadAttendance(); reloadEarnings() }, [fromDate, toDate, selectedShiftId])

  async function loadMeta(){
    setLoading(true)
    try{
      const [staffRes, shiftsRes] = await Promise.all([
        aestheticApi.listStaff({ limit: 1000 }) as any,
        aestheticApi.listShifts() as any,
      ])
      const staffItems: any[] = (staffRes?.items || [])
        .map((x:any)=> ({ _id: x._id, id: x._id, name: x.name, position: x.position || 'other', phone: x.phone, salary: x.salary, shiftId: x.shiftId, status: x.status || 'Active' }))
      const shiftItems: any[] = (shiftsRes?.items || []).map((x:any)=> ({ _id: x._id, id: x._id, name: x.name, start: x.start, end: x.end }))
      setStaff(staffItems)
      setShifts(shiftItems)
      setUpdatedAt(new Date().toLocaleString())
    } finally { setLoading(false) }
  }

  async function reloadEarnings(){
    try{
      const res: any = await (aestheticApi as any).listStaffEarnings({ from: fromDate, to: toDate, limit: 5000 })
      const sum = ((res?.items)||[]).reduce((s:number,n:any)=> s + Number(n?.amount||0), 0)
      setEarningsSum(sum)
    } catch { setEarningsSum(0) }
  }

  async function reloadAttendance(){
    setLoading(true)
    try{
      const res = await aestheticApi.listAttendance({ from: fromDate, to: toDate, shiftId: selectedShiftId || undefined, limit: 5000 }) as any
      setAtt((res?.items || []) as any[])
      setUpdatedAt(new Date().toLocaleString())
    } finally { setLoading(false) }
  }

  useEffect(()=>{
    if (!live) return
    const id = setInterval(async ()=>{
      await reloadAttendance()
      setTick(t => t + 1)
    }, Math.max(3000, refreshMs))
    return () => clearInterval(id)
  }, [live, refreshMs, fromDate, toDate, selectedShiftId])

  useEffect(()=>{
    if (!live) return
    if (tick > 0 && tick % 4 === 0) {
      loadMeta()
    }
  }, [tick, live])

  useEffect(()=>{
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        reloadAttendance()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const endIso = toDate
  const activeStaff = useMemo(()=> staff.filter((s:any)=> String(s.status||'Active') !== 'Inactive'), [staff])
  const staffById = useMemo(()=> {
    const m: Record<string, any> = {}
    activeStaff.forEach(s=>{ m[String(s._id||s.id)] = s })
    return m
  }, [activeStaff])
  const attFiltered = useMemo(()=> att, [att])
  const presentToday = useMemo(()=> attFiltered.filter((a:any)=> a.date===endIso && a.status==='present').length, [attFiltered, endIso])
  const absentToday = useMemo(()=> attFiltered.filter((a:any)=> a.date===endIso && a.status==='absent').length, [attFiltered, endIso])
  const leaveToday = useMemo(()=> attFiltered.filter((a:any)=> a.date===endIso && a.status==='leave').length, [attFiltered, endIso])
  const payrollMonthly = useMemo(()=> activeStaff.reduce((s,n)=> s + (Number(n.salary)||0), 0), [activeStaff])

  const roles = useMemo(()=>{
    const map: Record<string,number> = {}
    activeStaff.forEach((s:any)=>{ const r = (s.position||'other'); map[r] = (map[r]||0)+1 })
    return map
  }, [activeStaff])
  const roleLabels = Object.keys(roles)
  const roleValues = roleLabels.map(k=> roles[k])

  // Late Today logic
  const shiftById = useMemo(()=>{
    const m: Record<string, any> = {}
    shifts.forEach((sh:any)=>{ m[String(sh._id||sh.id)] = sh })
    return m
  }, [shifts])
  function timeToMin(t?: string){ if(!t) return null; const [h,m] = String(t).split(':').map(x=>parseInt(x||'0')); return isFinite(h) ? (h*60 + (m||0)) : null }
  const lateToday = useMemo(()=>{
    let c = 0
    for (const a of attFiltered){
      if (a.date!==endIso || a.status!=='present' || !a.clockIn) continue
      const sid = String(a.shiftId || staffById[a.staffId]?.shiftId || '')
      const sh = shiftById[sid]
      const start = timeToMin(sh?.start)
      const inMin = timeToMin(a.clockIn)
      if (start!=null && inMin!=null && inMin > start) c++
    }
    return c
  }, [attFiltered, endIso, staffById, shiftById])

  const rangeDays = useMemo(()=>{
    const days: string[] = []
    const start = new Date(fromDate + 'T00:00:00')
    const end = new Date(toDate + 'T00:00:00')
    for(let d = new Date(start); d <= end; d.setDate(d.getDate()+1)){
      days.push(iso(d))
    }
    return days
  }, [fromDate, toDate])
  const trend = useMemo(()=> rangeDays.map(d => attFiltered.filter((a:any)=> a.date===d && a.status==='present').length), [attFiltered, rangeDays])

  const cards = [
    { title: 'Total Staff', value: String(activeStaff.length), icon: Users, tone: 'bg-sky-50 border-sky-200' },
    { title: 'Present Today', value: String(presentToday), icon: CalendarCheck2, tone: 'bg-emerald-50 border-emerald-200' },
    { title: 'Absent Today', value: String(absentToday), icon: CalendarX2, tone: 'bg-rose-50 border-rose-200' },
    { title: 'On Leave', value: String(leaveToday), icon: CalendarRange, tone: 'bg-amber-50 border-amber-200' },
    { title: 'Late Today', value: String(lateToday), icon: CalendarRange, tone: 'bg-indigo-50 border-indigo-200' },
    { title: 'Monthly Payroll (Basic)', value: `PKR ${fmt(payrollMonthly)}`, icon: Wallet, tone: 'bg-teal-50 border-teal-200' },
    { title: 'Additional Earnings', value: `PKR ${fmt(earningsSum)}`, icon: Wallet, tone: 'bg-emerald-50 border-emerald-200' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Staff Dashboard</h2>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <Clock className="h-4 w-4" />
          <span>Last updated: {updatedAt}</span>
          <button onClick={()=>{ loadMeta(); reloadAttendance() }} disabled={loading} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading?'animate-spin':''}`} /> Refresh
          </button>
          <button onClick={()=> setLive(v=>!v)} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${live? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            Live: <span className={`font-medium ${live? 'text-emerald-700' : 'text-slate-800'}`}>{live? 'On' : 'Off'}</span>
          </button>
          <label className="inline-flex items-center gap-1">
            <span className="text-slate-600">Every</span>
            <select value={refreshMs} onChange={e=> setRefreshMs(Number(e.target.value))} className="select !py-1 !px-2">
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={15000}>15s</option>
              <option value={30000}>30s</option>
              <option value={60000}>60s</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-800 font-semibold"><Filter className="h-4 w-4" /> Filters</div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="flex items-center gap-2 text-sm"><span className="w-16 text-slate-600">From</span>
            <input type="date" value={fromDate} onChange={e=> setFromDate(e.target.value)} className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm"><span className="w-16 text-slate-600">To</span>
            <input type="date" value={toDate} onChange={e=> setToDate(e.target.value)} className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm"><span className="w-16 text-slate-600">Shift</span>
            <select value={selectedShiftId} onChange={e=> setSelectedShiftId(e.target.value)} className="select">
              <option value="">All Shifts</option>
              {shifts.map((s:any)=> <option key={String(s._id||s.id)} value={String(s._id||s.id)}>{s.name}</option>)}
            </select>
          </label>
          
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={()=>{ setFromDate(iso(startOfMonth(new Date()))); setToDate(iso(new Date())); setSelectedShiftId('') }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ title, value, icon: Icon, tone }) => (
          <div key={title} className={`rounded-xl border ${tone} p-4`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">{title}</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
              </div>
              <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><Icon className="h-4 w-4" /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 font-semibold"><BarChart3 className="h-4 w-4" /> Attendance Trend (Selected range)</div>
            <div className="text-xs text-slate-500">Avg {fmt(Math.round((trend.reduce((s,n)=>s+n,0)/Math.max(1,trend.length))||0))}/day</div>
          </div>
          <LineSpark data={trend} color="#0ea5e9" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-800 font-semibold"><PieChart className="h-4 w-4" /> Roles Distribution</div>
          <div className="flex items-center gap-6">
            <Bars values={roleValues} color="#111827" />
            <div className="text-sm text-slate-700">
              {roleLabels.map((r,i)=> (
                <div key={r} className="flex items-center justify-between gap-6"><span className="capitalize">{r}</span><span className="font-medium">{roleValues[i]}</span></div>
              ))}
              {roleLabels.length===0 && <div className="text-slate-500">No staff</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Removed: quick action buttons */}
    </div>
  )
}
