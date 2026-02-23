export type Supplier = {
  id: string
  name: string
  company?: string
  phone?: string
  address?: string
  taxId?: string
  status: 'Active' | 'Inactive'
  totalPurchases?: number
  paid?: number
  lastOrder?: string // yyyy-mm-dd
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (s: Supplier) => void
  initial?: Supplier | null
  title?: string
  submitLabel?: string
}

export default function Lab_AddSupplierDialog({ open, onClose, onSave, initial = null, title = 'Add Supplier', submitLabel = 'Save' }: Props) {
  if (!open) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const s: Supplier = {
      id: initial?.id ?? crypto.randomUUID(),
      name: String(fd.get('name') || ''),
      company: String(fd.get('company') || ''),
      phone: String(fd.get('phone') || ''),
      address: String(fd.get('address') || ''),
      taxId: String(fd.get('taxId') || ''),
      status: (String(fd.get('status') || 'Active') as 'Active' | 'Inactive'),
      totalPurchases: initial?.totalPurchases ?? 0,
      paid: initial?.paid ?? 0,
      lastOrder: initial?.lastOrder ?? '',
    }
    onSave(s)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Supplier Name</label>
            <input name="name" defaultValue={initial?.name} required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Company Name</label>
            <input name="company" defaultValue={initial?.company} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Phone Number</label>
            <input name="phone" defaultValue={initial?.phone} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Address</label>
            <textarea name="address" defaultValue={initial?.address} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Tax ID</label>
            <input name="taxId" defaultValue={initial?.taxId} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Status</label>
            <select name="status" defaultValue={initial?.status ?? 'Active'} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">{submitLabel}</button>
        </div>
      </form>
    </div>
  )
}
