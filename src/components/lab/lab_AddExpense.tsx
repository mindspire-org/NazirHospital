import { useState } from 'react'

 type Expense = {
  date: string
  time?: string
  type: 'Rent' | 'Utilities' | 'Supplies' | 'Salaries' | 'Maintenance' | 'Other'
  note: string
  amount: number
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (exp: Expense) => void
}

export default function Lab_AddExpense({ open, onClose, onSave }: Props) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [type, setType] = useState<Expense['type']>('Other')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState<number>(0)

  if (!open) return null

  const save = () => {
    if (!date || !note || !amount) return
    onSave({ date, time: time || undefined, type, note, amount })
    onClose()
    setDate('')
    setTime('')
    setType('Other')
    setNote('')
    setAmount(0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="text-lg font-semibold text-slate-800">Add Expense</div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">×</button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-700">Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Time (optional)</label>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Type</label>
              <select value={type} onChange={e=>setType(e.target.value as Expense['type'])} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option>Rent</option>
                <option>Utilities</option>
                <option>Supplies</option>
                <option>Salaries</option>
                <option>Maintenance</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Note</label>
            <input value={note} onChange={e=>setNote(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Enter note" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Amount</label>
            <input type="number" value={amount} onChange={e=>setAmount(parseFloat(e.target.value || '0'))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="0" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button onClick={save} className="btn">Save Expense</button>
        </div>
      </div>
    </div>
  )
}
