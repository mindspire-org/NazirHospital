import { useEffect, useMemo, useState } from 'react'
import { labApi } from '../../utils/api'

type Summary = {
  totalIncome: number
  amountReceived: number
  receivableAmount: number
  tokens: number
  pendingReceivablesCount: number
}

type MethodBreakdown = { method: string; amount: number }

type Row = {
  tokenNo: string
  createdAt?: string
  patient?: { fullName?: string; mrn?: string; phone?: string }
  referringConsultant?: string
  status?: 'paid' | 'receivable'
  method?: string
  performedBy?: string
  net: number
  receivedAmount: number
  receivableAmount: number
  testsCount?: number
}

function fmtMoney(n: any) {
  const x = Number(n || 0)
  if (!Number.isFinite(x)) return '0'
  return x.toLocaleString()
}

function toYmd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Lab_IncomeLedger() {
  const [from, setFrom] = useState(() => toYmd(new Date()))
  const [to, setTo] = useState(() => toYmd(new Date()))
  const [status, setStatus] = useState<'all' | 'paid' | 'receivable'>('all')
  const [method, setMethod] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, amountReceived: 0, receivableAmount: 0, tokens: 0, pendingReceivablesCount: 0 })
  const [methods, setMethods] = useState<MethodBreakdown[]>([])
  const [total, setTotal] = useState(0)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, limit))), [total, limit])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(next?: Partial<{ page: number }>) {
    const nextPage = next?.page ?? page
    setLoading(true)
    try {
      const res: any = await labApi.incomeLedger({ from, to, status, method: method || undefined, q: q || undefined, page: nextPage, limit })
      setRows(Array.isArray(res?.items) ? res.items : [])
      setSummary(res?.summary || { totalIncome: 0, amountReceived: 0, receivableAmount: 0, tokens: 0, pendingReceivablesCount: 0 })
      setMethods(Array.isArray(res?.methodBreakdown) ? res.methodBreakdown : [])
      setTotal(Number(res?.total || 0))
      setPage(Number(res?.page || nextPage || 1))
    } catch {
      setRows([])
      setSummary({ totalIncome: 0, amountReceived: 0, receivableAmount: 0, tokens: 0, pendingReceivablesCount: 0 })
      setMethods([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    const today = toYmd(new Date())
    setFrom(today)
    setTo(today)
    setStatus('all')
    setMethod('')
    setQ('')
    setLimit(50)
    setPage(1)
    setTimeout(() => load({ page: 1 }), 0)
  }

  const pendingText = summary.pendingReceivablesCount > 0
    ? `You have ${summary.pendingReceivablesCount} pending transactions with a total receivable amount of Rs ${fmtMoney(summary.receivableAmount)}.`
    : 'No pending receivables in selected range.'

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-700">From Date</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To Date</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Payment Status</label>
            <select value={status} onChange={e => setStatus((e.target.value as any) || 'all')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="receivable">Receivable</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">All Methods</option>
              {methods.map(m => (
                <option key={m.method} value={m.method}>{m.method}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search</label>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Token, patient, mrn, phone..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-500">Complete financial overview of Lab operations</div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Reset Filters</button>
            <button onClick={() => load({ page: 1 })} className="btn">{loading ? 'Loading...' : 'Apply Filters'}</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-medium text-amber-900">Pending Receivables</div>
        <div className="text-sm text-amber-800">{pendingText}</div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-800">Profit &amp; Loss Summary</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="rounded-lg bg-emerald-50 p-3">
            <div className="text-xs text-slate-600">Total Income</div>
            <div className="text-lg font-bold text-emerald-700">Rs {fmtMoney(summary.totalIncome)}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <div className="text-xs text-slate-600">Amount Received</div>
            <div className="text-lg font-bold text-emerald-700">Rs {fmtMoney(summary.amountReceived)}</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <div className="text-xs text-slate-600">Receivable Amount</div>
            <div className="text-lg font-bold text-amber-700">Rs {fmtMoney(summary.receivableAmount)}</div>
          </div>
          <div className="rounded-lg bg-rose-50 p-3">
            <div className="text-xs text-slate-600">Total Expenses</div>
            <div className="text-lg font-bold text-rose-700">Rs 0</div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <div className="text-xs text-slate-600">Net Profit</div>
            <div className="text-lg font-bold text-emerald-700">Rs {fmtMoney(summary.amountReceived)}</div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-600 mb-2">Payment Method Breakdown</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {methods.length === 0 && <div className="text-sm text-slate-500">No payments</div>}
            {methods.map(m => (
              <div key={m.method} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                <div className="text-sm text-slate-700">{m.method}</div>
                <div className="text-sm font-semibold text-slate-900">Rs {fmtMoney(m.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="text-sm font-semibold text-slate-800">Transactions ({total})</div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-600">items per page:</div>
            <select value={String(limit)} onChange={e => { const v = Number(e.target.value || 50); setLimit(v); setPage(1); setTimeout(() => load({ page: 1 }), 0) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 font-medium">Date &amp; Time</th>
              <th className="px-4 py-2 font-medium">Token/Ref</th>
              <th className="px-4 py-2 font-medium">Patient</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Method</th>
              <th className="px-4 py-2 font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Received</th>
              <th className="px-4 py-2 font-medium">Receivable</th>
              <th className="px-4 py-2 font-medium">Performed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                <td className="px-4 py-2 font-medium">{r.tokenNo}</td>
                <td className="px-4 py-2">
                  <div className="font-medium">{r.patient?.fullName || '-'}</div>
                  <div className="text-xs text-slate-500">{r.patient?.phone || ''}</div>
                </td>
                <td className="px-4 py-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">Income</span></td>
                <td className="px-4 py-2">
                  {r.status === 'receivable'
                    ? <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs">Receivable</span>
                    : <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs">Paid</span>}
                </td>
                <td className="px-4 py-2">{r.method || '-'}</td>
                <td className="px-4 py-2">Rs {fmtMoney(r.net)}</td>
                <td className="px-4 py-2 text-emerald-700 font-medium">Rs {fmtMoney(r.receivedAmount)}</td>
                <td className="px-4 py-2 text-amber-700 font-medium">Rs {fmtMoney(r.receivableAmount)}</td>
                <td className="px-4 py-2">{r.performedBy || '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={10}>No transactions</td></tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between p-4">
          <div className="text-xs text-slate-600">Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => load({ page: Math.max(1, page - 1) })} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50">Prev</button>
            <button disabled={page >= totalPages} onClick={() => load({ page: Math.min(totalPages, page + 1) })} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
