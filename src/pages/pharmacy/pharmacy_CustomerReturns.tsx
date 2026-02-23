import { useEffect, useMemo, useState } from 'react'
import { pharmacyApi } from '../../utils/api'
import Pharmacy_ReturnDialog from '../../components/pharmacy/pharmacy_ReturnDialog'
import Pharmacy_ReturnSlipDialog from '../../components/pharmacy/pharmacy_ReturnSlipDialog'

type Row = {
  id: string
  datetime: string // ISO
  billNo: string
  customer: string
  medicines: string
  qtyEach: string
  qty: number
  amount: number
  payment: 'cash' | 'card' | 'credit'
  saleRaw: any
}

function formatDateTime(s: string) {
  const d = new Date(s)
  return d.toLocaleString()
}

export default function Pharmacy_Returns() {
  const [invoiceId, setInvoiceId] = useState('')
  const [customer, setCustomer] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTick, setSearchTick] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [, setLoading] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any|null>(null)
  const [slip, setSlip] = useState<{ open:boolean; billNo:string; customer?:string; lines:{ name:string; qty:number; amount:number }[]; total:number }>({ open:false, billNo:'', customer:'', lines:[], total:0 })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const res: any = await pharmacyApi.listSales({ bill: invoiceId || undefined, customer: customer || undefined, from: from || undefined, to: to || undefined, page, limit })
        if (!mounted) return
        const items = res.items || []
        const mapped: Row[] = items.map((s: any) => {
          const qtys = (s.lines || []).map((l: any) => Number(l.qty || 0))
          const qtyEach = qtys.join(', ')
          const qty = qtys.reduce((a:number,b:number)=>a+b,0)
          const meds = (s.lines || []).map((l: any) => String(l.name || '')).filter(Boolean).join(', ')
          return {
            id: s._id,
            datetime: s.datetime,
            billNo: s.billNo,
            customer: s.customer || 'Walk-in',
            medicines: meds,
            qtyEach,
            qty,
            amount: Number(s.total || 0),
            payment: String(s.payment || 'Cash').toLowerCase() as any,
            saleRaw: s,
          }
        })
        setRows(mapped)
        setTotal(Number(res.total || mapped.length || 0))
        setTotalPages(Number(res.totalPages || 1))
      } catch (e) { console.error(e) }
      setLoading(false)
    })()
    return ()=>{ mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTick, page, limit])

  const filtered = useMemo(() => rows, [rows])

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Customer Return</div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 font-medium text-slate-800">Search</div>
        <div className="grid gap-3 md:grid-cols-6 items-end">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Invoice ID</label>
            <input value={invoiceId} onChange={e=>setInvoiceId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Exact bill/invoice" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Customer</label>
            <input value={customer} onChange={e=>setCustomer(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={()=>{ setPage(1); setSearchTick(t=>t+1) }} className="btn">Search</button>
          </div>
          <div className="flex items-end">
            <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Results</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Date/Time</th>
                <th className="px-4 py-2 font-medium">Bill No</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Medicines</th>
                <th className="px-4 py-2 font-medium">Qty (each)</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Payment</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">{formatDateTime(r.datetime)}</td>
                  <td className="px-4 py-2">{r.billNo}</td>
                  <td className="px-4 py-2">{r.customer}</td>
                  <td className="px-4 py-2">{r.medicines}</td>
                  <td className="px-4 py-2">{r.qtyEach}</td>
                  <td className="px-4 py-2">{r.qty}</td>
                  <td className="px-4 py-2">Rs {r.amount.toFixed(2)}</td>
                  <td className="px-4 py-2">{r.payment}</td>
                  <td className="px-4 py-2"><button onClick={()=>setSelectedSale(r.saleRaw)} className="btn-outline-navy text-xs">Select</button></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">No results</td>
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

      <Pharmacy_ReturnDialog
        open={!!selectedSale}
        onClose={()=>setSelectedSale(null)}
        sale={selectedSale ? {
          billNo: selectedSale.billNo,
          datetime: selectedSale.datetime,
          customer: selectedSale.customer,
          payment: selectedSale.payment,
          discountPct: selectedSale.discountPct,
          lines: (selectedSale.lines || []).map((l:any)=>{
            const unit = Number(l.unitPrice || 0)
            const qty = Number(l.qty || 0)
            const lineDiscRs = Number(l.discountRs || 0)
            const effectiveUnit = qty > 0 ? (unit - (lineDiscRs / qty)) : unit
            return { medicineId: l.medicineId, name: l.name, unitPrice: effectiveUnit, qty }
          })
        } : null}
        onSubmitted={({ returnDoc })=>{
          setSelectedSale(null)
          // Show print slip using returnDoc lines
          const lines = (returnDoc?.lines || []).map((l:any)=>({ name: l.name, qty: l.qty, amount: l.amount }))
          const total = Number(returnDoc?.total || 0)
          setSlip({ open: true, billNo: returnDoc?.reference || selectedSale?.billNo || '', customer: selectedSale?.customer || 'Walk-in', lines, total })
          // Refresh the list
          setSearchTick(t=>t+1)
        }}
      />

      <Pharmacy_ReturnSlipDialog
        open={slip.open}
        onClose={()=>setSlip(s=>({ ...s, open: false }))}
        billNo={slip.billNo}
        customer={slip.customer}
        lines={slip.lines}
        total={slip.total}
      />
    </div>
  )
}
