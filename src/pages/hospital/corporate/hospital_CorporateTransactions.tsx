import { useEffect, useMemo, useState } from 'react'
import { corporateApi } from '../../../utils/api'

export default function Hospital_CorporateTransactions(){
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [filters, setFilters] = useState<{ companyId: string; serviceType: ''|'OPD'|'LAB'|'DIAG'|'IPD'; status: ''|'accrued'|'claimed'|'paid'|'reversed'|'rejected'; refType: ''|'opd_token'|'lab_order'|'diag_order'|'ipd_billing_item'; from: string; to: string; patientMrn: string }>({ companyId: '', serviceType: '', status: '', refType: '', from: '', to: '', patientMrn: '' })
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState<number | null>(null)

  useEffect(()=>{ (async()=>{ try{ const r = await corporateApi.listCompanies() as any; setCompanies((r?.companies||[]).map((c:any)=>({ id: String(c._id||c.id), name: c.name })))}catch{ setCompanies([]) } })() }, [])

  async function load(){
    setLoading(true)
    try {
      const res = await corporateApi.listTransactions({ companyId: filters.companyId || undefined, serviceType: filters.serviceType || undefined, status: filters.status || undefined, refType: filters.refType || undefined, from: filters.from || undefined, to: filters.to || undefined, patientMrn: filters.patientMrn || undefined, page, limit }) as any
      setRows(res?.transactions || res?.items || [])
      const t = (res?.total ?? res?.count ?? res?.totalCount)
      setTotal(typeof t === 'number' ? t : null)
    } catch { setRows([]) }
    setLoading(false)
  }
  useEffect(()=>{ load() }, [page, limit])

  const totalNet = useMemo(()=> rows.reduce((s,r)=> s + Number(r?.netToCorporate||0), 0), [rows])
  const companyNameMap = useMemo(()=>{
    const m: Record<string,string> = {}
    for (const c of companies){ m[String(c.id)] = c.name }
    return m
  }, [companies])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Corporate Transactions</h2>

      {/* Filters */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Company</label>
            <select value={filters.companyId} onChange={e=>setFilters(s=>({ ...s, companyId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Service</label>
            <select value={filters.serviceType} onChange={e=>setFilters(s=>({ ...s, serviceType: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Any</option>
              <option value="OPD">OPD</option>
              <option value="LAB">Lab</option>
              <option value="DIAG">Diagnostic</option>
              <option value="IPD">IPD</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select value={filters.status} onChange={e=>setFilters(s=>({ ...s, status: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Any</option>
              <option value="accrued">Accrued</option>
              <option value="claimed">Claimed</option>
              <option value="paid">Paid</option>
              <option value="reversed">Reversed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Ref Type</label>
            <select value={filters.refType} onChange={e=>setFilters(s=>({ ...s, refType: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Any</option>
              <option value="opd_token">OPD Token</option>
              <option value="lab_order">Lab Order</option>
              <option value="diag_order">Diagnostic Order</option>
              <option value="ipd_billing_item">IPD Billing Item</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
            <input type="date" value={filters.from} onChange={e=>setFilters(s=>({ ...s, from: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
            <input type="date" value={filters.to} onChange={e=>setFilters(s=>({ ...s, to: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Patient MRN</label>
            <input value={filters.patientMrn} onChange={e=>setFilters(s=>({ ...s, patientMrn: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional" />
          </div>
          <div className="flex items-end"><button onClick={()=>{ setPage(1); load() }} className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white">Apply</button></div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Results</div>
          <div className="text-sm text-slate-600">Total Net: <span className="font-semibold">{formatPKR(totalNet)}</span></div>
        </div>
        {loading && <div className="text-sm text-slate-500">Loading...</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-slate-500">No transactions</div>}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">MRN</th>
                  <th className="px-2 py-2">Patient</th>
                  <th className="px-2 py-2">Panel</th>
                  <th className="px-2 py-2">Service</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">UnitPrice</th>
                  <th className="px-2 py-2 text-right">CoPay</th>
                  <th className="px-2 py-2 text-right">Net To Corp</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r:any)=>{
                  const d = r.dateIso || (r.createdAt ? new Date(r.createdAt).toISOString().slice(0,10) : '')
                  return (
                    <tr key={String(r._id)} className="border-t border-slate-100">
                      <td className="px-2 py-2">{d}</td>
                      <td className="px-2 py-2">{r.patientMrn || '-'}</td>
                      <td className="px-2 py-2">{r.patientName || '-'}</td>
                      <td className="px-2 py-2">{r.companyName || r.corporateName || companyNameMap[String(r.companyId || r.corporateId || r.panelId || '')] || '-'}</td>
                      <td className="px-2 py-2">{r.serviceType}</td>
                      <td className="px-2 py-2">{r.description || '-'}</td>
                      <td className="px-2 py-2 text-right">{Number(r.qty||1)}</td>
                      <td className="px-2 py-2 text-right">{formatPKR(Number(r.unitPrice||0))}</td>
                      <td className="px-2 py-2 text-right">{formatPKR(Number(r.coPay||0))}</td>
                      <td className="px-2 py-2 text-right">{formatPKR(Number(r.netToCorporate||0))}</td>
                      <td className="px-2 py-2">{r.status}</td>
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

function formatPKR(n: number){ try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` } }
