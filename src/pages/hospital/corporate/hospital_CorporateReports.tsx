import { useEffect, useMemo, useState } from 'react'
import { corporateApi } from '../../../utils/api'
import { Building2, Download, FileText, TrendingUp, AlertCircle, Calendar, DollarSign, Wallet, CreditCard, ArrowUpRight } from 'lucide-react'

interface Company {
  id: string
  name: string
}

interface OutstandingRow {
  companyId: string
  companyName: string
  outstanding: number
  accrued?: number
  claimed?: number
}

interface PaymentRow {
  companyId: string
  companyName: string
  amount: number
  date: string
  method?: string
}

export default function Hospital_CorporateReports() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [outstanding, setOutstanding] = useState<OutstandingRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    setDateFrom(firstDay.toISOString().split('T')[0])
    setDateTo(today.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const [c, o, p] = await Promise.all([
          corporateApi.listCompanies() as any,
          corporateApi.reportsOutstanding(companyId ? { companyId } : undefined) as any,
          corporateApi.listPayments(companyId ? { companyId, from: dateFrom, to: dateTo } : { from: dateFrom, to: dateTo }) as any,
        ])
        if (!mounted) return
        setCompanies((c?.companies || []).map((x: any) => ({ id: String(x._id || x.id), name: x.name })))
        setOutstanding(o?.rows || [])
        setPayments(p?.payments || [])
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [companyId, dateFrom, dateTo])

  const totals = useMemo(() => {
    const totalOutstanding = outstanding.reduce((s, r) => s + Number(r.outstanding || 0), 0)
    const totalAccrued = outstanding.reduce((s, r) => s + Number(r.accrued || 0), 0)
    const totalClaimed = outstanding.reduce((s, r) => s + Number(r.claimed || 0), 0)
    const totalPayments = payments.reduce((s, r) => s + Number(r.amount || 0), 0)
    return { totalOutstanding, totalAccrued, totalClaimed, totalPayments }
  }, [outstanding, payments])

  const topCompanies = useMemo(() => {
    return [...outstanding]
      .sort((a, b) => Number(b.outstanding || 0) - Number(a.outstanding || 0))
      .slice(0, 5)
  }, [outstanding])

  const recentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
  }, [payments])

  function exportOutstandingCSV() {
    const headers = ['Company', 'Outstanding', 'Accrued', 'Claimed']
    const rows = outstanding.map(r => [String(r.companyName || r.companyId).replace(/[\n\r,]/g, ' '), String(r.outstanding || 0), String(r.accrued || 0), String(r.claimed || 0)])
    downloadCSV('corporate_outstanding.csv', [headers, ...rows])
  }

  function exportPaymentsCSV() {
    const headers = ['Date', 'Company', 'Amount', 'Method']
    const rows = payments.map(r => [String(r.date).replace(/[\n\r,]/g, ' '), String(r.companyName || r.companyId).replace(/[\n\r,]/g, ' '), String(r.amount || 0), String(r.method || '-').replace(/[\n\r,]/g, ' ')])
    downloadCSV('corporate_payments.csv', [headers, ...rows])
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  function formatPKR(n: number) {
    try {
      return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })
    } catch {
      return `PKR ${n.toFixed(0)}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Corporate Reports</h1>
          <p className="mt-1 text-sm text-slate-600">Financial overview and payment tracking for corporate accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <Building2 className="h-3.5 w-3.5" />
            {companies.length} Companies
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Company</label>
            <select
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              <option value="">All Companies</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">From</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">To</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>
          <button
            onClick={() => { setCompanyId(''); setDateFrom(''); setDateTo('') }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Outstanding</p>
              <p className="mt-1 text-xl font-bold text-rose-700">{formatPKR(totals.totalOutstanding)}</p>
            </div>
            <div className="rounded-lg bg-rose-100 p-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Accrued</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{formatPKR(totals.totalAccrued)}</p>
            </div>
            <div className="rounded-lg bg-emerald-100 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Claimed</p>
              <p className="mt-1 text-xl font-bold text-blue-700">{formatPKR(totals.totalClaimed)}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Payments Received</p>
              <p className="mt-1 text-xl font-bold text-amber-700">{formatPKR(totals.totalPayments)}</p>
            </div>
            <div className="rounded-lg bg-amber-100 p-2">
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Table */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Outstanding by Company</h2>
          </div>
          <button
            onClick={exportOutstandingCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600"></div>
            </div>
          ) : outstanding.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-500">
              <FileText className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm">No outstanding data available</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Company</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Outstanding</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Accrued</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Claimed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outstanding.map((r) => (
                  <tr key={String(r.companyId)} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                          <Building2 className="h-4 w-4 text-violet-600" />
                        </div>
                        <span className="font-medium text-slate-900">{r.companyName || r.companyId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">{formatPKR(r.outstanding || 0)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatPKR(Number(r.accrued || 0))}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatPKR(Number(r.claimed || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 5 Outstanding */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Top 5 Outstanding</h2>
            </div>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-slate-200 border-t-violet-600"></div>
              </div>
            ) : topCompanies.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-4">No data available</div>
            ) : (
              <div className="space-y-3">
                {topCompanies.map((r, index) => (
                  <div key={String(r.companyId)} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                        {index + 1}
                      </div>
                      <span className="font-medium text-slate-900">{r.companyName || r.companyId}</span>
                    </div>
                    <span className="font-semibold text-rose-600">{formatPKR(r.outstanding || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Recent Payments</h2>
            </div>
            <button
              onClick={exportPaymentsCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
          <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-slate-200 border-t-violet-600"></div>
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-8">No recent payments</div>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {recentPayments.map((r, index) => (
                    <tr key={`${r.companyId}-${index}`} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{r.companyName || r.companyId}</div>
                        <div className="text-xs text-slate-500">{formatDate(r.date)}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{formatPKR(r.amount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
