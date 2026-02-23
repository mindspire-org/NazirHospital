import { useEffect, useState } from 'react'

export type HospitalDoctorInput = {
  name: string
  cnic: string
  pmdcNo: string
  specialization: string
  qualification: string
  phone: string
  fee: string
  shares: string
  username: string
  password: string
  primaryDepartmentId: string
}

export default function Hospital_AddDoctorDialog({
  open,
  onClose,
  onAdd,
  departments,
}: {
  open: boolean
  onClose: () => void
  onAdd: (data: HospitalDoctorInput) => void
  departments: Array<{ id: string; name: string }>
}) {
  const [form, setForm] = useState<HospitalDoctorInput>({
    name: '', cnic: '', pmdcNo: '', specialization: '', qualification: '', phone: '', fee: '0', shares: '0', username: '', password: '', primaryDepartmentId: ''
  })

  useEffect(() => {
    if (open) {
      setForm({ name: '', cnic: '', pmdcNo: '', specialization: '', qualification: '', phone: '', fee: '0', shares: '0', username: '', password: '', primaryDepartmentId: '' })
    }
  }, [open])

  const update = (k: keyof HospitalDoctorInput, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  if (!open) return null

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Add New Doctor</h3>
          </div>
          <button onClick={onClose} className="text-slate-500">✖</button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Doctor Name</label>
            <input value={form.name} onChange={e=>update('name', e.target.value)} placeholder="Enter doctor's full name" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">CNIC</label>
            <input value={form.cnic} onChange={e=>update('cnic', e.target.value)} placeholder="13-digit CNIC (no dashes)" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">PMDC No</label>
            <input value={form.pmdcNo} onChange={e=>update('pmdcNo', e.target.value)} placeholder="e.g., 12345-ABC" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Password</label>
            <input type="password" value={form.password} onChange={e=>update('password', e.target.value)} placeholder="Enter password" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Specialization</label>
            <input value={form.specialization} onChange={e=>update('specialization', e.target.value)} placeholder="e.g., Cardiologist, Gynecologist" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Qualification</label>
            <input value={form.qualification} onChange={e=>update('qualification', e.target.value)} placeholder="e.g., MBBS, FCPS" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Department</label>
            <select value={form.primaryDepartmentId} onChange={e=>update('primaryDepartmentId', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
              <option value="">Select department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Phone Number</label>
            <input value={form.phone} onChange={e=>update('phone', e.target.value)} placeholder="Enter phone number" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Consultation Fee (Rs.)</label>
            <input value={form.fee} onChange={e=>update('fee', e.target.value)} placeholder="0" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">OPD Share</label>
            <input value={form.shares} onChange={e=>update('shares', e.target.value)} placeholder="0" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Username</label>
            <input value={form.username} onChange={e=>update('username', e.target.value)} placeholder="Enter username" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={()=>onAdd(form)} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800">Add Doctor</button>
        </div>
      </div>
    </div>
  )
}
