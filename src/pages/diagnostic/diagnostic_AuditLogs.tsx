import { useEffect, useState } from 'react'
import { diagnosticApi } from '../../utils/api'

type Log = { id: string; action: string; subjectType?: string; subjectId?: string; message?: string; actorUsername?: string; createdAt?: string }

function fmt(iso?: string){ const d = new Date(iso||''); return isNaN(d.getTime())? '-' : d.toLocaleDateString()+" "+d.toLocaleTimeString() }

export default function Diagnostic_AuditLogs(){
  const [logs, setLogs] = useState<Log[]>([])
  const [q, setQ] = useState('')
  const [action, setAction] = useState('')
  const [subjectType, setSubjectType] = useState('')
  const [actorUsername, setActorUsername] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(()=>{ let mounted=true; (async()=>{
    try {
      const res = await diagnosticApi.listAuditLogs({ search: q||undefined, action: action||undefined, subjectType: subjectType||undefined, actorUsername: actorUsername||undefined, from: from||undefined, to: to||undefined, page, limit: rows }) as any
      const items: Log[] = (res.items||[]).map((x:any)=>({ id: String(x._id), action: x.action, subjectType: x.subjectType, subjectId: x.subjectId, message: x.message, actorUsername: x.actorUsername, createdAt: x.createdAt }))
      if (mounted){ setLogs(items); setTotal(Number(res.total||items.length||0)); setTotalPages(Number(res.totalPages||1)) }
    } catch { if (mounted){ setLogs([]); setTotal(0); setTotalPages(1) } }
  })(); return ()=>{ mounted=false } }, [q, action, subjectType, actorUsername, from, to, page, rows])

  const pageCount = Math.max(1, totalPages)
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + logs.length, total)

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h2 className="text-xl font-semibold text-slate-800">Audit Logs</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="min-w-[220px] flex-1">
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search message, action, subject, user..." className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <input value={action} onChange={e=>{ setAction(e.target.value); setPage(1) }} placeholder="Action (e.g., result.finalize)" className="rounded-md border border-slate-300 px-3 py-2 w-[200px]" />
          <input value={subjectType} onChange={e=>{ setSubjectType(e.target.value); setPage(1) }} placeholder="Subject (Result/Order)" className="rounded-md border border-slate-300 px-3 py-2 w-[180px]" />
          <input value={actorUsername} onChange={e=>{ setActorUsername(e.target.value); setPage(1) }} placeholder="User" className="rounded-md border border-slate-300 px-3 py-2 w-[160px]" />
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span>Rows</span>
            <select value={rows} onChange={e=>{ setRows(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="px-4 py-2 whitespace-nowrap">{fmt(l.createdAt)}</td>
                <td className="px-4 py-2 whitespace-nowrap">{l.action}</td>
                <td className="px-4 py-2 whitespace-nowrap">{l.subjectType || '-'}{l.subjectId? ` / ${l.subjectId}`: ''}</td>
                <td className="px-4 py-2 whitespace-nowrap">{l.actorUsername || '-'}</td>
                <td className="px-4 py-2">{l.message || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No logs</div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>{total === 0 ? '0' : `${start}-${end}`} of {total}</div>
        <div className="flex items-center gap-2">
          <button disabled={curPage<=1} onClick={()=> setPage(p=> Math.max(1, p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Prev</button>
          <span>{curPage} / {pageCount}</span>
          <button disabled={curPage>=pageCount} onClick={()=> setPage(p=> p+1)} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  )
}
