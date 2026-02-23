import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type VisitRow = {
  _id: string
  when: string
  doctorName?: string
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
}

export default function DailyProgressSheet({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<VisitRow[]>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdDoctorVisits(encounterId, { limit: 200 }) as any
      const items = (res?.visits || []).map((v: any)=>({
        _id: String(v._id),
        when: String(v.when || v.createdAt || new Date().toISOString()),
        doctorName: v?.doctorId?.name,
        subjective: v.subjective,
        objective: v.objective,
        assessment: v.assessment,
        plan: v.plan,
      })) as VisitRow[]
      const filtered = items.filter(r => {
        const s = (r.subjective||'').trim()
        const o = (r.objective||'').trim()
        const a = (r.assessment||'').trim()
        const p = (r.plan||'').trim()
        return !!(s || o || a || p)
      })
      filtered.sort((a,b)=> new Date(b.when).getTime() - new Date(a.when).getTime())
      setRows(filtered)
    }catch{}
  }

  async function handleCreate(d: { doctorId?: string; date?: string; time?: string; subjective?: string; objective?: string; assessment?: string; plan?: string }){
    try{
      const hasAny = [d.subjective, d.objective, d.assessment, d.plan].some(x => (x||'').trim().length>0)
      if (!hasAny){ alert('Please enter at least one of Subjective, Objective, Assessment, or Plan'); return }
      const when = d.date && d.time ? `${d.date}T${d.time}` : undefined
      await hospitalApi.createIpdDoctorVisit(encounterId, {
        doctorId: d.doctorId,
        when,
        subjective: d.subjective,
        objective: d.objective,
        assessment: d.assessment,
        plan: d.plan,
      })
      await reload(); setOpen(false)
    }catch(e: any){ alert(e?.message || 'Failed to create progress entry') }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="text-lg font-semibold text-slate-900">Daily Progress Sheet</div>
        <button className="btn" onClick={()=>setOpen(true)}>Add Progress</button>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-6 text-slate-500">No progress entries yet.</div>
      ) : (
        <div className="overflow-x-auto p-4">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Subjective</th>
                <th className="px-3 py-2 font-medium">Objective</th>
                <th className="px-3 py-2 font-medium">Assessment</th>
                <th className="px-3 py-2 font-medium">Plan</th>
                <th className="px-3 py-2 font-medium">Doctor Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(r => {
                const d = new Date(r.when)
                const date = d.toISOString().slice(0,10)
                const time = d.toTimeString().slice(0,5)
                return (
                  <tr key={r._id}>
                    <td className="px-3 py-2 text-xs text-slate-600">{date}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{time}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{r.subjective || '-'}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{r.objective || '-'}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{r.assessment || '-'}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{r.plan || '-'}</td>
                    <td className="px-3 py-2">{r.doctorName || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <DailyProgressDialog open={open} onClose={()=>setOpen(false)} onSave={handleCreate} />
    </div>
  )
}

function DailyProgressDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { doctorId?: string; date?: string; time?: string; subjective?: string; objective?: string; assessment?: string; plan?: string })=>void }){
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  useEffect(()=>{ if(open){ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() } }, [open])
  if(!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      doctorId: String(fd.get('doctorId')||''),
      date: String(fd.get('date')||''),
      time: String(fd.get('time')||''),
      subjective: String(fd.get('subjective')||''),
      objective: String(fd.get('objective')||''),
      assessment: String(fd.get('assessment')||''),
      plan: String(fd.get('plan')||''),
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Daily Progress</div>
        <div className="px-5 py-4 text-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="prog-date" className="block text-xs font-medium text-slate-600">Date</label>
              <input id="prog-date" name="date" type="date" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="prog-time" className="block text-xs font-medium text-slate-600">Time</label>
              <input id="prog-time" name="time" type="time" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="prog-doctor" className="block text-xs font-medium text-slate-600">Doctor</label>
              <select id="prog-doctor" name="doctorId" className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="">Select doctor</option>
                {doctors.map(d => (<option key={d._id} value={d._id}>{d.name}</option>))}
              </select>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="prog-subj" className="block text-xs font-medium text-slate-600">Subjective</label>
              <textarea id="prog-subj" name="subjective" rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="prog-obj" className="block text-xs font-medium text-slate-600">Objective</label>
              <textarea id="prog-obj" name="objective" rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="prog-asm" className="block text-xs font-medium text-slate-600">Assessment</label>
              <textarea id="prog-asm" name="assessment" rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="prog-plan" className="block text-xs font-medium text-slate-600">Plan</label>
              <textarea id="prog-plan" name="plan" rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2" />
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
