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

  async function save(items: Array<{ name: string; dose: string; freq: string; start: string }>) {
    try {
      for (const d of items) {
        const name = String(d?.name || '').trim()
        const dose = String(d?.dose || '').trim()
        const freq = String(d?.freq || '').trim()
        const start = String(d?.start || '').trim()
        if (!name && !dose && !freq && !start) continue
        await hospitalApi.createIpdMedOrder(encounterId, { drugName: name, dose, frequency: freq, startAt: start || undefined })
      }
      setOpen(false)
      await reload()
    } catch (e: any) {
      alert(e?.message || 'Failed to add medication')
    }
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

function MedicationDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (items: Array<{ name: string; dose: string; freq: string; start: string }>) => void
}){
  const [items, setItems] = useState<Array<{ name: string; dose: string; freq: string; start: string }>>([
    { name: '', dose: '', freq: '', start: '' },
  ])

  useEffect(() => {
    if (open) {
      setItems([{ name: '', dose: '', freq: '', start: '' }])
    }
  }, [open])

  if(!open) return null

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSave(items)
  }

  const addRow = () => setItems([...items, { name: '', dose: '', freq: '', start: '' }])
  const removeRow = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateRow = (idx: number, patch: Partial<{ name: string; dose: string; freq: string; start: string }>) =>
    setItems(items.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Medication</div>
        <div className="space-y-4 px-5 py-4 text-sm">
          {items.map((row, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-700">Medicine #{idx + 1}</div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeRow(idx)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Remove</button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Name</label>
                  <input
                    value={row.name}
                    onChange={(e) => updateRow(idx, { name: e.target.value })}
                    placeholder="Medicine name"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Dose</label>
                  <input
                    value={row.dose}
                    onChange={(e) => updateRow(idx, { dose: e.target.value })}
                    placeholder="e.g. 500mg"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Frequency</label>
                  <input
                    value={row.freq}
                    onChange={(e) => updateRow(idx, { freq: e.target.value })}
                    placeholder="e.g. BID"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600">Start Date</label>
                  <input
                    value={row.start}
                    onChange={(e) => updateRow(idx, { start: e.target.value })}
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addRow} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Add more
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
