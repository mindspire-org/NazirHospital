import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'

export default function Finance_Vendors(){
  type Vendor = { id: string; name: string; phone?: string; address?: string }
  const [list, setList] = useState<Vendor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [q, setQ] = useState('')
  const [qDraft, setQDraft] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [openAdd, setOpenAdd] = useState(false)

  useEffect(()=>{ load() }, [page, limit, q])

  async function load(){
    try {
      const res: any = await financeApi.vendors({ q: q || undefined, page, limit })
      const rows: Vendor[] = (res?.vendors||[]).map((v:any)=>({ id: String(v._id||v.id), name: String(v.name||''), phone: v.phone?String(v.phone):undefined, address: v.address?String(v.address):undefined }))
      setList(rows)
      setTotal(Number(res?.total || rows.length || 0))
      setTotalPages(Number(res?.totalPages || 1))
    } catch { setList([]) }
  }

  async function add(e: React.FormEvent){
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await financeApi.createVendor({ name: name.trim(), phone: phone.trim()||undefined, address: address.trim()||undefined })
      setName(''); setPhone(''); setAddress('')
      setOpenAdd(false)
      await load()
    } catch (err: any) {
      const msg = err?.message || 'Failed to add vendor'
      alert(msg)
    } finally { setLoading(false) }
  }

  async function saveEdit(){
    if (!editing) return
    setLoading(true)
    try {
      await financeApi.updateVendor(editing.id, { name: editing.name, phone: editing.phone, address: editing.address })
      setEditing(null)
      await load()
    } finally { setLoading(false) }
  }

  async function remove(id: string){
    if (!confirm('Delete this vendor?')) return
    try { await financeApi.deleteVendor(id); await load() } catch {}
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="text-2xl font-bold text-slate-800">Vendors</div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <input value={qDraft} onChange={e=>setQDraft(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search name/phone/address" />
          <button type="button" onClick={()=>{ setPage(1); setQ(qDraft.trim()) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Search</button>
          <button type="button" onClick={()=>{ setQDraft(''); setQ(''); setPage(1) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Clear</button>
          <div className="ml-auto" />
          <button type="button" onClick={()=>setOpenAdd(true)} className="btn">+ Add Vendor</button>
        </div>
      </div>

      {openAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 text-lg font-semibold text-slate-800">Add Vendor</div>
            <form onSubmit={add} className="grid gap-3">
              <input value={name} onChange={e=>setName(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Vendor name" required />
              <input value={phone} onChange={e=>setPhone(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Phone (optional)" />
              <input value={address} onChange={e=>setAddress(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Address (optional)" />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={()=>{ setOpenAdd(false); setName(''); setPhone(''); setAddress('') }} className="btn-outline-navy">Cancel</button>
                <button type="submit" disabled={loading||!name.trim()} className="btn">{loading?'Saving...':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Address</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {list.map(v => (
              <tr key={v.id}>
                <td className="px-4 py-2">
                  {editing?.id===v.id ? (
                    <input value={editing.name} onChange={e=>setEditing({ ...editing!, name: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1 text-sm w-full" />
                  ) : v.name}
                </td>
                <td className="px-4 py-2">
                  {editing?.id===v.id ? (
                    <input value={editing.phone||''} onChange={e=>setEditing({ ...editing!, phone: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1 text-sm w-full" />
                  ) : (v.phone||'-')}
                </td>
                <td className="px-4 py-2">
                  {editing?.id===v.id ? (
                    <input value={editing.address||''} onChange={e=>setEditing({ ...editing!, address: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1 text-sm w-full" />
                  ) : (v.address||'-')}
                </td>
                <td className="px-4 py-2">
                  {editing?.id===v.id ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={saveEdit} className="btn">Save</button>
                      <button type="button" onClick={()=>setEditing(null)} className="btn-outline-navy">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={()=>setEditing(v)} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Edit</button>
                      <button type="button" onClick={()=>remove(v.id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {list.length===0 && (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={4}>No vendors</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>Page {page} of {totalPages} • {total} total</div>
        <div className="flex items-center gap-2">
          <button disabled={loading || page<=1} onClick={()=>setPage(p=> Math.max(1, p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Prev</button>
          <button disabled={loading || page>=totalPages} onClick={()=>setPage(p=> Math.min(totalPages, p+1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Next</button>
          <select value={limit} onChange={e=>{ setPage(1); setLimit(Number(e.target.value)) }} className="rounded-md border border-slate-300 px-2 py-1">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  )
}
