import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_IpdAnesPostRecovery({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; bp?: string; pulse?: string; rr?: string; spo2?: string; pain?: string; temp?: string; aldreteScore?: string; vomiting?: string; shivering?: string; siteBleedingHematoma?: string; doctorName?: string; sign?: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-post-recovery', limit: 200 }) as any
      const items = (res.notes || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.recordedAt || n.createdAt || ''),
        bp: (n.data||{}).bp || '',
        pulse: (n.data||{}).pulse || '',
        rr: (n.data||{}).rr || '',
        spo2: (n.data||{}).spo2 || '',
        pain: (n.data||{}).pain || '',
        temp: (n.data||{}).temp || '',
        aldreteScore: (n.data||{}).aldreteScore || '',
        vomiting: (n.data||{}).vomiting || '',
        shivering: (n.data||{}).shivering || '',
        siteBleedingHematoma: (n.data||{}).siteBleedingHematoma || '',
        doctorName: n.doctorName || '',
        sign: n.sign || '',
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; bp?: string; pulse?: string; rr?: string; spo2?: string; pain?: string; temp?: string; aldreteScore?: string; vomiting?: string; shivering?: string; siteBleedingHematoma?: string; doctorName?: string; sign?: string }) => {
    try{
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'anes-post-recovery',
        recordedAt: d.when || new Date().toISOString(),
        doctorName: d.doctorName,
        sign: d.sign,
        data: { bp: d.bp, pulse: d.pulse, rr: d.rr, spo2: d.spo2, pain: d.pain, temp: d.temp, aldreteScore: d.aldreteScore, vomiting: d.vomiting, shivering: d.shivering, siteBleedingHematoma: d.siteBleedingHematoma },
      })
      setOpen(false); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save post-recovery note') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Post Anesthesia Notes (at Shifting from Recovery Room)</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Post-Recovery Note</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No post-recovery notes yet.</div>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Date/Time</th>
              <th className="px-3 py-2">BP</th>
              <th className="px-3 py-2">Pulse</th>
              <th className="px-3 py-2">RR</th>
              <th className="px-3 py-2">SpO2</th>
              <th className="px-3 py-2">Pain</th>
              <th className="px-3 py-2">Temp</th>
              <th className="px-3 py-2">Aldrete</th>
              <th className="px-3 py-2">Vomiting</th>
              <th className="px-3 py-2">Shivering</th>
              <th className="px-3 py-2">Site Bleeding/Hematoma</th>
              <th className="px-3 py-2">Doctor/Sign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map(r => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-xs text-slate-600">{new Date(r.when).toLocaleString()}</td>
                <td className="px-3 py-2">{r.bp || '-'}</td>
                <td className="px-3 py-2">{r.pulse || '-'}</td>
                <td className="px-3 py-2">{r.rr || '-'}</td>
                <td className="px-3 py-2">{r.spo2 || '-'}</td>
                <td className="px-3 py-2">{r.pain || '-'}</td>
                <td className="px-3 py-2">{r.temp || '-'}</td>
                <td className="px-3 py-2">{r.aldreteScore || '-'}</td>
                <td className="px-3 py-2">{r.vomiting || '-'}</td>
                <td className="px-3 py-2">{r.shivering || '-'}</td>
                <td className="px-3 py-2">{r.siteBleedingHematoma || '-'}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{r.doctorName || ''} {r.sign ? ` / ${r.sign}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <PostRecDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function PostRecDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; bp?: string; pulse?: string; rr?: string; spo2?: string; pain?: string; temp?: string; aldreteScore?: string; vomiting?: string; shivering?: string; siteBleedingHematoma?: string; doctorName?: string; sign?: string })=>void }){
  if (!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => String(fd.get(k) || '')
    onSave({ when: get('when'), bp: get('bp'), pulse: get('pulse'), rr: get('rr'), spo2: get('spo2'), pain: get('pain'), temp: get('temp'), aldreteScore: get('aldreteScore'), vomiting: get('vomiting'), shivering: get('shivering'), siteBleedingHematoma: get('siteBleedingHematoma'), doctorName: get('doctorName'), sign: get('sign') })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Post-Recovery Note</div>
        <div className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="when">Date/Time</label>
            <input id="when" name="when" type="datetime-local" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          {['bp','pulse','rr','spo2','pain','temp','aldreteScore','vomiting','shivering','siteBleedingHematoma','doctorName','sign'].map(name => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={name}>{name.toUpperCase()}</label>
              <input id={name} name={name} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
