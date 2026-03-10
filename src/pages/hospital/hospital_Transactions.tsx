import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type Transaction = {
  id: string
  dateIso: string
  createdAt: string
  type: 'OPD' | 'IPD' | 'ER' | 'Expense' | 'Doctor Payout' | 'Manual Earning' | 'Token Return' | 'Other'
  refType: string
  refId: string
  memo: string
  fee?: number
  totalAmount: number
  discount?: number
  tokenDiscount?: number
  netAmount: number
  paymentMethod: 'cash' | 'bank' | 'other'
  patientName?: string
  mrn?: string
  doctorName?: string
  departmentName?: string
  tokenNo?: string
  isReturned?: boolean
  status: string
  createdByUsername?: string
}

function toCsv(rows: Transaction[]) {
  const headers = ['Date', 'Type', 'Patient', 'MRN', 'Doctor', 'Department', 'Description', 'Token#', 'Fee', 'Discount', 'Net', 'Method', 'Status', 'Performed By']
  const body = rows.map(r => [
    r.dateIso,
    r.type,
    r.patientName || '',
    r.mrn || '',
    r.doctorName || '',
    r.departmentName || '',
    r.memo,
    r.tokenNo || '',
    r.fee || r.totalAmount || 0,
    r.tokenDiscount || r.discount || 0,
    r.netAmount || 0,
    r.paymentMethod || '',
    r.isReturned ? 'Returned' : r.status,
    r.createdByUsername || ''
  ])
  return [headers, ...body].map(arr => arr.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export default function Hospital_Transactions() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [ttype, setTtype] = useState<'All' | Transaction['type']>('All')
  const [method, setMethod] = useState<'all' | 'cash' | 'bank'>('all')
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [page, setPage] = useState(1)
  const [tick, setTick] = useState(0)
  const [all, setAll] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState({ totalRevenue: 0, totalDiscount: 0, totalExpenses: 0, netIncome: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const params: any = { 
          page, 
          limit: rowsPerPage,
          type: ttype,
          method,
          q: q || undefined
        }
        if (from) params.from = from
        if (to) params.to = to
        
        const res: any = await hospitalApi.listTransactions(params)
        if (!cancelled) {
          setAll(res?.transactions || [])
          setTotal(res?.total || 0)
          setTotalPages(res?.totalPages || 1)
          setSummary(res?.summary || { totalRevenue: 0, totalDiscount: 0, totalExpenses: 0, netIncome: 0 })
        }
      } catch (err) {
        console.error('Failed to load transactions:', err)
        if (!cancelled) {
          setAll([])
          setTotal(0)
          setTotalPages(1)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [from, to, ttype, method, q, page, rowsPerPage, tick])
  const filtered = useMemo(() => all, [all])

  const exportCsv = () => {
    const csv = toCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full px-6 py-8 space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Total Revenue</div>
          <div className="text-2xl font-bold text-slate-800">Rs {summary.totalRevenue.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Total Discounts</div>
          <div className="text-2xl font-bold text-amber-600">Rs {summary.totalDiscount.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Total Expenses</div>
          <div className="text-2xl font-bold text-red-600">Rs {summary.totalExpenses.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Net Income</div>
          <div className="text-2xl font-bold text-emerald-600">Rs {(summary.totalRevenue - summary.totalDiscount - summary.totalExpenses).toFixed(2)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-800">Transactions</div>
          <div className="text-sm text-slate-500">All hospital transactions from Finance Ledger</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setTick(t=>t+1)} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Refresh</button>
          <button onClick={exportCsv} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Export CSV</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid items-end gap-3 md:grid-cols-8">
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>{setFrom(e.target.value); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>{setTo(e.target.value); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Type</label>
            <select value={ttype} onChange={e=>{setTtype(e.target.value as any); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500">
              <option>All</option>
              <option>OPD</option>
              <option>IPD</option>
              <option>Token Return</option>
              <option>Expense</option>
              <option>Doctor Payout</option>
              <option>Manual Earning</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Method</label>
            <select value={method} onChange={e=>{setMethod(e.target.value as any); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500">
              <option value="all">All</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search</label>
            <input value={q} onChange={e=>{setQ(e.target.value); setPage(1)}} placeholder="Patient, MRN, doctor, description..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Rows</label>
            <select value={rowsPerPage} onChange={e=>{setRowsPerPage(parseInt(e.target.value)); setPage(1)}} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500">
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-slate-500">{total} total</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Results</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Token#</th>
                <th className="px-3 py-2 font-medium">Patient</th>
                <th className="px-3 py-2 font-medium">Doctor</th>
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium text-right">Fee</th>
                <th className="px-3 py-2 font-medium text-right">Discount</th>
                <th className="px-3 py-2 font-medium text-right">Net</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Performed By</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-500">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-500">No transactions found</td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className={`hover:bg-slate-50/50 ${r.isReturned ? 'bg-red-50/50' : ''}`}>
                  <td className="px-3 py-2 whitespace-nowrap">{r.dateIso}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                      r.type === 'OPD' ? 'bg-emerald-100 text-emerald-700' :
                      r.type === 'IPD' ? 'bg-blue-100 text-blue-700' :
                      r.type === 'Expense' ? 'bg-red-100 text-red-700' :
                      r.type === 'Token Return' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{r.tokenNo || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.patientName || '-'}</div>
                    <div className="text-xs text-slate-500">{r.mrn || ''}</div>
                  </td>
                  <td className="px-3 py-2">{r.doctorName || '-'}</td>
                  <td className="px-3 py-2">{r.departmentName || '-'}</td>
                  <td className="px-3 py-2 max-w-xs truncate" title={r.memo}>{r.memo}</td>
                  <td className="px-3 py-2 text-right font-medium">Rs {(r.fee || r.totalAmount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-amber-600">{r.tokenDiscount ? `Rs ${r.tokenDiscount.toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-right font-semibold">Rs {(r.netAmount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 capitalize">{r.paymentMethod || '-'}</td>
                  <td className="px-3 py-2">{r.createdByUsername || '-'}</td>
                  <td className="px-3 py-2">
                    {r.isReturned ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Returned</span>
                    ) : (
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {r.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div>Page {page} of {totalPages} ({total} total)</div>
          <div className="flex items-center gap-2">
            <button 
              onClick={()=>setPage(p=>Math.max(1, p-1))} 
              disabled={page <= 1}
              className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={()=>setPage(p=>Math.min(totalPages, p+1))} 
              disabled={page >= totalPages}
              className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
