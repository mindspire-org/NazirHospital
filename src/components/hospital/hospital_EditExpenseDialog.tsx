import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type ExpenseInput = {
  date: string
  category: 'Rent' | 'Utilities' | 'Supplies' | 'Salaries' | 'Maintenance' | 'Other'
  note: string
  amount: string
  method: 'cash' | 'bank' | 'card'
  reference?: string
  department: string
}

type ExpenseTxn = {
  id: string
  datetime: string
  type: 'Expense'
  category: 'Rent' | 'Utilities' | 'Supplies' | 'Salaries' | 'Maintenance' | 'Other'
  description: string
  amount: number
  method?: 'cash' | 'bank' | 'card'
  ref?: string
  department?: string
}

type Props = {
  expense: ExpenseTxn
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export default function Hospital_EditExpenseDialog({ expense, open, onClose, onSaved }: Props) {
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ExpenseInput>({
    date: new Date().toISOString().slice(0, 10),
    category: 'Supplies',
    note: '',
    amount: '',
    method: 'cash',
    reference: '',
    department: '',
  })

  useEffect(() => {
    if (!open || !expense) return
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await hospitalApi.listDepartments()
        const list: Array<{ id: string; name: string }> = (res?.departments || res || []).map((d: any) => ({ id: String(d._id || d.id), name: d.name }))
        if (!cancelled) {
          setDepartments(list)
          // Pre-fill form with expense data
          setForm({
            date: expense.datetime ? new Date(expense.datetime).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            category: expense.category || 'Supplies',
            note: expense.description || '',
            amount: String(expense.amount || ''),
            method: expense.method || 'cash',
            reference: expense.ref || '',
            department: expense.department || list?.[0]?.name || '',
          })
        }
      } catch {
        if (!cancelled) setDepartments([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, expense])

  if (!open) return null

  const canSave = !!form.date && !!form.department && !!form.category && parseFloat(form.amount || '0') > 0 && !saving

  const save = async () => {
    if (!canSave || !expense?.id) return
    const amt = parseFloat(form.amount || '0')
    if (!amt) return

    try {
      setSaving(true)
      const sel = departments.find(d => d.name === form.department)
      await hospitalApi.updateExpense(expense.id, {
        dateIso: form.date,
        departmentId: sel?.id,
        category: form.category,
        amount: amt,
        note: form.note?.trim() || undefined,
        method: form.method,
        ref: form.reference?.trim() || undefined,
      })
      try {
        window.dispatchEvent(new CustomEvent('hospital:expenses:refresh'))
      } catch {}
      onSaved?.()
      onClose()
    } catch (err: any) {
      alert(err?.message || 'Failed to update expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="text-lg font-semibold text-slate-800">Edit Expense</div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">×</button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-700">Department</label>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                {departments.map(dep => (
                  <option key={dep.id} value={dep.name}>
                    {dep.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option>Rent</option>
                <option>Utilities</option>
                <option>Supplies</option>
                <option>Salaries</option>
                <option>Maintenance</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Amount</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="0.00" required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Payment Method</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option>cash</option>
                <option>bank</option>
                <option>card</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-700">Reference</label>
              <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., EXP-000045" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-700">Note</label>
              <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button onClick={save} disabled={!canSave} className="btn disabled:opacity-50">
            {saving ? 'Saving...' : 'Update Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}
