import { useEffect, useState } from 'react'
import Lab_ReasonDialog from '../../components/lab/lab_ReasonDialog'
import Lab_ReturnSlipDialog from '../../components/lab/lab_ReturnSlipDialog'
import { labApi } from '../../utils/api'

type Row = {
  id: string
  date: string // yyyy-mm-dd
  type: 'Customer' | 'Supplier'
  party: string
  reference: string
  items: number
  total: number
  lines: { itemId?: string; name: string; qty: number; amount: number }[]
  note?: string
}

export default function Lab_ReturnHistory() {
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
  const [slip, setSlip] = useState<{ open:boolean; billNo:string; party?:string; lines:{ name:string; qty:number; amount:number }[]; total:number; type:'Customer'|'Supplier'; note?: string }>({ open:false, billNo:'', party:'', lines:[], total:0, type:'Customer', note: '' })
  const [reasonOpen, setReasonOpen] = useState(false)
  const [undoCtx, setUndoCtx] = useState<{ id: string; reference: string; testId?: string; testName?: string } | null>(null)

  useEffect(() => {
    function onReturn(){ setRefreshTick(t=>t+1) }
    window.addEventListener('lab:return', onReturn as any)
    return ()=>{ window.removeEventListener('lab:return', onReturn as any) }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const res: any = await labApi.listReturns({ type: type === 'All' ? undefined : type, from: from || undefined, to: to || undefined, search: search || undefined, page, limit })
        const items = res?.items || []
        const mapped: Row[] = items.map((x: any) => ({
          id: x._id,
          date: String(x.datetime || '').slice(0,10),
          type: x.type,
          party: x.party,
          reference: x.reference,
          items: Number(x.items || 0),
          total: Number(x.total || 0),
          lines: (x.lines || []).map((l:any)=>({ itemId: l.itemId, name: l.name, qty: Number(l.qty||0), amount: Number(l.amount||0) })),
          note: x.note || '',
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

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Return History</div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search</label>
            <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="invoice, supplier, item" />
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
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Results</div>
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
                <th className="px-4 py-2 font-medium">Reason</th>
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
                  <td className="px-4 py-2">{r.note || '-'}</td>
                  <td className="px-4 py-2 flex items-center gap-2">
                    <button className="btn-outline-navy text-xs" onClick={()=>setSlip({ open:true, billNo: r.reference, party: r.party, lines: r.lines, total: r.total, type: r.type, note: r.note })}>Reprint</button>
                    {r.type==='Customer' && r.items===1 ? (
                      <button className="rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700" onClick={()=>{ const l=r.lines[0]; setUndoCtx({ id: r.id, reference: r.reference, testId: l.itemId, testName: l.name }); setReasonOpen(true) }}>Undo</button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">No results</td>
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

      <Lab_ReturnSlipDialog
        open={slip.open}
        onClose={()=>setSlip(s=>({ ...s, open:false }))}
        billNo={slip.billNo}
        customer={slip.party}
        lines={slip.lines}
        total={slip.total}
        type={slip.type}
        note={slip.note}
      />
      <Lab_ReasonDialog
        open={reasonOpen}
        title="Undo Return Reason"
        placeholder="Reason (optional)"
        confirmText="Undo"
        onConfirm={async (note)=>{
          if (!undoCtx) { setReasonOpen(false); return }
          try {
            await labApi.undoReturn({ reference: undoCtx.reference, testId: undoCtx.testId, testName: undoCtx.testName, note: note || undefined })
            setRows(prev => prev.filter(x => x.id !== (undoCtx?.id || '')))
            setSlip(s=>({ ...s, open:false }))
            setReasonOpen(false)
            setUndoCtx(null)
            try { window.dispatchEvent(new CustomEvent('lab:return', { detail: { reference: undoCtx.reference, undo: true } })) } catch {}
          } catch (e){ console.error(e); alert('Failed to undo return') }
        }}
        onClose={()=>setReasonOpen(false)}
      />
    </div>
  )
}
