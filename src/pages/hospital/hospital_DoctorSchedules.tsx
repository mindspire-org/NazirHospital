import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

function todayIso(){ return new Date().toISOString().slice(0,10) }

type Doctor = { id: string; name: string }

type Schedule = {
  _id: string
  doctorId: string
  departmentId?: string
  dateIso: string
  startTime: string
  endTime: string
  slotMinutes: number
  fee?: number
  followupFee?: number
  notes?: string
}

export default function Hospital_DoctorSchedules(){
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [doctorId, setDoctorId] = useState('')
  const [rows, setRows] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [anchorDate, setAnchorDate] = useState(todayIso())
  const [weeklyDeptId, setWeeklyDeptId] = useState('')
  const [applying, setApplying] = useState(false)
  const [weekly, setWeekly] = useState<Array<{ enabled: boolean; startTime: string; endTime: string; slotMinutes: string; fee: string; followupFee: string; notes: string }>>(()=> Array.from({ length: 7 }, ()=>({ enabled: false, startTime: '09:00', endTime: '12:00', slotMinutes: '30', fee: '', followupFee: '', notes: '' })))
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const [editingId, setEditingId] = useState<string>('')
  const [rowForm, setRowForm] = useState({ departmentId: '', startTime: '09:00', endTime: '12:00', slotMinutes: '30', fee: '', followupFee: '', notes: '' })
  const [slotFor, setSlotFor] = useState<string>('')
  const [slotRows, setSlotRows] = useState<Array<{ slotNo: number; start: string; end: string; status: 'free'|'appt'|'token'; appt?: any }>>([])
  const [slotLoading, setSlotLoading] = useState(false)

  useEffect(()=>{ (async()=>{
    try{
      const [docRes, depRes] = await Promise.all([ hospitalApi.listDoctors() as any, hospitalApi.listDepartments() as any ])
      setDoctors(((docRes?.doctors)||[]).map((d:any)=>({ id: String(d._id), name: d.name })))
      setDepartments(((depRes?.departments)||[]).map((d:any)=>({ id: String(d._id), name: d.name })))
    }catch{}
  })() }, [])

  useEffect(()=>{ if(doctorId && anchorDate) load() }, [doctorId, anchorDate])

  async function load(){
    setLoading(true)
    try{
      const res = await hospitalApi.listDoctorSchedules({ doctorId, date: anchorDate }) as any
      setRows(res?.schedules || [])
    }catch{
      // Fallback: some backends 500 on certain doctorId filters; retry without doctor filter and filter client-side
      try{
        const resAll = await hospitalApi.listDoctorSchedules({ date: anchorDate }) as any
        const all: any[] = resAll?.schedules || []
        const filtered = doctorId ? all.filter((r:any)=> String(r.doctorId||'') === String(doctorId)) : all
        setRows(filtered)
      }catch{ setRows([]) }
    }
    setLoading(false)
  }

  const remove = async (id: string)=>{
    if (!confirm('Delete this schedule?')) return
    try { await hospitalApi.deleteDoctorSchedule(id); await load() } catch(e:any){ alert(e?.message || 'Failed to delete') }
  }

  function beginEdit(s: Schedule){
    setEditingId(s._id)
    setRowForm({ departmentId: String(s.departmentId||''), startTime: s.startTime, endTime: s.endTime, slotMinutes: String(s.slotMinutes||15), fee: s.fee!=null?String(s.fee):'', followupFee: s.followupFee!=null?String(s.followupFee):'', notes: s.notes||'' })
  }

  async function saveEdit(id: string){
    try{
      await hospitalApi.updateDoctorSchedule(id, {
        departmentId: rowForm.departmentId || undefined,
        startTime: rowForm.startTime,
        endTime: rowForm.endTime,
        slotMinutes: Math.max(5, parseInt(rowForm.slotMinutes||'15',10) || 15),
        fee: rowForm.fee ? Number(rowForm.fee) : undefined,
        followupFee: rowForm.followupFee ? Number(rowForm.followupFee) : undefined,
        notes: rowForm.notes || undefined,
      })
      setEditingId('')
      await load()
    }catch(e:any){ alert(e?.message || 'Failed to update schedule') }
  }

  async function saveWeeklyPattern(){
    if (!doctorId) { alert('Select doctor'); return }
    // Basic validation to avoid server 500 on invalid IDs
    if (!/^[0-9a-fA-F]{24}$/.test(String(doctorId))) {
      alert('Selected doctor has an invalid ID format. Please pick a doctor created in this module.');
      return
    }
    const days = weekly.map((d,i)=>({
      day: i,
      enabled: !!d.enabled,
      startTime: d.enabled ? d.startTime : undefined,
      endTime: d.enabled ? d.endTime : undefined,
      slotMinutes: d.enabled ? Math.max(5, parseInt(d.slotMinutes||'15',10) || 15) : undefined,
      fee: d.enabled && d.fee ? Number(d.fee) : undefined,
      followupFee: d.enabled && d.followupFee ? Number(d.followupFee) : undefined,
      notes: d.enabled && d.notes ? d.notes : undefined,
    }))
    setApplying(true)
    try{
      await hospitalApi.applyDoctorWeeklyPattern({ doctorId, departmentId: weeklyDeptId || undefined, anchorDate, weeks: 52, days })
      alert('Weekly pattern saved')
      await load()
    }catch(e:any){ alert(e?.message || 'Failed to save weekly pattern') }
    setApplying(false)
  }

  function toMin(hhmm: string){ const [h,m] = (hhmm||'').split(':').map(x=>parseInt(x,10)||0); return (h*60)+m }
  function fromMin(min: number){ const h = Math.floor(min/60).toString().padStart(2,'0'); const m = (min%60).toString().padStart(2,'0'); return `${h}:${m}` }

  async function toggleSlots(s: Schedule){
    if (slotFor === s._id){ setSlotFor(''); setSlotRows([]); return }
    setSlotLoading(true)
    try{
      const [ap, tk]: any = await Promise.all([
        hospitalApi.listAppointments({ scheduleId: String(s._id) }),
        hospitalApi.listTokens({ scheduleId: String(s._id) }),
      ])
      const appts: any[] = ap?.appointments || []
      const usedTokens = new Set<number>((tk?.tokens || []).map((t:any)=> Number(t.slotNo||0)).filter(Boolean))
      const slotMinutes = Math.max(5, Number(s.slotMinutes||15))
      const total = Math.max(0, Math.floor((toMin(s.endTime) - toMin(s.startTime)) / slotMinutes))
      const rows: Array<{ slotNo: number; start: string; end: string; status: 'free'|'appt'|'token'; appt?: any }> = []
      for (let i=1;i<=total;i++){
        const startMin = toMin(s.startTime) + (i-1)*slotMinutes
        const se = { start: fromMin(startMin), end: fromMin(startMin + slotMinutes) }
        const appt = appts.find(a => Number(a.slotNo||0) === i && ['booked','confirmed','checked-in'].includes(String(a.status||'')))
        if (appt) rows.push({ slotNo: i, ...se, status: 'appt', appt })
        else if (usedTokens.has(i)) rows.push({ slotNo: i, ...se, status: 'token' })
        else rows.push({ slotNo: i, ...se, status: 'free' })
      }
      setSlotRows(rows)
      setSlotFor(s._id)
    } catch {
      setSlotRows([]); setSlotFor(s._id)
    }
    setSlotLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold text-slate-800">Doctor Schedules</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-medium text-slate-800">Weekly Pattern (Forever)</div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Doctor</label>
            <select value={doctorId} onChange={e=>setDoctorId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select doctor</option>
              {doctors.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Date (preview)</label>
            <input type="date" value={anchorDate} onChange={e=>setAnchorDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Department (optional)</label>
            <select value={weeklyDeptId} onChange={e=>setWeeklyDeptId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Not set</option>
              {departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Day</th>
                <th className="px-3 py-2 text-left">Enable</th>
                <th className="px-3 py-2 text-left">Start</th>
                <th className="px-3 py-2 text-left">End</th>
                <th className="px-3 py-2 text-left">Slot</th>
                <th className="px-3 py-2 text-left">Fee</th>
                <th className="px-3 py-2 text-left">Follow-up</th>
                <th className="px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((d, i)=>{
                const dis = !d.enabled
                return (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2">{dayLabels[i]}</td>
                    <td className="px-3 py-2"><input type="checkbox" checked={d.enabled} onChange={e=> setWeekly(w=> w.map((r,idx)=> idx===i? { ...r, enabled: e.target.checked } : r))} /></td>
                    <td className="px-3 py-2"><input type="time" disabled={dis} value={d.startTime} onChange={e=> setWeekly(w=> w.map((r,idx)=> idx===i? { ...r, startTime: e.target.value } : r))} className="w-32 rounded-md border border-slate-300 px-2 py-1" /></td>
                    <td className="px-3 py-2"><input type="time" disabled={dis} value={d.endTime} onChange={e=> setWeekly(w=> w.map((r,idx)=> idx===i? { ...r, endTime: e.target.value } : r))} className="w-32 rounded-md border border-slate-300 px-2 py-1" /></td>
                    <td className="px-3 py-2"><input type="number" disabled={dis} value={d.slotMinutes} onChange={e=> setWeekly(w=> w.map((r,idx)=> idx===i? { ...r, slotMinutes: e.target.value } : r))} className="w-20 rounded-md border border-slate-300 px-2 py-1" /></td>
                    <td className="px-3 py-2"><input disabled={dis} value={d.fee} onChange={e=> setWeekly(w=> w.map((r,idx)=> idx===i? { ...r, fee: e.target.value } : r))} className="w-24 rounded-md border border-slate-300 px-2 py-1" /></td>
                    <td className="px-3 py-2"><input disabled={dis} value={d.followupFee} onChange={e=> setWeekly(w=> w.map((r,idx)=> idx===i? { ...r, followupFee: e.target.value } : r))} className="w-24 rounded-md border border-slate-300 px-2 py-1" /></td>
                    <td className="px-3 py-2"><input disabled={dis} value={d.notes} onChange={e=> setWeekly(w=> w.map((r,idx)=> idx===i? { ...r, notes: e.target.value } : r))} className="w-full rounded-md border border-slate-300 px-2 py-1" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-end">
          <button onClick={saveWeeklyPattern} disabled={applying} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">{applying? 'Saving...' : 'Save Weekly Pattern'}</button>
        </div>
      </div>

      

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
          <div className="font-medium text-slate-800">Schedules on {anchorDate || '-'}</div>
          <div className="text-slate-600">{loading? 'Loading...' : `${rows.length} item(s)`}</div>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Doctor</th>
              <th className="px-3 py-2 text-left">Dept</th>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Slot</th>
              <th className="px-3 py-2 text-left">Fees</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => {
              const isEdit = editingId === s._id
              return (
                <>
                <tr key={s._id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{doctors.find(d=>d.id===s.doctorId)?.name || s.doctorId}</td>
                  <td className="px-3 py-2">
                    {isEdit ? (
                      <select value={rowForm.departmentId} onChange={e=>setRowForm(v=>({ ...v, departmentId: e.target.value }))} className="rounded-md border border-slate-300 px-2 py-1">
                        <option value="">Not set</option>
                        {departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    ) : (
                      departments.find(d=>d.id===s.departmentId)?.name || '-'
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {isEdit ? (
                      <div className="flex items-center gap-2">
                        <input type="time" value={rowForm.startTime} onChange={e=>setRowForm(v=>({ ...v, startTime: e.target.value }))} className="w-28 rounded-md border border-slate-300 px-2 py-1" />
                        <span>-</span>
                        <input type="time" value={rowForm.endTime} onChange={e=>setRowForm(v=>({ ...v, endTime: e.target.value }))} className="w-28 rounded-md border border-slate-300 px-2 py-1" />
                      </div>
                    ) : (
                      `${s.startTime} - ${s.endTime}`
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEdit ? (
                      <input type="number" value={rowForm.slotMinutes} onChange={e=>setRowForm(v=>({ ...v, slotMinutes: e.target.value }))} className="w-20 rounded-md border border-slate-300 px-2 py-1" />
                    ) : (
                      `${s.slotMinutes} min`
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEdit ? (
                      <div className="flex items-center gap-2">
                        <input value={rowForm.fee} onChange={e=>setRowForm(v=>({ ...v, fee: e.target.value }))} placeholder="Fee" className="w-24 rounded-md border border-slate-300 px-2 py-1" />
                        <input value={rowForm.followupFee} onChange={e=>setRowForm(v=>({ ...v, followupFee: e.target.value }))} placeholder="Follow-up" className="w-24 rounded-md border border-slate-300 px-2 py-1" />
                        <input value={rowForm.notes} onChange={e=>setRowForm(v=>({ ...v, notes: e.target.value }))} placeholder="Notes" className="w-40 rounded-md border border-slate-300 px-2 py-1" />
                      </div>
                    ) : (
                      s.fee!=null? `Rs. ${s.fee}`:'-'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {isEdit ? (
                        <>
                          <button onClick={()=>saveEdit(s._id)} className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Save</button>
                          <button onClick={()=>setEditingId('')} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">Cancel</button>
                        </>
                      ) : (
                        <button onClick={()=>beginEdit(s)} className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-sky-700">Edit</button>
                      )}
                      <button onClick={()=>toggleSlots(s)} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700">{slotFor===s._id? 'Hide Slots' : 'View Slots'}</button>
                      <button onClick={()=>remove(s._id)} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700">Delete</button>
                    </div>
                  </td>
                </tr>
                {slotFor===s._id && (
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="px-3 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-medium text-slate-700">Slots for {s.startTime} - {s.endTime} • {s.slotMinutes} min</div>
                        <button onClick={()=>toggleSlots(s)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">{slotLoading? 'Loading...' : 'Refresh'}</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {slotRows.map(r => {
                          const base = r.status==='free' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : (r.status==='appt' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-700')
                          return (
                            <div key={r.slotNo} className={`rounded-md border px-2 py-1 text-xs ${base}`}>
                              {r.slotNo}
                            </div>
                          )
                        })}
                        {slotRows.length===0 && (
                          <div className="text-xs text-slate-500">No slots</div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
              )
            })}
            {rows.length===0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No schedules</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
