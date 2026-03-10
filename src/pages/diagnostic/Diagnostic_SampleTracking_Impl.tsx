import { useEffect, useMemo, useState } from 'react'
import { diagnosticApi } from '../../utils/api'
import Diagnostic_TokenSlip from '../../components/diagnostic/Diagnostic_TokenSlip'
import Diagnostic_EditSampleDialog from '../../components/diagnostic/Diagnostic_EditSampleDialog'
import type { DiagnosticTokenSlipData } from '../../components/diagnostic/Diagnostic_TokenSlip'
import { Building2, Wallet, DollarSign, Printer, Pencil, Trash2, RotateCcw } from 'lucide-react'

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
  receivedAmount?: number
  receivableAmount?: number
  corporateId?: string
  corporateName?: string
  billingType?: 'cash' | 'corporate'
}

type Test = { id: string; name: string; price?: number }

function formatDateTime(iso: string) {
  const d = new Date(iso); return d.toLocaleDateString() + ', ' + d.toLocaleTimeString()
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
      const items: Order[] = (res.items||[]).map((x:any)=>({ 
        id: String(x._id), 
        createdAt: x.createdAt || new Date().toISOString(), 
        patient: x.patient || { fullName: '-', phone: '' }, 
        tests: x.tests || [], 
        items: x.items || [], 
        status: x.status || 'received', 
        tokenNo: x.tokenNo, 
        sampleTime: x.sampleTime, 
        subtotal: Number(x.subtotal||0), 
        discount: Number(x.discount||0), 
        net: Number(x.net||0),
        receivedAmount: Number(x.receivedAmount||0),
        receivableAmount: Number(x.receivableAmount||0),
        corporateId: x.corporateId,
        billingType: x.corporateId ? 'corporate' : 'cash'
      }))
      if (mounted){ setOrders(items); setTotal(Number(res.total||items.length||0)); setTotalPages(Number(res.totalPages||1)) }
    } catch (e){ if (mounted){ setOrders([]); setTotal(0); setTotalPages(1) } }
  })(); return ()=>{ mounted = false } }, [q, from, to, status, page, rows])

  const pageCount = Math.max(1, totalPages)
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + orders.length, total)

  // Per-test update handlers
  // @ts-expect-error unused function kept for future use
  const setSampleTimeForItem = (orderId: string, testId: string, time: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      return { ...o, items: (o.items || []).map(it => it.testId === testId ? { ...it, sampleTime: time } : it) }
    }))
  }
  const setStatusForItem = async (orderId: string, testId: string, s: 'received'|'completed'|'returned') => {
    try { await diagnosticApi.updateOrderItemTrack(orderId, testId, { status: s }) } catch {}
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const items = (o.items||[])
      const idx = items.findIndex(i => i.testId===testId)
      if (idx>=0){ const copy = items.slice(); copy[idx] = { ...copy[idx], status: s }; return { ...o, items: copy } }
      return { ...o, items: [ ...(o.items||[]), { testId, status: s } ] }
    }))
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

  // Receive Payment Dialog
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveOrder, setReceiveOrder] = useState<Order | null>(null)
  const [receiveAmount, setReceiveAmount] = useState('')
  const [receiveMethod, setReceiveMethod] = useState('cash')
  const [receiveNote, setReceiveNote] = useState('')

  function openReceivePayment(o: Order) {
    setReceiveOrder(o)
    setReceiveAmount(String(o.receivableAmount || 0))
    setReceiveMethod('cash')
    setReceiveNote('')
    setReceiveOpen(true)
  }

  async function submitReceivePayment() {
    if (!receiveOrder?.tokenNo) return
    const amount = Number(receiveAmount) || 0
    if (amount <= 0) {
      setNotice({ text: 'Amount must be greater than 0', kind: 'error' })
      return
    }
    try {
      const res = await diagnosticApi.receivePayment(receiveOrder.tokenNo, {
        amount,
        method: receiveMethod,
        note: receiveNote || undefined
      }) as any
      // Update local orders state
      setOrders(prev => prev.map(o => {
        if (o.tokenNo !== receiveOrder.tokenNo) return o
        return {
          ...o,
          receivedAmount: res?.receivedAmount ?? o.receivedAmount,
          receivableAmount: res?.receivableAmount ?? o.receivableAmount
        }
      }))
      setNotice({ text: 'Payment received successfully', kind: 'success' })
      setReceiveOpen(false)
    } catch (e: any) {
      setNotice({ text: e?.message || 'Failed to receive payment', kind: 'error' })
    } finally {
      setTimeout(() => setNotice(null), 3000)
    }
  }

  // Return Dialog
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnOrder, setReturnOrder] = useState<Order | null>(null)
  const [returnReason, setReturnReason] = useState('')
  const [returnAmount, setReturnAmount] = useState('')

  function openReturnDialog(o: Order) {
    setReturnOrder(o)
    setReturnReason('')
    setReturnAmount(String(o.receivedAmount || 0))
    setReturnOpen(true)
  }

  async function submitReturn() {
    if (!returnOrder) return
    const amount = Number(returnAmount) || 0
    if (amount <= 0) {
      setNotice({ text: 'Return amount must be greater than 0', kind: 'error' })
      return
    }
    if (amount > (returnOrder.receivedAmount || 0)) {
      setNotice({ text: 'Return amount cannot exceed received amount', kind: 'error' })
      return
    }
    try {
      const res = await diagnosticApi.returnOrder(returnOrder.id, {
        reason: returnReason || undefined,
        amount
      }) as any
      // Update local orders state
      setOrders(prev => prev.map(o => {
        if (o.id !== returnOrder.id) return o
        return {
          ...o,
          status: 'returned',
          net: res?.order?.net ?? o.net,
          receivedAmount: res?.order?.receivedAmount ?? o.receivedAmount,
          receivableAmount: res?.order?.receivableAmount ?? o.receivableAmount
        }
      }))
      setNotice({ text: `Order returned - Amount refunded: PKR ${amount.toLocaleString()}`, kind: 'success' })
      setReturnOpen(false)
    } catch (e: any) {
      setNotice({ text: e?.message || 'Failed to return order', kind: 'error' })
    } finally {
      setTimeout(() => setNotice(null), 3000)
    }
  }

  async function undoReturn(o: Order) {
    if (!confirm('Undo the return for this order? This will restore the original amounts.')) return
    try {
      const res = await diagnosticApi.undoReturn(o.id) as any
      // Update local orders state
      setOrders(prev => prev.map(order => {
        if (order.id !== o.id) return order
        return {
          ...order,
          status: 'received',
          net: res?.order?.net ?? order.net,
          receivedAmount: res?.order?.receivedAmount ?? order.receivedAmount,
          receivableAmount: res?.order?.receivableAmount ?? order.receivableAmount
        }
      }))
      setNotice({ text: `Return undone - Amount restored: PKR ${res?.restoredAmount?.toLocaleString() || 0}`, kind: 'success' })
    } catch (e: any) {
      setNotice({ text: e?.message || 'Failed to undo return', kind: 'error' })
    } finally {
      setTimeout(() => setNotice(null), 3000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-2xl font-bold text-slate-900">Sample Tracking</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[260px] flex-1">
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by token, patient, or test..." className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <button onClick={()=>setStatus('all')} className={`rounded-md px-3 py-1.5 border ${status==='all'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>All</button>
            <button onClick={()=>setStatus('received')} className={`rounded-md px-3 py-1.5 border ${status==='received'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Received</button>
            <button onClick={()=>setStatus('completed')} className={`rounded-md px-3 py-1.5 border ${status==='completed'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Completed</button>
            <button onClick={()=>setStatus('returned')} className={`rounded-md px-3 py-1.5 border ${status==='returned'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Returned</button>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span>Rows</span>
            <select value={rows} onChange={e=>{ setRows(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1">
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Token No</th>
              <th className="px-4 py-2">Test(s)</th>
              <th className="px-4 py-2">Billing</th>
              <th className="px-4 py-2">Net</th>
              <th className="px-4 py-2">Received</th>
              <th className="px-4 py-2">Pending</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.reduce((acc: any[], o) => {
              const token = o.tokenNo || '-'
              o.tests.forEach((tid, idx) => {
                const tname = testsMap[tid] || '—'
                const item = (o.items||[]).find(i=> i.testId===tid)
                const rowStatus = item?.status || o.status
                acc.push(
                  <tr key={`${o.id}-${tid}-${idx}`} className="border-b border-slate-100">
                    <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient.fullName}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{token}</td>
                    <td className="px-4 py-2">{tname}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {o.billingType === 'corporate' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                          <Building2 className="h-3 w-3" />
                          Corporate
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          <Wallet className="h-3 w-3" />
                          Cash
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">PKR {Number(o.net || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">PKR {Number(o.receivedAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {o.billingType === 'corporate' ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={Number(o.receivableAmount || 0) > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>
                          PKR {Number(o.receivableAmount || 0).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <select value={rowStatus} onChange={e=> setStatusForItem(o.id, String(tid), e.target.value as any)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                        <option value="received">received</option>
                        <option value="completed">completed</option>
                        <option value="returned">returned</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => printToken(o)}
                          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          title="Print Token"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(o)}
                          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          title="Edit Sample"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {o.billingType !== 'corporate' && Number(o.receivableAmount || 0) > 0 && (
                          <button
                            onClick={() => openReceivePayment(o)}
                            className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                            title="Receive Payment"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                        {o.status !== 'returned' && Number(o.receivedAmount || 0) > 0 && (
                          <button
                            onClick={() => openReturnDialog(o)}
                            className="rounded-md p-1.5 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                            title="Return Order"
                          >
                            <span className="text-xs font-bold">RET</span>
                          </button>
                        )}
                        {o.status === 'returned' && (
                          <button
                            onClick={() => undoReturn(o)}
                            className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            title="Undo Return"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => requestDeleteItem(o.id, String(tid))}
                          className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          title="Delete Test"
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
      {editOpen && editOrder && (
        <Diagnostic_EditSampleDialog
          open={editOpen}
          onClose={()=>setEditOpen(false)}
          order={editOrder}
          onSaved={onEditSaved}
        />
      )}

      {/* Receive Payment Dialog */}
      {receiveOpen && receiveOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Receive Payment</h3>
              <button onClick={() => setReceiveOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Token No</div>
                  <div className="font-medium text-slate-900">{receiveOrder.tokenNo}</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Patient</div>
                  <div className="font-medium text-slate-900">{receiveOrder.patient.fullName}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Net Amount</div>
                  <div className="font-medium text-slate-900">PKR {Number(receiveOrder.net || 0).toLocaleString()}</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Already Received</div>
                  <div className="font-medium text-slate-900">PKR {Number(receiveOrder.receivedAmount || 0).toLocaleString()}</div>
                </div>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                <div className="text-xs text-amber-600">Pending Amount</div>
                <div className="text-lg font-semibold text-amber-700">PKR {Number(receiveOrder.receivableAmount || 0).toLocaleString()}</div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Receive Amount</label>
                <input
                  type="number"
                  value={receiveAmount}
                  onChange={e => setReceiveAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method</label>
                <select
                  value={receiveMethod}
                  onChange={e => setReceiveMethod(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="easypaisa">Easypaisa</option>
                  <option value="jazzcash">JazzCash</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Note (optional)</label>
                <input
                  type="text"
                  value={receiveNote}
                  onChange={e => setReceiveNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="Add a note..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setReceiveOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReceivePayment}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Return Dialog */}
      {returnOpen && returnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Return Order</h3>
              <button onClick={() => setReturnOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Token No</div>
                  <div className="font-medium text-slate-900">{returnOrder.tokenNo}</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Patient</div>
                  <div className="font-medium text-slate-900">{returnOrder.patient.fullName}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Net Amount</div>
                  <div className="font-medium text-slate-900">PKR {Number(returnOrder.net || 0).toLocaleString()}</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Received Amount</div>
                  <div className="font-medium text-slate-900">PKR {Number(returnOrder.receivedAmount || 0).toLocaleString()}</div>
                </div>
              </div>
              <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                <div className="text-xs text-orange-600">Max Return Amount</div>
                <div className="text-lg font-semibold text-orange-700">PKR {Number(returnOrder.receivedAmount || 0).toLocaleString()}</div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Return Amount</label>
                <input
                  type="number"
                  value={returnAmount}
                  onChange={e => setReturnAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Reason (optional)</label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  placeholder="Enter reason for return..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setReturnOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReturn}
                  className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                >
                  Confirm Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
