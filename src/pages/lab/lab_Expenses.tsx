import { useEffect, useMemo, useRef, useState } from 'react'
import Lab_AddExpense from '../../components/lab/lab_AddExpense'
import { labApi } from '../../utils/api'
import Lab_SalarySlipDialog from '../../components/lab/lab_SalarySlipDialog'

 type LabExpense = {
  id: string
  date: string
  datetime?: string
  type: 'Rent' | 'Utilities' | 'Supplies' | 'Salaries' | 'Maintenance' | 'Other'
  note: string
  amount: number
  createdBy?: string
}

export default function Lab_Expenses() {
  const [items, setItems] = useState<LabExpense[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipExp, setSlipExp] = useState<LabExpense | null>(null)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [etype, setEtype] = useState<'All Types' | LabExpense['type']>('All Types')
  const [minAmount, setMinAmount] = useState<number>(0)
  const [search, setSearch] = useState('')
  // pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // load from backend
  const [tick, setTick] = useState(0)
  const reqSeq = useRef(0)
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      const my = ++reqSeq.current
      try {
        const res = await labApi.listExpenses({ from: from || undefined, to: to || undefined, minAmount: minAmount || undefined, search: search || undefined, type: etype==='All Types'? undefined : etype, page, limit, })
        if (!mounted || my !== reqSeq.current) return
        const list: LabExpense[] = (res.items||[]).map((x:any)=>({ id: x._id, date: x.date, datetime: x.datetime, type: x.type, note: x.note||'', amount: Number(x.amount||0), createdBy: x.createdBy }))
        setItems(list)
        setTotal(Number(res.total || list.length || 0))
        setTotalPages(Number(res.totalPages || 1))
      } catch (e) { console.error(e); if (mounted && my===reqSeq.current) { setItems([]); setTotal(0); setTotalPages(1) } }
    })()
    return ()=>{ mounted = false }
  }, [from, to, etype, minAmount, search, page, limit, tick])

  // Auto refresh on global event (e.g., after salary payment)
  useEffect(()=>{
    const onRefresh = () => setTick(t=>t+1)
    try { window.addEventListener('lab:expenses:refresh', onRefresh as any) } catch {}
    return () => { try { window.removeEventListener('lab:expenses:refresh', onRefresh as any) } catch {} }
  }, [])

  // Resolve current Lab username to stamp createdBy
  const currentUser = useMemo(() => {
    try {
      const s = localStorage.getItem('lab.session')
      if (s) { const u = JSON.parse(s); return (u?.username || u?.name || '').toString() }
    } catch {}
    return 'admin'
  }, [])

  // Add via modal -> backend
  const handleSave = async (exp: { date: string; time?: string; type: LabExpense['type']; note: string; amount: number }) => {
    try { await labApi.createExpense({ ...exp, createdBy: currentUser }) } catch (e) { console.error(e) }
    setTick(t=>t+1)
  }

  const filtered = useMemo(() => items, [items])

  const refresh = () => { setPage(1); setTick(t=>t+1) }

  const addExpense = () => setAddOpen(true)

  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const requestDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true) }
  const performDelete = async () => {
    const id = deleteId; if (!id) { setDeleteOpen(false); return }
    try { await labApi.deleteExpense(id); setNotice({ text: 'Expense deleted', kind: 'success' }) }
    catch(e){ console.error(e); setNotice({ text: 'Failed to delete expense', kind: 'error' }) }
    finally { setDeleteOpen(false); setDeleteId(null); setTick(t=>t+1); try { setTimeout(()=> setNotice(null), 2500) } catch {} }
  }

  const loadAllForExport = async (): Promise<LabExpense[]> => {
    const all: LabExpense[] = []
    const limitFetch = 200
    let p = 1
    while (true) {
      try {
        const res: any = await labApi.listExpenses({
          from: from || undefined,
          to: to || undefined,
          minAmount: minAmount || undefined,
          search: search || undefined,
          type: etype === 'All Types' ? undefined : etype,
          page: p,
          limit: limitFetch,
        })
        const items = res?.items || []
        const mapped: LabExpense[] = items.map((x: any) => ({ id: x._id, date: x.date, datetime: x.datetime, type: x.type, note: x.note || '', amount: Number(x.amount || 0) }))
        all.push(...mapped)
        const totalPages = Number(res?.totalPages || 1)
        if (p >= totalPages || items.length === 0) break
        p++
      } catch {
        break
      }
    }
    return all
  }

  const exportCSV = async () => {
    const escape = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const data = await loadAllForExport().then(r => r.length ? r : filtered).catch(() => filtered)
    const header = ['Date','Time','Amount','Note','Type','User'].map(escape).join(',')
    const lines = data.map(e => [
      e.date,
      e.datetime ? new Date(e.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      (e.amount ?? 0).toFixed(2),
      e.note,
      e.type,
      e.createdBy || ''
    ].map(escape).join(',')).join('\n')
    const csv = header + '\n' + lines
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lab-expenses-${new Date().toISOString().slice(0,10)}.csv`
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
    const dataRows: LabExpense[] = await loadAllForExport().then(r => r.length ? r : filtered).catch(() => filtered)
    for (const e of dataRows) {
      const timeStr = e.datetime ? new Date(e.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
      const data = [e.date, timeStr, `Rs ${(e.amount ?? 0).toFixed(2)}`, e.note, e.type, e.createdBy || '']
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
    doc.save(`lab-expenses-${new Date().toISOString().slice(0,10)}.pdf`)
  }


  return (
    <div className="space-y-4">
      {notice && (
        <div className={`rounded-md border px-3 py-2 text-sm ${notice.kind==='success'? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Expense Tracker</div>
        <button onClick={addExpense} className="btn">+ Add New Expense</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 font-medium text-slate-800">Filters</div>
        <div className="grid gap-3 md:grid-cols-4 items-end">
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Start" />
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" placeholder="End" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Expense Type</label>
            <select value={etype} onChange={e=>setEtype(e.target.value as any)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
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
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Minimum Amount</label>
            <input type="number" value={minAmount} onChange={e=>setMinAmount(parseFloat(e.target.value || '0'))} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={refresh} className="btn">Apply</button>
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
            <button onClick={exportCSV} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Download CSV</button>
            <button onClick={exportPDF} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Download PDF</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Note</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.map(e => (
                <tr key={e.id}>
                  <td className="px-4 py-2">{e.date}</td>
                  <td className="px-4 py-2">{e.datetime ? new Date(e.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                  <td className="px-4 py-2 font-semibold">PKR {e.amount.toLocaleString()}</td>
                  <td className="px-4 py-2">{e.note}</td>
                  <td className="px-4 py-2">{e.type}</td>
                  <td className="px-4 py-2">{e.createdBy || ''}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {e.type === 'Salaries' && (
                        <button type="button" onClick={()=>{ setSlipExp(e); setSlipOpen(true) }} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Slip</button>
                      )}
                      <button type="button" onClick={()=>requestDelete(e.id)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">No expenses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 px-1 py-3 text-sm text-slate-600">
          <div>
            {total > 0 ? (
              <>Showing {Math.min((page-1)*limit + 1, total)}-{Math.min((page-1)*limit + filtered.length, total)} of {total}</>
            ) : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Lab_AddExpense open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSave} />

      <Lab_SalarySlipDialog open={slipOpen} onClose={()=>{ setSlipOpen(false); setSlipExp(null) }} expense={slipExp} />

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Delete</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete this expense?</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>{ setDeleteOpen(false); setDeleteId(null) }} className="btn-outline-navy">Cancel</button>
              <button type="button" onClick={performDelete} className="btn bg-rose-600 hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
