import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { hospitalApi } from '../../utils/api'
import { fmtDateTime12 } from '../../utils/timeFormat'
import Hospital_ErPaymentSlip from '../../components/hospital/Hospital_ErPaymentSlip'
import Toast, { type ToastState } from '../../components/ui/Toast'

function getReceptionUser(){
  try{
    const s = localStorage.getItem('reception.session')
    if (!s) return 'reception'
    const obj = JSON.parse(s)
    return obj?.username || obj?.name || 'reception'
  }catch{ return 'reception' }
}

function currency(n: number){ return `Rs ${Number(n||0).toFixed(2)}` }

export default function Reception_ERBilling(){
  const [params] = useSearchParams()
  const preTokenId = String(params.get('tokenId') || '')

  const [q, setQ] = useState('')
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [tokenId, setTokenId] = useState<string>(preTokenId)
  const [token, setToken] = useState<any|null>(null)
  const [encounterId, setEncounterId] = useState<string>('')

  const [charges, setCharges] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [totals, setTotals] = useState<{ total: number; paid: number; pending: number }>({ total: 0, paid: 0, pending: 0 })

  const [method, setMethod] = useState('Cash')
  const [refNo, setRefNo] = useState('')
  const [collecting, setCollecting] = useState(false)
  const [collectAmount, setCollectAmount] = useState<string>('')
  const [toast, setToast] = useState<ToastState>(null)

  const panelRef = useRef<HTMLDivElement|null>(null)
  const [flash, setFlash] = useState(false)
  const [showPanel, setShowPanel] = useState<boolean>(!!preTokenId)

  const [slipOpen, setSlipOpen] = useState(false)
  const [slipData, setSlipData] = useState<any|null>(null)

  useEffect(()=>{ if(preTokenId){ setTokenId(preTokenId); setShowPanel(true) } }, [preTokenId])

  useEffect(()=>{ if (tokenId) loadToken(tokenId) }, [tokenId])

  useEffect(()=>{
    if (!token) return
    try { panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
    setFlash(true)
    const t = setTimeout(()=> setFlash(false), 1600)
    return ()=> clearTimeout(t)
  }, [token])

  useEffect(()=>{
    let timer: any
    const run = () => { search().catch(()=>{}) }
    run()
    timer = setInterval(run, 15000)
    return ()=> { if (timer) clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function search(){
    setLoading(true)
    try{
      const depRes: any = await hospitalApi.listDepartments().catch(()=>({ departments: [] }))
      const deps: any[] = depRes?.departments || []
      const erDep = deps.find(d => String(d?.name||'').trim().toLowerCase() === 'emergency')
      const departmentId = erDep ? String(erDep._id) : ''

      const res: any = await hospitalApi.listTokens({ status: 'queued', departmentId })
      const rows: any[] = res?.tokens || []
      const filtered = q.trim()
        ? rows.filter(t => {
          const s = q.trim().toLowerCase()
          const pat = t.patientId || {}
          return String(t.tokenNo||'').toLowerCase().includes(s) ||
            String(pat.fullName||'').toLowerCase().includes(s) ||
            String(pat.mrn||'').toLowerCase().includes(s)
        })
        : rows

      setList(filtered.map(t => ({
        id: String(t._id),
        tokenNo: t.tokenNo || '-',
        patientName: t.patientId?.fullName || t.patientName || '-',
        mrn: t.patientId?.mrn || t.mrn || '-',
        doctor: t.doctorId?.name || '-',
        createdAt: t.createdAt || t.dateIso,
      })))

      if (!tokenId && filtered.length){
        setTokenId(String(filtered[0]._id))
      }
    }catch{ setList([]) }
    setLoading(false)
  }

  function openCart(id: string){
    setTokenId(id)
    setShowPanel(true)
  }

  async function loadToken(id: string){
    try{
      const tRes: any = await hospitalApi.getToken(id)
      const t = tRes?.token
      setToken(t || null)
      const encId = String(t?.encounterId || '')
      setEncounterId(encId)
      if (encId){
        const [ch, pay] = await Promise.all([
          hospitalApi.listErCharges(encId, { limit: 500 }) as any,
          hospitalApi.erListPayments(encId, { limit: 500 }) as any,
        ])
        setCharges(ch?.charges || [])
        setPayments(pay?.payments || [])
        setTotals(pay?.totals || { total: 0, paid: 0, pending: 0 })
      } else {
        setCharges([]); setPayments([]); setTotals({ total: 0, paid: 0, pending: 0 })
      }
    }catch{
      setToken(null)
      setEncounterId('')
      setCharges([])
      setPayments([])
      setTotals({ total: 0, paid: 0, pending: 0 })
    }
  }

  const total = useMemo(()=> Number(totals.total || charges.reduce((s,c)=> s + Number(c.amount||0), 0) || 0), [totals.total, charges])
  const paid = useMemo(()=> Number(totals.paid || payments.reduce((s,p)=> s + Number(p.amount||0), 0) || 0), [totals.paid, payments])
  const pending = Math.max(0, total - paid)

  useEffect(()=>{ setCollectAmount(pending.toFixed(2)) }, [tokenId, total, paid])

  async function collect(){
    if (!tokenId || !encounterId) return
    const amt = Math.max(0, parseFloat(String(collectAmount||'0')) || 0)
    if (amt <= 0) return
    if (amt > pending){ setToast({ type: 'error', message: 'Collect exceeds pending' }); return }
    setCollecting(true)
    try{
      const res: any = await hospitalApi.erCreatePayment(encounterId, { amount: amt, method, refNo, receivedBy: getReceptionUser() })
      const pay = res?.payment
      const newTotals = res?.totals || { total, paid: paid + amt, pending: Math.max(0, pending - amt) }

      const [ch2, pay2] = await Promise.all([
        hospitalApi.listErCharges(encounterId, { limit: 500 }) as any,
        hospitalApi.erListPayments(encounterId, { limit: 500 }) as any,
      ])
      setCharges(ch2?.charges || [])
      setPayments(pay2?.payments || [])
      setTotals(pay2?.totals || newTotals)

      setSlipData({
        encounterId,
        patientName: token?.patientId?.fullName || token?.patientName || '-',
        mrn: token?.patientId?.mrn || token?.mrn || '',
        phone: token?.patientId?.phoneNormalized || token?.phone || '',
        payment: { amount: Number(pay?.amount || amt), method: pay?.method || method, refNo: pay?.refNo || refNo, receivedAt: pay?.receivedAt || pay?.createdAt || new Date().toISOString() },
        totals: newTotals,
      })
      setSlipOpen(true)

      setRefNo('')
      setCollectAmount('')
    }catch(e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to record payment' })
    }
    setCollecting(false)
  }

  const patientName = token?.patientId?.fullName || token?.patientName || '-'
  const mrn = token?.patientId?.mrn || token?.mrn || ''
  const pendingLabel = pending <= 0 ? 'Rs 0.00' : currency(pending)

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-lg font-semibold">ER Billing</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by Token, MRN or Patient Name" className="min-w-[320px] flex-1 rounded-md border border-slate-300 px-3 py-2" />
          <button onClick={search} className="btn" disabled={loading}>{loading? 'Searching...' : 'Search'}</button>
        </div>

        <div className="mt-3 overflow-x-auto text-sm">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-2 py-2 text-left">Patient</th>
                <th className="px-2 py-2 text-left">MRN</th>
                <th className="px-2 py-2 text-left">Token</th>
                <th className="px-2 py-2 text-left">Doctor</th>
                <th className="px-2 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.length===0 ? (
                <tr><td colSpan={5} className="px-2 py-6 text-center text-slate-500">{loading ? 'Loading...' : 'No ER tokens found'}</td></tr>
              ) : list.map(r => (
                <tr key={r.id}>
                  <td className="px-2 py-2">{r.patientName}</td>
                  <td className="px-2 py-2">{r.mrn}</td>
                  <td className="px-2 py-2 font-medium">{r.tokenNo}</td>
                  <td className="px-2 py-2">{r.doctor}</td>
                  <td className="px-2 py-2"><button className="btn-outline-navy" onClick={()=>openCart(r.id)}>Collect</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div ref={panelRef} className={`rounded-xl border border-slate-200 bg-white p-4 ${flash ? 'ring-2 ring-emerald-300' : ''}`}>
        {!showPanel || !tokenId ? (
          <div className="text-sm text-slate-500">Select a patient/token above to open billing.</div>
        ) : !token ? (
          <div className="text-sm text-slate-500">Loading token...</div>
        ) : !encounterId ? (
          <div className="text-sm text-rose-600">No encounter found for this token.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-lg font-semibold">{patientName}</div>
                <div className="text-xs text-slate-500">{mrn ? `MRN: ${mrn} · ` : ''}Token: {token?.tokenNo || '-'} · Encounter: {encounterId}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Pending</div>
                <div className="text-xl font-bold text-rose-700">{pendingLabel}</div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-semibold">Charges</div>
                <div className="mt-2 overflow-x-auto text-sm">
                  <table className="min-w-full">
                    <thead className="bg-slate-50 text-slate-700"><tr><th className="px-2 py-1 text-left">Description</th><th className="px-2 py-1 text-right">Amount</th></tr></thead>
                    <tbody className="divide-y">
                      {charges.length===0 ? <tr><td colSpan={2} className="px-2 py-4 text-center text-slate-500">No charges</td></tr> : charges.map((c:any)=>(
                        <tr key={String(c._id||c.id)}>
                          <td className="px-2 py-1">{c.description || '-'}</td>
                          <td className="px-2 py-1 text-right">{currency(Number(c.amount||0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-semibold">Collect Payment</div>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-600">Pending</div>
                    <div className="font-semibold">{pendingLabel}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-600">Method</div>
                    <select value={method} onChange={e=>setMethod(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                      <option>Cash</option>
                      <option>Card</option>
                      <option>Online</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">Reference / Notes</div>
                    <input value={refNo} onChange={e=>setRefNo(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Txn # / Notes" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">Collect Amount</div>
                    <input type="number" value={collectAmount} onChange={e=>setCollectAmount(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                  </div>

                  <button onClick={collect} disabled={collecting || pending<=0} className="btn w-full disabled:opacity-50">{collecting? 'Saving...' : `Collect ${currency(Number(collectAmount||0))}`}</button>

                  <div className="pt-2">
                    <div className="text-sm font-semibold">Previous Payments</div>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700"><tr><th className="px-2 py-1 text-left">Date</th><th className="px-2 py-1 text-left">Method</th><th className="px-2 py-1 text-left">Performed By</th><th className="px-2 py-1 text-right">Amount</th></tr></thead>
                        <tbody className="divide-y">
                          {payments.length===0 ? <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-500">None</td></tr> : payments.map((p:any)=>(
                            <tr key={String(p._id||p.id)}>
                              <td className="px-2 py-1">{fmtDateTime12(p.receivedAt||p.createdAt||new Date().toISOString())}</td>
                              <td className="px-2 py-1">{p.method || '-'}</td>
                              <td className="px-2 py-1">{p.createdByUsername || p.createdBy || '-'}</td>
                              <td className="px-2 py-1 text-right">{currency(Number(p.amount||0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Hospital_ErPaymentSlip
        open={slipOpen}
        onClose={()=>setSlipOpen(false)}
        data={slipData || { encounterId: '', patientName: '', payment: { amount: 0 }, totals: { total: 0, paid: 0, pending: 0 } }}
        autoPrint
      />

      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
