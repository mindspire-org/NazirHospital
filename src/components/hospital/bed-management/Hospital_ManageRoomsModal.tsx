import { useMemo, useState } from 'react'
import Hospital_Modal from './Hospital_Modal'

type RoomRef = { id: string; name: string; floorId: string }

type FloorRef = { id: string; name: string }

type FloorsMap = Record<string, FloorRef>

export default function Hospital_ManageRoomsModal({ open, onClose, rooms, floors, floorsMap, onUpdate, onDelete }: { open: boolean; onClose: () => void; rooms: RoomRef[]; floors: FloorRef[]; floorsMap: FloorsMap; onUpdate: (id: string, data: { name?: string; floorId?: string }) => void; onDelete: (id: string) => void }) {
  const [edits, setEdits] = useState<Record<string, { name: string; floorId: string }>>({})
  const rows = useMemo(() => rooms.map(r => ({ ...r })), [rooms])
  const startEdit = (r: RoomRef) => setEdits(prev => ({ ...prev, [r.id]: { name: r.name, floorId: r.floorId } }))
  const cancelEdit = (id: string) => setEdits(prev => { const c = { ...prev }; delete c[id]; return c })
  const save = (id: string) => {
    const e = edits[id]
    if (!e) return
    const payload: any = {}
    if (e.name.trim()) payload.name = e.name.trim()
    if (e.floorId) payload.floorId = e.floorId
    onUpdate(id, payload)
    cancelEdit(id)
  }
  return (
    <Hospital_Modal open={open} onClose={onClose}>
      <div className="px-1">
        <div className="text-lg font-semibold text-slate-800">Manage Rooms</div>
        <div className="mt-4 space-y-3">
          {rows.map(r => {
            const e = edits[r.id]
            return (
              <div key={r.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-md border border-slate-200 p-3">
                {!e ? (
                  <>
                    <div>
                      <div className="font-medium text-slate-800">{r.name}</div>
                      <div className="text-xs text-slate-500">Floor: {floorsMap[r.floorId]?.name || r.floorId}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(r)} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white">Edit</button>
                      <button onClick={() => onDelete(r.id)} className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white">Delete</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 grow flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
                      <input className="w-full rounded-md border border-slate-300 px-3 py-1.5 md:w-56" value={e.name} onChange={ev => setEdits(prev => ({ ...prev, [r.id]: { ...prev[r.id], name: ev.target.value } }))} />
                      <select className="w-full rounded-md border border-slate-300 px-3 py-1.5 md:w-48" value={e.floorId} onChange={ev => setEdits(prev => ({ ...prev, [r.id]: { ...prev[r.id], floorId: ev.target.value } }))}>
                        {floors.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => save(r.id)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white">Save</button>
                      <button onClick={() => cancelEdit(r.id)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
          {!rows.length && <div className="text-sm text-slate-500">No rooms</div>}
        </div>
      </div>
    </Hospital_Modal>
  )
}
