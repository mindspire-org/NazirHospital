import { useEffect, useState } from 'react'
import { corporateApi } from '../../../utils/api'

export default function Hospital_CorporateCompanies(){
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', code: '', contactName: '', phone: '', email: '', address: '', terms: '', billingCycle: '', active: true })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [creating, setCreating] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState<number | null>(null)

  async function load(){
    setLoading(true)
    try {
      const res = await corporateApi.listCompanies({ page, limit }) as any
      setRows(res?.companies || res?.items || [])
      const t = (res?.total ?? res?.count ?? res?.totalCount)
      setTotal(typeof t === 'number' ? t : null)
    } catch { setRows([]) }
    setLoading(false)
  }
  useEffect(()=>{ load() }, [page, limit])
  useEffect(()=>{
    if (!showAdd) return
    const onKey = (e: KeyboardEvent)=>{ if (e.key === 'Escape') setShowAdd(false) }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [showAdd])

  async function create(){
    if (!form.name.trim()) { alert('Name is required'); return }
    try {
      setCreating(true)
      await corporateApi.createCompany({ ...form, active: !!form.active })
      setForm({ name: '', code: '', contactName: '', phone: '', email: '', address: '', terms: '', billingCycle: '', active: true })
      setShowAdd(false)
      await load()
    } catch (e: any){ alert(e?.message || 'Failed to create company') }
    finally { setCreating(false) }
  }

  async function saveRow(row: any){
    try {
      await corporateApi.updateCompany(String(row._id || row.id), {
        name: row.name,
        code: row.code,
        contactName: row.contactName,
        phone: row.phone,
        email: row.email,
        address: row.address,
        terms: row.terms,
        billingCycle: row.billingCycle,
        active: !!row.active,
      })
      setEditingId(null)
      await load()
    } catch (e: any){ alert(e?.message || 'Failed to update') }
  }

  async function remove(id: string){
    if (!confirm('Delete this company?')) return
    try { await corporateApi.deleteCompany(id); await load() } catch (e: any){ alert(e?.message || 'Failed to delete') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Corporate Companies</h2>
        <button onClick={()=>setShowAdd(true)} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Add Company</button>
      </div>

      {/* Create */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Add Company</div>
              <button onClick={()=>setShowAdd(false)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">Close</button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input label="Name" value={form.name} onChange={v=>setForm(s=>({ ...s, name: v }))} required />
              <Input label="Code" value={form.code} onChange={v=>setForm(s=>({ ...s, code: v }))} />
              <Input label="Contact Name" value={form.contactName} onChange={v=>setForm(s=>({ ...s, contactName: v }))} />
              <Input label="Phone" value={form.phone} onChange={v=>setForm(s=>({ ...s, phone: v }))} />
              <Input label="Email" value={form.email} onChange={v=>setForm(s=>({ ...s, email: v }))} />
              <Input label="Billing Cycle" value={form.billingCycle} onChange={v=>setForm(s=>({ ...s, billingCycle: v }))} placeholder="e.g., monthly" />
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
                <textarea className="w-full rounded-md border border-slate-300 px-3 py-2" rows={2} value={form.address} onChange={e=>setForm(s=>({ ...s, address: e.target.value }))} />
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Terms</label>
                <textarea className="w-full rounded-md border border-slate-300 px-3 py-2" rows={2} value={form.terms} onChange={e=>setForm(s=>({ ...s, terms: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <input id="comp-active" type="checkbox" checked={form.active} onChange={e=>setForm(s=>({ ...s, active: e.target.checked }))} />
                <label htmlFor="comp-active" className="text-xs text-slate-700">Active</label>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setShowAdd(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={create} disabled={creating} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-slate-700">Companies</div>
        {loading && <div className="text-sm text-slate-500">Loading...</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-slate-500">No companies</div>}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Code</th>
                  <th className="px-2 py-2">Contact</th>
                  <th className="px-2 py-2">Phone</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Billing</th>
                  <th className="px-2 py-2">Active</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any)=>{
                  const isEdit = editingId === String(r._id)
                  return (
                    <tr key={String(r._id)} className="border-t border-slate-100">
                      <td className="px-2 py-2">{isEdit ? <Input value={r.name||''} onChange={v=>updateRowLocal(rows, setRows, r._id, 'name', v)} /> : (r.name||'')}</td>
                      <td className="px-2 py-2">{isEdit ? <Input value={r.code||''} onChange={v=>updateRowLocal(rows, setRows, r._id, 'code', v)} /> : (r.code||'')}</td>
                      <td className="px-2 py-2">{isEdit ? <Input value={r.contactName||''} onChange={v=>updateRowLocal(rows, setRows, r._id, 'contactName', v)} /> : (r.contactName||'')}</td>
                      <td className="px-2 py-2">{isEdit ? <Input value={r.phone||''} onChange={v=>updateRowLocal(rows, setRows, r._id, 'phone', v)} /> : (r.phone||'')}</td>
                      <td className="px-2 py-2">{isEdit ? <Input value={r.email||''} onChange={v=>updateRowLocal(rows, setRows, r._id, 'email', v)} /> : (r.email||'')}</td>
                      <td className="px-2 py-2">{isEdit ? <Input value={r.billingCycle||''} onChange={v=>updateRowLocal(rows, setRows, r._id, 'billingCycle', v)} /> : (r.billingCycle||'')}</td>
                      <td className="px-2 py-2">
                        {isEdit ? (
                          <input type="checkbox" checked={!!r.active} onChange={e=>updateRowLocal(rows, setRows, r._id, 'active', e.target.checked)} />
                        ) : (
                          <span className={r.active!==false ? 'text-green-600' : 'text-slate-400'}>{r.active!==false ? 'Yes' : 'No'}</span>
                        )}
                      </td>
                      <td className="px-2 py-2 space-x-2">
                        {!isEdit ? (
                          <>
                            <button onClick={()=>setEditingId(String(r._id))} className="rounded-md border border-slate-300 px-2 py-1">Edit</button>
                            <button onClick={()=>remove(String(r._id))} className="rounded-md border border-rose-300 px-2 py-1 text-rose-600">Delete</button>
                          </>
                        ) : (
                          <>
                            <button onClick={()=>saveRow(r)} className="rounded-md bg-violet-700 px-2 py-1 text-white">Save</button>
                            <button onClick={()=>setEditingId(null)} className="rounded-md border border-slate-300 px-2 py-1">Cancel</button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-slate-600">Page {page}{total!=null ? ` of ${Math.max(1, Math.ceil(total/limit))}` : ''}</div>
          <div className="flex items-center gap-2">
            <select value={limit} onChange={e=>{ setPage(1); setLimit(Number(e.target.value)||20) }} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1} className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50">Prev</button>
            <button onClick={()=> setPage(p=> p+1)} disabled={total!=null ? (page*limit)>= (total||0) : (rows.length < limit)} className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50">Next</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function Input({ label, value, onChange, required, placeholder }: { label?: string; value: string; onChange: (v: string)=>void; required?: boolean; placeholder?: string }){
  return (
    <div>
      {label && <label className="mb-1 block text-xs font-medium text-slate-600">{label}{required && <span className="text-rose-600"> *</span>}</label>}
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-md border border-slate-300 px-3 py-2" />
    </div>
  )
}

function updateRowLocal(rows: any[], setRows: (r:any[])=>void, id: any, key: string, val: any){
  const arr = rows.map(r => String(r._id)===String(id) ? { ...r, [key]: val } : r)
  setRows(arr)
}
