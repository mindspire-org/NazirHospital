import { useEffect, useRef, useState } from 'react'
import { labApi } from '../../utils/api'

 type PurchaseSummary = {
  id: string
  date: string // yyyy-mm-dd
  supplier: string
  invoice: string
  linesCount: number
  totalQty: number
  totalAmount: number
  raw: any
}

export default function Lab_PurchaseHistory() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(20)
  const [searchTick, setSearchTick] = useState(0)
  const [rows, setRows] = useState<PurchaseSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [viewer, setViewer] = useState<{ open: boolean; purchase: any | null }>({ open: false, purchase: null })
  const reqSeq = useRef(0)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState<PurchaseSummary | null>(null)

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      const my = ++reqSeq.current
      setLoading(true)
      try {
        const res = await labApi.listPurchases({ from: from || undefined, to: to || undefined, search: search || undefined, page, limit })
        if (!mounted || my !== reqSeq.current) return
        const items = res?.items || []
        const mapped: PurchaseSummary[] = items.map((p:any)=>{
          const lines = Array.isArray(p.lines) ? p.lines : []
          const totalQty = lines.reduce((s:number,l:any)=> s + Number(l.totalItems ?? (Number(l.unitsPerPack||1) * Number(l.packs||0))), 0)
          const totalAmount = Number(p.totalAmount || 0)
          return {
            id: String(p._id),
            date: String(p.date || '').slice(0,10),
            supplier: String(p.supplierName || '-'),
            invoice: String(p.invoice || '-'),
            linesCount: lines.length,
            totalQty,
            totalAmount,
            raw: p,
          }
        })
        setRows(mapped)
        setTotal(Number(res.total || mapped.length || 0))
        setTotalPages(Number(res.totalPages || 1))
      } catch (e){ console.error(e); if (mounted && my===reqSeq.current){ setRows([]); setTotal(0); setTotalPages(1) } }
      finally { if (mounted && my===reqSeq.current) setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [searchTick, from, to, search, page, limit])

  const downloadCsv = () => {
    const esc = (v: any) => {
      const s = String(v ?? '')
      return (s.includes('"') || s.includes(',') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const header = ['Date','Supplier','Invoice','Lines','Total Qty','Total Amount']
    const lines = [header.join(',')]
    rows.forEach(r => {
      lines.push([
        esc(r.date), esc(r.supplier), esc(r.invoice), esc(r.linesCount), esc(r.totalQty), esc(r.totalAmount.toFixed(2))
      ].join(','))
    })
    const csv = '\uFEFF' + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lab-purchases-${from || 'all'}_${to || 'all'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const requestDelete = (row: PurchaseSummary) => { setDeleteRow(row); setDeleteOpen(true) }
  const performDelete = async () => {
    const row = deleteRow; if (!row) { setDeleteOpen(false); return }
    try {
      await labApi.deletePurchase(row.id)
      setRows(prev => prev.filter(r => r.id !== row.id))
      setTotal(t=>Math.max(0,t-1))
      setNotice({ text: 'Purchase deleted', kind: 'success' })
    } catch(e){ console.error(e); setNotice({ text: 'Failed to delete purchase', kind: 'error' }) }
    finally { setDeleteOpen(false); setDeleteRow(null); try { setTimeout(()=> setNotice(null), 2500) } catch {} }
  }


  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Purchase History</div>
      {notice && (
        <div className={`rounded-md border px-3 py-2 text-sm ${notice.kind==='success'? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search</label>
            <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="medicine, supplier, invoice" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={()=>{ setPage(1); setSearchTick(t=>t+1) }} className="btn">Apply</button>
            <button onClick={downloadCsv} disabled={loading || rows.length===0} className="btn-outline-navy disabled:opacity-50">Download</button>
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
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Invoice</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Lines</th>
                <th className="px-4 py-2 font-medium">Total Qty</th>
                <th className="px-4 py-2 font-medium">Total Amount</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">{r.date}</td>
                  <td className="px-4 py-2">{r.invoice}</td>
                  <td className="px-4 py-2">{r.supplier}</td>
                  <td className="px-4 py-2">{r.linesCount}</td>
                  <td className="px-4 py-2">{r.totalQty}</td>
                  <td className="px-4 py-2">Rs {r.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={()=>setViewer({ open: true, purchase: r.raw })} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">View Lines</button>
                      <button onClick={()=>requestDelete(r)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!loading && rows.length === 0) && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-500">No results</td>
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
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40 hover:bg-slate-50">Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>
      {viewer.open && viewer.purchase && (
        <LinesDialog purchase={viewer.purchase} onClose={()=>setViewer({ open:false, purchase:null })} />
      )}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Delete</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete this purchase?</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={()=>{ setDeleteOpen(false); setDeleteRow(null) }} className="btn-outline-navy">Cancel</button>
              <button onClick={performDelete} className="btn bg-rose-600 hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LinesDialog({ purchase, onClose }: { purchase: any; onClose: ()=>void }){
  const lines = Array.isArray(purchase?.lines) ? purchase.lines : []
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white p-0 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">Purchase {String(purchase?.invoice||'')}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-800">
          <div className="mb-3 grid gap-2 sm:grid-cols-2 text-sm">
            <div><span className="text-slate-500">Date :</span> {String(purchase?.date||'').slice(0,10)}</div>
            <div><span className="text-slate-500">Supplier :</span> {String(purchase?.supplierName||'')}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Medicine</th>
                  <th className="px-3 py-2 font-medium">Packs</th>
                  <th className="px-3 py-2 font-medium">Units/Pack</th>
                  <th className="px-3 py-2 font-medium">Buy/Pack</th>
                  <th className="px-3 py-2 font-medium">Buy/Unit</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lines.map((l:any, idx:number)=>{
                  const unitsPerPack = Number(l.unitsPerPack || 1)
                  const packs = Number(l.packs || 0)
                  const qty = Number(l.totalItems != null ? l.totalItems : (unitsPerPack * packs))
                  const buyPerPack = Number(l.buyPerPack || 0)
                  const buyPerUnit = Number(l.buyPerUnit != null ? l.buyPerUnit : (unitsPerPack? buyPerPack/unitsPerPack : 0))
                  const amount = buyPerPack>0 ? (buyPerPack * packs) : (buyPerUnit * qty)
                  return (
                    <tr key={idx}>
                      <td className="px-3 py-2">{String(l.name||'-')}</td>
                      <td className="px-3 py-2">{packs}</td>
                      <td className="px-3 py-2">{unitsPerPack}</td>
                      <td className="px-3 py-2">{buyPerPack.toFixed(2)}</td>
                      <td className="px-3 py-2">{buyPerUnit.toFixed(3)}</td>
                      <td className="px-3 py-2">{qty}</td>
                      <td className="px-3 py-2">Rs {amount.toFixed(2)}</td>
                      <td className="px-3 py-2">{String(l.expiry||'-')}</td>
                    </tr>
                  )
                })}
                {lines.length===0 && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No lines</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="btn-outline-navy">Close</button>
        </div>
      </div>
    </div>
  )
}
