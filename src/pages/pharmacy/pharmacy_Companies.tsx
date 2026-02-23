import { useEffect, useState } from 'react'
import Pharmacy_AddCompanyDialog, { type Company } from '../../components/pharmacy/pharmacy_AddCompanyDialog'
import { pharmacyApi } from '../../utils/api'

export default function Pharmacy_Companies(){
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)

  const [companies, setCompanies] = useState<Array<{ id: string; name: string; distributorId?: string; distributorName?: string; status?: 'Active'|'Inactive' }>>([])
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await pharmacyApi.listCompanies({ q: query || undefined, page, limit })
        if (!mounted) return
        const items = (res?.items ?? res ?? []) as any[]
        const mapped = items.map(x => ({
          id: String(x._id),
          name: String(x.name || ''),
          distributorId: x.distributorId ? String(x.distributorId) : undefined,
          distributorName: x.distributorName ? String(x.distributorName) : undefined,
          status: (x.status === 'Inactive' ? 'Inactive' : 'Active') as 'Active'|'Inactive',
        }))
        setCompanies(mapped)
        setTotal(Number(res?.total || mapped.length || 0))
        setTotalPages(Number(res?.totalPages || 1))
      } catch (e) {
        console.error(e)
        setCompanies([])
        setTotal(0)
        setTotalPages(1)
      }
    })()
    return () => { mounted = false }
  }, [reloadTick, query, page, limit])

  // Refresh this page when assignments change elsewhere
  useEffect(() => {
    const onRefresh = () => setReloadTick(t => t + 1)
    window.addEventListener('pharmacy:companies:refresh', onRefresh as any)
    return () => window.removeEventListener('pharmacy:companies:refresh', onRefresh as any)
  }, [])

  const addCompany = async (c: Company) => {
    try {
      await pharmacyApi.createCompany({ name: c.name, status: c.status })
      setReloadTick(t=>t+1)
    } catch (e) { console.error(e) }
  }

  const saveEdit = async (c: Company & { id: string }) => {
    try {
      await pharmacyApi.updateCompany(c.id, { name: c.name, status: c.status })
      setReloadTick(t=>t+1)
    } catch (e) { console.error(e) }
  }

  const remove = async (id: string) => {
    try { await pharmacyApi.deleteCompany(id); setReloadTick(t=>t+1) } catch (e) { console.error(e) }
  }

  const openEdit = (c: any) => { setSelected(c); setEditOpen(true) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Companies</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={()=>setAddOpen(true)} className="btn">+ Add Company</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-3">
          <input value={query} onChange={e=>{ setQuery(e.target.value); setPage(1) }} placeholder="Search companies.." className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {companies.map(c => (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-sky-100" />
                <div>
                  <div className="font-semibold text-slate-800">{c.name}</div>
                  <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                    <span>Distributor: {c.distributorId ? `Assigned to ${c.distributorName || c.distributorId}` : 'Unassigned'}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className={`rounded px-2 py-1 ${c.status==='Inactive'?'bg-slate-100 text-slate-700':'bg-sky-100 text-sky-800'}`}>{c.status||'Active'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={()=>openEdit(c)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">✎</button>
                <button type="button" onClick={()=>remove(c.id)} className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">🗑</button>
              </div>
            </div>
          </div>
        ))}

        {companies.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">No companies</div>
        )}

        <div className="flex items-center justify-between px-1 text-sm text-slate-600">
          <div>
            {total > 0 ? (
              <>Showing {Math.min((page-1)*limit + 1, total)}-{Math.min((page-1)*limit + companies.length, total)} of {total}</>
            ) : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button type="button" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Pharmacy_AddCompanyDialog open={addOpen} onClose={()=>setAddOpen(false)} onSave={addCompany} />
      {selected && (
        <Pharmacy_AddCompanyDialog open={editOpen} onClose={()=>{ setEditOpen(false); setSelected(null) }} onSave={(c)=>saveEdit({ ...c, id: selected.id })} initial={{ id: selected.id, name: selected.name, status: (selected.status||'Active') as any }} title="Edit Company" submitLabel="Save" />
      )}
    </div>
  )
}
