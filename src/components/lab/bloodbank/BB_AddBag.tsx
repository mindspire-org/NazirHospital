import { useState, useEffect } from 'react'

type BagRow = { id: string; donor: string; type: string; vol: number; coll: string; exp: string; status: string; notes?: string }
type Props = {
  open: boolean
  onClose: () => void
  onCreate?: (row: BagRow) => void
  mode?: 'add' | 'edit'
  initial?: BagRow
  onUpdate?: (row: BagRow) => void
}

const bloodTypes = ['O+','O-','A+','A-','B+','B-','AB+','AB-']
const statuses = ['Available','Quarantined','Used','Expired']

export default function BB_AddBag({ open, onClose, onCreate, mode = 'add', initial, onUpdate }: Props){
  const [bagId, setBagId] = useState('')
  const [donor, setDonor] = useState('')
  const [type, setType] = useState('')
  const [vol, setVol] = useState<number | ''>('')
  const [coll, setColl] = useState('')
  const [exp, setExp] = useState('')
  const [status, setStatus] = useState('Available')
  const [notes, setNotes] = useState('')

  useEffect(()=>{
    if (!open) return
    if (mode === 'edit' && initial) {
      setBagId(initial.id || '')
      setDonor(initial.donor || '')
      setType(initial.type || '')
      setVol((initial.vol ?? '') as any)
      setColl(initial.coll || '')
      setExp(initial.exp || '')
      setStatus(initial.status || 'Available')
      setNotes(initial.notes || '')
    } else {
      setBagId('')
      setDonor('')
      setType('')
      setVol('')
      setColl('')
      setExp('')
      setStatus('Available')
      setNotes('')
    }
  }, [open, mode, initial])

  if (!open) return null

  const save = () => {
    const id = mode==='edit' ? (bagId || (initial?.id || '')) : (bagId || `#B-${Date.now().toString().slice(-5)}`)
    const row: BagRow = {
      id,
      donor: donor || 'Unknown',
      type: type || '',
      vol: typeof vol === 'number' ? vol : 0,
      coll,
      exp,
      status,
      notes: notes || undefined,
    }
    if (mode === 'edit') onUpdate?.(row)
    else onCreate?.(row)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">{mode==='edit' ? 'Edit Blood Bag Entry' : 'Add Blood Bag Entry'}</div>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>
        <div className="grid grid-cols-12 gap-3 text-sm">
          <div className="col-span-12 sm:col-span-6">
            <label className="mb-1 block text-xs text-slate-600">Bag ID</label>
            <input value={bagId} onChange={e=>setBagId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="#B-29386" />
          </div>
          <div className="col-span-12 sm:col-span-6">
            <label className="mb-1 block text-xs text-slate-600">Donor Name</label>
            <input value={donor} onChange={e=>setDonor(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="John Doe" />
          </div>
          <div className="col-span-6 sm:col-span-3">
            <label className="mb-1 block text-xs text-slate-600">Blood Type</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select</option>
              {bloodTypes.map(t=> <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-6 sm:col-span-3">
            <label className="mb-1 block text-xs text-slate-600">Volume (ml)</label>
            <input type="number" value={vol} onChange={e=>setVol(e.target.value===''?'':Number(e.target.value))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div className="col-span-6 sm:col-span-3">
            <label className="mb-1 block text-xs text-slate-600">Collection Date</label>
            <input type="date" value={coll} onChange={e=>setColl(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div className="col-span-6 sm:col-span-3">
            <label className="mb-1 block text-xs text-slate-600">Expiry Date</label>
            <input type="date" value={exp} onChange={e=>setExp(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div className="col-span-12 sm:col-span-4">
            <label className="mb-1 block text-xs text-slate-600">Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              {statuses.map(s=> <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-12 sm:col-span-8">
            <label className="mb-1 block text-xs text-slate-600">Notes</label>
            <input value={notes} onChange={e=>setNotes(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional internal notes" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">{mode==='edit' ? 'Save Changes' : 'Save Entry'}</button>
        </div>
      </div>
    </div>
  )
}
