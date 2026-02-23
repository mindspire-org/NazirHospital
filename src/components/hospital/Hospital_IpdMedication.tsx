import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Medication({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; name: string; dose: string; freq: string; start: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdMedOrders(encounterId, { limit: 200 }) as any
      const items = (res.orders || []).map((o: any)=>({
        id: String(o._id),
        name: o.drugName || o.drugId || '',
        dose: o.dose || '',
        freq: o.frequency || '',
        start: String(o.startAt || o.createdAt || ''),
      }))
      setRows(items)
    }catch{}
  }

  async function save(d: { name: string; dose: string; freq: string; start: string }){
    try{
      await hospitalApi.createIpdMedOrder(encounterId, { drugName: d.name, dose: d.dose, frequency: d.freq, startAt: d.start || undefined })
      setOpen(false); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add medication') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Medication</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Medication</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No medications added.</div>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Dose</th>
              <th className="px-3 py-2 font-medium">Frequency</th>
              <th className="px-3 py-2 font-medium">Start</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map(m => (
              <tr key={m.id}>
                <td className="px-3 py-2">{m.name}</td>
                <td className="px-3 py-2">{m.dose}</td>
                <td className="px-3 py-2">{m.freq}</td>
                <td className="px-3 py-2">{m.start}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <MedicationDialog open={open} onClose={()=>setOpen(false)} onSave={save} />
    </div>
  )
}

function MedicationDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { name: string; dose: string; freq: string; start: string })=>void }){
  if(!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      name: String(fd.get('name')||''),
      dose: String(fd.get('dose')||''),
      freq: String(fd.get('freq')||''),
      start: String(fd.get('start')||''),
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Medication</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <label htmlFor="med-name" className="block text-xs font-medium text-slate-600">Name</label>
          <input id="med-name" name="name" placeholder="Medicine name" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <label htmlFor="med-dose" className="block text-xs font-medium text-slate-600">Dose</label>
          <input id="med-dose" name="dose" placeholder="e.g. 500mg" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <label htmlFor="med-freq" className="block text-xs font-medium text-slate-600">Frequency</label>
          <input id="med-freq" name="freq" placeholder="e.g. BID" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <label htmlFor="med-start" className="block text-xs font-medium text-slate-600">Start Date</label>
          <input id="med-start" name="start" type="date" className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
