import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

export default function Hospital_IpdBilling(){
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [enc, setEnc] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'items'|'payments'>('items')

  const totals = useMemo(()=>{
    const subtotal = (items||[]).reduce((s,r)=> s + Number(r.amount||0), 0)
    const paid = (payments||[]).reduce((s,p)=> s + Number(p.amount||0), 0)
    const deposit = Number(enc?.deposit||0)
    const totalPaid = deposit + paid
    const balance = Math.max(0, subtotal - totalPaid)
    return { subtotal, deposit, paid, totalPaid, balance }
  }, [items, payments, enc?.deposit])

  useEffect(()=>{ if (id) loadAll() }, [id])

  async function loadAll(){
    setLoading(true)
    try {
      const e: any = await hospitalApi.getIPDAdmissionById(String(id)).catch(()=>null)
      setEnc(e?.encounter||null)
      const r1: any = await hospitalApi.listIpdBillingItems(String(id)).catch(()=>({ items: [] }))
      const r2: any = await hospitalApi.listIpdPayments(String(id)).catch(()=>({ payments: [] }))
      const its = (r1.items||[]).map((r:any, i:number)=> ({ sr: i+1, ...r }))
      const pays = (r2.payments||[]).map((p:any, i:number)=> ({ sr: i+1, ...p }))
      setItems(its)
      setPayments(pays)
    } finally { setLoading(false) }
  }

  function setItem(i: number, patch: any){ setItems(v=> v.map((r,idx)=> idx===i? { ...r, ...patch }: r)) }
  function setPayment(i: number, patch: any){ setPayments(v=> v.map((r,idx)=> idx===i? { ...r, ...patch }: r)) }

  async function saveItem(i: number){
    const r = items[i]
    if (!id) return
    const body: any = {
      type: r.type||'service', description: r.description||'',
      qty: Number(r.qty||1)||1,
      unitPrice: Number(r.unitPrice||0)||0,
      amount: Number(r.amount!=null? r.amount : Number(r.unitPrice||0)||0)
    }
    if (r._id) await hospitalApi.updateIpdBillingItem(String(r._id), body)
    else {
      const created: any = await hospitalApi.createIpdBillingItem(String(id), body)
      const newId = created?.item?._id || created?._id
      if (newId) setItem(i, { _id: newId })
    }
    await loadAll()
  }
  async function deleteItem(i: number){ const r = items[i]; if (!r?._id) { setItems(v=> v.filter((_,x)=>x!==i)); return } await hospitalApi.deleteIpdBillingItem(String(r._id)); await loadAll() }
  function addItem(){ setItems(v=> [...v, { sr: v.length+1, type: 'service', description: '', qty: 1, unitPrice: 0, amount: 0 }]) }

  async function savePayment(i: number){
    const r = payments[i]
    if (!id) return
    const body: any = {
      amount: Number(r.amount||0)||0,
      method: r.method||'Cash',
      refNo: r.refNo||'',
      receivedBy: r.receivedBy||'',
      receivedAt: r.receivedAt || new Date().toISOString(),
      notes: r.notes||'',
    }
    if (r._id) await hospitalApi.updateIpdPayment(String(r._id), body)
    else {
      const created: any = await hospitalApi.createIpdPayment(String(id), body)
      const newId = created?.payment?._id || created?._id
      if (newId) setPayment(i, { _id: newId })
    }
    await loadAll()
  }
  async function deletePayment(i: number){ const r = payments[i]; if (!r?._id) { setPayments(v=> v.filter((_,x)=>x!==i)); return } await hospitalApi.deleteIpdPayment(String(r._id)); await loadAll() }
  function addPayment(){ setPayments(v=> [...v, { sr: v.length+1, amount: 0, method: 'Cash', refNo: '', receivedAt: new Date().toISOString().slice(0,10) }]) }

  async function previewUrl(fullUrl: string){
    const api: any = (window as any).electronAPI
    try {
      if (api && typeof api.printPreviewHtml === 'function'){
        const token = ((): string => { try { return localStorage.getItem('hospital.token') || localStorage.getItem('token') || '' } catch { return '' } })()
        const res = await fetch(fullUrl, { headers: token ? { Authorization: `Bearer ${token}` } as any : undefined })
        if (!res.ok) throw new Error('failed')
        const html = await res.text()
        await api.printPreviewHtml(html, {})
        return
      }
    } catch {}
    try { window.open(fullUrl, '_blank') } catch {}
  }

  function printInvoice(){
    const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'
    previewUrl(`${base}/hospital/ipd/admissions/${encodeURIComponent(String(id))}/final-invoice/print`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-800">IPD Billing</div>
        <div className="text-sm text-slate-600">{enc? `${enc?.patientId?.fullName||''} · MRN ${enc?.patientId?.mrn||''}`:''}</div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="Subtotal" value={totals.subtotal} />
        <Stat label="Deposit" value={totals.deposit} />
        <Stat label="Paid" value={totals.totalPaid} />
        <Stat label="Balance" value={totals.balance} highlight />
      </div>

      <div className="flex items-center gap-2">
        <button className={`${tab==='items'?'btn':'btn-outline-navy'}`} onClick={()=> setTab('items')}>Items</button>
        <button className={`${tab==='payments'?'btn':'btn-outline-navy'}`} onClick={()=> setTab('payments')}>Payments</button>
        <div className="ml-auto flex gap-2">
          <button className="btn-outline-navy" onClick={printInvoice}>Print Final Invoice</button>
          <button className="btn-outline-navy" onClick={()=> navigate(`/hospital/ipd/admissions/${encodeURIComponent(String(id))}/invoice`)}>Invoice Slip</button>
        </div>
      </div>

      {tab==='items' ? (
        <div className="border rounded-md overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Sr</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit Price</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(items||[]).map((r,i)=> (
                <tr key={r._id||i} className="border-t">
                  <td className="px-3 py-2">{i+1}</td>
                  <td className="px-3 py-2">
                    <select className="border rounded px-2 py-1" value={r.type||'service'} onChange={e=> setItem(i,{ type: e.target.value })}>
                      {['bed','procedure','medication','service'].map(t=> <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input className="w-full border rounded px-2 py-1" value={r.description||''} onChange={e=> setItem(i,{ description: e.target.value })} /></td>
                  <td className="px-3 py-2 text-right"><input type="number" className="w-24 border rounded px-2 py-1 text-right" value={r.qty||1} onChange={e=> setItem(i,{ qty: Number(e.target.value||0) })} /></td>
                  <td className="px-3 py-2 text-right"><input type="number" className="w-28 border rounded px-2 py-1 text-right" value={r.unitPrice||0} onChange={e=> setItem(i,{ unitPrice: Number(e.target.value||0) })} /></td>
                  <td className="px-3 py-2 text-right"><input type="number" className="w-28 border rounded px-2 py-1 text-right" value={r.amount!=null? r.amount : (Number(r.unitPrice||0) * Number(r.qty||1))} onChange={e=> setItem(i,{ amount: Number(e.target.value||0) })} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="btn-outline-navy text-xs" onClick={()=> saveItem(i)} disabled={loading}>Save</button>
                      <button className="btn-outline-navy text-xs" onClick={()=> deleteItem(i)} disabled={loading}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!items || items.length===0) && (
                <tr><td className="px-3 py-6 text-slate-500" colSpan={7}>{loading? 'Loading...' : 'No items'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border rounded-md overflow-auto">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Sr</th>
                <th className="px-3 py-2 text-left">Method</th>
                <th className="px-3 py-2 text-left">Ref No</th>
                <th className="px-3 py-2 text-left">Received At</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(payments||[]).map((p,i)=> (
                <tr key={p._id||i} className="border-t">
                  <td className="px-3 py-2">{i+1}</td>
                  <td className="px-3 py-2">
                    <select className="border rounded px-2 py-1" value={p.method||'Cash'} onChange={e=> setPayment(i,{ method: e.target.value })}>
                      {['Cash','Bank','AR'].map(t=> <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input className="w-full border rounded px-2 py-1" value={p.refNo||''} onChange={e=> setPayment(i,{ refNo: e.target.value })} /></td>
                  <td className="px-3 py-2"><input type="datetime-local" className="border rounded px-2 py-1" value={fmtLocal(p.receivedAt)} onChange={e=> setPayment(i,{ receivedAt: toIso(e.target.value) })} /></td>
                  <td className="px-3 py-2 text-right"><input type="number" className="w-28 border rounded px-2 py-1 text-right" value={p.amount||0} onChange={e=> setPayment(i,{ amount: Number(e.target.value||0) })} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="btn-outline-navy text-xs" onClick={()=> savePayment(i)} disabled={loading}>Save</button>
                      <button className="btn-outline-navy text-xs" onClick={()=> deletePayment(i)} disabled={loading}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!payments || payments.length===0) && (
                <tr><td className="px-3 py-6 text-slate-500" colSpan={6}>{loading? 'Loading...' : 'No payments'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2 justify-end">
        {tab==='items' ? (
          <button onClick={addItem} className="btn-outline-navy">Add Item</button>
        ) : (
          <button onClick={addPayment} className="btn-outline-navy">Add Payment</button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }){
  return (
    <div className={`rounded-md border p-3 ${highlight? 'bg-amber-50 border-amber-200 text-amber-800':'bg-white border-slate-200 text-slate-800'}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-lg font-semibold">{Number(value||0).toLocaleString()}</div>
    </div>
  )
}

function fmtLocal(s?: string){ try { if (!s) return ''; const d = new Date(s); if (isNaN(d as any)) return ''; const tz = new Date(d.getTime() - d.getTimezoneOffset()*60000); return tz.toISOString().slice(0,16) } catch { return '' } }
function toIso(local: string){ try { if (!local) return undefined as any; const d = new Date(local); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString() } catch { return undefined as any } }
