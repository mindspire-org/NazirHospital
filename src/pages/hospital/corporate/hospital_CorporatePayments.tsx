import { useEffect, useMemo, useState } from 'react'
import { corporateApi } from '../../../utils/api'

export default function Hospital_CorporatePayments(){
  const today = new Date().toISOString().slice(0,10)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [companyId, setCompanyId] = useState('')
  const [dateIso, setDateIso] = useState(today)
  const [amount, setAmount] = useState('')
  const [refNo, setRefNo] = useState('')
  const [notes, setNotes] = useState('')

  const [txLoading, setTxLoading] = useState(false)
  const [txRows, setTxRows] = useState<any[]>([])
  const [allocations, setAllocations] = useState<Array<{ transactionId: string; amount: number }>>([])

  useEffect(()=>{ (async()=>{ try{ const r = await corporateApi.listCompanies() as any; setCompanies((r?.companies||[]).map((c:any)=>({ id: String(c._id||c.id), name: c.name })))}catch{} })() }, [])

  async function loadTx(){
    if (!companyId) { setTxRows([]); return }
    setTxLoading(true)
    try {
      // Load accrued + claimed; compute due (netToCorporate - paidAmount)
      const [acc, clm] = await Promise.all([
        corporateApi.listTransactions({ companyId, status: 'accrued' }) as any,
        corporateApi.listTransactions({ companyId, status: 'claimed' }) as any,
      ])
      const rows = ([...(acc?.transactions||[]), ...(clm?.transactions||[])]).map((t:any)=> ({ ...t, due: Math.max(0, Number(t.netToCorporate||0) - Number(t.paidAmount||0)) })).filter((t:any)=> t.due > 0)
      setTxRows(rows)
    } catch { setTxRows([]) }
    setTxLoading(false)
  }
  useEffect(()=>{ loadTx() }, [companyId])

  const unallocated = useMemo(()=> {
    const total = Number(amount||0)
    const used = allocations.reduce((s,a)=> s + Number(a.amount||0), 0)
    return Math.max(0, total - used)
  }, [amount, allocations])

  function addAllocation(t: any){
    const due = Math.max(0, Number(t.netToCorporate||0) - Number(t.paidAmount||0))
    // If amount not entered yet, default allocate full due and set amount accordingly
    const currentAmt = Number(amount||0)
    const available = currentAmt > 0 ? unallocated : due
    if (available <= 0 || due <= 0) return
    const apply = Math.min(available, due)
    setAllocations(prev => {
      const idx = prev.findIndex(x => x.transactionId === String(t._id))
      if (idx >= 0){
        const arr = [...prev]
        arr[idx] = { transactionId: String(t._id), amount: Number(arr[idx].amount || 0) + apply }
        return arr
      }
      return [...prev, { transactionId: String(t._id), amount: apply }]
    })
    if (currentAmt <= 0) setAmount(String(apply))
  }

  function setAlloc(tid: string, v: string){
    const amt = Math.max(0, Number(v||0))
    setAllocations(prev => prev.map(a => a.transactionId === tid ? { ...a, amount: amt } : a))
  }

  function removeAlloc(tid: string){ setAllocations(prev => prev.filter(a => a.transactionId !== tid)) }

  async function submit(){
    if (!companyId){ alert('Select a company'); return }
    const amt = Number(amount||0)
    if (!(amt > 0)){ alert('Enter a positive payment amount'); return }
    try {
      const payload = { companyId, dateIso, amount: amt, refNo: refNo || undefined, notes: notes || undefined, allocations }
      await corporateApi.createPayment(payload)
      alert('Payment created')
      // reset
      setAmount(''); setRefNo(''); setNotes(''); setAllocations([])
      await loadTx()
    } catch (e: any){ alert(e?.message || 'Failed to create payment') }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Corporate Payments</h2>

      {/* Create Payment */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Company</label>
            <select value={companyId} onChange={e=>{ setCompanyId(e.target.value); setAllocations([]) }} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select Company</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
            <input type="date" value={dateIso} onChange={e=>setDateIso(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Amount</label>
            <input value={amount} onChange={e=>setAmount(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0.00" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Ref No</label>
            <input value={refNo} onChange={e=>setRefNo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
            <input value={notes} onChange={e=>setNotes(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional" />
          </div>
        </div>
        <div className="mt-3 text-sm text-slate-700">Unallocated: <span className="font-semibold">{formatPKR(unallocated)}</span></div>
        <div className="mt-3"><button onClick={submit} className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white">Create Payment</button></div>
      </section>

      {/* Outstanding Transactions for Allocation */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Outstanding Transactions</div>
          <div className="text-xs text-slate-600">Click "Allocate" to add default amount (min of due and unallocated); edit in the grid below.</div>
        </div>
        {!companyId && <div className="text-sm text-slate-500">Select a company to view outstanding transactions.</div>}
        {companyId && txLoading && <div className="text-sm text-slate-500">Loading...</div>}
        {companyId && !txLoading && txRows.length === 0 && <div className="text-sm text-slate-500">No outstanding transactions</div>}
        {companyId && !txLoading && txRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">MRN</th>
                  <th className="px-2 py-2">Patient</th>
                  <th className="px-2 py-2">Service</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2 text-right">Net</th>
                  <th className="px-2 py-2 text-right">Paid</th>
                  <th className="px-2 py-2 text-right">Due</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {txRows.map((t:any)=> (
                  <tr key={String(t._id)} className="border-top border-slate-100">
                    <td className="px-2 py-2">{t.dateIso || '-'}</td>
                    <td className="px-2 py-2">{t.patientMrn || '-'}</td>
                    <td className="px-2 py-2">{t.patientName || '-'}</td>
                    <td className="px-2 py-2">{t.serviceType}</td>
                    <td className="px-2 py-2">{t.description || '-'}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number(t.netToCorporate||0))}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number(t.paidAmount||0))}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Math.max(0, Number(t.netToCorporate||0) - Number(t.paidAmount||0)))}</td>
                    <td className="px-2 py-2"><button onClick={()=>addAllocation(t)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Allocate</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Allocations Grid */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Allocations</div>
        {allocations.length === 0 && <div className="text-sm text-slate-500">No allocations yet.</div>}
        {allocations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-2">Transaction</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                  <th className="px-2 py-2">Remove</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a)=> (
                  <tr key={a.transactionId} className="border-t border-slate-100">
                    <td className="px-2 py-2 text-xs">{a.transactionId}</td>
                    <td className="px-2 py-2 text-right"><input value={String(a.amount)} onChange={e=>setAlloc(a.transactionId, e.target.value)} className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right" /></td>
                    <td className="px-2 py-2"><button onClick={()=>removeAlloc(a.transactionId)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function formatPKR(n: number){ try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` } }
