import { useEffect, useMemo, useState } from 'react'
import { hospitalApi, financeApi } from '../../utils/api'
import Toast, { type ToastState } from '../../components/ui/Toast'
import Hospital_DoctorPayoutSlipDialog, { type DoctorPayoutSlipData } from '../../components/hospital/Hospital_DoctorPayoutSlipDialog'

export default function Finance_DoctorPayouts(){
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([])
  const [doctorId, setDoctorId] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const [payouts, setPayouts] = useState<Array<{ id: string; dateIso: string; memo?: string; amount: number; createdByUsername?: string; doctorId?: string; doctorName?: string }>>([])
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalRows, setTotalRows] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'Cash'|'Bank'>('Cash')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)
  const [toast, setToast] = useState<ToastState>(null)
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipAutoPrint, setSlipAutoPrint] = useState(false)
  const [slipData, setSlipData] = useState<DoctorPayoutSlipData | null>(null)
  const [payDialogOpen, setPayDialogOpen] = useState(false)

  useEffect(()=>{ loadDoctors() }, [])
  useEffect(()=>{ if (doctorId) { loadBalance() } else { setBalance(null) }}, [doctorId, tick])
  useEffect(()=>{ loadRecentPayouts() }, [tick, page, rowsPerPage])

  async function loadDoctors(){
    try {
      const res: any = await hospitalApi.listDoctors()
      const items = (res?.doctors || []).map((d:any)=> ({ id: String(d._id), name: d.name }))
      setDoctors(items)
      if (items.length && !doctorId) setDoctorId(items[0].id)
    } catch {}
  }
  async function loadBalance(){
    try { const res: any = await financeApi.doctorBalance(doctorId); setBalance(Number(res?.payable || 0)) } catch { setBalance(null) }
  }
  async function loadPayouts(){
    try { const res: any = await financeApi.doctorPayouts(doctorId, 50); setPayouts(res?.payouts || []) } catch { setPayouts([]) }
  }

  async function loadRecentPayouts(){
    try{
      const res: any = await (financeApi as any).listRecentDoctorPayouts({ page, limit: rowsPerPage })
      const rows = (res?.transactions || []).map((t: any) => ({
        id: String(t.id || t._id || ''),
        dateIso: String(t.dateIso || ''),
        memo: t.memo,
        amount: Number(t.totalAmount || 0),
        createdByUsername: t.createdByUsername,
        doctorId: t.doctorId ? String(t.doctorId) : undefined,
        doctorName: t.doctorName,
      }))
      setPayouts(rows)
      setTotalRows(Number(res?.total || 0))
      setTotalPages(Math.max(1, Number(res?.totalPages || 1)))
    } catch {
      // fallback to selected doctor's payouts if the aggregated endpoint is unavailable
      if (doctorId) loadPayouts()
    }
  }

  const canPay = useMemo(()=>{
    const amt = parseFloat(amount || '0')
    return doctorId && !loading && amt > 0
  }, [doctorId, amount, loading])

  async function pay(){
    const amt = parseFloat(amount || '0')
    if (!(amt>0) || !doctorId) return
    setLoading(true)
    try {
      await financeApi.doctorPayout({ doctorId, amount: amt, method, memo: memo || undefined })
      const docName = doctors.find(d => d.id === doctorId)?.name || '-'
      setSlipData({
        doctorId,
        doctorName: docName,
        amount: amt,
        method,
        memo: memo || undefined,
        createdByUsername: undefined,
        createdAt: new Date().toISOString(),
      })
      setSlipAutoPrint(false)
      setSlipOpen(true)
      setPayDialogOpen(false)
      setAmount('')
      setMemo('')
      setTick(t=>t+1)
      setToast({ type: 'success', message: 'Payout recorded' })
    } catch (e:any){ setToast({ type: 'error', message: e?.message || 'Failed to record payout' }) }
    finally { setLoading(false) }
  }

  function openSlipForRow(p: { id: string; dateIso: string; memo?: string; amount: number; createdByUsername?: string; doctorId?: string; doctorName?: string }){
    const docName = p.doctorName || doctors.find(d => d.id === (p.doctorId || doctorId))?.name || '-'
    setSlipData({
      doctorId: p.doctorId || doctorId,
      doctorName: docName,
      amount: Number(p.amount || 0),
      method: undefined,
      memo: p.memo || undefined,
      createdByUsername: p.createdByUsername,
      createdAt: p.dateIso ? new Date(p.dateIso).toISOString() : undefined,
    })
    setSlipAutoPrint(false)
    setSlipOpen(true)
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <Hospital_DoctorPayoutSlipDialog
        open={slipOpen && !!slipData}
        onClose={()=>setSlipOpen(false)}
        data={(slipData || { doctorName: '-', amount: 0 }) as any}
        autoPrint={slipAutoPrint}
      />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-800">Doctor Payouts</div>
          <div className="text-sm text-slate-500">Make payouts and view recent history</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-slate-700">Doctor</label>
          <select value={doctorId} onChange={e=>setDoctorId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {doctors.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Current Payable</label>
          <div className={`rounded-md border px-3 py-2 text-sm ${balance!=null ? 'border-amber-300 bg-amber-50 text-amber-800' : 'text-slate-500'}`}>{balance!=null ? `Rs ${balance.toFixed(2)}` : '-'}</div>
        </div>
        <div className="flex items-end justify-end">
          <button
            disabled={!doctorId}
            onClick={()=>setPayDialogOpen(true)}
            className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Pay Doctor
          </button>
        </div>
      </div>

      {payDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-slate-800">Pay Doctor</div>
              <button onClick={()=>setPayDialogOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Close</button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Amount (Rs)</label>
                <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" step="0.01" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Method</label>
                <select value={method} onChange={e=>setMethod(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option>Cash</option>
                  <option>Bank</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-700">Memo</label>
                <input value={memo} onChange={e=>setMemo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Optional note" />
              </div>
              <div className="md:col-span-4 flex justify-end gap-2">
                <button onClick={()=>setPayDialogOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
                <button disabled={!canPay} onClick={pay} className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{loading? 'Saving...' : 'Confirm Payout'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Recent Payouts</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Doctor</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Performed By</th>
                <th className="px-4 py-2 font-medium">Memo</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {payouts.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-2">{p.dateIso}</td>
                  <td className="px-4 py-2">{p.doctorName || '-'}</td>
                  <td className="px-4 py-2">Rs {p.amount.toFixed(2)}</td>
                  <td className="px-4 py-2">{p.createdByUsername || '-'}</td>
                  <td className="px-4 py-2">{p.memo || '-'}</td>
                  <td className="px-4 py-2">
                    <button className="btn-outline-navy" onClick={()=>openSlipForRow(p)}>Slip</button>
                  </td>
                </tr>
              ))}
              {payouts.length===0 && (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No payouts</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {payouts.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={e=>{ setRowsPerPage(parseInt(e.target.value)); setPage(1) }}
                className="rounded-md border border-slate-300 px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div>
              {(() => {
                const startIdx = totalRows === 0 ? 0 : (page - 1) * rowsPerPage + 1
                const endIdx = Math.min(page * rowsPerPage, totalRows)
                return `Page ${page} of ${totalPages} (${startIdx}-${endIdx} of ${totalRows})`
              })()}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={()=>setPage(p=>Math.max(1, p-1))}
                disabled={page <= 1}
                className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={()=>setPage(p=>Math.min(totalPages, p+1))}
                disabled={page >= totalPages}
                className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
