import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function DailyMonitoring({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; date: string; time: string; bp?: string; temp?: string; pulse?: string; resp?: string; bsr?: string; intakeIV?: string; urine?: string; nurseSign?: string; shift?: 'morning'|'evening'|'night' }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdVitals(encounterId, { limit: 200 }) as any
      const docs = (res.vitals || []) as any[]
      docs.sort((a: any, b: any)=> new Date(String(b.recordedAt || b.createdAt || 0)).getTime() - new Date(String(a.recordedAt || a.createdAt || 0)).getTime())
      const vitRows = docs.map((v: any)=>{
        const d = new Date(String(v.recordedAt || v.createdAt || new Date().toISOString()))
        const date = d.toISOString().slice(0,10)
        const time = d.toTimeString().slice(0,5)
        return {
          id: String(v._id),
          date,
          time,
          bp: v.bp || '',
          temp: v.temp!=null ? String(v.temp) : '',
          pulse: v.hr!=null ? String(v.hr) : '',
          resp: v.rr!=null ? String(v.rr) : '',
          bsr: v.bsr!=null ? String(v.bsr) : '',
          intakeIV: v.intakeIV || '',
          urine: v.urine || '',
          nurseSign: v.nurseSign || '',
          shift: v.shift,
        }
      })
      setRows(vitRows)
    }catch{}
  }

  async function save(d: { date?: string; time?: string; bp?: string; temp?: string; pulse?: string; resp?: string; bsr?: string; intakeIV?: string; urine?: string; nurseSign?: string; shift?: 'morning'|'evening'|'night' }){
    try{
      const recordedAt = (d.date && d.time) ? new Date(`${d.date}T${d.time}`).toISOString() : new Date().toISOString()
      await hospitalApi.createIpdVital(encounterId, {
        recordedAt,
        bp: d.bp,
        temp: d.temp ? parseFloat(d.temp) : undefined,
        hr: d.pulse ? parseFloat(d.pulse) : undefined,
        rr: d.resp ? parseFloat(d.resp) : undefined,
        bsr: d.bsr ? parseFloat(d.bsr) : undefined,
        intakeIV: d.intakeIV,
        urine: d.urine,
        nurseSign: d.nurseSign,
        shift: d.shift,
      })
      setOpen(false); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save monitoring entry') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Daily Monitoring Charts</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Monitoring Entry</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No vitals recorded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Shift</th>
                <th className="px-3 py-2 font-medium">B.P.</th>
                <th className="px-3 py-2 font-medium">Pulse</th>
                <th className="px-3 py-2 font-medium">Temp.</th>
                <th className="px-3 py-2 font-medium">Resp.</th>
                <th className="px-3 py-2 font-medium">BSR</th>
                <th className="px-3 py-2 font-medium">Intake I/V</th>
                <th className="px-3 py-2 font-medium">Urine</th>
                <th className="px-3 py-2 font-medium">Nurse Sign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Array.from(new Set(rows.map(v=>v.date)))
                .sort((a,b)=> new Date(b).getTime() - new Date(a).getTime())
                .map(date => (
                  <React.Fragment key={`date-${date}`}>
                    {(['morning','evening','night'] as const).map(shift => {
                      const srows = rows.filter(v => v.date===date && (v.shift||'')===shift)
                      if (srows.length === 0) return null
                      return (
                        <React.Fragment key={`grp-${date}-${shift}`}>
                          <tr>
                            <td colSpan={11} className="bg-slate-100 px-3 py-2 font-medium text-slate-700">{shift.charAt(0).toUpperCase()+shift.slice(1)} Shift — {date}</td>
                          </tr>
                          {srows.map(v => (
                            <tr key={v.id}>
                              <td className="px-3 py-2 text-xs text-slate-600">{v.date}</td>
                              <td className="px-3 py-2 text-xs text-slate-600">{v.time}</td>
                              <td className="px-3 py-2 capitalize">{v.shift || '-'}</td>
                              <td className="px-3 py-2">{v.bp || '-'}</td>
                              <td className="px-3 py-2">{v.pulse || '-'}</td>
                              <td className="px-3 py-2">{v.temp || '-'}</td>
                              <td className="px-3 py-2">{v.resp || '-'}</td>
                              <td className="px-3 py-2">{v.bsr || '-'}</td>
                              <td className="px-3 py-2">{v.intakeIV || '-'}</td>
                              <td className="px-3 py-2">{v.urine || '-'}</td>
                              <td className="px-3 py-2">{v.nurseSign || '-'}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      )
                    })}
                  </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <VitalsDialog open={open} onClose={()=>setOpen(false)} onSave={save} />
    </div>
  )
}

function VitalsDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { date?: string; time?: string; bp?: string; temp?: string; pulse?: string; resp?: string; bsr?: string; intakeIV?: string; urine?: string; nurseSign?: string; shift?: 'morning'|'evening'|'night' })=>void }){
  if(!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      date: String(fd.get('date')||''),
      time: String(fd.get('time')||''),
      shift: (String(fd.get('shift')||'') as any),
      bp: String(fd.get('bp')||''),
      pulse: String(fd.get('pulse')||''),
      temp: String(fd.get('temp')||''),
      resp: String(fd.get('resp')||''),
      bsr: String(fd.get('bsr')||''),
      intakeIV: String(fd.get('intakeIV')||''),
      urine: String(fd.get('urine')||''),
      nurseSign: String(fd.get('nurseSign')||''),
    })
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Daily Monitoring Entry</div>
        <div className="px-5 py-4 text-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="mon-date" className="block text-xs font-medium text-slate-600">Date</label>
              <input id="mon-date" name="date" type="date" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="mon-time" className="block text-xs font-medium text-slate-600">Time</label>
              <input id="mon-time" name="time" type="time" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="mon-shift" className="block text-xs font-medium text-slate-600">Shift</label>
              <select id="mon-shift" name="shift" className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="">Select</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </select>
            </div>
            <div>
              <label htmlFor="vital-bp" className="block text-xs font-medium text-slate-600">B.P.</label>
              <input id="vital-bp" name="bp" placeholder="e.g. 120/80" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="vital-pulse" className="block text-xs font-medium text-slate-600">Pulse</label>
              <input id="vital-pulse" name="pulse" placeholder="e.g. 72" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="vital-temp" className="block text-xs font-medium text-slate-600">Temp.</label>
              <input id="vital-temp" name="temp" placeholder="e.g. 98.6" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="vital-resp" className="block text-xs font-medium text-slate-600">Resp.</label>
              <input id="vital-resp" name="resp" placeholder="e.g. 16" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="vital-bsr" className="block text-xs font-medium text-slate-600">BSR</label>
              <input id="vital-bsr" name="bsr" type="number" step="0.1" placeholder="e.g. 120" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="vital-intake" className="block text-xs font-medium text-slate-600">Intake I/V</label>
              <input id="vital-intake" name="intakeIV" placeholder="e.g. 500ml" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="vital-urine" className="block text-xs font-medium text-slate-600">Urine</label>
              <input id="vital-urine" name="urine" placeholder="e.g. 300ml" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="vital-nurse" className="block text-xs font-medium text-slate-600">Nurse Sign</label>
              <input id="vital-nurse" name="nurseSign" placeholder="Signature/Name" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
