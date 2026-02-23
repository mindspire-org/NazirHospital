import { useState } from 'react'
import Hospital_Modal from './Hospital_Modal'

type FloorRef = { id: string; name: string }

type RoomRef = { id: string; name: string; floorId: string }

type WardRef = { id: string; name: string; floorId: string }

type RoomsByFloor = Record<string, RoomRef[]>

type WardsByFloor = Record<string, WardRef[]>

export default function Hospital_AddBedModal({ open, onClose, floors, roomsByFloor, wardsByFloor, onSave }: { open: boolean; onClose: () => void; floors: FloorRef[]; roomsByFloor: RoomsByFloor; wardsByFloor: WardsByFloor; onSave: (data: { floorId: string; locationType: 'room' | 'ward'; locationId: string; labels: string; charges?: string; category?: string }) => void }) {
  const [floorId, setFloorId] = useState('')
  const [locationType, setLocationType] = useState<'room' | 'ward' | ''>('')
  const [locationId, setLocationId] = useState('')
  const [labels, setLabels] = useState('')
  const [charges, setCharges] = useState('')
  const [category, setCategory] = useState('General')

  const save = () => {
    if (!floorId || !locationType || !locationId || !labels.trim()) return
    onSave({ floorId, locationType, locationId, labels, charges, category })
    setFloorId('')
    setLocationType('')
    setLocationId('')
    setLabels('')
    setCharges('')
    setCategory('General')
    onClose()
  }

  return (
    <Hospital_Modal open={open} onClose={onClose}>
      <div className="px-1">
        <div className="text-lg font-semibold text-slate-800">Add New Bed</div>
        <div className="mt-4 grid gap-3">
          <select value={floorId} onChange={e => { setFloorId(e.target.value); setLocationId(''); setLocationType('') }} className="w-full rounded-md border border-slate-300 px-3 py-2">
            <option value="">Floor</option>
            {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={locationType} onChange={e => { setLocationType(e.target.value as any); setLocationId('') }} className="w-full rounded-md border border-slate-300 px-3 py-2">
            <option value="">Add beds to</option>
            <option value="room">Room</option>
            <option value="ward">Ward</option>
          </select>
          <select value={locationId} onChange={e => setLocationId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
            <option value="">Select location</option>
            {floorId && locationType === 'room' && roomsByFloor[floorId]?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            {floorId && locationType === 'ward' && wardsByFloor[floorId]?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <textarea placeholder="1,2,3 or one per line" value={labels} onChange={e => setLabels(e.target.value)} className="h-24 w-full rounded-md border border-slate-300 px-3 py-2" />
          <input placeholder="Charges (per day)" value={charges} onChange={e => setCharges(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
            <option>General</option>
            <option>Private</option>
            <option>ICU</option>
          </select>
          <button onClick={save} className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white">Add Bed</button>
        </div>
      </div>
    </Hospital_Modal>
  )
}
