import { useEffect, useMemo, useRef, useState } from 'react'
import { labApi } from '../../utils/api'

 type Log = {
  id: string
  actor: string
  action: string
  label: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path?: string
  at: string
  detail?: string
}

const actions = [
  'All Actions',
  'Login',
  'Logout',
  'Add Inventory',
  'Edit Inventory',
  'Delete Inventory',
  'Add Result',
  'Approve Result',
  'Add Expense',
  'Add User',
  // Lab orders & tracking
  'Sample Intake',
  'Tracking Update',
  'Delete Sample',
  // Returns
  'Customer Return',
  'Supplier Return',
  'Undo Return',
  // Staff
  'Add Staff',
  'Edit Staff',
  'Delete Staff',
  // Attendance
  'Mark Attendance',
] as const

export default function Lab_AuditLogs() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<typeof actions[number]>('All Actions')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [tick, setTick] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [logs, setLogs] = useState<Log[]>([])
  const reqSeq = useRef(0)

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      const mySeq = ++reqSeq.current
      try {
        const res = await labApi.listAuditLogs({
          search: search || undefined,
          action: action==='All Actions' ? undefined : action,
          from: from || undefined,
          to: to || undefined,
          page,
          limit,
        })
        if (!mounted || mySeq !== reqSeq.current) return
        const list: Log[] = (res.items||res||[]).map((x:any)=>({
          id: x._id,
          actor: x.actor || 'system',
          action: x.action || '-',
          label: x.label || '-',
          method: x.method,
          path: x.path,
          at: x.at || x.createdAt || new Date().toISOString(),
          detail: x.detail || '',
        }))
        setLogs(list)
        setTotal(Number((res as any).total || list.length || 0))
        setTotalPages(Number((res as any).totalPages || 1))
      } catch (e) { console.error(e); if (mounted && mySeq===reqSeq.current) setLogs([]) }
    })()
    return ()=>{ mounted = false }
  }, [search, action, from, to, page, limit, tick])

  const filtered = useMemo(()=> logs, [logs])

  const refresh = () => { setPage(1); setTick(t=>t+1) }
  const exportPdf = () => {
    const rows = filtered
      .map(l=>`<tr>
        <td style="border:1px solid #e5e7eb;padding:6px;">${l.actor}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${l.action}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${l.label}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${l.method||''}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${l.path||''}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${new Date(l.at).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${l.detail||''}</td>
      </tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <title>Audit Logs</title>
      <style>body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a}
      h1{font-size:18px;margin:12px 0}
      table{width:100%;border-collapse:collapse}
      th{background:#f8fafc;border:1px solid #e5e7eb;padding:6px;text-align:left;font-weight:600}
      td{font-size:12px}
      </style>
    </head><body>
      <h1>Audit Logs</h1>
      <table>
        <thead><tr>
          <th>Actor</th><th>Action</th><th>Label</th><th>Method</th><th>Path</th><th>At</th><th>Detail</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`
    try{
      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewHtml === 'function') { api.printPreviewHtml(html, {}); return }
    }catch{}
    try {
      const win = window.open('', '_blank'); if (!win) return
      win.document.write(html + '<script>window.onload=()=>{window.print();}</script>')
      win.document.close()
    } catch (e) { console.error(e) }
  }
  const exportExcel = () => {
    try {
      const headers = ['Actor','Action','Label','Method','Path','At','Detail']
      const lines = filtered.map(l=>[
        l.actor,
        l.action,
        l.label,
        l.method||'',
        l.path||'',
        new Date(l.at).toLocaleString(),
        l.detail||'',
      ])
      const csv = [headers, ...lines]
        .map(row => row.map(v => {
          const s = String(v)
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s
        }).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Audit Logs</div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_200px_1fr_1fr_auto_auto_auto] items-end">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Search logs...</label>
            <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search logs..." />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Action</label>
            <select value={action} onChange={e=>setAction(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {actions.map(a => (<option key={a}>{a}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button onClick={refresh} className="btn">Refresh</button>
          <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <div className="flex gap-2">
            <button onClick={exportPdf} className="btn-outline-navy">Export Logs PDF</button>
            <button onClick={exportExcel} className="btn-outline-navy">Export Logs Excel</button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 px-1 py-3 text-sm text-slate-600">
          <div>
            {total > 0 ? (
              <>Showing {Math.min((page-1)*limit + 1, total)}-{Math.min((page-1)*limit + filtered.length, total)} of {total}</>
            ) : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-slate-500"><path d="M8.25 13.5a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5ZM3.75 12a4.5 4.5 0 1 0 9 0 4.5 4.5 0 0 0-9 0Z"/><path d="M17.25 8.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Z"/><path d="M17.25 15.75a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"/></svg>
          <div className="font-medium">System Activity</div>
        </div>

        <div className="space-y-3">
          {filtered.map(l => (
            <div key={l.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <div className="font-semibold text-slate-800">{l.actor}</div>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{l.label}</span>
                    {l.method && <span className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-700">{l.method}</span>}
                    {l.path && <span className="truncate text-xs text-slate-500">{l.path}</span>}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{new Date(l.at).toLocaleString()} {l.detail ? ` — ${l.detail}` : ''}</div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-slate-500">No logs found</div>
          )}
        </div>
      </div>
    </div>
  )
}
