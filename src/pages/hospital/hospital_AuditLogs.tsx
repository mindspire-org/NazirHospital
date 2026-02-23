import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

const actions: string[] = [
  'login','logout',
  'token_generate','token_return','token_delete',
  'department_add','department_edit','department_delete',
  'doctor_add','doctor_edit',
  'user_add','user_edit','user_delete',
  'ipd_admit','ipd_discharge','ipd_transfer_bed','ipd_admit_from_token',
]

type Row = { _id: string; actor?: string; action: string; label?: string; method?: string; path?: string; at: string; detail?: string }

export default function Hospital_AuditLogs() {
  const today = new Date().toISOString().slice(0,10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [action, setAction] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [items, setItems] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const refresh = async (goToPage?: number) => {
    setLoading(true)
    try {
      const res: any = await hospitalApi.listHospitalAuditLogs({
        search: search || undefined,
        action: action && action !== 'All' ? action : undefined,
        from: from || undefined,
        to: to || undefined,
        page: goToPage ?? page,
        limit,
      })
      setItems(Array.isArray(res?.items) ? res.items : [])
      setTotal(Number(res?.total || 0))
      setTotalPages(Number(res?.totalPages || 1))
      if (goToPage != null) setPage(goToPage)
    } catch {
      setItems([]); setTotal(0); setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ refresh(1) }, [])

  const exportCSV = () => {
    const header = ['Time','Actor','Action','Details']
    const lines = [header.join(',')]
    for (const e of items) {
      const row = [new Date(e.at).toLocaleString(), e.actor||'', e.action||'', e.detail||'']
        .map(v => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : String(v))
      lines.push(row.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const canPrev = page > 1
  const canNext = page < totalPages
  const showingFrom = (page - 1) * limit + 1
  const showingTo = Math.min(page * limit, total)

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800">Audit Logs</h2>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
        <span>to</span>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
        <select value={action} onChange={e=>setAction(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1">
          <option value="All">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={()=>refresh(1)} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Apply</button>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-slate-600">Rows</label>
          <select value={limit} onChange={e=>{ setLimit(Number(e.target.value)); setPage(1); setTimeout(()=>refresh(1)) }} className="rounded-md border border-slate-300 px-2 py-1">
            {[10,20,50].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Export</button>
        </div>
      </div>

      <div className="mt-3">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search actor, action, details..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left">Time</th>
              <th className="px-4 py-2 text-left">Actor</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {items.map(e => (
              <tr key={e._id}>
                <td className="px-4 py-2">{new Date(e.at).toLocaleString()}</td>
                <td className="px-4 py-2">{e.actor || '-'}</td>
                <td className="px-4 py-2">{e.action}</td>
                <td className="px-4 py-2">{e.detail || e.label || e.path || ''}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>{loading ? 'Loading...' : 'No logs'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-700">
        <div>
          Showing {total ? showingFrom : 0}-{total ? showingTo : 0} of {total}
        </div>
        <div className="flex items-center gap-2">
          <button disabled={!canPrev} onClick={()=> refresh(page - 1)} className={`rounded-md border px-3 py-1.5 ${canPrev? 'hover:bg-slate-50' : 'opacity-50 cursor-not-allowed'}`}>Prev</button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={!canNext} onClick={()=> refresh(page + 1)} className={`rounded-md border px-3 py-1.5 ${canNext? 'hover:bg-slate-50' : 'opacity-50 cursor-not-allowed'}`}>Next</button>
        </div>
      </div>
    </div>
  )
}
