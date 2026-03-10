import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_ErConsultantNotes({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; text: string; doctorName?: string; sign?: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listErClinicalNotes(encounterId, { type: 'consultant', limit: 200 }) as any
      const items = (res.notes || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.recordedAt || n.createdAt || ''),
        text: String((n.data||{}).text || ''),
        doctorName: n.doctorName || '',
        sign: n.sign || '',
      }))
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; text?: string; doctorName?: string; sign?: string }) => {
    try{
      const when = d.when || new Date().toISOString()
      await hospitalApi.createErClinicalNote(encounterId, {
        type: 'consultant',
        recordedAt: when,
        doctorName: d.doctorName,
        sign: d.sign,
        data: { text: d.text || '' },
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add consultant note') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">CONSULTANT / MO / WMO - NOTES</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Note</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No notes yet.</div>
      ) : (
        <ul className="space-y-2 text-sm text-slate-800">
          {rows.map(r => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="whitespace-pre-wrap">{r.text || '-'}</div>
                <div className="text-right text-xs text-slate-600">
                  <div>{new Date(r.when).toLocaleString()}</div>
                  {r.doctorName ? <div>Dr: {r.doctorName}</div> : null}
                  {r.sign ? <div>Sign: {r.sign}</div> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <NoteDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function NoteDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; text?: string; doctorName?: string; sign?: string })=>void }){
  if(!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      when: String(fd.get('when')||''),
      text: String(fd.get('text')||''),
      doctorName: String(fd.get('doctorName')||''),
      sign: String(fd.get('sign')||''),
    })
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Consultant Note</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Date/Time</label>
              <input name="when" type="datetime-local" defaultValue={new Date().toISOString().slice(0,16)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Doctor Name</label>
              <input name="doctorName" placeholder="Doctor name" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Notes</label>
            <textarea name="text" rows={4} placeholder="Enter notes..." className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Sign</label>
            <input name="sign" placeholder="Signature" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
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
