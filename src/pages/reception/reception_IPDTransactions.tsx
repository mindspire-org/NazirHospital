import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { Link } from 'react-router-dom'

function currency(n: number){ return `Rs ${Number(n||0).toFixed(2)}` }
function escapeHtml(x: any){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;') }

export default function Reception_IPDTransactions(){
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')

  useEffect(()=>{ loadRecent() }, [])

  async function loadRecent(){
    setLoading(true)
    try{
      const now = new Date()
      const from = new Date(now.getTime() - 14*24*60*60*1000).toISOString().slice(0,10)
      const to = now.toISOString().slice(0,10)
      const [adm, disc] = await Promise.all([
        hospitalApi.listIPDAdmissions({ status: 'admitted', limit: 40 }) as any,
        hospitalApi.listIPDAdmissions({ status: 'discharged', from, to, limit: 40 }) as any,
      ])
      const encs: any[] = [...(adm.admissions||[]), ...(disc.admissions||[])]
      const seen = new Set<string>()
      const uniq = encs.filter((e:any)=>{ const id=String(e._id); if(seen.has(id)) return false; seen.add(id); return true })
      const paymentsArrays = await Promise.all(uniq.map(e => hospitalApi.listIpdPayments(String(e._id), { limit: 200 }).catch(()=>({ payments: [] })) as any))
      const flat = [] as any[]
      for (let i=0;i<uniq.length;i++){
        const e = uniq[i]
        const pays = (paymentsArrays[i]?.payments || [])
        for (const p of pays){
          flat.push({
            id: String(p._id||Math.random()),
            encounterId: String(e._id),
            admissionNo: e.admissionNo || '-',
            patientName: e.patientId?.fullName || '-',
            mrn: e.patientId?.mrn || '-',
            amount: Number(p.amount||0),
            method: p.method || '-',
            refNo: p.refNo || '',
            receivedAt: p.receivedAt || p.createdAt || new Date().toISOString(),
          })
        }
      }
      flat.sort((a,b)=> new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      setRows(flat.slice(0,200))
    }catch{ setRows([]) }
    setLoading(false)
  }

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r =>
      r.patientName.toLowerCase().includes(s) ||
      String(r.mrn||'').toLowerCase().includes(s) ||
      String(r.admissionNo||'').toLowerCase().includes(s) ||
      String(r.method||'').toLowerCase().includes(s) ||
      String(r.refNo||'').toLowerCase().includes(s)
    )
  }, [q, rows])

  async function printReceipt(rec: any){
    try{
      const [encRes, chRes, payRes] = await Promise.all([
        hospitalApi.getIPDAdmissionById(rec.encounterId) as any,
        hospitalApi.listIpdBillingItems(rec.encounterId, { limit: 500 }) as any,
        hospitalApi.listIpdPayments(rec.encounterId, { limit: 500 }) as any,
      ])
      const enc = (encRes||{}).encounter
      const charges = (chRes.items||[])
      const payments = (payRes.payments||[])
      await printReceiptHtml(enc, charges, payments)
    }catch{}
  }

  async function printReceiptHtml(enc: any, charges: any[], payments: any[]){
    const s: any = await hospitalApi.getSettings().catch(()=>({}))
    const name = s?.name || 'Hospital'
    const address = s?.address || '-'
    const phone = s?.phone || ''
    const logo = s?.logoDataUrl || ''
    const patient = enc?.patientId || {}
    const dt = new Date()
    const total = charges.reduce((sum:number,c:any)=> sum + Number(c.amount||0), 0)
    const linesHtml = charges.map((c:any)=>`<tr><td style="padding:4px 6px;border-bottom:1px solid #e5e7eb">${escapeHtml(c.description||'')}</td><td style="padding:4px 6px;text-align:right;border-bottom:1px solid #e5e7eb">${currency(Number(c.amount||0))}</td></tr>`).join('')
    const paysHtml = payments.map((p:any)=>`<tr><td style="padding:3px 6px">${new Date(p.receivedAt||dt).toLocaleString()}</td><td style="padding:3px 6px">${escapeHtml(p.method||'-')}</td><td style="padding:3px 6px">${escapeHtml(p.refNo||'')}</td><td style="padding:3px 6px;text-align:right">${currency(Number(p.amount||0))}</td></tr>`).join('')
    const paid = payments.reduce((s:number,p:any)=> s + Number(p.amount||0), 0)
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
          <div><div>Paid</div><div class="right">${currency(paid)}</div></div>
          <div><div><strong>Outstanding</strong></div><div class="right"><strong>${currency(Math.max(0, total - paid))}</strong></div></div>
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

  const total = useMemo(()=> rows.reduce((s,r)=> s + Number(r.amount||0), 0), [rows])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-semibold">Recent IPD Payments</div>
          <div className="text-sm text-slate-600">{loading? 'Loading...' : `${filtered.length} payments`} · Total {currency(total)}</div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name / MRN / Admission / Method / Ref" className="min-w-[280px] flex-1 rounded-md border border-slate-300 px-3 py-2" />
          <button onClick={loadRecent} className="btn" disabled={loading}>{loading? 'Refreshing...' : 'Refresh'}</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {filtered.length===0 ? (
          <div className="text-sm text-slate-500">No recent payments</div>
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-slate-700"><tr><th className="px-2 py-1 text-left">Date/Time</th><th className="px-2 py-1 text-left">Patient</th><th className="px-2 py-1 text-left">MRN</th><th className="px-2 py-1 text-left">Admission</th><th className="px-2 py-1 text-left">Method</th><th className="px-2 py-1 text-left">Ref</th><th className="px-2 py-1 text-right">Amount</th><th className="px-2 py-1 text-left">Actions</th></tr></thead>
              <tbody className="divide-y">
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td className="px-2 py-1">{new Date(r.receivedAt).toLocaleString()}</td>
                    <td className="px-2 py-1">{r.patientName}</td>
                    <td className="px-2 py-1">{r.mrn}</td>
                    <td className="px-2 py-1">{r.admissionNo}</td>
                    <td className="px-2 py-1">{r.method}</td>
                    <td className="px-2 py-1">{r.refNo}</td>
                    <td className="px-2 py-1 text-right">{currency(r.amount)}</td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-2">
                        <button className="btn-outline-navy" onClick={()=>printReceipt(r)}>Print Receipt</button>
                        <Link className="btn" to={`/reception/ipd-billing?encounterId=${encodeURIComponent(r.encounterId)}`}>Open Billing</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
