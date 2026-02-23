import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

function getReceptionUser(){
  try{
    const s = localStorage.getItem('reception.session')
    if (!s) return 'reception'
    const obj = JSON.parse(s)
    return obj?.username || obj?.name || 'reception'
  }catch{ return 'reception' }
}

function currency(n: number){ return `Rs ${Number(n||0).toFixed(2)}` }

export default function Reception_IPDBilling(){
  const [params] = useSearchParams()
  const preEncounterId = String(params.get('encounterId') || '')
  const [q, setQ] = useState('')
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [encId, setEncId] = useState<string>(preEncounterId)
  const [enc, setEnc] = useState<any|null>(null)
  const [charges, setCharges] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [method, setMethod] = useState('Cash')
  const [refNo, setRefNo] = useState('')
  const [collecting, setCollecting] = useState(false)
  const [discount, setDiscount] = useState<string>('0')
  const [collectAmount, setCollectAmount] = useState<string>('')
  const panelRef = useRef<HTMLDivElement|null>(null)
  const [flash, setFlash] = useState(false)
  const [showPanel, setShowPanel] = useState<boolean>(!!preEncounterId)

  useEffect(()=>{ if(preEncounterId){ setEncId(preEncounterId); setShowPanel(true) } }, [preEncounterId])

  useEffect(()=>{ if (encId) loadEncounter(encId) }, [encId])

  // When encounter loads, scroll into view and flash highlight
  useEffect(()=>{
    if (!enc) return
    try { panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
    setFlash(true)
    const t = setTimeout(()=> setFlash(false), 1600)
    return ()=> clearTimeout(t)
  }, [enc])

  // Auto-load admitted queue on mount and refresh periodically
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
      const res = await hospitalApi.listIPDAdmissions({ q, status: 'admitted', limit: 40 }) as any
      const rows = (res.admissions||[]).map((a:any)=>({
        id: String(a._id),
        info: `${a.patientId?.fullName||'-'} • ${a.patientId?.mrn||''}`,
        admissionNo: a.admissionNo,
        bed: a.bedLabel || a.bedId || '-',
        doctor: a.doctorId?.name || '-',
        startAt: a.startAt
      }))
      rows.sort((a:any,b:any)=> new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
      setList(rows)
      if (!encId && rows.length){
        setEncId(rows[0].id)
      }
    }catch{ setList([]) }
    setLoading(false)
  }

  function openCart(id: string){
    setEncId(id)
    setShowPanel(true)
  }

  async function loadEncounter(id: string){
    try{
      const [e, bi, pay] = await Promise.all([
        hospitalApi.getIPDAdmissionById(id) as any,
        hospitalApi.listIpdBillingItems(id, { limit: 500 }) as any,
        hospitalApi.listIpdPayments(id, { limit: 500 }) as any,
      ])
      setEnc((e||{}).encounter || null)
      setCharges((bi.items||[]))
      setPayments((pay.payments||[]))
    }catch{
      setEnc(null); setCharges([]); setPayments([])
    }
  }

  const total = useMemo(()=> charges.reduce((s,c)=> s + Number(c.amount||0), 0), [charges])
  const paid = useMemo(()=> payments.reduce((s,p)=> s + Number(p.amount||0), 0), [payments])
  const pending = Math.max(0, total - paid)
  const discountNum = Math.max(0, parseFloat(String(discount||'0')) || 0)
  const pendingAfterDiscount = Math.max(0, pending - discountNum)

  // Reset discount and default collect amount when encounter/figures change
  useEffect(()=>{
    setDiscount('0')
    setCollectAmount(pending.toFixed(2))
  }, [encId, total, paid])

  async function collect(){
    if (!enc || !encId) return
    const disc = Math.max(0, parseFloat(String(discount||'0')) || 0)
    const amt = Math.max(0, parseFloat(String(collectAmount||'0')) || 0)
    if ((disc + amt) <= 0) return
    if ((disc + amt) > pending){ alert('Discount + Collect exceeds pending'); return }
    setCollecting(true)
    try{
      // Post discount first (as a payment with method 'Discount')
      if (disc > 0){
        await hospitalApi.createIpdPayment(encId, { amount: disc, method: 'Discount', refNo: 'discount', receivedBy: getReceptionUser() })
      }
      // Post cash/card/online collected amount
      if (amt > 0){
        await hospitalApi.createIpdPayment(encId, { amount: amt, method, refNo, receivedBy: getReceptionUser() })
      }
      // Reload fresh data and print
      const [e, bi, pay] = await Promise.all([
        hospitalApi.getIPDAdmissionById(encId) as any,
        hospitalApi.listIpdBillingItems(encId, { limit: 500 }) as any,
        hospitalApi.listIpdPayments(encId, { limit: 500 }) as any,
      ])
      setEnc((e||{}).encounter || null)
      setCharges((bi.items||[]))
      setPayments((pay.payments||[]))
      try{ await printReceipt((e||{}).encounter, (bi.items||[]), (pay.payments||[])) }catch{}
      setRefNo('')
      setDiscount('0')
      setCollectAmount('')
    }catch(e: any){ alert(e?.message || 'Failed to record payment') }
    setCollecting(false)
  }

  async function printReceipt(enc: any, charges: any[], payments: any[], newPay?: { amount: number; method?: string; refNo?: string }){
    const s: any = await hospitalApi.getSettings().catch(()=>({}))
    const name = s?.name || 'Hospital'
    const address = s?.address || '-'
    const phone = s?.phone || ''
    const logo = s?.logoDataUrl || ''
    const patient = enc?.patientId || {}
    const dt = new Date()
    const linesHtml = charges.map((c:any)=>`<tr><td style="padding:4px 6px;border-bottom:1px solid #e5e7eb">${escapeHtml(c.description||'')}</td><td style="padding:4px 6px;text-align:right;border-bottom:1px solid #e5e7eb">${currency(Number(c.amount||0))}</td></tr>`).join('')
    const paysHtml = payments.concat(newPay? [{ amount: newPay.amount, method: newPay.method, refNo: newPay.refNo, receivedAt: dt.toISOString() }]: [])
      .map((p:any)=>`<tr><td style="padding:3px 6px">${new Date(p.receivedAt||dt).toLocaleString()}</td><td style="padding:3px 6px">${escapeHtml(p.method||'-')}</td><td style="padding:3px 6px">${escapeHtml(p.refNo||'')}</td><td style="padding:3px 6px;text-align:right">${currency(Number(p.amount||0))}</td></tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>IPD Bill Receipt</title>
      <style>
        @page { size: A5 portrait; margin: 10mm }
        body{ font-family: ui-sans-serif, system-ui, Segoe UI, Roboto, Arial; color:#0f172a }
        .wrap{ max-width: 680px; margin: 0 auto }
        .hdr{ display:grid; grid-template-columns:72px 1fr 72px; align-items:center }
        .title{ font-size:20px; font-weight:800; text-align:center }
        .muted{ color:#64748b; font-size:12px; text-align:center }
        .hr{ border-bottom:1px solid #0f172a; margin:6px 0 }
        .kv{ display:grid; grid-template-columns: 120px 1fr 120px 1fr; gap:4px 10px; font-size:12px }
        .box{ border:1px solid #e5e7eb; border-radius:8px; padding:6px; margin:8px 0 }
        table{ width:100%; border-collapse:collapse; font-size:12px }
        th{ background:#f8fafc; text-align:left; padding:6px; border-bottom:1px solid #e5e7eb }
        td{ vertical-align:top }
        .right{ text-align:right }
      </style></head><body>
      <div class="wrap">
        <div class="hdr">
          <div>${logo? `<img src="${escapeHtml(logo)}" alt="logo" style="height:60px;width:auto;object-fit:contain"/>` : ''}</div>
          <div>
            <div class="title">${escapeHtml(name)}</div>
            <div class="muted">${escapeHtml(address)}</div>
            <div class="muted">Ph: ${escapeHtml(phone)}</div>
          </div>
          <div></div>
        </div>
        <div class="hr"></div>
        <div class="box">
          <div class="kv">
            <div>Patient</div><div>${escapeHtml(patient?.fullName||'-')}</div>
            <div>MRN</div><div>${escapeHtml(patient?.mrn||'-')}</div>
            <div>Admission No</div><div>${escapeHtml(enc?.admissionNo||'-')}</div>
            <div>Date/Time</div><div>${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}</div>
          </div>
        </div>
        <div class="box">
          <div style="font-weight:600;margin-bottom:4px">Charges</div>
          <table>
            <thead><tr><th>Description</th><th class="right">Amount</th></tr></thead>
            <tbody>${linesHtml}</tbody>
            <tfoot><tr><th style="padding:6px;text-align:right">Total</th><th class="right" style="padding:6px">${currency(total)}</th></tr></tfoot>
          </table>
        </div>
        <div class="box">
          <div style="font-weight:600;margin-bottom:4px">Payments</div>
          <table>
            <thead><tr><th>Date/Time</th><th>Method</th><th>Ref</th><th class="right">Amount</th></tr></thead>
            <tbody>${paysHtml || `<tr><td colspan="4" style="padding:6px">No payments yet</td></tr>`}</tbody>
          </table>
        </div>
        <div class="box" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><div>SubTotal</div><div class="right">${currency(total)}</div></div>
          <div><div>Paid</div><div class="right">${currency(payments.reduce((s,p)=>s+Number(p.amount||0),0) + (newPay?.amount||0))}</div></div>
          <div><div><strong>Outstanding</strong></div><div class="right"><strong>${currency(Math.max(0, total - (payments.reduce((s,p)=>s+Number(p.amount||0),0) + (newPay?.amount||0))) )}</strong></div></div>
        </div>
        <div style="text-align:center;color:#475569;margin-top:10px">System Generated Receipt</div>
      </div>
    </body></html>`
    try{
      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewHtml === 'function'){ await api.printPreviewHtml(html, {}); return }
    }catch{}
    try{
      const w = window.open('', '_blank'); if (!w) return
      w.document.write(html + '<script>window.onload=()=>{window.print();}</script>');
      w.document.close();
    }catch{}
  }

  function escapeHtml(x: any){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-lg font-semibold">IPD Billing</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by MRN, Name or Admission No" className="min-w-[280px] flex-1 rounded-md border border-slate-300 px-3 py-2" />
          <button onClick={search} className="btn" disabled={loading}>{loading? 'Searching...' : 'Search'}</button>
        </div>
        {list.length>0 && (
          <div className="mt-3 overflow-x-auto text-sm">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-slate-700"><tr><th className="px-3 py-2 text-left">Patient</th><th className="px-3 py-2 text-left">Admission No</th><th className="px-3 py-2 text-left">Bed</th><th className="px-3 py-2 text-left">Actions</th></tr></thead>
              <tbody>
                {list.map(r=> (
                  <tr key={r.id} className="border-b">
                    <td className="px-3 py-2">{r.info}</td>
                    <td className="px-3 py-2">{r.admissionNo}</td>
                    <td className="px-3 py-2">{r.bed}</td>
                    <td className="px-3 py-2"><button className="btn-outline-navy" onClick={()=> openCart(r.id)}>Collect</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {enc && showPanel && (
        <div ref={panelRef} className={`rounded-xl border border-slate-200 bg-white p-4 ${flash? 'ring-2 ring-violet-400':''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{enc?.patientId?.fullName || '-'}</div>
              <div className="text-xs text-slate-600">MRN: {enc?.patientId?.mrn || '-'} · Admission: {enc?.admissionNo || '-'}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-rose-700">Pending</div>
              <div className="text-2xl font-semibold text-rose-700">{currency(pending)}</div>
              {discountNum>0 && <div className="text-xs text-slate-600">After discount: <span className="font-semibold">{currency(pendingAfterDiscount)}</span></div>}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="font-medium mb-2">Charges</div>
              {charges.length===0 ? (<div className="text-sm text-slate-500">No charges</div>) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700"><tr><th className="px-2 py-1 text-left">Description</th><th className="px-2 py-1 text-right">Amount</th></tr></thead>
                    <tbody className="divide-y">
                      {charges.map((c:any)=> (
                        <tr key={String(c._id)}><td className="px-2 py-1">{c.description}</td><td className="px-2 py-1 text-right">{currency(Number(c.amount||0))}</td></tr>
                      ))}
                    </tbody>
                    <tfoot><tr><th className="px-2 py-1 text-right">Total</th><th className="px-2 py-1 text-right">{currency(total)}</th></tr></tfoot>
                  </table>
                </div>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-medium mb-2">Collect Payment</div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between"><div>Pending</div><div className="font-semibold">{currency(pending)}</div></div>
                <label className="text-xs text-slate-600">Discount</label>
                <input value={discount} onChange={(e)=>{ const v = e.target.value; setDiscount(v); const n = Math.max(0, parseFloat(v||'0')||0); const after = Math.max(0, pending - n); setCollectAmount(after.toFixed(2)) }} placeholder="0" className="rounded-md border border-slate-300 px-2 py-1 w-40" />
                <label className="text-xs text-slate-600">Method</label>
                <select value={method} onChange={e=>setMethod(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 w-40">
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Online</option>
                  </select>
                <label className="text-xs text-slate-600">Reference / Notes</label>
                <input value={refNo} onChange={e=>setRefNo(e.target.value)} placeholder="Txn # / Notes" className="rounded-md border border-slate-300 px-2 py-1" />
                <label className="text-xs text-slate-600">Collect Amount</label>
                <input value={collectAmount} onChange={e=>setCollectAmount(e.target.value)} placeholder={pendingAfterDiscount.toFixed(2)} className="rounded-md border border-slate-300 px-2 py-1 w-40" />
                <button className="btn mt-2" disabled={(pending<=0) || collecting || ((parseFloat(collectAmount||'0')||0) <= 0 && (parseFloat(discount||'0')||0) <= 0)} onClick={collect}>{collecting? 'Saving...' : `Collect ${currency(Math.max(0, parseFloat(String(collectAmount||'0'))||0))}`}</button>
              </div>
              <div className="mt-4">
                <div className="font-medium mb-1">Previous Payments</div>
                {payments.length===0 ? (<div className="text-sm text-slate-500">None</div>) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-700"><tr><th className="px-2 py-1 text-left">Date/Time</th><th className="px-2 py-1 text-left">Method</th><th className="px-2 py-1 text-left">Ref</th><th className="px-2 py-1 text-right">Amount</th></tr></thead>
                      <tbody className="divide-y">
                        {payments.map((p:any)=> (
                          <tr key={String(p._id)}><td className="px-2 py-1">{new Date(p.receivedAt||p.createdAt||'').toLocaleString()}</td><td className="px-2 py-1">{p.method||'-'}</td><td className="px-2 py-1">{p.refNo||''}</td><td className="px-2 py-1 text-right">{currency(Number(p.amount||0))}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
