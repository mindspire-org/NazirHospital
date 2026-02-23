import { useState } from 'react'
import Hospital_Modal from './Hospital_Modal'

type FloorRef = { id: string; name: string }

export default function Hospital_AddRoomModal({ open, onClose, floors, onSave }: { open: boolean; onClose: () => void; floors: FloorRef[]; onSave: (data: { floorId: string; name: string }) => void }) {
  const [floorId, setFloorId] = useState('')
  const [name, setName] = useState('')

  const save = () => {
    if (!floorId || !name.trim()) return
    onSave({ floorId, name: name.trim() })
    setFloorId('')
    setName('')
    onClose()
  }

  return (
    <Hospital_Modal open={open} onClose={onClose}>
      <div className="px-1">
        <div className="text-lg font-semibold text-slate-800">Add Room</div>
        <div className="mt-4 grid gap-3">
          <select value={floorId} onChange={e => setFloorId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
            <option value="">Select floor</option>
            {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <button onClick={save} className="rounded-md bg-blue-900 px-3 py-2 text-sm font-medium text-white">Save</button>
        </div>
      </div>
    </Hospital_Modal>
  )
}
