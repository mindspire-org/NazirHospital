import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function PreoperativeNotes({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; npoFrom?: string; maintainIV?: string; shavePrepare?: string; specialConsent?: string; medication?: string; specialInstructions?: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'preop', limit: 200 }) as any
      const items = (res.notes || []).map((n: any)=>{
        const d = n.data || {}
        return {
          id: String(n._id),
          when: String(n.recordedAt || n.createdAt || ''),
          npoFrom: d.npoFrom || '',
          maintainIV: d.maintainIV || '',
          shavePrepare: d.shavePrepare || '',
          specialConsent: d.specialConsent || '',
          medication: d.medication || '',
          specialInstructions: d.specialInstructions || '',
        }
      })
      setRows(items)
    }catch{}
  }

  const add = async (d: { npoFrom?: string; maintainIV?: string; shavePrepare?: string; specialConsent?: string; medication?: string; specialInstructions?: string; when?: string }) => {
    try{
      const when = d.when || new Date().toISOString()
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'preop',
        recordedAt: when,
        data: {
          npoFrom: d.npoFrom,
          maintainIV: d.maintainIV,
          shavePrepare: d.shavePrepare,
          specialConsent: d.specialConsent,
          medication: d.medication,
          specialInstructions: d.specialInstructions,
        },
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add pre-operative note') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Pre-Operative Notes</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Pre-Op Note</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No pre-operative notes yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Date/Time</th>
                <th className="px-3 py-2 font-medium">NPO From</th>
                <th className="px-3 py-2 font-medium">Maintain I/V Line</th>
                <th className="px-3 py-2 font-medium">Shave & Prepare / Mark Site</th>
                <th className="px-3 py-2 font-medium">Special Consent</th>
                <th className="px-3 py-2 font-medium">Medication</th>
                <th className="px-3 py-2 font-medium">Special Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-xs text-slate-600">{new Date(r.when).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.npoFrom || '-'}</td>
                  <td className="px-3 py-2">{r.maintainIV || '-'}</td>
                  <td className="px-3 py-2">{r.shavePrepare || '-'}</td>
                  <td className="px-3 py-2">{r.specialConsent || '-'}</td>
                  <td className="px-3 py-2">{r.medication || '-'}</td>
                  <td className="px-3 py-2">{r.specialInstructions || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PreopDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function PreopDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { npoFrom?: string; maintainIV?: string; shavePrepare?: string; specialConsent?: string; medication?: string; specialInstructions?: string; when?: string })=>void }){
  if(!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      when: String(fd.get('when')||''),
      npoFrom: String(fd.get('npoFrom')||''),
      maintainIV: String(fd.get('maintainIV')||''),
      shavePrepare: String(fd.get('shavePrepare')||''),
      specialConsent: String(fd.get('specialConsent')||''),
      medication: String(fd.get('medication')||''),
      specialInstructions: String(fd.get('specialInstructions')||''),
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Pre-Operative Note</div>
        <div className="px-5 py-4 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="preop-when" className="block text-xs font-medium text-slate-600">Date/Time</label>
              <input id="preop-when" name="when" type="datetime-local" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="preop-npo" className="block text-xs font-medium text-slate-600">NPO From</label>
              <input id="preop-npo" name="npoFrom" placeholder="e.g. 12:00 AM" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="preop-iv" className="block text-xs font-medium text-slate-600">Maintain I/V Line</label>
              <input id="preop-iv" name="maintainIV" placeholder="e.g. Yes / 18G cannula" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="preop-shave" className="block text-xs font-medium text-slate-600">Shave & prepare / mark site</label>
              <input id="preop-shave" name="shavePrepare" placeholder="details" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="preop-consent" className="block text-xs font-medium text-slate-600">Take Special Consent</label>
              <input id="preop-consent" name="specialConsent" placeholder="e.g. Taken / Pending" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="preop-medication" className="block text-xs font-medium text-slate-600">Medication</label>
              <textarea id="preop-medication" name="medication" className="h-20 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="preop-instructions" className="block text-xs font-medium text-slate-600">Special Instructions</label>
              <textarea id="preop-instructions" name="specialInstructions" className="h-20 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
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
