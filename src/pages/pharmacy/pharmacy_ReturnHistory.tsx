import { useEffect, useState } from 'react'
import { pharmacyApi } from '../../utils/api'
import Pharmacy_ReturnSlipDialog from '../../components/pharmacy/pharmacy_ReturnSlipDialog'

type Row = {
  id: string
  date: string // yyyy-mm-dd
  type: 'Customer' | 'Supplier'
  party: string
  reference: string
  items: number
  total: number
  lines: { name: string; qty: number; amount: number }[]
}

export default function Pharmacy_ReturnHistory() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'All' | 'Customer' | 'Supplier'>('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshTick, setRefreshTick] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [, setLoading] = useState(false)
  const [slip, setSlip] = useState<{ open:boolean; billNo:string; party?:string; lines:{ name:string; qty:number; amount:number }[]; total:number; type:'Customer'|'Supplier' }>({ open:false, billNo:'', party:'', lines:[], total:0, type:'Customer' })

  useEffect(() => {
    function onReturn(){ setRefreshTick(t=>t+1) }
    window.addEventListener('pharmacy:return', onReturn as any)
    return ()=>{ window.removeEventListener('pharmacy:return', onReturn as any) }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const res: any = await pharmacyApi.listReturns({ type: type === 'All' ? undefined : type, from: from || undefined, to: to || undefined, search: search || undefined, page, limit })
        const items = res?.items || []
        const mapped: Row[] = items.map((x: any) => ({
          id: x._id,
          date: String(x.datetime || '').slice(0,10),
          type: x.type,
          party: x.party,
          reference: x.reference,
          items: Number(x.items || 0),
          total: Number(x.total || 0),
          lines: (x.lines || []).map((l:any)=>({ name: l.name, qty: Number(l.qty||0), amount: Number(l.amount||0) })),
        }))
        if (mounted) {
          setRows(mapped)
          setTotal(Number(res.total || mapped.length || 0))
          setTotalPages(Number(res.totalPages || 1))
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    })()
    return ()=>{ mounted = false }
  }, [search, type, from, to, page, limit, refreshTick])

  const exportCSV = () => {
    const escape = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const header = ['Date','Type','Party','Reference','Items','Total'].map(escape).join(',')
    const lines = rows.map(r => [r.date, r.type, r.party, r.reference, r.items, r.total.toFixed(2)].map(escape).join(',')).join('\n')
    const csv = header + '\n' + lines
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `returns-${new Date().toISOString().slice(0,10)}.csv`
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
      { key: 'date', title: 'Date', width: 30 },
      { key: 'type', title: 'Type', width: 22 },
      { key: 'party', title: 'Party', width: 60 },
      { key: 'reference', title: 'Reference', width: 34 },
      { key: 'items', title: 'Items', width: 18 },
      { key: 'total', title: 'Total', width: 24 },
    ] as const
    const drawHeader = (y: number) => {
      doc.setFontSize(12)
      doc.text('Return History', margin, y)
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
      const data = [r.date, r.type, r.party, r.reference, String(r.items), `Rs ${r.total.toFixed(2)}`]
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
    doc.save(`returns-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Return History</div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search</label>
            <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="invoice, supplier, medicine" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Type</label>
            <select value={type} onChange={e=>setType(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option>All</option>
              <option>Customer</option>
              <option>Supplier</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={()=>{ setPage(1); setRefreshTick(t=>t+1) }} className="btn">Refresh</button>
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
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Party</th>
                <th className="px-4 py-2 font-medium">Reference</th>
                <th className="px-4 py-2 font-medium">Items</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">{r.date}</td>
                  <td className="px-4 py-2">{r.type}</td>
                  <td className="px-4 py-2">{r.party}</td>
                  <td className="px-4 py-2">{r.reference}</td>
                  <td className="px-4 py-2">{r.items}</td>
                  <td className="px-4 py-2">Rs {r.total.toFixed(2)}</td>
                  <td className="px-4 py-2"><button className="btn-outline-navy text-xs" onClick={()=>setSlip({ open:true, billNo: r.reference, party: r.party, lines: r.lines, total: r.total, type: r.type })}>Reprint</button></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">No results</td>
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
      <Pharmacy_ReturnSlipDialog
        open={slip.open}
        onClose={()=>setSlip(s=>({ ...s, open:false }))}
        billNo={slip.billNo}
        customer={slip.party}
        lines={slip.lines}
        total={slip.total}
        type={slip.type}
      />
    </div>
  )
}
