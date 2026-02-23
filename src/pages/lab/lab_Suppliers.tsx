import { useEffect, useMemo, useRef, useState } from 'react'
import Lab_AddSupplierDialog, { type Supplier } from '../../components/lab/lab_AddSupplierDialog'
import Lab_SupplierDetailsDialog from '../../components/lab/lab_SupplierDetailsDialog'
import { labApi } from '../../utils/api'

export default function Lab_Suppliers() {
  const [query, setQuery] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(6)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [paymentFor, setPaymentFor] = useState<string | null>(null)
  const [paymentDraft, setPaymentDraft] = useState<{ amount: string; method: string; note: string; date: string; purchaseId?: string }>({ amount: '', method: 'cash', note: '', date: '' })
  const [payingPurchases, setPayingPurchases] = useState<any[]>([])

  const filtered = useMemo(() => suppliers, [suppliers])

  const reqSeq = useRef(0)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const my = ++reqSeq.current
      try {
        const res: any = await labApi.listSuppliers({ q: query || undefined, page, limit: rowsPerPage })
        if (!mounted || my !== reqSeq.current) return
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
      } catch (e) {
        console.error(e)
        if (mounted && my===reqSeq.current){
          setSuppliers([])
          setTotal(0)
          setTotalPages(1)
        }
      }
    })()
    return () => { mounted = false }
  }, [query, rowsPerPage, page])

  const addSupplier = async (s: Supplier) => {
    const created = await labApi.createSupplier({
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
    await labApi.updateSupplier(s.id, {
      name: s.name,
      company: s.company,
      phone: s.phone,
      address: s.address,
      taxId: s.taxId,
      status: s.status,
    })
    setSuppliers(prev => prev.map(x => x.id === s.id ? s : x))
  }
  const requestDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true) }
  const performDelete = async () => {
    const id = deleteId; if (!id) { setDeleteOpen(false); return }
    try { await labApi.deleteSupplier(id); setSuppliers(prev => prev.filter(x => x.id !== id)); setNotice({ text: 'Supplier deleted', kind: 'success' }) }
    catch (e){ console.error(e); setNotice({ text: 'Failed to delete supplier', kind: 'error' }) }
    finally { setDeleteOpen(false); setDeleteId(null); try { setTimeout(()=> setNotice(null), 2500) } catch {} }
  }

  const openDetails = (s: Supplier) => { setSelected(s); setDetailsOpen(true) }

  const startPayment = async (s: Supplier) => {
    setPaymentFor(s.id)
    setPaymentDraft({ amount: '', method: 'cash', note: '', date: '' })
    try {
      const res = await labApi.listSupplierPurchases(s.id)
      setPayingPurchases(res.items || [])
    } catch {
      setPayingPurchases([])
    }
  }
  const cancelPayment = () => { setPaymentFor(null) }
  const savePayment = async (s: Supplier) => {
    const amt = parseFloat(paymentDraft.amount || '0')
    if (!amt) { setPaymentFor(null); return }
    await labApi.recordSupplierPayment(s.id, { amount: amt, purchaseId: paymentDraft.purchaseId, method: paymentDraft.method, note: paymentDraft.note, date: paymentDraft.date })
    setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, paid: (x.paid || 0) + amt } : x))
    if (paymentDraft.purchaseId){
      setPayingPurchases(prev => prev.map(p => p._id === paymentDraft.purchaseId ? { ...p, paid: (p.paid||0)+amt, remaining: Math.max(0, (p.remaining||0) - amt) } : p))
    }
    setPaymentFor(null)
  }

  

  return (
    <div className="space-y-4">
      {notice && (
        <div className={`rounded-md border px-3 py-2 text-sm ${notice.kind==='success'? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Supplier Management</div>
        <button onClick={()=>setAddOpen(true)} className="btn">+ Add Supplier</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-3">
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search suppliers.." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={rowsPerPage} onChange={e=>setRowsPerPage(parseInt(e.target.value))} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
            <option value={6}>6</option>
            <option value={12}>12</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(s => {
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
                      <span className={`${s.status==='Active'?'bg-navy text-white':'bg-slate-100 text-slate-700'} rounded px-2 py-1`}>{s.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={()=>startPayment(s)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Record Payment</button>
                  <button onClick={()=>openEdit(s)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">✎</button>
                  <button onClick={()=>requestDelete(s.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">🗑</button>
                </div>
              </div>

              {payOpen && (
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_160px_1fr_160px_auto_auto]">
                  <select value={paymentDraft.purchaseId || ''} onChange={e=>setPaymentDraft(p=>({ ...p, purchaseId: e.target.value || undefined }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="">General payment (no specific invoice)</option>
                    {payingPurchases.map(p => (
                      <option key={p._id} value={p._id}>{p.invoice || p._id} · Total Rs {Number(p.totalAmount||0).toFixed(0)} · Remaining Rs {Number(p.remaining||0).toFixed(0)}</option>
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

        {filtered.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">No suppliers</div>
        )}

        <div className="flex items-center justify-between px-1 text-sm text-slate-600">
          <div>
            {total>0 ? (
              <>Showing {Math.min((page-1)*rowsPerPage + 1, total)}-{Math.min((page-1)*rowsPerPage + filtered.length, total)} of {total}</>
            ) : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Prev</button>
            <div>Page {page} / {totalPages}</div>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      <Lab_AddSupplierDialog open={addOpen} onClose={()=>setAddOpen(false)} onSave={addSupplier} />
      <Lab_AddSupplierDialog open={editOpen} onClose={()=>setEditOpen(false)} onSave={saveEdit} initial={selected ?? undefined} title="Edit Supplier" submitLabel="Save" />
      <Lab_SupplierDetailsDialog open={detailsOpen} onClose={()=>setDetailsOpen(false)} supplier={selected} />

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Delete</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete this supplier?</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={()=>{ setDeleteOpen(false); setDeleteId(null) }} className="btn-outline-navy">Cancel</button>
              <button onClick={performDelete} className="btn bg-rose-600 hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
