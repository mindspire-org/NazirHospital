import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Printer, Trash2 } from 'lucide-react'
import { diagnosticApi } from '../../utils/api'
import Diagnostic_TokenSlip from '../../components/diagnostic/Diagnostic_TokenSlip'
import Diagnostic_EditSampleDialog from '../../components/diagnostic/Diagnostic_EditSampleDialog'
import type { DiagnosticTokenSlipData } from '../../components/diagnostic/Diagnostic_TokenSlip'

type Order = {
  id: string
  createdAt: string
  patient: { mrn?: string; fullName: string; phone?: string; cnic?: string; guardianName?: string }
  tests: string[]
  // per-test tracking items
  items?: Array<{ testId: string; status: 'received'|'completed'|'returned'; sampleTime?: string; reportingTime?: string }>
  status: 'received'|'completed'|'returned'
  tokenNo?: string
  sampleTime?: string
  subtotal?: number
  discount?: number
  net?: number
}

type Test = { id: string; name: string; price?: number }

function formatDate(iso: string) {
  const d = new Date(iso); return d.toLocaleDateString()
}

function formatTime(iso: string) {
  const d = new Date(iso); return d.toLocaleTimeString()
}

export default function Diagnostic_SampleTracking(){
  // tests map
  const [tests, setTests] = useState<Test[]>([])
  useEffect(()=>{ (async()=>{
    try { const res = await diagnosticApi.listTests({ limit: 1000 }) as any; setTests((res?.items||res||[]).map((t:any)=>({ id: String(t._id||t.id), name: t.name, price: Number(t.price||0) })))} catch { setTests([]) }
  })() }, [])
  const testsMap = useMemo(()=> Object.fromEntries(tests.map(t=>[t.id, t.name])), [tests])
  const testsPrice = useMemo(()=> Object.fromEntries(tests.map(t=>[t.id, Number(t.price||0)])), [tests])

  // filters
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'all'|'received'|'completed'|'returned'>('all')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)

  // data
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)

  useEffect(()=>{ let mounted = true; (async()=>{
    try {
      // Do not exclude orders with some returned items when viewing 'received' or 'all'
      const st = (status==='all' || status==='received') ? undefined : status
      const res = await diagnosticApi.listOrders({ q: q || undefined, from: from || undefined, to: to || undefined, status: st as any, page, limit: rows }) as any
      const items: Order[] = (res.items||[]).map((x:any)=>({ id: String(x._id), createdAt: x.createdAt || new Date().toISOString(), patient: x.patient || { fullName: '-', phone: '' }, tests: x.tests || [], items: x.items || [], status: x.status || 'received', tokenNo: x.tokenNo, sampleTime: x.sampleTime, subtotal: Number(x.subtotal||0), discount: Number(x.discount||0), net: Number(x.net||0) }))
      if (mounted){ setOrders(items); setTotal(Number(res.total||items.length||0)); setTotalPages(Number(res.totalPages||1)) }
    } catch (e){ if (mounted){ setOrders([]); setTotal(0); setTotalPages(1) } }
  })(); return ()=>{ mounted = false } }, [q, from, to, status, page, rows])

  const pageCount = Math.max(1, totalPages)
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + orders.length, total)

  // Per-test update handlers
  const setSampleTimeForItem = async (orderId: string, testId: string, t: string) => {
    try { await diagnosticApi.updateOrderItemTrack(orderId, testId, { sampleTime: t }) } catch {}
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const items = (o.items||[])
      const idx = items.findIndex(i => i.testId===testId)
      if (idx>=0){ const copy = items.slice(); copy[idx] = { ...copy[idx], sampleTime: t }; return { ...o, items: copy } }
      return { ...o, items: [ ...(o.items||[]), { testId, status: 'received', sampleTime: t } ] }
    }))
  }
  const setStatusForItem = async (orderId: string, testId: string, s: 'received'|'completed'|'returned') => {
    let ok = false
    try {
      await diagnosticApi.updateOrderItemTrack(orderId, testId, { status: s })
      ok = true
    } catch {}
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const items = (o.items||[])
      const idx = items.findIndex(i => i.testId===testId)
      if (idx>=0){ const copy = items.slice(); copy[idx] = { ...copy[idx], status: s }; return { ...o, items: copy } }
      return { ...o, items: [ ...(o.items||[]), { testId, status: s } ] }
    }))

    if (ok && s === 'completed') {
      setNotice({ text: 'Marked completed. You can enter results in Result Entry.', kind: 'success' })
      try { setTimeout(()=> setNotice(null), 2500) } catch {}
    }
  }
  const requestDeleteItem = async (orderId: string, testId: string) => {
    if (!confirm('Delete this test from the order?')) return
    try {
      const res = await diagnosticApi.deleteOrderItem(orderId, testId) as any
      if (res?.deletedOrder){
        setOrders(prev => prev.filter(o=>o.id!==orderId))
      } else if (res?.order){
        setOrders(prev => prev.map(o => o.id===orderId ? {
          ...o,
          tests: (res.order.tests||[]),
          items: (res.order.items||[]),
          status: res.order.status || o.status,
        } : o))
      } else {
        setOrders(prev => prev.map(o => o.id===orderId ? { ...o, tests: o.tests.filter(t=>t!==testId), items: (o.items||[]).filter(i=>i.testId!==testId) } : o))
      }
      setNotice({ text: 'Test deleted', kind: 'success' })
    }
    catch { setNotice({ text: 'Failed to delete', kind: 'error' }) }
    finally { try { setTimeout(()=> setNotice(null), 2500) } catch {} }
  }

  // Print Slip
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipData, setSlipData] = useState<DiagnosticTokenSlipData | null>(null)
  // View Details Dialog
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null)
  // Edit Sample Dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editOrder, setEditOrder] = useState<{ id: string; patient: any; tests: string[] } | null>(null)
  function openEdit(o: Order){ setEditOrder({ id: o.id, patient: o.patient, tests: o.tests }); setEditOpen(true) }
  function onEditSaved(updated: any){
    const id = String(updated?._id || updated?.id || (editOrder && editOrder.id))
    if (!id) { setEditOpen(false); return }
    setOrders(prev => prev.map(o => o.id===id ? { ...o, patient: updated.patient || o.patient, tests: updated.tests || o.tests, tokenNo: updated.tokenNo || o.tokenNo, createdAt: updated.createdAt || o.createdAt } : o))
    setEditOpen(false)
  }
  const printToken = (o: Order) => {
    const rows = o.tests.map(tid => ({ name: testsMap[tid] || tid, price: Number(testsPrice[tid]||0) }))
    const computedSubtotal = rows.reduce((s,r)=> s + Number(r.price||0), 0)
    const subtotal = (o.subtotal!=null && !Number.isNaN(o.subtotal)) ? Number(o.subtotal) : computedSubtotal
    const discount = (o.discount!=null && !Number.isNaN(o.discount)) ? Number(o.discount) : 0
    const payable = (o.net!=null && !Number.isNaN(o.net)) ? Number(o.net) : Math.max(0, subtotal - discount)
    const data: DiagnosticTokenSlipData = {
      tokenNo: o.tokenNo || '-',
      patientName: o.patient.fullName,
      phone: o.patient.phone || '',
      age: (o as any)?.patient?.age ? String((o as any).patient.age) : undefined,
      gender: (o as any)?.patient?.gender ? String((o as any).patient.gender) : undefined,
      mrn: o.patient.mrn || undefined,
      guardianRel: undefined,
      guardianName: o.patient.guardianName || undefined,
      cnic: (o as any)?.patient?.cnic || o.patient.cnic || undefined,
      address: (o as any)?.patient?.address || undefined,
      tests: rows,
      subtotal,
      discount,
      payable,
      createdAt: o.createdAt,
    }
    setSlipData(data); setSlipOpen(true)
  }

  const openDetails = (o: Order) => {
    setDetailsOrder(o)
    setDetailsOpen(true)
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-2xl font-bold text-slate-900">Sample Tracking</div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="min-w-0 w-full">
            <label className="mb-1 block text-xs text-slate-500">Search</label>
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by token, patient, or test..." className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div className="min-w-0 w-full">
            <label className="mb-1 block text-xs text-slate-500">From</label>
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
          </div>
          <div className="min-w-0 w-full">
            <label className="mb-1 block text-xs text-slate-500">To</label>
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
          </div>
          <div className="min-w-0 w-full">
            <label className="mb-1 block text-xs text-slate-500">Status</label>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value as any); setPage(1) }}
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="received">Received</option>
              <option value="completed">Completed</option>
              <option value="returned">Returned</option>
            </select>
          </div>
          <div className="min-w-0 w-full">
            <label className="mb-1 block text-xs text-slate-500">Rows</label>
            <select value={rows} onChange={e=>{ setRows(Number(e.target.value)); setPage(1) }} className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        {notice && (
          <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${notice.kind==='success'? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-2 py-2 lg:px-4">DateTime</th>
              <th className="px-2 py-2 lg:px-4">Patient</th>
              <th className="px-2 py-2 lg:px-4">Token No</th>
              <th className="px-2 py-2 lg:px-4">Test(s)</th>
              <th className="hidden px-2 py-2 lg:px-4 md:table-cell">MR No</th>
              <th className="hidden px-2 py-2 lg:px-4 lg:table-cell">Phone</th>
              <th className="hidden px-2 py-2 lg:px-4 sm:table-cell">Sample Time</th>
              <th className="px-2 py-2 lg:px-4">Status</th>
              <th className="px-2 py-2 lg:px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.reduce((acc: any[], o) => {
              const token = o.tokenNo || '-'
              o.tests.forEach((tid, idx) => {
                const tname = testsMap[tid] || '—'
                const item = (o.items||[]).find(i=> i.testId===tid)
                const rowStatus = item?.status || o.status
                const sampleTime = item?.sampleTime || o.sampleTime || ''
                acc.push(
                  <tr key={`${o.id}-${tid}-${idx}`} className="border-b border-slate-100">
                    <td className="px-2 py-2 lg:px-4 whitespace-nowrap">
                      <div className="leading-tight">
                        <div>{formatDate(o.createdAt)}</div>
                        <div className="text-xs text-slate-500">{formatTime(o.createdAt)}</div>
                      </div>
                    </td>
                    <td className="px-2 py-2 lg:px-4 whitespace-nowrap">{o.patient.fullName}</td>
                    <td className="px-2 py-2 lg:px-4 whitespace-nowrap">{token}</td>
                    <td className="px-2 py-2 lg:px-4">{tname}</td>
                    <td className="hidden px-2 py-2 lg:px-4 whitespace-nowrap md:table-cell">{o.patient.mrn || '-'}</td>
                    <td className="hidden px-2 py-2 lg:px-4 whitespace-nowrap lg:table-cell">{o.patient.phone || '-'}</td>
                    <td className="hidden px-2 py-2 lg:px-4 whitespace-nowrap sm:table-cell">
                      <input type="time" value={sampleTime} onChange={e=>setSampleTimeForItem(o.id, String(tid), e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
                     </td>
                    <td className="px-2 py-2 lg:px-4 whitespace-nowrap">
                      <select value={rowStatus} onChange={e=> setStatusForItem(o.id, String(tid), e.target.value as any)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                        <option value="received">received</option>
                        <option value="completed">completed</option>
                        <option value="returned">returned</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 lg:px-4 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          title="View Details"
                          onClick={()=>openDetails(o)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 sm:h-8 sm:w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Print Token"
                          onClick={()=>printToken(o)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 sm:h-8 sm:w-8"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit Sample"
                          onClick={()=> openEdit(o)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 sm:h-8 sm:w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete Test"
                          onClick={()=>requestDeleteItem(o.id, String(tid))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50 sm:h-8 sm:w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
              return acc
            }, [] as any[])}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No samples found</div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>{total === 0 ? '0' : `${start}-${end}`} of {total}</div>
        <div className="flex items-center gap-2">
          <button disabled={curPage<=1} onClick={()=> setPage(p=> Math.max(1, p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Prev</button>
          <span>{curPage} / {pageCount}</span>
          <button disabled={curPage>=pageCount} onClick={()=> setPage(p=> p+1)} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>

      {slipOpen && slipData && (
        <Diagnostic_TokenSlip open={slipOpen} onClose={()=>setSlipOpen(false)} data={slipData} />
      )}
      {detailsOpen && detailsOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <div>
                <div className="text-base font-semibold text-slate-800">Order Details</div>
                <div className="text-xs text-slate-500">Token: {detailsOrder.tokenNo || '-'} • {formatDate(detailsOrder.createdAt)} {formatTime(detailsOrder.createdAt)}</div>
              </div>
              <button onClick={()=>setDetailsOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Close</button>
            </div>

            <div className="space-y-4 p-5">
              <section className="rounded-lg border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-800">Patient Details</div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div className="flex items-start justify-between gap-2"><div className="text-slate-500">Name</div><div className="text-right text-slate-800">{detailsOrder.patient?.fullName || '-'}</div></div>
                  <div className="flex items-start justify-between gap-2"><div className="text-slate-500">Phone</div><div className="text-right text-slate-800">{detailsOrder.patient?.phone || '-'}</div></div>
                  <div className="flex items-start justify-between gap-2"><div className="text-slate-500">MR No</div><div className="text-right text-slate-800">{detailsOrder.patient?.mrn || '-'}</div></div>
                  <div className="flex items-start justify-between gap-2"><div className="text-slate-500">CNIC</div><div className="text-right text-slate-800">{(detailsOrder.patient as any)?.cnic || '-'}</div></div>
                  <div className="flex items-start justify-between gap-2"><div className="text-slate-500">Guardian</div><div className="text-right text-slate-800">{(detailsOrder.patient as any)?.guardianName || (detailsOrder.patient as any)?.fatherName || '-'}</div></div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-800">Token Details</div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div className="flex items-start justify-between gap-2"><div className="text-slate-500">Token No</div><div className="text-right font-semibold text-slate-900">{detailsOrder.tokenNo || '-'}</div></div>
                  <div className="flex items-start justify-between gap-2"><div className="text-slate-500">Status</div><div className="text-right text-slate-800">{detailsOrder.status || '-'}</div></div>
                  <div className="flex items-start justify-between gap-2"><div className="text-slate-500">Created</div><div className="text-right text-slate-800">{formatDate(detailsOrder.createdAt)} {formatTime(detailsOrder.createdAt)}</div></div>
                  <div className="flex items-start justify-between gap-2"><div className="text-slate-500">Sample Time</div><div className="text-right text-slate-800">{detailsOrder.sampleTime || '-'}</div></div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-800">Test Details</div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-500">
                      <tr>
                        <th className="py-2">Test</th>
                        <th className="py-2">Sample Time</th>
                        <th className="py-2">Reporting Time</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(detailsOrder.tests || []).map((tid, i) => {
                        const item = (detailsOrder.items || []).find(x => String(x.testId) === String(tid)) as any
                        return (
                          <tr key={`${detailsOrder.id}-${tid}-${i}`}>
                            <td className="py-2 pr-3 text-slate-800">{testsMap[tid] || tid}</td>
                            <td className="py-2 pr-3 text-slate-700">{item?.sampleTime || '-'}</td>
                            <td className="py-2 pr-3 text-slate-700">{item?.reportingTime || '-'}</td>
                            <td className="py-2 text-slate-700">{item?.status || detailsOrder.status || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
      {editOpen && editOrder && (
        <Diagnostic_EditSampleDialog
          open={editOpen}
          onClose={()=>setEditOpen(false)}
          order={editOrder}
          onSaved={onEditSaved}
        />
      )}
    </div>
  )
}
