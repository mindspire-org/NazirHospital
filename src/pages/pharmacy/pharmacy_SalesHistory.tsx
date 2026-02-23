import { useEffect, useState } from 'react'
import { pharmacyApi } from '../../utils/api'
import Pharmacy_POSReceiptDialog from '../../components/pharmacy/pharmacy_POSReceiptDialog'
import SuggestField from '../../components/SuggestField'

 type Row = {
  id: string
  datetime: string // ISO string
  billNo: string
  customer: string
  medicines: string
  qtyEach: string
  qty: number
  amount: number
  payment: 'Cash' | 'Card' | 'Credit'
  user?: string
}

function formatDateTime(s: string) {
  const d = new Date(s)
  return d.toLocaleString()
}

export default function Pharmacy_SalesHistory() {
  const [medicine, setMedicine] = useState('')
  const [bill, setBill] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [user, setUser] = useState('')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [rows, setRows] = useState<Row[]>([])
  const [rawSales, setRawSales] = useState<any[]>([])
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptSale, setReceiptSale] = useState<any | null>(null)
  const [userSuggestions, setUserSuggestions] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res: any = await pharmacyApi.listSales({ bill: bill || undefined, medicine: medicine || undefined, user: user || undefined, from: from || undefined, to: to || undefined, page, limit })
        if (!mounted) return
        const items = res.items || []
        setRawSales(items)
        const mapped: Row[] = items.map((s: any) => {
          const meds = (s.lines || []).map((l: any) => String(l.name || '')).filter(Boolean)
          const qtyEach = (s.lines || []).map((l: any) => String(l.qty || 0)).filter(Boolean)
          const qtySum = (s.lines || []).reduce((acc: number, l: any) => acc + (l.qty || 0), 0)
          return {
            id: s._id,
            datetime: s.datetime,
            billNo: s.billNo,
            customer: s.customer || 'Walk-in',
            medicines: meds.join(', '),
            qtyEach: qtyEach.join(', '),
            qty: qtySum,
            amount: s.total || 0,
            payment: s.payment || 'Cash',
            user: s.createdBy || '',
          } as Row
        })
        setRows(mapped)
        setTotal(Number(res.total || mapped.length || 0))
        setTotalPages(Number(res.totalPages || 1))
      } catch (e) { console.error(e) }
    }
    load()
    const handler = () => load()
    try { window.addEventListener('pharmacy:sale', handler as any) } catch {}
    return ()=>{ mounted = false; try { window.removeEventListener('pharmacy:sale', handler as any) } catch {} }
  }, [bill, medicine, user, from, to, page, limit])

  // Load pharmacy users for the User autocomplete filter
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await pharmacyApi.listUsers()
        if (!mounted) return
        const list = (res?.items || []).map((u: any) => String(u?.username || '')).filter(Boolean)
        setUserSuggestions(list)
      } catch {
        setUserSuggestions([])
      }
    })()
    return () => { mounted = false }
  }, [])

  const exportCSV = () => {
    const escape = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const header = ['Date/Time','Bill No','Customer','Medicines','Qty (each)','Qty','Amount','User','Payment']
      .map(escape).join(',')
    const lines = rows.map(r => [
      formatDateTime(r.datetime), r.billNo, r.customer, r.medicines, r.qtyEach, r.qty, r.amount.toFixed(2), r.user || '', r.payment
    ].map(escape).join(',')).join('\n')
    const csv = header + '\n' + lines
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-${new Date().toISOString().slice(0,10)}.csv`
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
      { key: 'datetime', title: 'Date/Time', width: 40 },
      { key: 'billNo', title: 'Bill No', width: 24 },
      { key: 'customer', title: 'Customer', width: 28 },
      { key: 'medicines', title: 'Medicines', width: 90 },
      { key: 'qtyEach', title: 'Qty (each)', width: 24 },
      { key: 'qty', title: 'Qty', width: 12 },
      { key: 'amount', title: 'Amount', width: 20 },
      { key: 'user', title: 'User', width: 22 },
      { key: 'payment', title: 'Payment', width: 15 },
    ] as const
    const drawHeader = (y: number) => {
      doc.setFontSize(12)
      doc.text('Sales History', margin, y)
      y += 6
      doc.setFontSize(9)
      let x = margin
      cols.forEach(c => { doc.text(c.title, x + 1, y) ; x += c.width })
      y += 2
      doc.setLineWidth(0.2)
      doc.line(margin, y, pageW - margin, y)
      return y + 4
    }
    let y = drawHeader(margin)
    doc.setFontSize(8)
    for (const r of rows) {
      const data = [
        formatDateTime(r.datetime), r.billNo, r.customer, r.medicines, r.qtyEach, String(r.qty), `Rs ${r.amount.toFixed(2)}`, r.user || '', r.payment,
      ]
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
    doc.save(`sales-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="text-xl font-bold text-slate-800">Sales History</div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm text-slate-700">Medicine name</label>
              <input value={medicine} onChange={e=>setMedicine(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., Paracetamol" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Bill/Invoice #</label>
              <input value={bill} onChange={e=>setBill(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="B-YYYYMM-###" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">From</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">To</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">User</label>
              <SuggestField
                as="input"
                value={user}
                onChange={setUser}
                suggestions={userSuggestions}
                placeholder="username"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={()=>{ setPage(1); }} className="btn">Apply</button>
            <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="font-medium text-slate-800">Results</div>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Download CSV</button>
              <button onClick={exportPDF} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Download PDF</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Date/Time</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Bill No</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Customer</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Medicines</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Qty (each)</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Qty</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Amount</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">User</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Payment</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">{formatDateTime(r.datetime)}</td>
                  <td className="px-4 py-2">{r.billNo}</td>
                  <td className="px-4 py-2">{r.customer}</td>
                  <td className="px-4 py-2">{r.medicines}</td>
                  <td className="px-4 py-2">{r.qtyEach}</td>
                  <td className="px-4 py-2">{r.qty}</td>
                  <td className="px-4 py-2">Rs {r.amount.toFixed(2)}</td>
                  <td className="px-4 py-2">{r.user || '-'}</td>
                  <td className="px-4 py-2">{r.payment}</td>
                  <td className="px-4 py-2"><button onClick={()=>{ const s = rawSales.find(x=>x._id===r.id); if (s){ setReceiptSale(s); setReceiptOpen(true) }}} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Reprint</button></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">No results</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div>
            {total > 0 ? (
              <>Showing {Math.min((page-1)*limit + 1, total)}-{Math.min((page-1)*limit + rows.length, total)} of {total}</>
            ) : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
      </div>
      <Pharmacy_POSReceiptDialog
        open={receiptOpen}
        onClose={()=>{ setReceiptOpen(false); setReceiptSale(null) }}
        receiptNo={receiptSale?.billNo || ''}
        method={(receiptSale?.payment === 'Credit') ? 'credit' : 'cash'}
        lines={(receiptSale?.lines || []).map((l:any)=> ({ name: l.name, qty: l.qty, price: l.unitPrice }))}
        discountPct={receiptSale?.discountPct || 0}
        customer={receiptSale?.customer}
        datetime={receiptSale?.datetime}
      />
    </>
  )
}
