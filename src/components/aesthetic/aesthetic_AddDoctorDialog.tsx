import { useEffect, useState } from 'react'

export type AestheticDoctorInput = {
  name: string
  cnic?: string
  specialty?: string
  qualification?: string
  phone?: string
  fee?: string
  shares?: string
}

export default function Aesthetic_AddDoctorDialog({ open, onClose, onAdd }: { open: boolean; onClose: ()=>void; onAdd: (form: AestheticDoctorInput)=>void }){
  const [form, setForm] = useState<AestheticDoctorInput>({ name: '', cnic: '', specialty: '', qualification: '', phone: '', fee: '', shares: '' })

  useEffect(()=>{ if (open) setForm({ name: '', cnic: '', specialty: '', qualification: '', phone: '', fee: '', shares: '' }) }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Add Doctor</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Doctor Name</label>
            <input value={form.name} onChange={e=>setForm(f=>({ ...f, name: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">CNIC</label>
            <input value={form.cnic} onChange={e=>setForm(f=>({ ...f, cnic: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Specialization</label>
            <input value={form.specialty} onChange={e=>setForm(f=>({ ...f, specialty: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Qualification</label>
            <input value={form.qualification} onChange={e=>setForm(f=>({ ...f, qualification: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Phone</label>
            <input value={form.phone} onChange={e=>setForm(f=>({ ...f, phone: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Consultation Fee</label>
            <input value={form.fee} onChange={e=>setForm(f=>({ ...f, fee: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Shares %</label>
            <input value={form.shares} onChange={e=>setForm(f=>({ ...f, shares: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          </div>
          
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={()=>{ if (!form.name.trim()) return; onAdd(form) }} className="rounded-md bg-fuchsia-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-fuchsia-800">Add</button>
        </div>
      </div>
    </div>
  )
}
