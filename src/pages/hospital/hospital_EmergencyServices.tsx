import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

type ServiceCatalogItem = {
  id: string
  name: string
  price: number
  category?: string
  active: boolean
}

function money(n: number){
  try { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) } catch { return String(n) }
}

export default function Hospital_EmergencyServices(){
  const { id } = useParams()
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [category, setCategory] = useState<string>('All')

  const [loading, setLoading] = useState(false)
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState<{ id: string; name: string; category: string; price: number; active: boolean } | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>('')

  useEffect(()=>{ reload() }, [])

  useEffect(() => {
    const t = setTimeout(() => { reload() }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, category])

  async function reload(){
    setLoading(true)
    try{
      const res: any = await hospitalApi.listErServices({
        q: q.trim() || undefined,
        category: category !== 'All' ? category : undefined,
        active: undefined,
        page,
        limit,
      })
      const rows: any[] = res?.services || []
      setTotal(Number(res?.total || rows.length || 0))
      setCatalog(rows.map((r: any) => ({
        id: String(r._id || r.id),
        name: String(r.name || ''),
        price: Number(r.price || 0),
        category: r.category ? String(r.category) : undefined,
        active: Boolean(r.active !== false),
      })))
    }catch{
      setTotal(0)
      setCatalog([])
    }
    setLoading(false)
  }

  const confirmDeleteService = async () => {
    const id = confirmDeleteId
    setConfirmDeleteId('')
    if (!id) return
    try{
      await hospitalApi.deleteErService(id)
      setCatalog(prev => prev.filter(x => x.id !== id))
      setToast({ type: 'success', message: 'Deleted' })
    }catch(err:any){
      setToast({ type: 'error', message: err?.message || 'Failed to delete' })
    }
  }

  const categories = useMemo(()=>{
    const set = new Set<string>()
    for (const c of catalog) if (c.category) set.add(c.category)
    return ['All', ...Array.from(set).sort()]
  }, [catalog])

  const totalPages = useMemo(()=> Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, limit))), [total, limit])

  useEffect(() => {
    setPage(1)
  }, [q, category, limit])

  const goAddService = () => {
    const returnTo = id ? `/hospital/emergency/${encodeURIComponent(String(id))}/services` : '/hospital/emergency-services'
    navigate(`/hospital/emergency-services/add?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const openEdit = (svc: ServiceCatalogItem) => {
    setEditDraft({
      id: svc.id,
      name: svc.name,
      category: svc.category || '',
      price: Number(svc.price || 0),
      active: Boolean(svc.active),
    })
    setEditOpen(true)
  }

  return (
    <>
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600">Emergency</div>
          <h2 className="text-xl font-semibold text-slate-800">Services & Prices</h2>
          <div className="mt-1 text-xs text-slate-500">Case #{id || '—'} (frontend scaffold)</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goAddService} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">Add Service</button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search services..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={limit} onChange={e=>setLimit(Number(e.target.value||20))} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
              {[10,20,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button onClick={reload} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Service</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-left font-medium">Price</th>
                  <th className="px-3 py-2 text-left font-medium">Active</th>
                  <th className="px-3 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {catalog.map(s => {
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">{s.name}</td>
                      <td className="px-3 py-2 text-slate-600">{s.category || '—'}</td>
                      <td className="px-3 py-2">{money(s.price)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={s.active}
                          onChange={async (e)=>{
                            try{
                              await hospitalApi.updateErService(s.id, { active: e.target.checked })
                              setCatalog(prev => prev.map(x => x.id===s.id ? ({...x, active: e.target.checked}) : x))
                            }catch(err:any){
                              setToast({ type: 'error', message: err?.message || 'Failed to update' })
                            }
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={()=>openEdit(s)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async()=>{
                              setConfirmDeleteId(String(s.id))
                            }}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {catalog.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">{loading ? 'Loading...' : 'No services found'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="text-slate-600">
              Showing {(total === 0) ? 0 : ((page - 1) * limit + 1)}-{Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
                onClick={()=>setPage(p=>Math.max(1,p-1))}
                disabled={page <= 1 || loading}
              >
                Prev
              </button>
              <div className="text-slate-700">Page {page} / {totalPages}</div>
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
                onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
                disabled={page >= totalPages || loading}
              >
                Next
              </button>
            </div>
          </div>
      </div>

      {editOpen && editDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={async (e)=>{
              e.preventDefault()
              try{
                await hospitalApi.updateErService(editDraft.id, {
                  name: editDraft.name.trim(),
                  category: editDraft.category.trim() || undefined,
                  price: Number(editDraft.price || 0),
                  active: Boolean(editDraft.active),
                })
                setCatalog(prev => prev.map(x => x.id===editDraft.id ? ({
                  ...x,
                  name: editDraft.name.trim(),
                  category: editDraft.category.trim() || undefined,
                  price: Number(editDraft.price || 0),
                  active: Boolean(editDraft.active),
                }) : x))
                setEditOpen(false)
                setEditDraft(null)
              }catch(err:any){
                setToast({ type: 'error', message: err?.message || 'Failed to save changes' })
              }
            }}
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Edit Service</div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600">Name</label>
                <input value={editDraft.name} onChange={e=>setEditDraft(d => d ? ({...d, name: e.target.value}) : d)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Category</label>
                <input value={editDraft.category} onChange={e=>setEditDraft(d => d ? ({...d, category: e.target.value}) : d)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Price</label>
                <input type="number" value={editDraft.price} onChange={e=>setEditDraft(d => d ? ({...d, price: Number(e.target.value || 0)}) : d)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={editDraft.active} onChange={e=>setEditDraft(d => d ? ({...d, active: e.target.checked}) : d)} />
                Active
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>{ setEditOpen(false); setEditDraft(null) }} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Save</button>
            </div>
          </form>
        </div>
      )}
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
    <ConfirmDialog
      open={!!confirmDeleteId}
      title="Confirm"
      message="Delete this service?"
      confirmText="Delete"
      onCancel={()=>setConfirmDeleteId('')}
      onConfirm={confirmDeleteService}
    />
    </>
  )
}
