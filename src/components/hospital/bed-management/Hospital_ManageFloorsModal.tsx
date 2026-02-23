import { useMemo, useState } from 'react'
import Hospital_Modal from './Hospital_Modal'

type FloorRef = { id: string; name: string; number?: string }

export default function Hospital_ManageFloorsModal({ open, onClose, floors, onUpdate, onDelete }: { open: boolean; onClose: () => void; floors: FloorRef[]; onUpdate: (id: string, data: { name?: string; number?: string }) => void; onDelete: (id: string) => void }){
  const [edits, setEdits] = useState<Record<string, { name: string; number: string }>>({})
  const rows = useMemo(() => floors.map(f => ({ ...f })), [floors])
  const startEdit = (f: FloorRef) => setEdits(prev => ({ ...prev, [f.id]: { name: f.name, number: f.number || '' } }))
  const cancelEdit = (id: string) => setEdits(prev => { const c = { ...prev }; delete c[id]; return c })
  const save = (id: string) => {
    const e = edits[id]
    if (!e) return
    const payload: any = {}
    if (e.name.trim()) payload.name = e.name.trim()
    if (e.number.trim()) payload.number = e.number.trim()
    else payload.number = ''
    onUpdate(id, payload)
    cancelEdit(id)
  }
  return (
    <Hospital_Modal open={open} onClose={onClose}>
      <div className="px-1">
        <div className="text-lg font-semibold text-slate-800">Manage Floors</div>
        <div className="mt-4 space-y-3">
          {rows.map(f => {
            const e = edits[f.id]
            return (
              <div key={f.id} className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center rounded-md border border-slate-200 p-3">
                {!e ? (
                  <>
                    <div>
                      <div className="font-medium text-slate-800">{f.name}</div>
                      <div className="text-xs text-slate-500">{f.number ? `No: ${f.number}` : ''}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(f)} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white">Edit</button>
                      <button onClick={() => onDelete(f.id)} className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white">Delete</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 grow flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
                      <input className="w-full rounded-md border border-slate-300 px-3 py-1.5 md:w-56" value={e.name} onChange={ev => setEdits(prev => ({ ...prev, [f.id]: { ...prev[f.id], name: ev.target.value } }))} />
                      <input placeholder="Number" className="w-full rounded-md border border-slate-300 px-3 py-1.5 md:w-32" value={e.number} onChange={ev => setEdits(prev => ({ ...prev, [f.id]: { ...prev[f.id], number: ev.target.value } }))} />
                    </div>
                    <div className="flex gap-2 md:ml-auto w-full md:w-auto">
                      <button onClick={() => save(f.id)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white">Save</button>
                      <button onClick={() => cancelEdit(f.id)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
          {!rows.length && <div className="text-sm text-slate-500">No floors</div>}
        </div>
      </div>
    </Hospital_Modal>
  )
}
