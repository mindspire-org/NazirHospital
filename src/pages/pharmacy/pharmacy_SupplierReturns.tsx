import { useEffect, useMemo, useState } from 'react'
import { pharmacyApi } from '../../utils/api'
import Pharmacy_SupplierReturnDialog from '../../components/pharmacy/pharmacy_SupplierReturnDialog'
import Pharmacy_ReturnSlipDialog from '../../components/pharmacy/pharmacy_ReturnSlipDialog'

type Row = {
  id: string
  datetime: string // ISO
  invoice: string
  supplier: string
  medicines: string
  qty: number
  buyAmount: number
  raw: any
}

function formatDateTime(s: string) {
  const d = new Date(s)
  return d.toLocaleString()
}

export default function Pharmacy_SupplierReturns() {
  const [supplier, setSupplier] = useState('')
  const [invoice, setInvoice] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTick, setSearchTick] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<any|null>(null)
  const [slip, setSlip] = useState<{ open:boolean; billNo:string; party?:string; lines:{ name:string; qty:number; amount:number }[]; total:number }>({ open:false, billNo:'', party:'', lines:[], total:0 })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await pharmacyApi.listPurchases({ from: from || undefined, to: to || undefined, search: (invoice || supplier) || undefined, page, limit })
        const items = res?.items || []
        const mapped: Row[] = items.map((p: any) => {
          const qty = (p.lines || []).reduce((s:number,l:any)=> s + Number(l.totalItems||0), 0)
          const meds = (p.lines || []).map((l:any)=>String(l.name||'')).filter(Boolean).join(', ')
          return {
            id: p._id,
            datetime: new Date(p.date || '').toISOString(),
            invoice: p.invoice,
            supplier: p.supplierName || '',
            medicines: meds,
            qty,
            buyAmount: Number(p.totalAmount || 0),
            raw: p,
          }
        })
        if (mounted) {
          setRows(mapped)
          setTotal(Number(res.total || mapped.length || 0))
          setTotalPages(Number(res.totalPages || 1))
        }
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTick, from, to, invoice, supplier, page, limit])

  const filtered = useMemo(() => rows, [rows])

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Supplier Return</div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 font-medium text-slate-800">Select Supplier</div>
        <div className="grid items-end gap-3 md:grid-cols-6">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Supplier</label>
            <input value={supplier} onChange={e=>setSupplier(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., zain" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Invoice</label>
            <input value={invoice} onChange={e=>setInvoice(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search invoice/bill" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end gap-2">
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
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Purchases</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Date/Time</th>
                <th className="px-4 py-2 font-medium">Invoice/Bill</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Medicines</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Buy Amount</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">{formatDateTime(r.datetime)}</td>
                  <td className="px-4 py-2">{r.invoice}</td>
                  <td className="px-4 py-2">{r.supplier}</td>
                  <td className="px-4 py-2">{r.medicines}</td>
                  <td className="px-4 py-2">{r.qty}</td>
                  <td className="px-4 py-2">Rs {r.buyAmount.toFixed(2)}</td>
                  <td className="px-4 py-2"><button onClick={()=>setSelected(r.raw)} className="btn-outline-navy text-xs">Select</button></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">No purchases</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
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

      <Pharmacy_SupplierReturnDialog
        open={!!selected}
        onClose={()=>setSelected(null)}
        purchase={selected ? {
          invoice: selected.invoice,
          date: selected.date,
          supplierName: selected.supplierName,
          lines: (selected.lines || []).map((l:any)=>({ medicineId: l.medicineId, name: l.name, totalItems: l.totalItems, unitsPerPack: l.unitsPerPack, buyPerUnitAfterTax: l.buyPerUnitAfterTax, buyPerUnit: l.buyPerUnit, buyPerPack: l.buyPerPack }))
        } : null}
        onSubmitted={({ returnDoc })=>{
          setSelected(null)
          const lines = (returnDoc?.lines || []).map((l:any)=>({ name: l.name, qty: l.qty, amount: l.amount }))
          const total = Number(returnDoc?.total || 0)
          setSlip({ open: true, billNo: returnDoc?.reference || '', party: returnDoc?.party || '', lines, total })
          setSearchTick(t=>t+1)
        }}
      />

      <Pharmacy_ReturnSlipDialog
        open={slip.open}
        onClose={()=>setSlip(s=>({ ...s, open:false }))}
        billNo={slip.billNo}
        customer={slip.party}
        lines={slip.lines}
        total={slip.total}
        type="Supplier"
      />
    </div>
  )
}
