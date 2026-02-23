import { useState } from 'react'

export type AddExpensePayload = {
  date: string
  time?: string
  type: 'Rent' | 'Utilities' | 'Supplies' | 'Salaries' | 'Maintenance' | 'Other'
  note: string
  amount: number
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (expense: AddExpensePayload) => void
}

export default function Pharmacy_AddExpenseDialog({ open, onClose, onSave }: Props) {
  const [date, setDate] = useState<string>('')
  const [type, setType] = useState<AddExpensePayload['type']>('Other')
  const [note, setNote] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [time, setTime] = useState<string>('')

  if (!open) return null

  const canSave = date && type && note && parseFloat(amount) > 0

  const save = () => {
    if (!canSave) return
    onSave({ date, time: time || undefined, type, note: note.trim(), amount: parseFloat(amount) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="text-lg font-semibold text-slate-800">Add Expense</div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">×</button>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <div>
            <label className="mb-1 block text-slate-700">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-slate-700">Time (optional)</label>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-slate-700">Type</label>
            <select value={type} onChange={e=>setType(e.target.value as AddExpensePayload['type'])} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option>Rent</option>
              <option>Utilities</option>
              <option>Supplies</option>
              <option>Salaries</option>
              <option>Maintenance</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-slate-700">Note</label>
            <input value={note} onChange={e=>setNote(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Description" />
          </div>
          <div>
            <label className="mb-1 block text-slate-700">Amount</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0.00" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button onClick={save} disabled={!canSave} className="btn disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  )
}
