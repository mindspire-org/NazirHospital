import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { diagnosticApi } from '../../utils/api'
import { DiagnosticTemplateRegistry } from '../../components/diagnostic/registry'
import Toast from '../../components/ui/Toast'

type Result = { id: string; tokenNo?: string; testName: string; patient?: any; status: 'draft'|'final'; reportedAt?: string; formData?: string; createdAt?: string; orderId?: string; testId?: string }

export default function Diagnostic_ReportGenerator(){
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'all'|'draft'|'final'>('all')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<Result[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [templateMappings, setTemplateMappings] = useState<Array<{ testId: string; templateKey: string }>>([])

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(()=>{ let mounted = true; (async()=>{
    try {
      const res = await diagnosticApi.listResults({ q: q||undefined, from: from||undefined, to: to||undefined, status: status==='all'? undefined : status, page, limit: rows }) as any
      const arr: Result[] = (res.items||[]).map((x:any)=>({ id: String(x._id), tokenNo: x.tokenNo, testName: x.testName, patient: x.patient, status: x.status||'draft', reportedAt: x.reportedAt, formData: String(x.formData||''), createdAt: x.createdAt, orderId: String(x.orderId||''), testId: String(x.testId||'') }))
      if (mounted){ setItems(arr); setTotal(Number(res.total||arr.length||0)); setTotalPages(Number(res.totalPages||1)) }
    } catch { if (mounted){ setItems([]); setTotal(0); setTotalPages(1) } }
  })(); return ()=>{ mounted=false } }, [q, from, to, status, page, rows])

  useEffect(()=>{ (async()=>{
    try {
      const s = await diagnosticApi.getSettings() as any
      const arr = Array.isArray(s?.templateMappings) ? s.templateMappings : []
      setTemplateMappings(arr.map((x:any)=> ({ testId: String(x.testId||''), templateKey: String(x.templateKey||'') })))
    } catch { setTemplateMappings([]) }
  })() }, [])

  const pageCount = Math.max(1, totalPages)
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + items.length, total)

  async function printItem(r: Result){
    const mapped = (templateMappings||[]).find(m=> String(m.testId) === String(r.testId))
    const key = mapped?.templateKey
    const tpl = key ? (DiagnosticTemplateRegistry as any)[key] : null
    if (!tpl || !tpl.print){ setToast({ type: 'error', message: 'No report template mapped for this test. Please set mapping in Diagnostic Settings.' }); return }
    await tpl.print({ tokenNo: r.tokenNo, createdAt: r.createdAt, reportedAt: r.reportedAt||r.createdAt, patient: r.patient as any, value: r.formData||'', referringConsultant: (r as any)?.patient?.referringConsultant })
  }

  function editItem(r: Result){
    const search = new URLSearchParams()
    search.set('resultId', r.id)
    if (r.orderId) search.set('orderId', String(r.orderId))
    if (r.testId) search.set('testId', String(r.testId))
    navigate(`/diagnostic/result-entry?${search.toString()}`)
  }

  async function deleteItem(r: Result){
    if (!confirm('Delete this result?')) return
    try {
      await diagnosticApi.deleteResult(r.id)
      setItems(prev => prev.filter(x => x.id !== r.id))
    } catch {}
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Report Generator</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="min-w-[260px] flex-1">
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by token, patient, or test..." className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <button onClick={()=>setStatus('all')} className={`rounded-md px-3 py-1.5 border ${status==='all'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>All</button>
            <button onClick={()=>setStatus('draft')} className={`rounded-md px-3 py-1.5 border ${status==='draft'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Draft</button>
            <button onClick={()=>setStatus('final')} className={`rounded-md px-3 py-1.5 border ${status==='final'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Final</button>
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
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Token</th>
              <th className="px-4 py-2">Test</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-4 py-2 whitespace-nowrap">{new Date(r.createdAt || '').toLocaleDateString()} {new Date(r.createdAt || '').toLocaleTimeString()}</td>
                <td className="px-4 py-2 whitespace-nowrap">{r.patient?.fullName || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{r.tokenNo || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{r.testName}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${r.status==='final'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-700'}`}>{r.status}</span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button onClick={()=>printItem(r)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50">PDF</button>
                    <button onClick={()=>editItem(r)} className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700">Edit</button>
                    <button onClick={()=>deleteItem(r)} className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No results</div>
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

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
