import { useMemo, useState } from 'react'
import Hospital_Modal from './Hospital_Modal'

type BedRef = { id: string; label: string; floorId: string; locationType: 'room'|'ward'; locationId: string; charges?: number; category?: string }
type FloorRef = { id: string; name: string }
type RoomRef = { id: string; name: string; floorId: string }
type WardRef = { id: string; name: string; floorId: string }

type Props = {
  open: boolean
  onClose: () => void
  beds: BedRef[]
  floorsMap: Record<string, FloorRef>
  rooms: RoomRef[]
  wards: WardRef[]
  onUpdate: (id: string, data: { label?: string; charges?: number; category?: string }) => void
  onDelete: (id: string) => void
}

export default function Hospital_ManageBedsModal({ open, onClose, beds, floorsMap, rooms, wards, onUpdate, onDelete }: Props){
  const [edits, setEdits] = useState<Record<string, { label: string; charges: string; category: string }>>({})
  const bedsSorted = useMemo(() => [...beds].sort((a,b)=>a.label.localeCompare(b.label)), [beds])
  const titleOf = (b: BedRef) => {
    const locName = b.locationType === 'room' ? (rooms.find(r=>r.id===b.locationId)?.name || 'Room') : (wards.find(w=>w.id===b.locationId)?.name || 'Ward')
    const floorName = floorsMap[b.floorId]?.name || 'Floor'
    return `${locName} (${floorName})`
  }
  const startEdit = (b: BedRef) => setEdits(prev => ({ ...prev, [b.id]: { label: b.label, charges: b.charges!=null? String(b.charges):'', category: b.category || '' } }))
  const cancelEdit = (id: string) => setEdits(prev => { const c = { ...prev }; delete c[id]; return c })
  const save = (id: string) => {
    const e = edits[id]; if (!e) return
    const payload: any = {}
    if (e.label.trim()) payload.label = e.label.trim()
    if (e.charges.trim()) payload.charges = Number(e.charges)
    if (e.category.trim()) payload.category = e.category.trim()
    else payload.category = ''
    onUpdate(id, payload)
    cancelEdit(id)
  }
  return (
    <Hospital_Modal open={open} onClose={onClose}>
      <div className="px-1">
        <div className="text-lg font-semibold text-slate-800">Manage Beds</div>
        <div className="mt-4 space-y-3 max-h-[60vh] overflow-auto pr-1">
          {bedsSorted.map(b => {
            const e = edits[b.id]
            return (
              <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 p-3">
                {!e ? (
                  <>
                    <div>
                      <div className="font-medium text-slate-800">{b.label}</div>
                      <div className="text-xs text-slate-500">{titleOf(b)}</div>
                      <div className="text-xs text-slate-500">{b.category ? `Category: ${b.category}` : ''} {b.charges!=null?`Charges: ${b.charges}`:''}</div>
                    </div>
                    <div className="flex gap-2 md:ml-auto w-full md:w-auto">
                      <button onClick={() => startEdit(b)} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white">Edit</button>
                      <button onClick={() => onDelete(b.id)} className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white">Delete</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 grow flex-wrap items-center gap-2">
                      <input className="w-full md:w-56 rounded-md border border-slate-300 px-3 py-1.5" value={e.label} onChange={ev => setEdits(prev => ({ ...prev, [b.id]: { ...prev[b.id], label: ev.target.value } }))} />
                      <input placeholder="Charges" type="number" className="w-full md:w-40 rounded-md border border-slate-300 px-3 py-1.5" value={e.charges} onChange={ev => setEdits(prev => ({ ...prev, [b.id]: { ...prev[b.id], charges: ev.target.value } }))} />
                      <input placeholder="Category" className="w-full md:w-48 rounded-md border border-slate-300 px-3 py-1.5" value={e.category} onChange={ev => setEdits(prev => ({ ...prev, [b.id]: { ...prev[b.id], category: ev.target.value } }))} />
                    </div>
                    <div className="flex gap-2 md:ml-auto w-full md:w-auto">
                      <button onClick={() => save(b.id)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white">Save</button>
                      <button onClick={() => cancelEdit(b.id)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
          {!bedsSorted.length && <div className="text-sm text-slate-500">No beds</div>}
        </div>
      </div>
    </Hospital_Modal>
  )
}
