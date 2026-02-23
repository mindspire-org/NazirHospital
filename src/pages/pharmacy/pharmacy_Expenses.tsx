import { useEffect, useMemo, useState } from 'react'
import Pharmacy_AddExpenseDialog from '../../components/pharmacy/pharmacy_AddExpenseDialog'
import { pharmacyApi } from '../../utils/api'
import Pharmacy_SalarySlipDialog from '../../components/pharmacy/pharmacy_SalarySlipDialog'

type Expense = {
  id: string
  date: string // yyyy-mm-dd
  datetime?: string // iso datetime
  type: 'Rent' | 'Utilities' | 'Supplies' | 'Salaries' | 'Maintenance' | 'Other'
  note: string
  amount: number
  createdBy?: string
}

export default function Pharmacy_Expenses() {
  const [items, setItems] = useState<Expense[]>([])
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipExp, setSlipExp] = useState<Expense | null>(null)

  // Filters
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [etype, setEtype] = useState<'All Types' | Expense['type']>('All Types')
  const [minAmount, setMinAmount] = useState<number>(0)
  const [search, setSearch] = useState('')
  const [user, setUser] = useState('')
  const [tick, setTick] = useState(0)

  // Add expense dialog
  const [addOpen, setAddOpen] = useState(false)

  // Current pharmacy username to stamp expenses
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('pharmacy.user')
      if (raw) { const u = JSON.parse(raw); if (u && typeof u.username === 'string') return u.username }
    } catch {}
    try { return localStorage.getItem('pharma_user') || 'admin' } catch { return 'admin' }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await pharmacyApi.listExpenses({ from: from || undefined, to: to || undefined, minAmount, search: search || undefined, type: etype === 'All Types' ? undefined : etype, user: user || undefined, page, limit })
        if (!mounted) return
        const mapped: Expense[] = (res.items || []).map((x: any) => ({ id: x._id, date: x.date, datetime: x.datetime, type: x.type, note: x.note || '', amount: x.amount, createdBy: x.createdBy }))
        setItems(mapped)
        setTotal(Number(res.total || mapped.length || 0))
        setTotalPages(Number(res.totalPages || 1))
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, from, to, minAmount, search, user, etype, page, limit])

  const refresh = () => setTick(t=>t+1)

  useEffect(()=>{
    const onRefresh = () => { setPage(1); refresh() }
    try { window.addEventListener('pharmacy:expenses:refresh', onRefresh as any) } catch {}
    return () => { try { window.removeEventListener('pharmacy:expenses:refresh', onRefresh as any) } catch {} }
  }, [])

  

  const remove = async (id: string) => {
    await pharmacyApi.deleteExpense(id)
    refresh()
  }

  const exportCSV = () => {
    const escape = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const header = ['Date','Time','Amount','Note','Type','User'].map(escape).join(',')
    const lines = items.map(e => [
      e.date,
      e.datetime ? new Date(e.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      e.amount.toFixed(2),
      e.note,
      e.type,
      e.createdBy || ''
    ].map(escape).join(',')).join('\n')
    const csv = header + '\n' + lines
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    const loadJsPDF = () => new Promise<any>((resolve, reject) => {
      const w: any = window as any
      if (w.jspdf && w.jspdf.jsPDF) return resolve(w.jspdf)
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
      s.onload = () => resolve((window as any).jspdf)
      s.onerror = reject
      document.head.appendChild(s)
    })
    const jspdf = await loadJsPDF()
    const { jsPDF } = jspdf
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const margin = 10
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFont('courier', 'normal')
    const cols = [
      { key: 'date', title: 'Date', width: 32 },
      { key: 'time', title: 'Time', width: 24 },
      { key: 'amount', title: 'Amount', width: 30 },
      { key: 'note', title: 'Note', width: 120 },
      { key: 'type', title: 'Type', width: 30 },
      { key: 'user', title: 'User', width: 36 },
    ] as const
    const drawHeader = (y: number) => {
      doc.setFontSize(12)
      doc.text('Expense Tracker', margin, y)
      y += 6
      doc.setFontSize(9)
      let x = margin
      cols.forEach(c => { doc.text(c.title, x + 1, y); x += c.width })
      y += 2
      doc.setLineWidth(0.2)
      doc.line(margin, y, pageW - margin, y)
      return y + 4
    }
    let y = drawHeader(margin)
    doc.setFontSize(8)
    for (const e of items) {
      const timeStr = e.datetime ? new Date(e.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
      const data = [e.date, timeStr, `Rs ${e.amount.toFixed(2)}`, e.note, e.type, e.createdBy || '']
      const lines = data.map((v, i) => (doc as any).splitTextToSize(v, cols[i].width - 2)) as string[][]
      const maxLines = Math.max(1, ...lines.map(a => a.length))
      if (y + maxLines * 4 + 6 > pageH - margin) {
        doc.addPage()
        y = drawHeader(margin)
      }
      let x = margin
      for (let i = 0; i < cols.length; i++) {
        const colLines = lines[i]
        for (let j = 0; j < maxLines; j++) {
          const t = colLines[j] || ''
          doc.text(t, x + 1, y + j * 4 + 3)
        }
        x += cols[i].width
      }
      y += maxLines * 4 + 2
      doc.line(margin, y, pageW - margin, y)
    }
    doc.save(`expenses-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Expense Tracker</div>
        <button type="button" onClick={() => setAddOpen(true)} className="btn">+ Add Expense</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 font-medium text-slate-800">Filters</div>
        <div className="grid gap-3 md:grid-cols-4 items-end">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Start" />
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" placeholder="End" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Expense Type</label>
            <select value={etype} onChange={e=>{ setEtype(e.target.value as any); setPage(1) }} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              <option>All Types</option>
              <option>Rent</option>
              <option>Utilities</option>
              <option>Supplies</option>
              <option>Salaries</option>
              <option>Maintenance</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Minimum Amount</label>
            <input type="number" value={minAmount} onChange={e=>setMinAmount(parseFloat(e.target.value || '0'))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">User</label>
            <input value={user} onChange={e=>setUser(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Username" />
          </div>
          <div className="flex items-end gap-2">
            <button type="button" onClick={()=>{ setPage(1); refresh() }} className="btn">Apply</button>
            <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-medium text-slate-800">Expenses</div>
          <div className="flex items-center gap-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} className="w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Search expenses..." />
            <button type="button" onClick={exportCSV} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Download CSV</button>
            <button type="button" onClick={exportPDF} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Download PDF</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Note</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {items.map(e => (
                <tr key={e.id}>
                  <td className="px-4 py-2">{e.date}</td>
                  <td className="px-4 py-2">{e.datetime ? new Date(e.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                  <td className="px-4 py-2">{e.type}</td>
                  <td className="px-4 py-2">{e.note}</td>
                  <td className="px-4 py-2 font-semibold">PKR {e.amount.toLocaleString()}</td>
                  <td className="px-4 py-2">{e.createdBy || ''}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {e.type === 'Salaries' && (
                        <button type="button" onClick={()=>{ setSlipExp(e); setSlipOpen(true) }} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Slip</button>
                      )}
                      <button type="button" onClick={()=>remove(e.id)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">No expenses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div>
            {total > 0 ? (
              <>Showing {Math.min((page-1)*limit + 1, total)}-{Math.min((page-1)*limit + items.length, total)} of {total}</>
            ) : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button type="button" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      <Pharmacy_AddExpenseDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={async (exp) => {
          await pharmacyApi.createExpense({ ...exp, createdBy: currentUser })
          setAddOpen(false)
          setPage(1)
          refresh()
        }}
      />
      <Pharmacy_SalarySlipDialog open={slipOpen} onClose={()=>{ setSlipOpen(false); setSlipExp(null) }} expense={slipExp || undefined as any} />
    </div>
  )
}
