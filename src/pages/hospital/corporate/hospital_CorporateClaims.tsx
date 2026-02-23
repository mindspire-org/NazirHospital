import { useEffect, useMemo, useState } from 'react'
import { corporateApi, hospitalApi } from '../../../utils/api'

const STATUSES = ['open','locked','exported','partially-paid','paid','rejected'] as const

type ClaimRow = { _id: string; claimNo?: string; companyId: string; status: typeof STATUSES[number]; totalAmount: number; totalTransactions: number; createdAt?: string; fromDate?: string; toDate?: string }

type TxRow = { _id: string; dateIso?: string; patientMrn?: string; patientName?: string; serviceType: string; description?: string; qty?: number; unitPrice?: number; coPay?: number; netToCorporate?: number }

export default function Hospital_CorporateClaims(){
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [filters, setFilters] = useState<{ companyId: string; status: ''|typeof STATUSES[number]; from?: string; to?: string }>({ companyId: '', status: '' })
  const [rows, setRows] = useState<ClaimRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<ClaimRow | null>(null)
  const [selectedTx, setSelectedTx] = useState<TxRow[]>([])
  const [gen, setGen] = useState<{ patientMrn?: string; departmentId?: string; serviceType?: ''|'OPD'|'LAB'|'DIAG'|'IPD' }>({})
  const [brand, setBrand] = useState<{ name?: string; address?: string; phone?: string; logoDataUrl?: string }>({})
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState<number | null>(null)

  useEffect(()=>{ (async()=>{ try{ const r = await corporateApi.listCompanies() as any; setCompanies((r?.companies||[]).map((c:any)=>({ id: String(c._id||c.id), name: c.name })))}catch{} })() }, [])
  useEffect(()=>{ (async()=>{ try{ const r:any = await hospitalApi.listDepartments(); const arr:any[] = (r?.departments || r?.data || []) as any[]; setDepartments(arr.map((d:any)=>({ id: String(d._id||d.id), name: d.name })))}catch{} })() }, [])
  useEffect(()=>{ (async()=>{ try{ const s:any = await hospitalApi.getSettings(); setBrand({ name: s?.name, address: s?.address, phone: s?.phone, logoDataUrl: s?.logoDataUrl }) }catch{} })() }, [])

  async function load(){
    setLoading(true)
    try {
      const res = await corporateApi.listClaims({ companyId: filters.companyId || undefined, status: (filters.status || undefined) as any, from: filters.from || undefined, to: filters.to || undefined, page, limit }) as any
      setRows((res?.items||res?.claims||[]) as ClaimRow[])
      const t = (res?.total ?? res?.count ?? res?.totalCount)
      setTotal(typeof t === 'number' ? t : null)
    } catch { setRows([] as any) }
    setLoading(false)
  }
  useEffect(()=>{ load() }, [page, limit])

  const totalAmount = useMemo(()=> (rows||[]).reduce((s,r)=> s + Number(r.totalAmount||0), 0), [rows])

  async function selectClaim(c: ClaimRow){
    setSelected(c)
    try {
      const res = await corporateApi.getClaim(String(c._id)) as any
      setSelectedTx((res?.transactions||[]) as TxRow[])
    } catch { setSelectedTx([]) }
  }

  async function generate(){
    const companyId = filters.companyId || (companies[0]?.id || '')
    if (!companyId){ alert('Select a company first'); return }
    try {
      await corporateApi.generateClaim({
        companyId,
        fromDate: filters.from || undefined,
        toDate: filters.to || undefined,
        patientMrn: (gen.patientMrn||'') || undefined,
        departmentId: (gen.departmentId||'') || undefined,
        serviceType: (gen.serviceType as any) || undefined,
      })
      await load()
    } catch (e: any){ alert(e?.message || 'Failed to generate claim') }
  }

  async function lockUnlock(c: ClaimRow){
    try {
      if (c.status === 'locked') await corporateApi.unlockClaim(String(c._id))
      else await corporateApi.lockClaim(String(c._id))
      await load()
      if (selected && String(selected._id) === String(c._id)) await selectClaim(c)
    } catch (e: any){ alert(e?.message || 'Failed to update claim') }
  }

  function exportCsv(c: ClaimRow){
    try { const url = corporateApi.exportClaimUrl(String(c._id)); window.open(url, '_blank') } catch {}
  }

  async function removeClaim(c: ClaimRow){
    const ok = confirm(`Delete claim ${c.claimNo || String((c as any)._id).slice(-6)}? This cannot be undone.`)
    if (!ok) return
    try {
      await corporateApi.deleteClaim(String(c._id))
      if (selected && String(selected._id) === String(c._id)) setSelected(null)
      await load()
    } catch (e: any){ alert(e?.message || 'Failed to delete claim') }
  }

  async function printDeptWise(c: ClaimRow){
    try {
      const res = await corporateApi.getClaim(String(c._id)) as any
      const tx: TxRow[] = (res?.transactions||[]) as TxRow[]
      const groups: Record<string, { gross: number; discount: number; net: number }> = {}
      const nameFor = (t: any)=> t?.departmentName || ({ OPD: 'Outdoor', IPD: 'Indoor', DIAG: 'Diagnostic', LAB: 'Lab' } as any)[t?.serviceType] || (t?.serviceType || 'Other')
      for (const t of tx){
        const key = nameFor(t)
        const qty = Number((t as any).qty || 1)
        const unit = Number((t as any).unitPrice || 0)
        const gross = qty * unit
        const coPay = Number((t as any).coPay || 0)
        const net = Number((t as any).netToCorporate || Math.max(0, gross - coPay))
        if (!groups[key]) groups[key] = { gross: 0, discount: 0, net: 0 }
        groups[key].gross += gross
        groups[key].discount += coPay
        groups[key].net += net
      }
      const rows = Object.entries(groups).map(([k,v])=> ({ k, ...v }))
      const totals = rows.reduce((s,r)=> ({ gross: s.gross + r.gross, discount: s.discount + r.discount, net: s.net + r.net }), { gross:0, discount:0, net:0 })
      const company = companies.find(x=> x.id === String((c as any).companyId))?.name || String((c as any).companyId)
      const title = 'Hospitalization Bill'
      const header = `
          <div style="position:relative; min-height:56px; padding-top:8px; margin-bottom:8px;">
            ${brand?.logoDataUrl ? `<img src="${brand.logoDataUrl}" style="position:absolute; top:0; left:0; height:56px; object-fit:contain;" />` : ''}
            <div style="text-align:center;">
              <div style="font-weight:800; font-size:22px; text-transform:uppercase;">${brand?.name || 'Hospital'}</div>
              ${brand?.address ? `<div style=\"font-size:12px; color:#374151;\">${brand.address}</div>` : ''}
              ${brand?.phone ? `<div style=\"font-size:12px; color:#374151;\">${brand.phone}</div>` : ''}
            </div>
          </div>`
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
        <style>
          body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827; }
          .container{ max-width:900px; margin:0 auto; padding:24px; }
          h1{ font-size:20px; margin:0 0 8px; }
          table{ width:100%; border-collapse:collapse; margin-top:12px; }
          th,td{ border:1px solid #e5e7eb; padding:8px; font-size:12px; }
          th{ background:#f3f4f6; text-align:left; }
          .right{ text-align:right; }
        </style></head><body>
        <div class="container">${header}
          <div style="text-align:center;">
            <h1 style="margin:0;">${company}</h1>
            <div style="font-size:12px; color:#374151;">Ref: ${c.claimNo || String((c as any)._id).slice(-6)}</div>
          </div>
          <div style="text-align:right; font-size:12px; color:#374151;">Date: ${new Date().toLocaleDateString()}</div>
          <div style="margin-top:16px; font-size:14px; font-weight:600;">Subject: ${title}</div>
          <table>
            <thead>
              <tr><th style="width:56px;">SR #</th><th>Subscription</th><th class="right">T Amount</th><th class="right">Discount</th><th class="right">Net Amount</th></tr>
            </thead>
            <tbody>
              ${rows.map((r,i)=> `<tr><td>${i+1}</td><td>${r.k}</td><td class="right">${formatPKR(r.gross)}</td><td class="right">${formatPKR(r.discount)}</td><td class="right">${formatPKR(r.net)}</td></tr>`).join('')}
              <tr><td></td><td style="font-weight:700;">Total</td><td class="right" style="font-weight:700;">${formatPKR(totals.gross)}</td><td class="right" style="font-weight:700;">${formatPKR(totals.discount)}</td><td class="right" style="font-weight:700;">${formatPKR(totals.net)}</td></tr>
            </tbody>
          </table>
        </div>
      </body></html>`
      const w = window.open('', '_blank', 'width=1024,height=768')
      if (!w) return
      w.document.open(); w.document.write(html); w.document.close(); w.focus(); w.print();
    } catch (e: any){ alert(e?.message || 'Failed to render print') }
  }

  async function printPatientWise(c: ClaimRow){
    try {
      const res = await corporateApi.getClaim(String(c._id)) as any
      const tx: TxRow[] = (res?.transactions||[]) as TxRow[]
      const byPatient: Record<string, { name: string; mrn: string; amount: number; count: number }> = {}
      for (const t of tx){
        const mrn = String((t as any).patientMrn||'-')
        const name = String((t as any).patientName||'-')
        const key = `${mrn}__${name}`
        const net = Number((t as any).netToCorporate || 0)
        if (!byPatient[key]) byPatient[key] = { name, mrn, amount: 0, count: 0 }
        byPatient[key].amount += net
        byPatient[key].count += 1
      }
      const rows = Object.values(byPatient)
      const total = rows.reduce((s,r)=> s + r.amount, 0)
      const company = companies.find(x=> x.id === String((c as any).companyId))?.name || String((c as any).companyId)
      const title = `Bill of ${company} Patients`
      const header = `
          <div style="position:relative; min-height:56px; padding-top:8px; margin-bottom:8px;">
            ${brand?.logoDataUrl ? `<img src="${brand.logoDataUrl}" style="position:absolute; top:0; left:0; height:56px; object-fit:contain;" />` : ''}
            <div style="text-align:center;">
              <div style="font-weight:800; font-size:22px; text-transform:uppercase;">${brand?.name || 'Hospital'}</div>
              ${brand?.address ? `<div style=\"font-size:12px; color:#374151;\">${brand.address}</div>` : ''}
              ${brand?.phone ? `<div style=\"font-size:12px; color:#374151;\">${brand.phone}</div>` : ''}
            </div>
          </div>`
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
        <style>
          body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827; }
          .container{ max-width:900px; margin:0 auto; padding:24px; }
          h1{ font-size:20px; margin:0 0 8px; }
          table{ width:100%; border-collapse:collapse; margin-top:12px; }
          th,td{ border:1px solid #e5e7eb; padding:8px; font-size:12px; }
          th{ background:#f3f4f6; text-align:left; }
          .right{ text-align:right; }
        </style></head><body>
        <div class="container">${header}
          <div style="text-align:center;">
            <h1 style="margin:0;">${company}</h1>
            <div style="font-size:12px; color:#374151;">Ref: ${c.claimNo || String((c as any)._id).slice(-6)}</div>
          </div>
          <div style="text-align:right; font-size:12px; color:#374151;">Date: ${new Date().toLocaleDateString()}</div>
          <div style="margin-top:16px; font-size:14px; font-weight:600;">Subject: Patient-wise Bill</div>
          <table>
            <thead>
              <tr><th style="width:56px;">Sr#</th><th>MRN</th><th>Patient</th><th class="right">Tx</th><th class="right">Amount</th></tr>
            </thead>
            <tbody>
              ${rows.map((r,i)=> `<tr><td>${i+1}</td><td>${r.mrn}</td><td>${r.name}</td><td class=\"right\">${r.count}</td><td class=\"right\">${formatPKR(r.amount)}</td></tr>`).join('')}
              <tr><td></td><td></td><td style="font-weight:700;">Total</td><td class="right" style="font-weight:700;">${rows.reduce((s,r)=> s + r.count, 0)}</td><td class="right" style="font-weight:700;">${formatPKR(total)}</td></tr>
            </tbody>
          </table>
        </div>
      </body></html>`
      const w = window.open('', '_blank', 'width=1024,height=768')
      if (!w) return
      w.document.open(); w.document.write(html); w.document.close(); w.focus(); w.print();
    } catch (e: any){ alert(e?.message || 'Failed to render print') }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Corporate Claims</h2>

      {/* Filters & actions */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7 items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Company</label>
            <select value={filters.companyId} onChange={e=>setFilters(s=>({ ...s, companyId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select value={filters.status} onChange={e=>setFilters(s=>({ ...s, status: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Any</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
            <input type="date" value={filters.from||''} onChange={e=>setFilters(s=>({ ...s, from: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
            <input type="date" value={filters.to||''} onChange={e=>setFilters(s=>({ ...s, to: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Patient MRN (optional)</label>
            <input value={gen.patientMrn||''} onChange={e=>setGen(s=>({ ...s, patientMrn: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="MRN" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Department (optional)</label>
            <select value={gen.departmentId||''} onChange={e=>setGen(s=>({ ...s, departmentId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Any</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Service (optional)</label>
            <select value={gen.serviceType||''} onChange={e=>setGen(s=>({ ...s, serviceType: (e.target.value as any) }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Any</option>
              <option value="OPD">OPD</option>
              <option value="LAB">Lab</option>
              <option value="DIAG">Diagnostic</option>
              <option value="IPD">IPD</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={()=>{ setPage(1); load() }} className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white">Apply</button>
            <button onClick={generate} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Generate Claim</button>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Claims</div>
          <div className="text-sm text-slate-600">Total: <span className="font-semibold">{formatPKR(totalAmount)}</span></div>
        </div>
        {loading && <div className="text-sm text-slate-500">Loading...</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-slate-500">No claims</div>}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-2">Claim #</th>
                  <th className="px-2 py-2">Company</th>
                  <th className="px-2 py-2">From → To</th>
                  <th className="px-2 py-2 text-right">Tx</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r)=>{
                  const comp = companies.find(c=>c.id===String((r as any).companyId))?.name || String((r as any).companyId)
                  const range = `${r.fromDate || '-'} → ${r.toDate || '-'}`
                  return (
                    <tr key={String((r as any)._id)} className="border-t border-slate-100">
                      <td className="px-2 py-2">
                        <button onClick={()=>selectClaim(r)} className="text-violet-700 underline">{r.claimNo || String((r as any)._id).slice(-6)}</button>
                      </td>
                      <td className="px-2 py-2">{comp}</td>
                      <td className="px-2 py-2">{range}</td>
                      <td className="px-2 py-2 text-right">{r.totalTransactions||0}</td>
                      <td className="px-2 py-2 text-right">{formatPKR(Number(r.totalAmount||0))}</td>
                      <td className="px-2 py-2">{r.status}</td>
                      <td className="px-2 py-2 space-x-2">
                        <button onClick={()=>lockUnlock(r)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">{r.status==='locked' ? 'Unlock' : 'Lock'}</button>
                        <button onClick={()=>exportCsv(r)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Export CSV</button>
                        <button onClick={()=>removeClaim(r)} className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-600">Delete</button>
                        <button onClick={()=>printDeptWise(r)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Print Dept</button>
                        <button onClick={()=>printPatientWise(r)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Print Patients</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-slate-600">Page {page}{total!=null ? ` of ${Math.max(1, Math.ceil(total/limit))}` : ''}</div>
          <div className="flex items-center gap-2">
            <select value={limit} onChange={e=>{ setPage(1); setLimit(Number(e.target.value)||20) }} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1} className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50">Prev</button>
            <button onClick={()=> setPage(p=> p+1)} disabled={total!=null ? (page*limit)>= (total||0) : (rows.length < limit)} className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50">Next</button>
          </div>
        </div>
      </section>

      {/* Claim details */}
      {selected && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">Claim Details — {selected.claimNo || String((selected as any)._id).slice(-6)}</div>
            <div className="text-xs text-slate-600">Transactions: {selected.totalTransactions} • Amount: {formatPKR(selected.totalAmount||0)}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">MRN</th>
                  <th className="px-2 py-2">Patient</th>
                  <th className="px-2 py-2">Service</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">UnitPrice</th>
                  <th className="px-2 py-2 text-right">CoPay</th>
                  <th className="px-2 py-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {selectedTx.map(t=> (
                  <tr key={String((t as any)._id)} className="border-t border-slate-100">
                    <td className="px-2 py-2">{t.dateIso || '-'}</td>
                    <td className="px-2 py-2">{t.patientMrn || '-'}</td>
                    <td className="px-2 py-2">{t.patientName || '-'}</td>
                    <td className="px-2 py-2">{t.serviceType || '-'}</td>
                    <td className="px-2 py-2">{t.description || '-'}</td>
                    <td className="px-2 py-2 text-right">{Number(t.qty||1)}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number(t.unitPrice||0))}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number(t.coPay||0))}</td>
                    <td className="px-2 py-2 text-right">{formatPKR(Number(t.netToCorporate||0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function formatPKR(n: number){ try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` } }
