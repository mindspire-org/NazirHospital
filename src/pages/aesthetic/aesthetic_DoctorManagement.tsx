import { useEffect, useMemo, useState } from 'react'
import { aestheticApi } from '../../utils/api'
import Aesthetic_AddDoctorDialog, { type AestheticDoctorInput } from '../../components/aesthetic/aesthetic_AddDoctorDialog'

export default function Aesthetic_DoctorManagementPage(){
  const [q, setQ] = useState('')
  const [list, setList] = useState<Array<{ id: string; name: string; specialty?: string; qualification?: string; phone?: string; fee?: number; shares?: number }>>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', specialty: '', qualification: '', phone: '', fee: '', shares: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function refresh(){
    try {
      const res: any = await aestheticApi.listDoctors({ limit: 500 })
      const items: any[] = (res?.doctors || res || []) as any[]
      setList(items.map((d:any)=> ({ id: String(d._id||d.id), name: String(d.name||''), specialty: d.specialty||'', qualification: d.qualification||'', phone: d.phone||'', fee: Number(d.fee||0), shares: Number(d.shares||0) })))
    } catch { setList([]) }
  }
  useEffect(()=>{ refresh() }, [])

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase()
    if (!s) return list
    return list.filter(d => [d.name, d.specialty, d.qualification, d.phone].some(v => String(v||'').toLowerCase().includes(s)))
  }, [q, list])

  const addDoctor = async (f: AestheticDoctorInput) => {
    try {
      await aestheticApi.createDoctor({ name: f.name.trim(), specialty: f.specialty?.trim() || undefined, qualification: f.qualification?.trim() || undefined, phone: f.phone?.trim() || undefined, fee: f.fee? Number(f.fee): undefined, shares: f.shares? Number(f.shares): undefined, active: true })
      setShowAdd(false)
      await refresh()
    } catch {}
  }

  const openEdit = (id: string) => {
    const d = list.find(x=>x.id===id); if (!d) return
    setEditId(id)
    setEditForm({ name: d.name, specialty: d.specialty||'', qualification: d.qualification||'', phone: d.phone||'', fee: d.fee!=null? String(d.fee):'', shares: d.shares!=null? String(d.shares):'' })
  }
  const saveEdit = async () => {
    if (!editId) return
    try {
      await aestheticApi.updateDoctor(editId, { name: editForm.name.trim(), specialty: editForm.specialty.trim()||undefined, qualification: editForm.qualification.trim()||undefined, phone: editForm.phone.trim()||undefined, fee: editForm.fee? Number(editForm.fee): undefined, shares: editForm.shares? Number(editForm.shares): undefined })
      setEditId(null)
      await refresh()
    } catch {}
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try { await aestheticApi.deleteDoctor(deleteId) } catch {}
    setDeleteId(null)
    await refresh()
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Doctors</div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search doctors..." className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          <button onClick={()=>setShowAdd(true)} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">+ Add Doctor</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Specialty</th>
              <th className="px-4 py-2 text-left">Qualification</th>
              <th className="px-4 py-2 text-left">Fee</th>
              <th className="px-4 py-2 text-left">Shares (%)</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700 dark:divide-slate-700 dark:text-slate-200">
            {filtered.map(d => (
              <tr key={d.id}>
                <td className="px-4 py-2 font-medium">{d.name}</td>
                <td className="px-4 py-2">{d.specialty || '-'}</td>
                <td className="px-4 py-2">{d.qualification || '-'}</td>
                <td className="px-4 py-2">{d.fee!=null? `Rs. ${d.fee}` : '-'}</td>
                <td className="px-4 py-2">{d.shares!=null? d.shares : '-'}</td>
                <td className="px-4 py-2">{d.phone || '-'}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button onClick={()=>openEdit(d.id)} className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700">Edit</button>
                    <button onClick={()=>setDeleteId(d.id)} className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500 dark:text-slate-400" colSpan={7}>No doctors</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Aesthetic_AddDoctorDialog open={showAdd} onClose={()=>setShowAdd(false)} onAdd={addDoctor} />

      {editId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Edit Doctor</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Doctor Name</label>
                <input value={editForm.name} onChange={e=>setEditForm(f=>({ ...f, name: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Specialty</label>
                <input value={editForm.specialty} onChange={e=>setEditForm(f=>({ ...f, specialty: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Qualification</label>
                <input value={editForm.qualification} onChange={e=>setEditForm(f=>({ ...f, qualification: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Phone</label>
                <input value={editForm.phone} onChange={e=>setEditForm(f=>({ ...f, phone: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Consultation Fee</label>
                <input value={editForm.fee} onChange={e=>setEditForm(f=>({ ...f, fee: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Shares %</label>
                <input value={editForm.shares} onChange={e=>setEditForm(f=>({ ...f, shares: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setEditId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={saveEdit} className="rounded-md bg-fuchsia-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-fuchsia-800">Save</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Delete Doctor</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Are you sure you want to delete this doctor?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setDeleteId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={confirmDelete} className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
