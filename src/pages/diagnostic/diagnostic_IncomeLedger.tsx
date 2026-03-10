import { useEffect, useMemo, useState } from 'react'
import { diagnosticApi } from '../../utils/api'
import { ArrowLeft, TrendingUp, CreditCard, DollarSign, FileText } from 'lucide-react'

interface LedgerItem {
  _id?: string
  tokenNo?: string
  patient?: { fullName?: string; phone?: string }
  createdAt?: string
  corporateId?: string
  tests?: Array<{ testId?: string; status?: string }>
  subtotal?: number
  discount?: number
  net?: number
  receivedAmount?: number
  receivableAmount?: number
  payments?: Array<{ amount: number; at: string; method?: string; note?: string; receivedBy?: string }>
}

interface Summary {
  totalNet: number
  totalReceived: number
  totalPending: number
  totalReturned?: number
}

export default function Diagnostic_IncomeLedger() {
  const [items, setItems] = useState<LedgerItem[]>([])
  const [summary, setSummary] = useState<Summary>({ totalNet: 0, totalReceived: 0, totalPending: 0 })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ text: string; kind: 'success' | 'error' } | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 25

  // Filters - default to last 7 days to ensure new tokens show up
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const sevenDaysAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  }, [])
  const [from, setFrom] = useState(sevenDaysAgo)
  const [to, setTo] = useState(today)
  const [tokenNo, setTokenNo] = useState('')
  const [patientName, setPatientName] = useState('')

  async function fetchData() {
    setLoading(true)
    try {
      const [ledgerRes, summaryRes] = await Promise.all([
        diagnosticApi.incomeLedger({ from, to, tokenNo: tokenNo || undefined, patientName: patientName || undefined, page, limit }),
        diagnosticApi.incomeLedgerSummary({ from, to })
      ])
      const ledgerData = ledgerRes as any
      const summaryData = summaryRes as any
      setItems(ledgerData?.items || [])
      setTotal(ledgerData?.total || 0)
      setSummary(summaryData || { totalNet: 0, totalReceived: 0, totalPending: 0, totalReturned: 0 })
    } catch (e: any) {
      setNotice({ text: e?.message || 'Failed to fetch income ledger', kind: 'error' })
      setTimeout(() => setNotice(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [from, to, tokenNo, patientName, page])

  function formatCurrency(n?: number) {
    return `PKR ${(Number(n) || 0).toLocaleString()}`
  }

  function formatDateTime(iso?: string) {
    if (!iso) return '-'
    const d = new Date(iso)
    return d.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })
  }

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => window.history.back()} className="rounded-md border border-slate-300 p-2 hover:bg-slate-50">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-2xl font-bold text-slate-900">Income Ledger</div>
        </div>
      </div>

      {notice && (
        <div className={`rounded-md px-3 py-2 text-sm ${notice.kind === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {notice.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="text-sm text-slate-600">Total Net</div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(summary.totalNet)}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-sm text-slate-600">Total Received</div>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700">{formatCurrency(summary.totalReceived)}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-100 p-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-sm text-slate-600">Total Pending</div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{formatCurrency(summary.totalPending)}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-orange-50 to-white p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-orange-100 p-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-sm text-slate-600">Total Returned</div>
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-700">{formatCurrency(summary.totalReturned)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">From</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">To</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Token No</label>
            <input value={tokenNo} onChange={e => { setTokenNo(e.target.value); setPage(1) }} placeholder="Search token..." className="w-40 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Patient</label>
            <input value={patientName} onChange={e => { setPatientName(e.target.value); setPage(1) }} placeholder="Search patient..." className="w-40 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500" />
          </div>
          <button onClick={fetchData} className="rounded-md bg-violet-600 px-4 py-2 text-white hover:bg-violet-700">Refresh</button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-sm font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Token No</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Tests</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">Received</th>
                <th className="px-4 py-3 text-right">Returned</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3">Billing Type</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">No records found</td></tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">{item.tokenNo || '-'}</td>
                    <td className="px-4 py-3">{item.patient?.fullName || '-'}</td>
                    <td className="px-4 py-3">{(item.tests || []).length}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.net)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(item.receivedAmount)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatCurrency((item as any).returnedAmount)}</td>
                    <td className="px-4 py-3 text-right">
                      {item.corporateId ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={Number(item.receivableAmount) > 0 ? 'text-amber-600 font-medium' : 'text-slate-500'}>
                          {formatCurrency(item.receivableAmount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.corporateId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                          Corporate
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          Cash
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">
                        <FileText className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <div className="text-sm text-slate-600">
              Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">Page {page} of {pages}</span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
