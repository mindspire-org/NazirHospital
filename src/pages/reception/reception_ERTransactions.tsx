import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { fmtDateTime12 } from '../../utils/timeFormat'

function currency(n: number){ return `Rs ${Number(n||0).toFixed(2)}` }
function escapeHtml(x: any){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }

export default function Reception_ERTransactions(){
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)

  useEffect(()=>{ loadRecent() }, [])

  async function loadRecent(){
    setLoading(true)
    try{
      // Get all tokens from last 7 days (any status) to find ER payments
      const from = new Date(Date.now() - 7*24*60*60*1000).toISOString().slice(0,10)
      const to = new Date().toISOString().slice(0,10)
      
      // Try to get ER encounters directly first
      let encounters: any[] = []
      try {
        const erRes: any = await hospitalApi.listTokens({ from, to, status: 'completed' })
        const tokens: any[] = erRes?.tokens || []
        
        // Filter ER department tokens
        const erTokens = tokens.filter((t: any) => {
          const deptName = t.departmentId?.name?.toLowerCase() || ''
          return deptName.includes('emergency') || deptName.includes('er')
        })
        
        for (const t of erTokens){
          if (t.encounterId) {
            encounters.push({
              encounterId: t.encounterId,
              tokenNo: t.tokenNo,
              patientName: t.patientId?.fullName || t.patientName,
              mrn: t.patientId?.mrn,
            })
          }
        }
      }catch(e){ console.log('Error fetching tokens:', e) }

      // Also try queued tokens
      try {
        const queueRes: any = await hospitalApi.listTokens({ status: 'queued' })
        const queueTokens: any[] = queueRes?.tokens || []
        const erQueueTokens = queueTokens.filter((t: any) => {
          const deptName = t.departmentId?.name?.toLowerCase() || ''
          return deptName.includes('emergency') || deptName.includes('er')
        })
        
        for (const t of erQueueTokens){
          if (t.encounterId && !encounters.find(e => e.encounterId === t.encounterId)) {
            encounters.push({
              encounterId: t.encounterId,
              tokenNo: t.tokenNo,
              patientName: t.patientId?.fullName || t.patientName,
              mrn: t.patientId?.mrn,
            })
          }
        }
      }catch(e){ console.log('Error fetching queued tokens:', e) }

      const flat = [] as any[]
      
      // Fetch payments for each unique encounter
      for (const enc of encounters.slice(0, 50)){ // Limit to 50 encounters
        try{
          const payRes: any = await hospitalApi.erListPayments(enc.encounterId, { limit: 100 })
          const pays = payRes?.payments || []
          for (const p of pays){
            flat.push({
              id: String(p._id||Math.random()),
              encounterId: String(enc.encounterId),
              tokenNo: enc.tokenNo || '-',
              patientName: enc.patientName || '-',
              mrn: enc.mrn || '-',
              amount: Number(p.amount||0),
              method: p.method || '-',
              refNo: p.refNo || '',
              receivedAt: p.receivedAt || p.createdAt || new Date().toISOString(),
              performedBy: p.createdByUsername || p.createdBy || '-',
            })
          }
        }catch(e){ /* ignore individual encounter errors */ }
      }
      
      flat.sort((a,b)=> new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      setRows(flat)
      setPage(1)
    }catch(err) { 
      console.error('Failed to load ER payments:', err)
      setRows([]) 
    }
    setLoading(false)
  }

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r =>
      r.patientName.toLowerCase().includes(s) ||
      String(r.mrn||'').toLowerCase().includes(s) ||
      String(r.tokenNo||'').toLowerCase().includes(s) ||
      String(r.method||'').toLowerCase().includes(s) ||
      String(r.refNo||'').toLowerCase().includes(s) ||
      String(r.performedBy||'').toLowerCase().includes(s)
    )
  }, [q, rows])

  async function printReceipt(rec: any){
    try{
      const [chRes, payRes] = await Promise.all([
        hospitalApi.listErCharges(rec.encounterId, { limit: 500 }) as any,
        hospitalApi.erListPayments(rec.encounterId, { limit: 500 }) as any,
      ])
      const charges = (chRes.charges||[])
      const payments = (payRes.payments||[])
      await printReceiptHtml(rec, charges, payments)
    }catch{}
  }

  async function printReceiptHtml(rec: any, charges: any[], payments: any[]){
    const s: any = await hospitalApi.getSettings().catch(()=>({}))
    const name = s?.name || 'Hospital'
    const address = s?.address || '-'
    const phone = s?.phone || ''
    const logo = s?.logoDataUrl || ''
    const dt = new Date()
    const total = charges.reduce((sum:number,c:any)=> sum + Number(c.amount||0), 0)
    const linesHtml = charges.map((c:any)=>`<tr><td style="padding:4px 6px;border-bottom:1px solid #e5e7eb">${escapeHtml(c.description||'')}</td><td style="padding:4px 6px;text-align:right;border-bottom:1px solid #e5e7eb">${currency(Number(c.amount||0))}</td></tr>`).join('')
    const paysHtml = payments.map((p:any)=>`<tr><td style="padding:3px 6px">${fmtDateTime12(p.receivedAt||dt)}</td><td style="padding:3px 6px">${escapeHtml(p.method||'-')}</td><td style="padding:3px 6px">${escapeHtml(p.refNo||'')}</td><td style="padding:3px 6px;text-align:right">${currency(Number(p.amount||0))}</td></tr>`).join('')
    const paid = payments.reduce((s:number,p:any)=> s + Number(p.amount||0), 0)
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>ER Bill Receipt</title>
      <style>
        @page { size: A4 portrait; margin: 8mm }
        body{ font-family: ui-sans-serif, system-ui, Segoe UI, Roboto, Arial; color:#0f172a; font-size:12px; line-height:1.25 }
        .wrap{ width:100%; max-width: 190mm; margin: 0 auto }
        .hdr{ display:flex; align-items:center; gap:10px }
        .logo img{ height:46px; width:auto; object-fit:contain }
        .hinfo{ text-align:center }
        .title{ font-size:18px; font-weight:900; line-height:1.1 }
        .muted{ color:#64748b; font-size:11px }
        .hr{ border-bottom:1px solid #0f172a; margin:6px 0 }
        .kv{ display:grid; grid-template-columns: 120px 1fr 120px 1fr; gap:3px 10px; font-size:12px }
        .box{ border:1px solid #e5e7eb; border-radius:8px; padding:6px; margin:8px 0 }
        table{ width:100%; border-collapse:collapse; font-size:12px }
        th{ background:#f8fafc; text-align:left; padding:5px 6px; border-bottom:1px solid #e5e7eb }
        td{ vertical-align:top }
        .right{ text-align:right }
      </style></head><body>
      <div class="wrap">
        <div class="hdr">
          <div class="logo">${logo? `<img src="${escapeHtml(logo)}" alt="logo"/>` : ''}</div>
          <div class="hinfo" style="flex:1">
            <div class="title">${escapeHtml(name)}</div>
            <div class="muted">${escapeHtml(address)}</div>
            <div class="muted">Ph: ${escapeHtml(phone)}</div>
          </div>
        </div>
        <div class="hr"></div>
        <div class="box">
          <div class="kv">
            <div>Patient</div><div>${escapeHtml(rec.patientName||'-')}</div>
            <div>MRN</div><div>${escapeHtml(rec.mrn||'-')}</div>
            <div>Token</div><div>${escapeHtml(rec.tokenNo||'-')}</div>
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
        <div class="box" style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <div><div>SubTotal</div><div class="right">${currency(total)}</div></div>
          <div><div>Paid</div><div class="right">${currency(paid)}</div></div>
          <div style="grid-column:1 / -1"><div><strong>Outstanding</strong></div><div class="right"><strong>${currency(Math.max(0, total - paid))}</strong></div></div>
        </div>
        <div style="text-align:center;color:#475569;margin-top:6px;font-size:10px">System Generated Receipt</div>
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

  // Pagination - server-side style with client data
  const startIdx = (page - 1) * rowsPerPage
  const endIdx = startIdx + rowsPerPage
  const paginatedRows = filtered.slice(startIdx, endIdx)
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const total = useMemo(()=> paginatedRows.reduce((s,r)=> s + Number(r.amount||0), 0), [paginatedRows])
  const displayStart = Math.min(startIdx + 1, filtered.length)
  const displayEnd = Math.min(endIdx, filtered.length)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-semibold">Recent ER Payments</div>
          <div className="text-sm text-slate-600">{loading? 'Loading...' : `${filtered.length} payments`} · Total {currency(total)}</div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name / MRN / Token / Method / Ref / Performed By" className="min-w-[280px] flex-1 rounded-md border border-slate-300 px-3 py-2" />
          <button onClick={loadRecent} className="btn" disabled={loading}>{loading? 'Refreshing...' : 'Refresh'}</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {filtered.length===0 ? (
          <div className="text-sm text-slate-500">No recent ER payments</div>
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-slate-700"><tr><th className="px-2 py-1 text-left">Date/Time</th><th className="px-2 py-1 text-left">Token</th><th className="px-2 py-1 text-left">Patient</th><th className="px-2 py-1 text-left">MRN</th><th className="px-2 py-1 text-left">Method</th><th className="px-2 py-1 text-left">Ref</th><th className="px-2 py-1 text-left">Performed By</th><th className="px-2 py-1 text-right">Amount</th><th className="px-2 py-1 text-left">Actions</th></tr></thead>
              <tbody className="divide-y">
                {paginatedRows.map(r => (
                  <tr key={r.id}>
                    <td className="px-2 py-1">{fmtDateTime12(r.receivedAt)}</td>
                    <td className="px-2 py-1">{r.tokenNo}</td>
                    <td className="px-2 py-1">{r.patientName}</td>
                    <td className="px-2 py-1">{r.mrn}</td>
                    <td className="px-2 py-1">{r.method}</td>
                    <td className="px-2 py-1">{r.refNo}</td>
                    <td className="px-2 py-1">{r.createdByUsername || r.createdBy || r.performedBy || '-'}</td>
                    <td className="px-2 py-1 text-right">{currency(r.amount)}</td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-2">
                        <button className="btn-outline-navy" onClick={()=>printReceipt(r)}>Print Receipt</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination Controls */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600 mt-4">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select 
                value={rowsPerPage} 
                onChange={e=>{setRowsPerPage(parseInt(e.target.value)); setPage(1)}} 
                className="rounded-md border border-slate-300 px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div>Page {page} of {totalPages} ({displayStart}-{displayEnd} of {filtered.length})</div>
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
    </div>
  )
}
