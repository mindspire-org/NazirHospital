import { useEffect, useState } from 'react'
import Aesthetic_AddSupplierDialog, { type Supplier } from '../../components/aesthetic/aesthetic_AddSupplierDialog'
import Aesthetic_SupplierDetailsDialog from '../../components/aesthetic/aesthetic_SupplierDetailsDialog'
import { aestheticApi } from '../../utils/api'

export default function Pharmacy_Suppliers() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selected, setSelected] = useState<Supplier | null>(null)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [paymentFor, setPaymentFor] = useState<string | null>(null)
  const [paymentDraft, setPaymentDraft] = useState<{ amount: string; method: string; note: string; date: string; purchaseId?: string }>({ amount: '', method: 'cash', note: '', date: '' })
  const [payingPurchases, setPayingPurchases] = useState<any[]>([])
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await aestheticApi.listSuppliers({ q: query || undefined, page, limit })
        if (!mounted) return
        const mapped: Supplier[] = (res.items || []).map((x: any) => ({
          id: x._id,
          name: x.name,
          company: x.company,
          phone: x.phone,
          address: x.address,
          taxId: x.taxId,
          status: x.status || 'Active',
          totalPurchases: x.totalPurchases || 0,
          paid: x.paid || 0,
          lastOrder: x.lastOrder || '',
        }))
        setSuppliers(mapped)
        setTotal(Number(res.total || mapped.length || 0))
        setTotalPages(Number(res.totalPages || 1))

        // Frontend fallback enrichment: if backend totals are 0 but details have purchases,
        // fetch purchases per supplier and compute totals/lastOrder.
        const zeros = mapped.filter(s => !Number(s.totalPurchases || 0))
        if (zeros.length){
          const updates = await Promise.all(zeros.map(async (s) => {
            try {
              const r = await aestheticApi.listSupplierPurchases(s.id)
              const items = (r?.items || []) as any[]
              if (!items.length) return null
              const total = items.reduce((sum, p:any) => sum + Number(p.totalAmount || 0), 0)
              const last = items.reduce((max: string, p:any) => (max && max > String(p.date||'')) ? max : String(p.date||''), '')
              return { id: s.id, totalPurchases: Math.round(total*100)/100, lastOrder: last }
            } catch { return null }
          }))
          const map = new Map(updates.filter(Boolean).map(u => [String((u as any).id), u]))
          if (map.size && mounted){
            setSuppliers(prev => prev.map(s => {
              const u = map.get(s.id) as any
              return u ? { ...s, totalPurchases: u.totalPurchases, lastOrder: u.lastOrder || s.lastOrder } : s
            }))
          }
        }
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { mounted = false }
  }, [reloadTick, query, page, limit])

  useEffect(() => {
    function onReturn(){ setReloadTick(t=>t+1) }
    window.addEventListener('aesthetic:return', onReturn as any)
    return ()=>{ window.removeEventListener('aesthetic:return', onReturn as any) }
  }, [])

  

  const addSupplier = async (s: Supplier) => {
    const created = await aestheticApi.createSupplier({
      name: s.name,
      company: s.company,
      phone: s.phone,
      address: s.address,
      taxId: s.taxId,
      status: s.status,
    })
    setSuppliers(prev => [{ ...s, id: created._id }, ...prev])
  }
  const openEdit = (s: Supplier) => { setSelected(s); setEditOpen(true) }
  const saveEdit = async (s: Supplier) => {
    await aestheticApi.updateSupplier(s.id, {
      name: s.name,
      company: s.company,
      phone: s.phone,
      address: s.address,
      taxId: s.taxId,
      status: s.status,
    })
    setSuppliers(prev => prev.map(x => x.id === s.id ? s : x))
  }
  const remove = async (id: string) => {
    await aestheticApi.deleteSupplier(id)
    setSuppliers(prev => prev.filter(x => x.id !== id))
  }

  const openDetails = (s: Supplier) => { setSelected(s); setDetailsOpen(true) }

  const startPayment = async (s: Supplier) => {
    setPaymentFor(s.id)
    setPaymentDraft({ amount: '', method: 'cash', note: '', date: '' })
    try {
      const res = await aestheticApi.listSupplierPurchases(s.id)
      setPayingPurchases(res.items || [])
    } catch {
      setPayingPurchases([])
    }
  }
  const cancelPayment = () => { setPaymentFor(null) }
  const savePayment = async (s: Supplier) => {
    const amt = parseFloat(paymentDraft.amount || '0')
    if (!amt) { setPaymentFor(null); return }
    await aestheticApi.recordSupplierPayment(s.id, { amount: amt, purchaseId: paymentDraft.purchaseId, method: paymentDraft.method, note: paymentDraft.note, date: paymentDraft.date })
    // Update supplier quick totals locally
    setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, paid: (x.paid || 0) + amt } : x))
    // Update remaining for the selected purchase in local list
    if (paymentDraft.purchaseId){
      setPayingPurchases(prev => prev.map(p => p._id === paymentDraft.purchaseId ? { ...p, paid: (p.paid||0)+amt, remaining: Math.max(0, (p.remaining||0) - amt) } : p))
    }
    setPaymentFor(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Supplier Management</div>
        <button onClick={()=>setAddOpen(true)} className="btn">+ Add Supplier</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-3">
          <input value={query} onChange={e=>{ setQuery(e.target.value); setPage(1) }} placeholder="Search suppliers.." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {suppliers.map(s => {
          const remaining = (s.totalPurchases || 0) - (s.paid || 0)
          const payOpen = paymentFor === s.id
          return (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100" />
                  <div>
                    <div className="font-semibold text-slate-800">{s.name}</div>
                    <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border" /></span>
                      <span>Last Order: {s.lastOrder || '-'}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-slate-800 px-2 py-1 text-white">Total Purchases: PKR {(s.totalPurchases || 0).toFixed(0)}</span>
                      <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">Paid: PKR {(s.paid || 0).toFixed(0)}</span>
                      <span className="rounded bg-rose-100 px-2 py-1 text-rose-700">Remaining: PKR {remaining.toFixed(0)}</span>
                      <span className={`rounded px-2 py-1 ${s.status==='Active'?'bg-navy text-white':'bg-slate-100 text-slate-700'}`}>{s.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={()=>startPayment(s)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Record Payment</button>
                  <button onClick={()=>openEdit(s)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">✎</button>
                  <button onClick={()=>remove(s.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">🗑</button>
                </div>
              </div>

              {payOpen && (
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_160px_1fr_160px_auto_auto]">
                  <select value={paymentDraft.purchaseId || ''} onChange={e=>setPaymentDraft(p=>({ ...p, purchaseId: e.target.value || undefined }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="">General payment (no specific invoice)</option>
                    {payingPurchases.map(p => (
                      <option key={p._id} value={p._id}>{p.invoice} · Total Rs {Number(p.totalAmount||0).toFixed(0)} · Remaining Rs {Number(p.remaining||0).toFixed(0)}</option>
                    ))}
                  </select>
                  <input value={paymentDraft.amount} onChange={e=>setPaymentDraft(p=>({ ...p, amount: e.target.value }))} placeholder="Amount" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <select value={paymentDraft.method} onChange={e=>setPaymentDraft(p=>({ ...p, method: e.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option>cash</option>
                    <option>bank</option>
                    <option>card</option>
                  </select>
                  <input value={paymentDraft.note} onChange={e=>setPaymentDraft(p=>({ ...p, note: e.target.value }))} placeholder="Note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <input value={paymentDraft.date} onChange={e=>setPaymentDraft(p=>({ ...p, date: e.target.value }))} type="date" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <button onClick={()=>savePayment(s)} className="btn">Save</button>
                  <button onClick={cancelPayment} className="btn-outline-navy">Cancel</button>
                </div>
              )}

              <div className="mt-3 text-right">
                <button onClick={()=>openDetails(s)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">View Details</button>
              </div>
            </div>
          )
        })}

        {suppliers.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">No suppliers</div>
        )}
        <div className="flex items-center justify-between px-1 text-sm text-slate-600">
          <div>
            {total > 0 ? (
              <>Showing {Math.min((page-1)*limit + 1, total)}-{Math.min((page-1)*limit + suppliers.length, total)} of {total}</>
            ) : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      <Aesthetic_AddSupplierDialog open={addOpen} onClose={()=>setAddOpen(false)} onSave={addSupplier} />
      <Aesthetic_AddSupplierDialog open={editOpen} onClose={()=>setEditOpen(false)} onSave={saveEdit} initial={selected ?? undefined} title="Edit Supplier" submitLabel="Save" />
      <Aesthetic_SupplierDetailsDialog open={detailsOpen} onClose={()=>setDetailsOpen(false)} supplier={selected} />
    </div>
  )
}
