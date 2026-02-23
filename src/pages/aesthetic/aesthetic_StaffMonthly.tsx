import { useEffect, useMemo, useState } from 'react'
import { aestheticApi } from '../../utils/api'
import Aesthetic_StaffReportDialog from '../../components/aesthetic/aesthetic_StaffReportDialog'

type Staff = { id: string; name: string; position?: string; shiftId?: string; salary?: number }
type Attendance = { id?: string; staffId: string; date: string; shiftId?: string; status: 'present'|'absent'|'leave'; clockIn?: string; clockOut?: string; notes?: string }

function toMinutes(hm?: string){ if(!hm) return 0; const [h,m] = (hm||'').split(':').map(n=>parseInt(n||'0')); return (h*60 + m) }
function fmtHours(min: number){ const h = Math.floor(min/60); const m = Math.round(min%60); return `${h}h ${m}m` }
function nowTime(){ const d=new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }

export default function Aesthetic_StaffMonthly(){
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7))
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [reportOpen, setReportOpen] = useState(false)
  const [showAllDays, setShowAllDays] = useState(false)

  const [staff, setStaff] = useState<Staff[]>([])
  const [att, setAtt] = useState<Attendance[]>([])

  useEffect(()=>{
    let mounted = true
    ;(async () => {
      try {
        const staffRes = await aestheticApi.listStaff({ limit: 1000 })
        if (!mounted) return
        const list = (staffRes.items||[]).map((x:any)=>({ id: x._id, name: x.name, position: x.position, shiftId: x.shiftId, salary: x.salary }))
        setStaff(list)
        if (!selectedStaffId && list[0]) setSelectedStaffId(list[0].id)
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [])

  useEffect(()=>{
    let mounted = true
    ;(async () => {
      try {
        const from = `${month}-01`
        const to = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)
        const toStr = `${to.getFullYear()}-${String(to.getMonth()+1).padStart(2,'0')}-${String(to.getDate()).padStart(2,'0')}`
        const res = await aestheticApi.listAttendance({ from, to: toStr, staffId: selectedStaffId || undefined, limit: 1000 })
        if (!mounted) return
        setAtt((res.items||[]).map((x:any)=>({ id: x._id || `${x.staffId}-${x.date}-${x.shiftId||''}`, staffId: x.staffId, date: x.date, shiftId: x.shiftId, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, notes: x.notes })))
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [month, selectedStaffId])

  const days = useMemo(()=>{
    if (!selectedStaffId) return [] as Array<{ date:string; clockIn?:string; clockOut?:string; status:string }>
    const byDate: Record<string, { clockIn?:string; clockOut?:string; status:string }> = {}
    for (const a of att.filter(x=>x.staffId===selectedStaffId)){
      const d = a.date
      if (!byDate[d]) byDate[d] = { status: a.status, clockIn: a.clockIn, clockOut: a.clockOut }
      else {
        const cur = byDate[d]
        if (a.clockIn && (!cur.clockIn || a.clockIn < cur.clockIn)) cur.clockIn = a.clockIn
        if (a.clockOut && (!cur.clockOut || a.clockOut > cur.clockOut)) cur.clockOut = a.clockOut
        if (a.status==='present') cur.status = 'present'
      }
    }
    const [y,m] = month.split('-').map(n=>parseInt(n||'0'))
    const totalDays = new Date(y, m, 0).getDate()
    let list: Array<{ date:string; clockIn?:string; clockOut?:string; status:string }>
    if (showAllDays){
      list = []
      for (let d=1; d<=totalDays; d++){
        const date = `${month}-${String(d).padStart(2,'0')}`
        const rec = byDate[date]
        list.push({ date, clockIn: rec?.clockIn, clockOut: rec?.clockOut, status: rec?.status || (rec?.clockIn||rec?.clockOut ? 'present' : 'absent') })
      }
    } else {
      list = Object.entries(byDate)
        .filter(([,v])=> Boolean(v.clockIn) || Boolean(v.clockOut))
        .map(([date,v])=> ({ date, clockIn: v.clockIn, clockOut: v.clockOut, status: v.status || 'present' }))
    }
    list.sort((a,b)=> (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    return list
  }, [att, selectedStaffId, month, showAllDays])

  const selectedStaff = useMemo(()=> staff.find(s=>s.id===selectedStaffId) || null, [staff, selectedStaffId])

  const saveQuick = async (date: string, type:'in'|'out') => {
    if (!selectedStaffId) return
    const dayRecs = att.filter(x=> x.staffId===selectedStaffId && x.date===date)
    const alreadyIn = dayRecs.some(r=> !!r.clockIn)
    const alreadyOut = dayRecs.some(r=> !!r.clockOut)
    if ((type==='in' && alreadyIn) || (type==='out' && alreadyOut)) return
    const payload: any = { staffId: selectedStaffId, date, status: 'present' }
    if (type==='in') payload.clockIn = nowTime(); else payload.clockOut = nowTime()
    await aestheticApi.upsertAttendance(payload)
    // refresh
    const to = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)
    const toStr = `${to.getFullYear()}-${String(to.getMonth()+1).padStart(2,'0')}-${String(to.getDate()).padStart(2,'0')}`
    const res = await aestheticApi.listAttendance({ from: `${month}-01`, to: toStr, staffId: selectedStaffId })
    setAtt((res.items||[]).map((x:any)=>({ id: x._id || `${x.staffId}-${x.date}-${x.shiftId||''}`, staffId: x.staffId, date: x.date, shiftId: x.shiftId, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, notes: x.notes })))
  }

  const exportCsv = () => {
    const rowsCsv = [['Month','Staff','Date','Status','Clock In','Clock Out','Hours']]
    for (const r of days){
      const minutes = (r.status==='present' && r.clockIn && r.clockOut) ? Math.max(0, toMinutes(r.clockOut) - toMinutes(r.clockIn)) : 0
      rowsCsv.push([month, selectedStaff?.name||'', r.date, r.status, r.clockIn||'', r.clockOut||'', fmtHours(minutes)])
    }
    const csv = rowsCsv.map(r=> r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `aesthetic_monthly_${month}_${selectedStaff?.name||''}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Staff Monthly</div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Staff</label>
            <select value={selectedStaffId} onChange={e=>setSelectedStaffId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm min-w-[220px]">
              {staff.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Month</label>
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="ml-auto flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={showAllDays} onChange={e=>setShowAllDays(e.target.checked)} />
              Show all days
            </label>
            <button onClick={exportCsv} className="btn-outline-navy">Export CSV</button>
            <button onClick={()=> setReportOpen(true)} className="btn">Staff Report</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 font-medium text-slate-800">Monthly View - {month}</div>
        <div className="space-y-2">
          {days.map(d => {
            const canIn = !d.clockIn
            const canOut = !d.clockOut
            return (
            <div key={d.date} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="text-slate-800">{new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div className={`text-xs rounded px-2 py-0.5 ${d.status==='present'?'bg-navy text-white':'bg-slate-100 text-slate-700'}`}>{d.status}</div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <div className="text-slate-500">Check in</div>
                  <div className="text-slate-800">{d.clockIn || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-500">Check out</div>
                  <div className="text-slate-800">{d.clockOut || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button disabled={!canIn} onClick={()=>saveQuick(d.date,'in')} className={`rounded-md border px-2 py-1 text-xs ${canIn? 'border-slate-300 hover:bg-slate-50' : 'border-slate-200 text-slate-400 cursor-not-allowed'}`}>Check In</button>
                  <button disabled={!canOut} onClick={()=>saveQuick(d.date,'out')} className={`rounded-md border px-2 py-1 text-xs ${canOut? 'border-slate-300 hover:bg-slate-50' : 'border-slate-200 text-slate-400 cursor-not-allowed'}`}>Check Out</button>
                </div>
              </div>
            </div>
          )})}
          {days.length===0 && (<div className="text-center text-slate-500 py-8">No attendance with check-in/out for this month</div>)}
        </div>
      </div>

      <Aesthetic_StaffReportDialog open={reportOpen} onClose={()=>setReportOpen(false)} staffList={staff as any} initialMonth={month} initialStaffId={selectedStaffId || undefined} />
    </div>
  )
}
