import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_IpdAnesAdverseEvents({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; anyEvent: boolean; details?: string; doctorName?: string; sign?: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-adverse', limit: 200 }) as any
      const items = (res.notes || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.recordedAt || n.createdAt || ''),
        anyEvent: !!((n.data||{}).anyEvent),
        details: (n.data||{}).details || '',
        doctorName: n.doctorName || '',
        sign: n.sign || '',
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; anyEvent?: string; details?: string; doctorName?: string; sign?: string }) => {
    try{
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'anes-adverse',
        recordedAt: d.when || new Date().toISOString(),
        doctorName: d.doctorName,
        sign: d.sign,
        data: { anyEvent: d.anyEvent === 'yes', details: d.details },
      })
      setOpen(false); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save adverse event') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Adverse Anesthesia Events</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Event</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No adverse events recorded.</div>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map(r => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <div>{new Date(r.when).toLocaleString()}</div>
                <div>{r.doctorName ? `Dr: ${r.doctorName}` : ''} {r.sign ? ` / ${r.sign}` : ''}</div>
              </div>
              <div className="mt-1">Any event: <span className="font-medium">{r.anyEvent ? 'Yes' : 'No'}</span></div>
              {r.details ? (<div className="mt-1 whitespace-pre-wrap">Details: {r.details}</div>) : null}
            </li>
          ))}
        </ul>
      )}
      <AdverseDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function AdverseDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; anyEvent?: string; details?: string; doctorName?: string; sign?: string })=>void }){
  if (!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => String(fd.get(k) || '')
    onSave({ when: get('when'), anyEvent: get('anyEvent'), details: get('details'), doctorName: get('doctorName'), sign: get('sign') })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Record Adverse Event</div>
        <div className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="when">Date/Time</label>
            <input id="when" name="when" type="datetime-local" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="anyEvent">Any Adverse Event</label>
            <select id="anyEvent" name="anyEvent" className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600" htmlFor="details">Details</label>
            <textarea id="details" name="details" className="h-28 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="doctorName">Doctor Name</label>
            <input id="doctorName" name="doctorName" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="sign">Sign</label>
            <input id="sign" name="sign" className="w-full rounded-md border border-slate-300 px-3 py-2" />
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
