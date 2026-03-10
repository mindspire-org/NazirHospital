import { useEffect, useMemo, useState } from 'react'
import { corporateApi } from '../../../utils/api'
import Toast, { type ToastState } from '../../../components/ui/Toast'

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
  const [txTotal, setTxTotal] = useState(0)
  const [txPage, setTxPage] = useState(1)
  const [txLimit, setTxLimit] = useState(20)
  const [payLoading, setPayLoading] = useState(false)
  const [payRows, setPayRows] = useState<any[]>([])
  const [payTotal, setPayTotal] = useState(0)
  const [payPage, setPayPage] = useState(1)
  const [payLimit, setPayLimit] = useState(20)
  const [allocations, setAllocations] = useState<Array<{ transactionId: string; amount: number }>>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [claimId, setClaimId] = useState('')
  const [claims, setClaims] = useState<any[]>([])
  const [claimPayAmount, setClaimPayAmount] = useState('')
  const [claimDiscount, setClaimDiscount] = useState('')
  const [claimRefNo, setClaimRefNo] = useState('')
  const [claimNotes, setClaimNotes] = useState('')
  const [claimsLoading, setClaimsLoading] = useState(false)

  useEffect(()=>{ (async()=>{ try{ const r = await corporateApi.listCompanies() as any; setCompanies((r?.companies||[]).map((c:any)=>({ id: String(c._id||c.id), name: c.name }))) }catch{} })() }, [])

  const companyNameMap = useMemo(()=>{
    const m: Record<string, string> = {}
    for (const c of (companies || [])) m[String(c.id)] = String(c.name || '')
    return m
  }, [companies])

  async function loadPayments(){
    setPayLoading(true)
    try {
      const res: any = await corporateApi.listPayments({ companyId: companyId || undefined, from: undefined, to: undefined, page: payPage, limit: payLimit }) as any
      const items = res?.payments || res?.items || res || []
      setPayRows(items)
      setPayTotal(Number(res?.total || items?.length || 0))
    } catch { setPayRows([]) }
    setPayLoading(false)
  }
  // Load claims for selected company (for claim payment)
  async function loadClaims(){
    if (!companyId) { setClaims([]); return }
    setClaimsLoading(true)
    try {
      const res: any = await corporateApi.listClaims({ companyId, status: undefined, page: 1, limit: 100 }) as any
      setClaims(res?.items || res?.claims || [])
    } catch { setClaims([]) }
    setClaimsLoading(false)
  }
  useEffect(()=>{ loadClaims() }, [companyId])

  async function loadTx(){
    setTxLoading(true)
    try {
      // Load accrued + claimed; compute due (netToCorporate - paidAmount)
      const half = Math.max(1, Math.ceil(txLimit / 2))
      const [acc, clm] = await Promise.all([
        corporateApi.listTransactions({ companyId: companyId || undefined, status: 'accrued', page: txPage, limit: half }) as any,
        corporateApi.listTransactions({ companyId: companyId || undefined, status: 'claimed', page: txPage, limit: txLimit - half }) as any,
      ])
      const accRows = (acc?.transactions || acc?.items || [])
      const clmRows = (clm?.transactions || clm?.items || [])
      const rows = ([...accRows, ...clmRows])
        .map((t:any)=> ({ ...t, due: Math.max(0, Number(t.netToCorporate||0) - Number(t.paidAmount||0)) }))
        .filter((t:any)=> t.due > 0)
      setTxRows(rows)
      setTxTotal(Number(acc?.total || 0) + Number(clm?.total || 0))
    } catch { setTxRows([]) }
    setTxLoading(false)
  }
  useEffect(()=>{ setTxPage(1) }, [companyId])
  useEffect(()=>{ loadTx() }, [companyId, txPage, txLimit])

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

  const [allocPage, setAllocPage] = useState(1)
  const [allocLimit, setAllocLimit] = useState(10)
  useEffect(()=>{ setAllocPage(1) }, [allocations.length, allocLimit])
  const allocTotalPages = Math.max(1, Math.ceil((allocations.length || 0) / allocLimit))
  const allocStart = (allocPage - 1) * allocLimit
  const allocPageRows = allocations.slice(allocStart, allocStart + allocLimit)

  async function submit(){
    if (!companyId){ setToast({ type: 'error', message: 'Select a company' }); return }
    const amt = Number(amount||0)
    if (!(amt > 0)){ setToast({ type: 'error', message: 'Enter a positive payment amount' }); return }
    try {
      const payload = { companyId, dateIso, amount: amt, refNo: refNo || undefined, notes: notes || undefined, allocations }
      await corporateApi.createPayment(payload)
      setToast({ type: 'success', message: 'Payment created' })
      // reset
      setAmount(''); setRefNo(''); setNotes(''); setAllocations([])
      await loadTx()
      await loadPayments()
    } catch (e: any){ setToast({ type: 'error', message: e?.message || 'Failed to create payment' }) }
  }

  async function submitClaimPayment(){
    if (!companyId){ setToast({ type: 'error', message: 'Select a company' }); return }
    if (!claimId){ setToast({ type: 'error', message: 'Select a claim' }); return }
    const amt = Number(claimPayAmount||0)
    const disc = Number(claimDiscount||0)
    if (!(amt > 0) && !(disc > 0)){ setToast({ type: 'error', message: 'Enter payment amount or discount' }); return }
    try {
      await corporateApi.createPaymentForClaim({
        companyId,
        claimId,
        dateIso,
        amount: amt,
        discount: disc,
        refNo: claimRefNo || undefined,
        notes: claimNotes || undefined
      })
      setToast({ type: 'success', message: 'Claim payment recorded' })
      // reset
      setClaimId(''); setClaimPayAmount(''); setClaimDiscount(''); setClaimRefNo(''); setClaimNotes('')
      await loadClaims()
      await loadPayments()
      await loadTx()
    } catch (e: any){ setToast({ type: 'error', message: e?.message || 'Failed to record claim payment' }) }
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
              <option value="">All Companies</option>
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

      {/* Claim Payment Section */}
      <section className="rounded-lg border border-violet-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-violet-800">Pay by Claim (with Discount)</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Select Claim</label>
            <select value={claimId} onChange={e=>setClaimId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">{claimsLoading ? 'Loading...' : 'Select a claim'}</option>
              {claims.map((c:any) => (
                <option key={String(c._id)} value={String(c._id)}>
                  {c.claimNo || String(c._id).slice(-6)} - {formatPKR(Number(c.totalAmount||0))} ({c.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Payment Amount</label>
            <input value={claimPayAmount} onChange={e=>setClaimPayAmount(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0.00" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Discount</label>
            <input value={claimDiscount} onChange={e=>setClaimDiscount(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0.00" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Ref No</label>
            <input value={claimRefNo} onChange={e=>setClaimRefNo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
            <input value={claimNotes} onChange={e=>setClaimNotes(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional" />
          </div>
        </div>
        <div className="mt-3"><button onClick={submitClaimPayment} className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white">Apply Payment to Claim</button></div>
      </section>

      {/* Payments List */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Payments</div>
          <div className="text-xs text-slate-600">{companyId ? 'Filtered by selected company' : 'All companies'}</div>
        </div>
        {payLoading && <div className="text-sm text-slate-500">Loading...</div>}
        {!payLoading && payRows.length === 0 && <div className="text-sm text-slate-500">No payments found</div>}
        {!payLoading && payRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Company</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                  <th className="px-2 py-2">Ref No</th>
                  <th className="px-2 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payRows.map((p:any)=> (
                  <tr key={String(p._id || p.id)} className="border-t border-slate-100">
                    <td className="px-2 py-2">{String(p.dateIso || p.date || p.createdAt || '').slice(0,10) || '-'}</td>
                    <td className="px-2 py-2">{p.companyName || companyNameMap[String(p.companyId)] || p.company?.name || '-'}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number(p.amount||0))}</td>
                    <td className="px-2 py-2">{p.refNo || '-'}</td>
                    <td className="px-2 py-2">{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <div>Page {payPage} of {Math.max(1, Math.ceil((payTotal || 0) / payLimit))} • Total {payTotal}</div>
          <div className="flex items-center gap-2">
            <select value={payLimit} onChange={e=>{ setPayLimit(Number(e.target.value||20)); setPayPage(1) }} className="rounded border border-slate-300 px-2 py-1">
              {[10,20,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button disabled={payPage<=1} onClick={()=>setPayPage(p=>Math.max(1,p-1))} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50">Prev</button>
            <button disabled={payPage>=Math.max(1, Math.ceil((payTotal || 0) / payLimit))} onClick={()=>setPayPage(p=>p+1)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      </section>

      {/* Outstanding Transactions for Allocation */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Outstanding Transactions</div>
          <div className="text-xs text-slate-600">Click "Allocate" to add default amount (min of due and unallocated); edit in the grid below.</div>
        </div>
        {txLoading && <div className="text-sm text-slate-500">Loading...</div>}
        {!txLoading && txRows.length === 0 && <div className="text-sm text-slate-500">No outstanding transactions</div>}
        {!txLoading && txRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Company</th>
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
                    <td className="px-2 py-2">{t.companyName || companyNameMap[String(t.companyId)] || t.companyId || '-'}</td>
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

        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <div>Page {txPage} of {Math.max(1, Math.ceil((txTotal || 0) / txLimit))} • Total {txTotal}</div>
          <div className="flex items-center gap-2">
            <select value={txLimit} onChange={e=>{ setTxLimit(Number(e.target.value||20)); setTxPage(1) }} className="rounded border border-slate-300 px-2 py-1">
              {[10,20,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button disabled={txPage<=1} onClick={()=>setTxPage(p=>Math.max(1,p-1))} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50">Prev</button>
            <button disabled={txPage>=Math.max(1, Math.ceil((txTotal || 0) / txLimit))} onClick={()=>setTxPage(p=>p+1)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
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
                {allocPageRows.map((a)=> (
                  <tr key={a.transactionId} className="border-t border-slate-100">
                    <td className="px-2 py-2 text-xs">{a.transactionId}</td>
                    <td className="px-2 py-2 text-right"><input value={String(a.amount)} onChange={e=>setAlloc(a.transactionId, e.target.value)} className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right" /></td>
                    <td className="px-2 py-2"><button onClick={()=>removeAlloc(a.transactionId)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              <div>Page {allocPage} of {allocTotalPages} • Total {allocations.length}</div>
              <div className="flex items-center gap-2">
                <select value={allocLimit} onChange={e=>{ setAllocLimit(Number(e.target.value||10)); setAllocPage(1) }} className="rounded border border-slate-300 px-2 py-1">
                  {[5,10,20,50].map(n => <option key={n} value={n}>{n}/page</option>)}
                </select>
                <button disabled={allocPage<=1} onClick={()=>setAllocPage(p=>Math.max(1,p-1))} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50">Prev</button>
                <button disabled={allocPage>=allocTotalPages} onClick={()=>setAllocPage(p=>Math.min(allocTotalPages,p+1))} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50">Next</button>
              </div>
            </div>
          </div>
        )}
      </section>
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}

function formatPKR(n: number){ try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` } }
