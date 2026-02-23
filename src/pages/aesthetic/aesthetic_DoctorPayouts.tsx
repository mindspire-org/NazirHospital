import { useEffect, useMemo, useState } from 'react'
import { aestheticApi, aestheticFinanceApi as financeApi } from '../../utils/api'

export default function Finance_DoctorPayouts(){
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([])
  const [doctorId, setDoctorId] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const [payouts, setPayouts] = useState<Array<{ id: string; dateIso: string; memo?: string; amount: number }>>([])
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'Cash'|'Bank'>('Cash')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(()=>{ loadDoctors() }, [])
  useEffect(()=>{ if (doctorId) { loadBalance(); loadPayouts() } else { setBalance(null); setPayouts([]) }}, [doctorId, tick])

  async function loadDoctors(){
    try {
      const res: any = await aestheticApi.listDoctors()
      const items = (res?.doctors || res || []).map((d:any)=> ({ id: String(d._id||d.id), name: d.name }))
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
      setAmount('')
      setMemo('')
      setTick(t=>t+1)
      alert('Payout recorded')
    } catch (e:any){ alert(e?.message || 'Failed to record payout') }
    finally { setLoading(false) }
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
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
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 grid gap-4 md:grid-cols-4">
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
        <div className="md:col-span-4 flex justify-end">
          <button disabled={!canPay} onClick={pay} className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{loading? 'Saving...' : 'Pay Doctor'}</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Recent Payouts</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Memo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {payouts.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-2">{p.dateIso}</td>
                  <td className="px-4 py-2">Rs {p.amount.toFixed(2)}</td>
                  <td className="px-4 py-2">{p.memo || '-'}</td>
                </tr>
              ))}
              {payouts.length===0 && (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={3}>No payouts</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
