import { useEffect, useState } from 'react'
import { aestheticApi } from '../../utils/api'

export default function Aesthetic_AuditLogsPage(){
  const [list, setList] = useState<Array<{ _id:string; at:string; action:string; detail?:string }>>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await aestheticApi.listAuditLogs({ page, limit: 20 })
        if (!mounted) return
        setList(res.items || [])
        setTotal(Number(res.total || 0))
        setTotalPages(Number(res.totalPages || 1))
      } catch (e) {
        console.error(e)
        setList([])
        setTotal(0)
        setTotalPages(1)
      }
    })()
    return () => { mounted = false }
  }, [page])

  return (
    <div className="w-full space-y-3">
      <div className="text-lg font-semibold">Audit Logs</div>
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Detail</th>
            </tr>
          </thead>
          <tbody>
            {list.map(row => (
              <tr key={row._id} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2">{new Date(row.at).toLocaleString()}</td>
                <td className="px-3 py-2">{row.action}</td>
                <td className="px-3 py-2">{row.detail || '-'}</td>
              </tr>
            ))}
            {list.length===0 && (
              <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={3}>No audit logs</td></tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 px-3 py-2 text-sm">
          <div>
            {total>0 ? <>Showing {Math.min((page-1)*20+1,total)}-{Math.min((page-1)*20 + list.length, total)} of {total}</> : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border px-2 py-1 disabled:opacity-50" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button className="rounded-md border px-2 py-1 disabled:opacity-50" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
