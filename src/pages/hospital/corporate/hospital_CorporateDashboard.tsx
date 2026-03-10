import { useEffect, useMemo, useState } from 'react'
import { corporateApi } from '../../../utils/api'
import { useNavigate } from 'react-router-dom'
import {
  Wallet,
  CreditCard,
  Building2,
  FileText,
  ArrowRight,
} from 'lucide-react'

export default function Hospital_CorporateDashboard(){
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0,10)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [filters, setFilters] = useState<{ companyId: string; from: string; to: string }>({ companyId: '', from: '', to: '' })
  const [outstandingRows, setOutstandingRows] = useState<Array<{ companyId: string; companyName: string; outstanding: number; accrued?: number; claimed?: number; paid?: number }>>([])
  const [totalPatients, setTotalPatients] = useState(0)
  const [paidTotal, setPaidTotal] = useState(0)
  const [claims, setClaims] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Date range defaults to last 30 days
  useEffect(() => {
    const to = today
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0,10)
    setFilters(s => ({ ...s, from, to }))
  }, [])

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
    setLoading(true)
    try {
      const params = { companyId: filters.companyId || undefined, from: filters.from || undefined, to: filters.to || undefined }
      const [oRes, txRes, payRes, claimsRes] = await Promise.all([
        corporateApi.reportsOutstanding(params as any) as any,
        corporateApi.listTransactions({ companyId: filters.companyId || undefined, from: filters.from || undefined, to: filters.to || undefined, limit: 1000 }) as any,
        corporateApi.listPayments({ companyId: filters.companyId || undefined, from: filters.from || undefined, to: filters.to || undefined, limit: 1000 }) as any,
        corporateApi.listClaims({ companyId: filters.companyId || undefined, from: filters.from || undefined, to: filters.to || undefined, limit: 1000 }) as any,
      ])
      setOutstandingRows(oRes?.rows || [])
      const setP = new Set<string>()
      const txs = txRes?.transactions || []
      for (const t of txs){
        const mrn = String(t.patientMrn||'').trim()
        if (mrn) setP.add(mrn)
      }
      setTotalPatients(setP.size)
      const pays: any[] = (payRes?.payments || payRes?.items || payRes || []) as any[]
      const sum = pays.reduce((s,p)=> s + Number(p?.amount||0), 0)
      setPaidTotal(sum)
      setPayments(pays)
      setTransactions(txs)
      setClaims(claimsRes?.items || claimsRes?.claims || [])
    } catch { 
      setOutstandingRows([]); setTotalPatients(0)
      setPayments([]); setTransactions([]); setClaims([])
    }
    setLoading(false)
  }
  useEffect(()=>{ apply() }, [filters.companyId])

  const totalOutstanding = useMemo(()=> (outstandingRows||[]).reduce((s,r)=> s + Number(r?.outstanding||0), 0), [outstandingRows])
  const claimedTotal = useMemo(()=> (outstandingRows||[]).reduce((s,r)=> s + Number(r?.claimed||0), 0), [outstandingRows])
  const accruedTotal = useMemo(()=> (outstandingRows||[]).reduce((s,r)=> s + Number(r?.accrued||0), 0), [outstandingRows])

  // Claims status breakdown
  const claimsByStatus = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {}
    for (const c of claims) {
      const status = c.status || 'unknown'
      if (!map[status]) map[status] = { count: 0, amount: 0 }
      map[status].count++
      map[status].amount += Number(c.totalAmount || 0)
    }
    return map
  }, [claims])

  const claimStatusColors: Record<string, string> = {
    open: '#3B82F6',
    locked: '#8B5CF6',
    'partially-paid': '#F59E0B',
    paid: '#10B981',
    rejected: '#EF4444'
  }

  // Collection metrics
  const collectionRate = useMemo(() => {
    if (!claimedTotal) return 0
    return (paidTotal / claimedTotal) * 100
  }, [paidTotal, claimedTotal])

  const avgClaimSize = useMemo(() => {
    if (!claims.length) return 0
    return claimedTotal / claims.length
  }, [claims.length, claimedTotal])

  const pendingClaimsCount = useMemo(() => {
    return claims.filter(c => c.status === 'open' || c.status === 'locked').length
  }, [claims])

  const totalDiscount = useMemo(() => {
    return payments.reduce((s, p) => s + Number(p.discount || 0), 0)
  }, [payments])

  // Aging analysis
  const agingBuckets = useMemo(() => {
    const now = new Date()
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    for (const t of transactions) {
      if (t.status === 'paid') continue
      const date = new Date(t.dateIso || t.createdAt || t.date)
      const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      const due = Math.max(0, Number(t.netToCorporate || 0) - Number(t.paidAmount || 0))
      if (days <= 30) buckets['0-30'] += due
      else if (days <= 60) buckets['31-60'] += due
      else if (days <= 90) buckets['61-90'] += due
      else buckets['90+'] += due
    }
    return buckets
  }, [transactions])

  // Top companies by outstanding
  const topCompanies = useMemo(() => {
    return [...outstandingRows]
      .sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0))
      .slice(0, 10)
  }, [outstandingRows])

  // Recent activity
  const recentClaims = useMemo(() => {
    return [...claims]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
  }, [claims])

  const recentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) => new Date(b.dateIso || b.createdAt || 0).getTime() - new Date(a.dateIso || a.createdAt || 0).getTime())
      .slice(0, 5)
  }, [payments])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Corporate Dashboard</h2>
        {loading && <span className="text-sm text-slate-500">Loading...</span>}
      </div>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <QuickActionCard
          icon={FileText}
          label="Generate Claim"
          tone="bg-violet-50 border-violet-200 text-violet-700"
          onClick={() => navigate('/hospital/corporate/claims')}
        />
        <QuickActionCard
          icon={Wallet}
          label="Record Payment"
          tone="bg-emerald-50 border-emerald-200 text-emerald-700"
          onClick={() => navigate('/hospital/corporate/payments')}
        />
        <QuickActionCard
          icon={CreditCard}
          label="View Transactions"
          tone="bg-sky-50 border-sky-200 text-sky-700"
          onClick={() => navigate('/hospital/corporate/transactions')}
        />
        <QuickActionCard
          icon={Building2}
          label="Add Company"
          tone="bg-amber-50 border-amber-200 text-amber-700"
          onClick={() => navigate('/hospital/corporate/companies')}
        />
      </section>

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
          <div className="flex items-end gap-2">
            <button onClick={apply} className="btn">Apply</button>
            <button onClick={() => { setFilters({ companyId: '', from: '', to: '' }); setTimeout(apply, 0) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Reset</button>
          </div>
        </div>
      </section>

      {/* Enhanced KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI title="Total Outstanding" value={formatPKR(totalOutstanding)} tone="bg-amber-50 border-amber-200" subtext="Awaiting payment" />
        <KPI title="Claimable (Accrued)" value={formatPKR(accruedTotal)} tone="bg-sky-50 border-sky-200" subtext="Ready to claim" />
        <KPI title="Claimed" value={formatPKR(claimedTotal)} tone="bg-violet-50 border-violet-200" subtext="Submitted to companies" />
        <KPI title="Paid" value={formatPKR(paidTotal)} tone="bg-emerald-50 border-emerald-200" subtext="Received from companies" />
        <KPI title="Collection Rate" value={`${collectionRate.toFixed(1)}%`} tone="bg-indigo-50 border-indigo-200" subtext="Paid / Claimed" />
        <KPI title="Avg Claim Size" value={formatPKR(avgClaimSize)} tone="bg-pink-50 border-pink-200" subtext="Per claim average" />
        <KPI title="Pending Claims" value={String(pendingClaimsCount)} tone="bg-orange-50 border-orange-200" subtext="Open or locked" />
        <KPI title="Total Discounts" value={formatPKR(totalDiscount)} tone="bg-rose-50 border-rose-200" subtext="Forgiven amount" />
        <KPI title="Total Patients" value={String(totalPatients)} tone="bg-indigo-50 border-indigo-200" subtext="Unique patients" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Claims Status Breakdown */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Claims by Status</div>
          {Object.keys(claimsByStatus).length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">No claims data</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(claimsByStatus).map(([status, data]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: claimStatusColors[status] || '#94a3b8' }} />
                    <span className="text-sm capitalize">{status.replace(/-/g, ' ')}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatPKR(data.amount)}</div>
                    <div className="text-xs text-slate-500">{data.count} claims</div>
                  </div>
                </div>
              ))}
              <MiniPieChart data={Object.entries(claimsByStatus).map(([k, v]) => ({ label: k, value: v.amount, color: claimStatusColors[k] || '#94a3b8' }))} />
            </div>
          )}
        </section>

        {/* Aging Analysis */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Aging Analysis (Days)</div>
          <div className="space-y-3">
            {Object.entries(agingBuckets).map(([bucket, amount]) => {
              const max = Math.max(...Object.values(agingBuckets), 1)
              const pct = (amount / max) * 100
              return (
                <div key={bucket}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{bucket} days</span>
                    <span className="font-medium">{formatPKR(amount)}</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${bucket === '90+' ? 'bg-red-500' : bucket === '61-90' ? 'bg-orange-500' : bucket === '31-60' ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Summary Bar Chart */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Financial Overview</div>
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

      {/* Tables Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Companies by Outstanding */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">Top Companies by Outstanding</div>
            <button onClick={() => navigate('/hospital/corporate/companies')} className="text-xs text-violet-600 hover:underline">View All</button>
          </div>
          {topCompanies.length === 0 ? (
            <div className="text-sm text-slate-500 py-4 text-center">No data</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="px-2 py-2">Company</th>
                    <th className="px-2 py-2 text-right">Outstanding</th>
                    <th className="px-2 py-2 text-right">Claimed</th>
                    <th className="px-2 py-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {topCompanies.map((row) => {
                    const collected = (row.paid || 0) + (row.claimed || 0) > 0 ? ((row.paid || 0) / ((row.claimed || 0) || 1)) * 100 : 0
                    return (
                      <tr key={row.companyId} className="border-t border-slate-100">
                        <td className="px-2 py-2">{row.companyName}</td>
                        <td className="px-2 py-2 text-right font-medium text-amber-600">{formatPKR(row.outstanding)}</td>
                        <td className="px-2 py-2 text-right">{formatPKR(row.claimed || 0)}</td>
                        <td className="px-2 py-2 text-right">
                          <span className={`text-xs ${collected >= 80 ? 'text-emerald-600' : collected >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {collected.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Recent Activity</div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentPayments.length === 0 && recentClaims.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">No recent activity</div>
            ) : (
              <>
                {recentPayments.map((p, i) => (
                  <div key={`pay-${i}`} className="flex items-start gap-3 rounded-md bg-emerald-50 p-2">
                    <Wallet className="h-4 w-4 mt-0.5 text-emerald-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Payment Received</div>
                      <div className="text-xs text-slate-600">{formatPKR(p.amount)} from {p.companyName || 'Unknown'}</div>
                      <div className="text-xs text-slate-400">{p.dateIso || p.createdAt?.slice(0,10)}</div>
                    </div>
                  </div>
                ))}
                {recentClaims.map((c, i) => (
                  <div key={`claim-${i}`} className="flex items-start gap-3 rounded-md bg-violet-50 p-2">
                    <FileText className="h-4 w-4 mt-0.5 text-violet-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Claim Generated</div>
                      <div className="text-xs text-slate-600">{c.claimNo || String(c._id).slice(-6)} - {formatPKR(c.totalAmount)}</div>
                      <div className="text-xs text-slate-400">{c.createdAt?.slice(0,10)} • {c.status}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function QuickActionCard({ icon: Icon, label, tone, onClick }: { icon: any; label: string; tone: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition hover:shadow-sm ${tone}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-medium">{label}</span>
      <ArrowRight className="ml-auto h-4 w-4 opacity-60" />
    </button>
  )
}

function KPI({ title, value, tone, subtext }: { title: string; value: string; tone?: string; subtext?: string }){
  return (
    <div className={`rounded-lg border p-4 ${tone || 'bg-white border-slate-200'}`}>
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {subtext && <div className="mt-1 text-xs text-slate-500">{subtext}</div>}
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

function MiniPieChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return null
  
  const size = 120
  const center = size / 2
  const radius = size / 2 - 10
  
  let currentAngle = 0
  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle += angle
    return { ...d, startAngle, endAngle }
  })
  
  const polarToCartesian = (angle: number) => ({
    x: center + radius * Math.cos(angle - Math.PI / 2),
    y: center + radius * Math.sin(angle - Math.PI / 2)
  })
  
  const largeArcFlag = (angle: number) => angle > Math.PI ? 1 : 0
  
  return (
    <div className="flex justify-center py-2">
      <svg width={size} height={size}>
        {slices.map((s, i) => {
          const start = polarToCartesian(s.startAngle)
          const end = polarToCartesian(s.endAngle)
          return (
            <path
              key={i}
              d={`M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag(s.endAngle - s.startAngle)} 1 ${end.x} ${end.y} Z`}
              fill={s.color}
            />
          )
        })}
        <circle cx={center} cy={center} r={radius * 0.5} fill="white" />
      </svg>
    </div>
  )
}

function formatPKR(n: number){
  try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` }
}
