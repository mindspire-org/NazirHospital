import { useEffect, useMemo, useState } from 'react'
import { aestheticApi } from '../../utils/api'

type Attendance = { id?: string; staffId: string; date: string; shiftId?: string; status: 'present'|'absent'|'leave'; clockIn?: string; clockOut?: string; notes?: string }
type Staff = { id: string; name: string; position?: string; phone?: string; shiftId?: string }

type Shift = { id: string; name: string; start?: string; end?: string }

function today(){ return new Date().toISOString().slice(0,10) }

export default function Aesthetic_StaffAttendance(){
  const [date, setDate] = useState<string>(today())
  const [shiftId, setShiftId] = useState<string>('')
  const [limit, setLimit] = useState<number>(10)
  const [page, setPage] = useState<number>(1)
  const [total, setTotal] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [tick, setTick] = useState(0)

  const [staff, setStaff] = useState<Staff[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [att, setAtt] = useState<Attendance[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [staffRes, shiftRes] = await Promise.all([
          aestheticApi.listStaff({ shiftId: shiftId || undefined, page, limit }),
          aestheticApi.listShifts(),
        ])
        if (!mounted) return
        const list = (staffRes.items||[]).map((x:any)=>({ id: x._id, name: x.name, position: x.position, phone: x.phone, shiftId: x.shiftId }))
        setStaff(list)
        setTotal(Number(staffRes.total || list.length || 0))
        setTotalPages(Number(staffRes.totalPages || 1))
        setShifts((shiftRes.items||[]).map((x:any)=>({ id: x._id, name: x.name, start: x.start, end: x.end })))
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [shiftId, page, limit])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await aestheticApi.listAttendance({ date, shiftId: shiftId || undefined, limit: 1000 })
        if (!mounted) return
        setAtt((res.items||[]).map((x:any)=>({ id: x._id || `${x.staffId}-${x.date}-${x.shiftId||''}`, staffId: x.staffId, date: x.date, shiftId: x.shiftId, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, notes: x.notes })))
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [date, shiftId, tick])

  const staffRows = useMemo(() => {
    const base = staff.filter(s => (selectedStaffId ? s.id===selectedStaffId : true))
    return base
  }, [staff, selectedStaffId])

  const shiftName = (id?: string)=> id ? (shifts.find(s=>s.id===id)?.name || '—') : '—'

  const refresh = () => setTick(t => t + 1)

  const exportCsv = () => {
    const rows = [['Date','Shift','Staff','Position','Phone','Clock In','Clock Out']]
    staffRows.forEach(s => {
      const rec = att.find(a=> a.staffId===s.id && a.date===date && (s.shiftId ? (a.shiftId||'')===s.shiftId : true)) || att.find(a=> a.staffId===s.id && a.date===date) || null
      rows.push([date, shiftName(s.shiftId), s.name, s.position||'', s.phone||'', rec?.clockIn||'', rec?.clockOut||''])
    })
    const csv = rows.map(r=> r.map(x=> `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `attendance_${date}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  function nowTime(){ const d=new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
  const quickClockRow = async (s: Staff, type: 'in'|'out') => {
    const rec = att.find(a=> a.staffId===s.id && (s.shiftId ? (a.shiftId||'')===s.shiftId : true) && a.date===date) || att.find(a=> a.staffId===s.id && a.date===date)
    if (type==='in' && rec?.clockIn) return
    if (type==='out' && rec?.clockOut) return
    const payload: any = { staffId: s.id, date, shiftId: s.shiftId || undefined, status: 'present' }
    if (type==='in') payload.clockIn = nowTime(); else payload.clockOut = nowTime()
    await aestheticApi.upsertAttendance(payload)
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Staff Attendance</div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Daily View</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Shift</label>
            <select value={shiftId} onChange={e=>setShiftId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm min-w-[180px]">
              <option value="">All Shifts</option>
              {shifts.map(s=> (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Staff</label>
            <select value={selectedStaffId} onChange={e=>setSelectedStaffId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm min-w-[220px]">
              <option value="">— All staff —</option>
              {staff.map(s=> (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div className="ml-auto flex items-end gap-2">
            <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button onClick={()=>{ setPage(1); refresh() }} className="btn-outline-navy">Refresh</button>
            <button onClick={exportCsv} className="btn-outline-navy">Export CSV</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Staff</th>
                <th className="px-4 py-2 font-medium">Position</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Shift</th>
                <th className="px-4 py-2 font-medium">Clock In</th>
                <th className="px-4 py-2 font-medium">Clock Out</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {staffRows.map(s => {
                const rec = att.find(a=> a.staffId===s.id && a.date===date && (s.shiftId ? (a.shiftId||'')===s.shiftId : true)) || att.find(a=> a.staffId===s.id && a.date===date) || null
                const canClockIn = !(rec && rec.clockIn)
                const canClockOut = !(rec && rec.clockOut)
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-2">{s.name}</td>
                    <td className="px-4 py-2">{s.position || '—'}</td>
                    <td className="px-4 py-2">{s.phone || '—'}</td>
                    <td className="px-4 py-2">{shiftName(s.shiftId)}</td>
                    <td className="px-4 py-2">{rec?.clockIn || '—'}</td>
                    <td className="px-4 py-2">{rec?.clockOut || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button disabled={!canClockIn} onClick={()=>quickClockRow(s,'in')} className={`rounded-md border px-2 py-1 text-xs ${canClockIn? 'border-slate-300 hover:bg-slate-50' : 'border-slate-200 text-slate-400 cursor-not-allowed'}`}>Clock In</button>
                        <button disabled={!canClockOut} onClick={()=>quickClockRow(s,'out')} className={`rounded-md border px-2 py-1 text-xs ${canClockOut? 'border-slate-300 hover:bg-slate-50' : 'border-slate-200 text-slate-400 cursor-not-allowed'}`}>Clock Out</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {staffRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">No staff records</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div>
            {total > 0 ? (
              <>Showing {Math.min((page-1)*limit + 1, total)}-{Math.min((page-1)*limit + staffRows.length, total)} of {total}</>
            ) : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
