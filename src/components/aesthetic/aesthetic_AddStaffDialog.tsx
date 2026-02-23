import type React from 'react'
import { useEffect, useState } from 'react'
import { aestheticApi } from '../../utils/api'

export type Shift = { id: string; name: string }

export type PharmacyStaff = {
  id: string
  name: string
  position: string
  phone: string
  joinDate: string
  address: string
  status: 'Active' | 'Inactive'
  salary: number
  shiftId?: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (staff: PharmacyStaff) => void
  initial?: PharmacyStaff | null
  title?: string
  submitLabel?: string
}

export default function Aesthetic_AddStaffDialog({ open, onClose, onSave, initial = null, title, submitLabel }: Props) {
  if (!open) return null
  const [shifts, setShifts] = useState<Shift[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await aestheticApi.listShifts()
        if (!mounted) return
        const mapped: Shift[] = (res.items || []).map((x: any) => ({ id: x._id, name: x.name }))
        setShifts(mapped)
      } catch (e) { console.error(e) }
    })()
    return () => { mounted = false }
  }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const staff: PharmacyStaff = {
      id: initial?.id ?? crypto.randomUUID(),
      name: String(fd.get('name') || ''),
      position: String(fd.get('position') || ''),
      phone: String(fd.get('phone') || ''),
      joinDate: String(fd.get('joinDate') || ''),
      address: String(fd.get('address') || ''),
      status: (String(fd.get('status') || 'Active') as any),
      salary: parseFloat(String(fd.get('salary') || '0')) || 0,
      shiftId: String(fd.get('shiftId') || '') || undefined,
    }
    onSave(staff)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white p-0 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-xl font-semibold text-slate-800">{title ?? (initial ? 'Edit Staff' : 'Add Staff')}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-700">Staff Name</label>
              <input name="name" defaultValue={initial?.name} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Position</label>
              <input name="position" defaultValue={initial?.position} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Phone Number</label>
              <input name="phone" defaultValue={initial?.phone} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Join Date</label>
              <input name="joinDate" type="date" defaultValue={initial?.joinDate} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Shift</label>
              <select name="shiftId" defaultValue={initial?.shiftId} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">— Select shift —</option>
                {shifts.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm text-slate-700">Address</label>
              <textarea name="address" rows={3} defaultValue={initial?.address} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Status</label>
              <select name="status" defaultValue={initial?.status ?? 'Active'} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Salary</label>
              <input name="salary" type="number" step="0.01" defaultValue={initial?.salary} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">{submitLabel ?? (initial ? 'Save' : 'Save')}</button>
        </div>
      </form>
    </div>
  )
}
