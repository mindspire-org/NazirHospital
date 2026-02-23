export type Company = {
  id: string
  name: string
  distributorId?: string
  distributorName?: string
  status: 'Active' | 'Inactive'
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (c: Company) => void
  initial?: Company | null
  title?: string
  submitLabel?: string
  distributorPrefill?: { id?: string; name?: string } | null
}

export default function Pharmacy_AddCompanyDialog({ open, onClose, onSave, initial = null, title = 'Add Company', submitLabel = 'Save', distributorPrefill: _distributorPrefill = null }: Props) {
  if (!open) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const c: Company = {
      id: initial?.id ?? crypto.randomUUID(),
      name: String(fd.get('name') || ''),
      status: (String(fd.get('status') || 'Active') as 'Active' | 'Inactive'),
    }
    onSave(c)
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
            <label className="mb-1 block text-sm text-slate-700">Company Name</label>
            <input name="name" defaultValue={initial?.name} required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
             
             
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
