import { useEffect, useMemo, useState } from 'react'
import { corporateApi } from '../../../utils/api'

export default function Hospital_CorporateDashboard(){
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [filters, setFilters] = useState<{ companyId: string; from: string; to: string }>({ companyId: '', from: '', to: '' })
  const [outstandingRows, setOutstandingRows] = useState<Array<{ companyId: string; companyName: string; outstanding: number; accrued?: number; claimed?: number }>>([])
  const [totalPatients, setTotalPatients] = useState(0)
  const [paidTotal, setPaidTotal] = useState(0)

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const [cRes] = await Promise.all([
          corporateApi.listCompanies() as any,
        ])
        if (!mounted) return
        setCompanies((cRes?.companies||[]).map((c:any)=>({ id: String(c._id||c.id), name: c.name })))
      } catch { /* ignore */ }
    })()
    return ()=>{ mounted=false }
  }, [])

  async function apply(){
    try {
      const params = { companyId: filters.companyId || undefined, from: filters.from || undefined, to: filters.to || undefined }
      const [oRes, txRes, payRes] = await Promise.all([
        corporateApi.reportsOutstanding(params as any) as any,
        corporateApi.listTransactions({ companyId: filters.companyId || undefined, from: filters.from || undefined, to: filters.to || undefined }) as any,
        corporateApi.listPayments({ companyId: filters.companyId || undefined, from: filters.from || undefined, to: filters.to || undefined, limit: 10000 }) as any,
      ])
      setOutstandingRows(oRes?.rows || [])
      const setP = new Set<string>()
      for (const t of (txRes?.transactions||[])){
        const mrn = String(t.patientMrn||'').trim()
        if (mrn) setP.add(mrn)
      }
      setTotalPatients(setP.size)
      const pays: any[] = (payRes?.payments || payRes?.items || payRes || []) as any[]
      const sum = pays.reduce((s,p)=> s + Number(p?.amount||0), 0)
      setPaidTotal(sum)
    } catch { setOutstandingRows([]); setTotalPatients(0) }
  }
  useEffect(()=>{ apply() }, [])

  const totalOutstanding = useMemo(()=> (outstandingRows||[]).reduce((s,r)=> s + Number(r?.outstanding||0), 0), [outstandingRows])
  const claimedTotal = useMemo(()=> (outstandingRows||[]).reduce((s,r)=> s + Number(r?.claimed||0), 0), [outstandingRows])
  const accruedTotal = useMemo(()=> (outstandingRows||[]).reduce((s,r)=> s + Number(r?.accrued||0), 0), [outstandingRows])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Corporate Dashboard</h2>

      {/* Filters */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5 items-end">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Company</label>
            <select value={filters.companyId} onChange={e=>setFilters(s=>({ ...s, companyId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <div className="flex items-end"><button onClick={apply} className="btn">Apply</button></div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPI title="Total Outstanding" value={formatPKR(totalOutstanding)} tone="bg-amber-50 border-amber-200" />
        <KPI title="Claimable (Accrued)" value={formatPKR(accruedTotal)} tone="bg-emerald-50 border-emerald-200" />
        <KPI title="Claimed" value={formatPKR(claimedTotal)} tone="bg-violet-50 border-violet-200" />
        <KPI title="Paid" value={formatPKR(paidTotal)} tone="bg-green-50 border-green-200" />
        <KPI title="Companies" value={String(companies.length)} tone="bg-sky-50 border-sky-200" />
        <KPI title="Total Patients" value={String(totalPatients)} tone="bg-indigo-50 border-indigo-200" />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-medium text-slate-700">Outstanding vs Claimable vs Claimed vs Paid</div>
        <FourBars
          data={[
            { label: 'Outstanding', value: totalOutstanding, color: '#F59E0B' },
            { label: 'Claimable', value: accruedTotal, color: '#0EA5E9' },
            { label: 'Claimed', value: claimedTotal, color: '#8B5CF6' },
            { label: 'Paid', value: paidTotal, color: '#10B981' },
          ]}
        />
      </section>
    </div>
  )
}

function KPI({ title, value, tone }: { title: string; value: string; tone?: string }){
  return (
    <div className={`rounded-lg border p-4 ${tone || 'bg-white border-slate-200'}`}>
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  )
}

function FourBars({ data }: { data: Array<{ label: string; value: number; color: string }> }){
  const W = 640, H = 220
  const padX = 40, padTop = 20, padBottom = 36
  const innerH = H - padTop - padBottom
  const maxV = Math.max(1, ...data.map(d => Number(d.value || 0)))
  const gap = 24
  const barW = (W - padX * 2 - gap * (data.length - 1)) / data.length
  return (
    <div className="w-full">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <line x1={padX} y1={padTop + innerH} x2={W - padX} y2={padTop + innerH} stroke="#e5e7eb" />
        {data.map((d, i) => {
          const x = padX + i * (barW + gap)
          const h = (Number(d.value || 0) / maxV) * innerH
          const y = padTop + innerH - h
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={Math.max(0, h)} rx={4} fill={d.color}>
                <title>{`${d.label}: ${formatPKR(Number(d.value || 0))}`}</title>
              </rect>
              <text x={x + barW / 2} y={Math.max(10, y - 6)} textAnchor="middle" fontSize="10" fill="#111827">{formatPKR(Number(d.value || 0))}</text>
              <text x={x + barW / 2} y={H - 14} textAnchor="middle" fontSize="11" fill="#374151">{d.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

//

function formatPKR(n: number){
  try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` }
}
