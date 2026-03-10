import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { diagnosticApi, corporateApi } from '../../utils/api'
import { DiagnosticTemplateRegistry } from '../../components/diagnostic/registry'
import type { ReportRendererProps } from '../../components/diagnostic/registry'
import Toast from '../../components/ui/Toast'
import { Building2 } from 'lucide-react'

type Order = { 
  id: string; 
  tokenNo?: string; 
  createdAt?: string; 
  patient: any; 
  tests: string[]; 
  referringConsultant?: string; 
  items?: Array<{ testId: string; status: 'received'|'completed'|'returned'; sampleTime?: string; reportingTime?: string }>; 
  status?: 'received'|'completed'|'returned'
  corporateId?: string
  corporateName?: string
  billingType?: 'cash' | 'corporate'
}
type Test = { id: string; name: string }

function formatDateTime(iso?: string) {
  const d = new Date(iso || new Date().toISOString());
  return d.toLocaleDateString() + ', ' + d.toLocaleTimeString()
}

export default function Diagnostic_ResultEntry(){
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const testsMap = useMemo(()=> Object.fromEntries(tests.map(t=>[t.id, t.name])), [tests])

  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [selectedTestId, setSelectedTestId] = useState<string>('')
  const [value, setValue] = useState('')
  const [resultId, setResultId] = useState<string | null>(null)
  const [orderFromResult, setOrderFromResult] = useState<Order | null>(null)
  const selectedOrder = useMemo(()=> orders.find(o=>o.id===selectedOrderId) || orderFromResult || null, [orders, selectedOrderId, orderFromResult])
  const selectedTestName = useMemo(()=> testsMap[selectedTestId] || '', [testsMap, selectedTestId])
  const [templateMappings, setTemplateMappings] = useState<Array<{ testId: string; templateKey: string }>>([])
  const templateKeyByTestId = useMemo(()=> Object.fromEntries((templateMappings||[]).map(m=> [String(m.testId), String(m.templateKey)])), [templateMappings])

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Filters & pagination (aligned with Sample Tracking)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'all'|'received'|'completed'|'returned'>('received')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Load tests list (for name mapping)
  useEffect(()=>{ (async()=>{
    try {
      const tr = await diagnosticApi.listTests({ limit: 1000 }) as any
      setTests((tr?.items||tr||[]).map((t:any)=>({ id: String(t._id||t.id), name: t.name })))
    } catch { setTests([]) }
  })() }, [])

  // Load companies list (for corporate billing display)
  useEffect(()=>{ (async()=>{
    try {
      const res: any = await corporateApi.listCompanies()
      setCompanies((res?.companies||[]).map((c:any)=>({ id: String(c._id||c.id), name: c.name })))
    } catch { setCompanies([]) }
  })() }, [])

  // Load template mappings from settings
  useEffect(()=>{ (async()=>{
    try {
      const s = await diagnosticApi.getSettings() as any
      const arr = Array.isArray(s?.templateMappings) ? s.templateMappings : []
      setTemplateMappings(arr.map((x:any)=> ({ testId: String(x.testId||''), templateKey: String(x.templateKey||'') })))
    } catch { setTemplateMappings([]) }
  })() }, [])

  // Load orders according to filters/pagination
  useEffect(()=>{ let mounted = true; (async()=>{
    try {
      // Important: do NOT filter by order.status when viewing 'received',
      // otherwise an order with any returned item would be excluded.
      const st = (status==='all' || status==='received') ? undefined : status
      const res = await diagnosticApi.listOrders({ q: q || undefined, from: from || undefined, to: to || undefined, status: st as any, page, limit: rows }) as any
      const companyNameMap: Record<string, string> = {}
      for (const c of companies) companyNameMap[c.id] = c.name
      const items: Order[] = (res.items||[]).map((x:any)=>({ 
        id: String(x._id), 
        tokenNo: x.tokenNo, 
        createdAt: x.createdAt, 
        patient: x.patient, 
        tests: x.tests||[], 
        referringConsultant: x.referringConsultant, 
        items: x.items||[], 
        status: x.status,
        corporateId: x.corporateId,
        corporateName: x.corporateName || companyNameMap[x.corporateId] || undefined,
        billingType: x.billingType || (x.corporateId ? 'corporate' : 'cash')
      }))
      if (mounted){ setOrders(items); setTotal(Number(res.total||items.length||0)); setTotalPages(Number(res.totalPages||1)) }
    } catch { if (mounted){ setOrders([]); setTotal(0); setTotalPages(1) } }
  })(); return ()=>{ mounted=false } }, [q, from, to, status, page, rows, companies])

  // When order/test change, load existing result or clear
  useEffect(()=>{ (async()=>{
    setValue(''); setResultId(null)
    if (!selectedOrderId || !selectedTestId) return
    try {
      const r = await diagnosticApi.listResults({ orderId: selectedOrderId, testId: selectedTestId, limit: 1 }) as any
      const item = (r?.items||[])[0]
      if (item){
        setResultId(String(item._id))
        const fd = (item as any)?.formData
        setValue(typeof fd === 'string' ? fd : JSON.stringify(fd || ''))
      }
    } catch {}
  })() }, [selectedOrderId, selectedTestId])

  // Support deep-linking via query params (orderId, testId, resultId)
  useEffect(()=>{ (async()=>{
    const oid = searchParams.get('orderId') || ''
    const tid = searchParams.get('testId') || ''
    const rid = searchParams.get('resultId') || ''
    if (oid) setSelectedOrderId(oid)
    if (tid) setSelectedTestId(tid)
    if (rid){
      try {
        const r = await diagnosticApi.getResult(rid) as any
        if (r){
          setResultId(String(r._id))
          const fd = (r as any)?.formData
          setValue(typeof fd === 'string' ? fd : JSON.stringify(fd || ''))
          if (r.orderId) setSelectedOrderId(String(r.orderId))
          if (r.testId) setSelectedTestId(String(r.testId))
          // Provide snapshot so Print/Finalize works even if the order is not in the received list
          setOrderFromResult({ id: String(r.orderId), tokenNo: r.tokenNo, createdAt: r.createdAt, patient: r.patient||{}, tests: Array.isArray((r as any)?.tests)? (r as any).tests : [], referringConsultant: (r as any)?.patient?.referringConsultant, items: [], status: undefined as any })
          // Ensure testsMap can resolve test name for form selection
          if (r.testId && r.testName){
            setTests(prev => prev.some(t=> t.id === String(r.testId)) ? prev : [...prev, { id: String(r.testId), name: String(r.testName) }])
          }
        }
      } catch {}
    }
  })() }, [searchParams])

  const FormComp = useMemo(()=>{
    const key = templateKeyByTestId[selectedTestId]
    return key ? (DiagnosticTemplateRegistry as any)[key]?.Form as React.ComponentType<ReportRendererProps> : undefined
  }, [selectedTestId, templateKeyByTestId])

  async function save(){
    if (!selectedOrder || !selectedTestId) return
    const payload = {
      orderId: selectedOrder.id,
      testId: selectedTestId,
      testName: selectedTestName,
      tokenNo: selectedOrder.tokenNo,
      patient: selectedOrder.patient,
      formData: value,
      status: 'final',
      reportedAt: new Date().toISOString(),
    }
    if (resultId){
      await diagnosticApi.updateResult(resultId, { formData: value, status: 'final', reportedAt: payload.reportedAt })
    } else {
      const created = await diagnosticApi.createResult(payload as any) as any
      setResultId(String(created?._id))
    }
    // Optimistically mark this test as completed so it disappears from the list (received filter)
    setOrders(prev => prev.map(o => {
      if (o.id !== selectedOrder.id) return o
      const items = Array.isArray(o.items) ? o.items.slice() : []
      const idx = items.findIndex(i=> i.testId===selectedTestId)
      const now = new Date().toISOString()
      if (idx>=0) items[idx] = { ...items[idx], status: 'completed', reportingTime: now }
      else items.push({ testId: selectedTestId, status: 'completed', reportingTime: now })
      return { ...o, items }
    }))
    // Clear selection
    setSelectedOrderId(''); setSelectedTestId(''); setValue(''); setResultId(null); setOrderFromResult(null)
    setToast({ type: 'success', message: 'Result finalized successfully' })
  }

  async function printNow(){
    if (!selectedOrder || !selectedTestId) return
    const key = templateKeyByTestId[selectedTestId]
    const tpl = key ? (DiagnosticTemplateRegistry as any)[key] : null
    if (!tpl || !tpl.print){ setToast({ type: 'error', message: 'No report template mapped for this test. Please set mapping in Diagnostic Settings.' }); return }
    await tpl.print({ tokenNo: selectedOrder.tokenNo, createdAt: selectedOrder.createdAt, reportedAt: new Date().toISOString(), patient: selectedOrder.patient, value, referringConsultant: selectedOrder.referringConsultant })
  }

  // Pagination helpers
  const pageCount = Math.max(1, totalPages)
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + orders.length, total)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-2xl font-bold text-slate-900">Result Entry</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[260px] flex-1">
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by token, patient, or test..." className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <button onClick={()=>{ setStatus('all'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='all'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>All</button>
            <button onClick={()=>{ setStatus('received'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='received'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Received</button>
            <button onClick={()=>{ setStatus('completed'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='completed'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Completed</button>
            <button onClick={()=>{ setStatus('returned'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='returned'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Returned</button>
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
              <th className="px-4 py-2">Token No</th>
              <th className="px-4 py-2">Test</th>
              <th className="px-4 py-2">Billing</th>
              <th className="px-4 py-2">MR No</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.reduce((acc: any[], o) => {
              const token = o.tokenNo || '-'
              const visibleTests = (o.tests||[]).filter((tid)=>{
                const item = (o.items||[]).find(i=> i.testId===tid)
                const istatus: 'received'|'completed'|'returned' = (item?.status || 'received') as any
                if (status==='all') return true
                return istatus === status
              })
              visibleTests.forEach((tid, idx) => {
                const tname = testsMap[tid] || '—'
                const isActive = selectedOrderId===o.id && selectedTestId===tid
                acc.push(
                  <tr key={`${o.id}-${tid}-${idx}`} className={`border-b border-slate-100 ${isActive? 'bg-violet-50' : ''}`}>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(o.createdAt||'')}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient?.fullName || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{token}</td>
                    <td className="px-4 py-2">{tname}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {o.billingType === 'corporate' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700" title={o.corporateName || 'Corporate'}>
                          <Building2 className="h-3 w-3" />
                          {o.corporateName || 'Corporate'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Cash</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient?.mrn || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient?.phone || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button onClick={()=>{ setOrderFromResult(null); setSelectedOrderId(o.id); setSelectedTestId(String(tid)) }} className="rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700">Enter Result</button>
                    </td>
                  </tr>
                )
              })
              return acc
            }, [] as any[])}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No samples found</div>
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

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {!FormComp && (
          <div className="text-sm text-slate-600">Select a sample row and test (Enter Result) to load the form.</div>
        )}
        {FormComp && (
          <FormComp value={value} onChange={setValue} />
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={printNow} disabled={!FormComp || !selectedOrderId || !selectedTestId} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Print</button>
        <button onClick={()=>save()} disabled={!FormComp || !selectedOrderId || !selectedTestId} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Finalize</button>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
