import { useState } from 'react'
import Hospital_Modal from './Hospital_Modal'

export default function Hospital_AddFloorModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (data: { name: string; number?: string }) => void }) {
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')

  const save = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), number: number.trim() ? number.trim() : undefined })
    setName('')
    setNumber('')
    onClose()
  }

  return (
    <Hospital_Modal open={open} onClose={onClose}>
      <div className="px-1">
        <div className="text-lg font-semibold text-slate-800">Add Floor</div>
        <div className="mt-4 grid gap-3">
          <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <input placeholder="Number (optional)" value={number} onChange={e => setNumber(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <button onClick={save} className="rounded-md bg-blue-900 px-3 py-2 text-sm font-medium text-white">Save</button>
        </div>
      </div>
    </Hospital_Modal>
  )
}
