import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onSave: (c: Customer) => void
}

export type Customer = {
  id: string
  name: string
  company?: string
  phone?: string
  address?: string
  cnic?: string
  mrNumber?: string
  totalSpent?: number
  salesCount?: number
  lastPurchaseAt?: string | null
}

export default function Pharmacy_AddCustomer({ open, onClose, onSave }: Props) {
  const [form, setForm] = useState<Customer>({
    id: crypto.randomUUID(),
    name: '',
    company: '',
    phone: '',
    address: '',
    cnic: '',
    mrNumber: 'MR-3901',
  })

  if (!open) return null

  function update<K extends keyof Customer>(key: K, value: Customer[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h3 className="text-2xl font-extrabold text-slate-900">Add Customer</h3>
          <button onClick={onClose} className="rounded-md p-2 text-slate-600 hover:bg-slate-100">×</button>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm">
          <div>
            <label className="mb-1 block text-slate-700">Customer Name</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-slate-700">Company Name</label>
            <input value={form.company} onChange={e => update('company', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-slate-700">Phone Number</label>
            <input value={form.phone} onChange={e => update('phone', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-slate-700">Address</label>
            <textarea value={form.address} onChange={e => update('address', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" rows={3} />
          </div>
          <div>
            <label className="mb-1 block text-slate-700">CNIC</label>
            <input value={form.cnic} onChange={e => update('cnic', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-slate-700">MR Number</label>
            <input value={form.mrNumber} onChange={e => update('mrNumber', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
          <button onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button onClick={handleSave} className="btn">Save</button>
        </div>
      </div>
    </div>
  )
}
