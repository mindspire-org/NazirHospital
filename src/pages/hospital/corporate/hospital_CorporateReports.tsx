import { useEffect, useMemo, useState } from 'react'
import { corporateApi } from '../../../utils/api'

export default function Hospital_CorporateReports(){
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [outstanding, setOutstanding] = useState<Array<{ companyId: string; companyName: string; outstanding: number; accrued?: number; claimed?: number }>>([])
  const [aging, setAging] = useState<Array<{ companyId: string; companyName: string; ['0-30']?: number; ['31-60']?: number; ['61-90']?: number; ['90+']?: number }>>([])

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        setLoading(true)
        const [c, o, a] = await Promise.all([
          corporateApi.listCompanies() as any,
          corporateApi.reportsOutstanding(companyId? { companyId } : undefined) as any,
          corporateApi.reportsAging(companyId? { companyId } : undefined) as any,
        ])
        if (!mounted) return
        setCompanies((c?.companies||[]).map((x:any)=>({ id: String(x._id||x.id), name: x.name })))
        setOutstanding(o?.rows || [])
        setAging(a?.rows || [])
      } finally{ setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [companyId])

  const totalOutstanding = useMemo(()=> outstanding.reduce((s,r)=> s + Number(r.outstanding||0), 0), [outstanding])

  function exportOutstandingCSV(){
    const headers = ['Company','Outstanding','Accrued','Claimed']
    const rows = outstanding.map(r => [safe(r.companyName||r.companyId), String(r.outstanding||0), String(r.accrued||0), String(r.claimed||0)])
    downloadCSV('corporate_outstanding.csv', [headers, ...rows])
  }
  function exportAgingCSV(){
    const headers = ['Company','0-30','31-60','61-90','90+']
    const rows = aging.map(r => [safe(r.companyName||r.companyId), String((r as any)['0-30']||0), String((r as any)['31-60']||0), String((r as any)['61-90']||0), String((r as any)['90+']||0)])
    downloadCSV('corporate_aging.csv', [headers, ...rows])
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Corporate Reports</h2>

      {/* Filters */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Company</label>
            <select value={companyId} onChange={e=>setCompanyId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Outstanding */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-700">Outstanding by Company</div>
            <div className="text-xs text-slate-600">Total: <span className="font-semibold">{formatPKR(totalOutstanding)}</span></div>
          </div>
          <button onClick={exportOutstandingCSV} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Export CSV</button>
        </div>
        {loading && <div className="text-sm text-slate-500">Loading...</div>}
        {!loading && outstanding.length === 0 && <div className="text-sm text-slate-500">No data</div>}
        {!loading && outstanding.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-2">Company</th>
                  <th className="px-2 py-2 text-right">Outstanding</th>
                  <th className="px-2 py-2 text-right">Accrued</th>
                  <th className="px-2 py-2 text-right">Claimed</th>
                </tr>
              </thead>
              <tbody>
                {outstanding.map((r)=> (
                  <tr key={String(r.companyId)} className="border-t border-slate-100">
                    <td className="px-2 py-2">{r.companyName || r.companyId}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(r.outstanding||0)}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number(r.accrued||0))}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number(r.claimed||0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Aging */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Aging</div>
          <button onClick={exportAgingCSV} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Export CSV</button>
        </div>
        {loading && <div className="text-sm text-slate-500">Loading...</div>}
        {!loading && aging.length === 0 && <div className="text-sm text-slate-500">No data</div>}
        {!loading && aging.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-2">Company</th>
                  <th className="px-2 py-2 text-right">0-30</th>
                  <th className="px-2 py-2 text-right">31-60</th>
                  <th className="px-2 py-2 text-right">61-90</th>
                  <th className="px-2 py-2 text-right">90+</th>
                </tr>
              </thead>
              <tbody>
                {aging.map((r)=> (
                  <tr key={String(r.companyId)} className="border-t border-slate-100">
                    <td className="px-2 py-2">{r.companyName || r.companyId}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number((r as any)['0-30']||0))}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number((r as any)['31-60']||0))}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number((r as any)['61-90']||0))}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number((r as any)['90+']||0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function downloadCSV(filename: string, rows: string[][]){
  const csv = rows.map(r => r.map(safe).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
function safe(s?: string){ return String(s||'').replace(/[\n\r,]/g,' ') }
function formatPKR(n: number){ try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` } }
