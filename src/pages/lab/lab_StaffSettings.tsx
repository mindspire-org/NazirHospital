import { useEffect, useMemo, useState } from 'react'
import { labApi } from '../../utils/api'

type Shift = {
  id: string
  name: string
  start: string
  end: string
  
  absentCharges?: number
  lateDeduction?: number
  earlyOutDeduction?: number
}

export default function Pharmacy_StaffSettings(){
  const [shifts, setShifts] = useState<Shift[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(()=>{
    let mounted = true
    ;(async () => {
      try {
        const res = await labApi.listShifts()
        if (!mounted) return
        const mapped: Shift[] = (res.items||[]).map((x:any)=>({
          id: x._id,
          name: x.name,
          start: x.start,
          end: x.end,
          
          absentCharges: Number(x.absentCharges||0),
          lateDeduction: Number(x.lateDeduction||0),
          earlyOutDeduction: Number(x.earlyOutDeduction||0),
        }))
        setShifts(mapped)
      } catch(e){ console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [])

  const update = (i: number, patch: Partial<Shift>) => {
    setShifts(s => { const next = [...s]; next[i] = { ...next[i], ...patch } as Shift; return next })
  }

  const addShift = async () => {
    const created = await labApi.createShift({ name: `Shift ${shifts.length+1}`, start: '09:00', end: '17:00', absentCharges: 0, lateDeduction: 0, earlyOutDeduction: 0 })
    setShifts(s => [...s, {
      id: created._id,
      name: created.name,
      start: created.start,
      end: created.end,
      
      absentCharges: Number(created.absentCharges||0),
      lateDeduction: Number(created.lateDeduction||0),
      earlyOutDeduction: Number(created.earlyOutDeduction||0),
    }])
  }
  const removeShift = async (id: string) => {
    await labApi.deleteShift(id)
    setShifts(s => s.filter(x=>x.id!==id))
  }

  const save = async () => {
    setSaving(true)
    try {
      // Persist updates for all shifts
      await Promise.all(shifts.map(sh => labApi.updateShift(sh.id, {
        name: sh.name,
        start: sh.start,
        end: sh.end,
        
        absentCharges: sh.absentCharges||0,
        lateDeduction: sh.lateDeduction||0,
        earlyOutDeduction: sh.earlyOutDeduction||0,
      })))
    } finally {
      setTimeout(()=>setSaving(false), 300)
    }
  }

  const total = useMemo(()=> shifts.length, [shifts.length])

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Staff Settings</div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold text-slate-800">Shifts</div>
          <div className="ml-auto text-sm text-slate-600">Total: {total}</div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shifts.map((sh, i)=> (
            <div key={sh.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <input value={sh.name} onChange={e=>update(i,{ name: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Shift name" />
                <button onClick={()=>removeShift(sh.id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Remove</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <label className="block">
                  <span className="block text-xs text-slate-600">Start</span>
                  <input type="time" value={sh.start} onChange={e=>update(i,{ start: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1" />
                </label>
                <label className="block">
                  <span className="block text-xs text-slate-600">End</span>
                  <input type="time" value={sh.end} onChange={e=>update(i,{ end: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1" />
                </label>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <label className="block">
                  <span className="block text-xs text-slate-600">Absent Charges (Rs)</span>
                  <input type="number" value={sh.absentCharges||0} onChange={e=>update(i,{ absentCharges: Math.max(0, Number(e.target.value||'0')) })} className="w-full rounded-md border border-slate-300 px-2 py-1" />
                </label>
                <label className="block">
                  <span className="block text-xs text-slate-600">Late Deduction (Rs)</span>
                  <input type="number" value={sh.lateDeduction||0} onChange={e=>update(i,{ lateDeduction: Math.max(0, Number(e.target.value||'0')) })} className="w-full rounded-md border border-slate-300 px-2 py-1" />
                </label>
                <label className="block">
                  <span className="block text-xs text-slate-600">Early Out Deduction (Rs)</span>
                  <input type="number" value={sh.earlyOutDeduction||0} onChange={e=>update(i,{ earlyOutDeduction: Math.max(0, Number(e.target.value||'0')) })} className="w-full rounded-md border border-slate-300 px-2 py-1" />
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={addShift} className="btn-outline-navy">Add Shift</button>
          <button onClick={save} disabled={saving} className="btn disabled:opacity-50">{saving? 'Saving...' : 'Save Shifts'}</button>
        </div>
        <div className="mt-2 text-xs text-slate-500">Tip: Night shift that ends next day is supported by using an end time smaller than start time (e.g., 20:00 to 08:00).</div>
      </div>
    </div>
  )
}
