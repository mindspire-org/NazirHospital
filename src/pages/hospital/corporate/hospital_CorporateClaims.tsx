import { useEffect, useMemo, useState } from 'react'
import { corporateApi, hospitalApi } from '../../../utils/api'
import Toast, { type ToastState } from '../../../components/ui/Toast'
import ConfirmDialog from '../../../components/ui/ConfirmDialog'

const STATUSES = ['open','locked','exported','partially-paid','paid','rejected'] as const

type ClaimRow = { _id: string; claimNo?: string; companyId: string; status: typeof STATUSES[number]; totalAmount: number; totalTransactions: number; createdAt?: string; fromDate?: string; toDate?: string; notes?: string }

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
  const [toast, setToast] = useState<ToastState>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; claim: ClaimRow | null } | null>(null)
  
  // Transaction selection for claim generation
  const [availableTx, setAvailableTx] = useState<TxRow[]>([])
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set())
  const [txLoading, setTxLoading] = useState(false)
  const [txPage, setTxPage] = useState(1)
  const [txLimit, setTxLimit] = useState(20)
  const [txTotal, setTxTotal] = useState(0)
  
  // Edit claim modal
  const [editClaim, setEditClaim] = useState<ClaimRow | null>(null)
  const [editStatus, setEditStatus] = useState<typeof STATUSES[number]>('open')
  const [editNotes, setEditNotes] = useState('')

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
  useEffect(()=>{ loadAvailableTransactions() }, [filters.companyId, txPage, txLimit])

  const totalAmount = useMemo(()=> (rows||[]).reduce((s,r)=> s + Number(r.totalAmount||0), 0), [rows])

  async function selectClaim(c: ClaimRow){
    setSelected(c)
    try {
      const res = await corporateApi.getClaim(String(c._id)) as any
      setSelectedTx((res?.transactions||[]) as TxRow[])
    } catch { setSelectedTx([]) }
  }

  async function lockUnlock(c: ClaimRow){
    try {
      if (c.status === 'locked') await corporateApi.unlockClaim(String(c._id))
      else await corporateApi.lockClaim(String(c._id))
      await load()
      if (selected && String(selected._id) === String(c._id)) await selectClaim(c)
      setToast({ type: 'success', message: 'Updated' })
    } catch (e: any){ setToast({ type: 'error', message: e?.message || 'Failed to update claim' }) }
  }

  function exportCsv(c: ClaimRow){
    try { const url = corporateApi.exportClaimUrl(String(c._id)); window.open(url, '_blank') } catch {}
  }

  async function removeClaim(c: ClaimRow){
    setConfirmDelete({ open: true, claim: c })
  }

  async function confirmRemoveClaim(){
    const c = confirmDelete?.claim
    setConfirmDelete(null)
    if (!c?._id) return
    try {
      await corporateApi.deleteClaim(String(c._id))
      if (selected && String(selected._id) === String(c._id)) setSelected(null)
      await load()
      setToast({ type: 'success', message: 'Deleted' })
    } catch (e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to delete claim' })
    }
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
    } catch (e: any){ setToast({ type: 'error', message: e?.message || 'Failed to render print' }) }
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
    } catch (e: any){ setToast({ type: 'error', message: e?.message || 'Failed to render print' }) }
  }

  // Load available transactions for selection
  async function loadAvailableTransactions(){
    const companyId = filters.companyId || ''

    setTxLoading(true)
    try {
      const payload: any = {
        status: 'accrued',
        page: txPage,
        limit: txLimit,
      }
      if (companyId) payload.companyId = companyId

      const res: any = await corporateApi.listTransactions(payload) as any
      const txs = res?.transactions || res?.items || []
      setAvailableTx(txs)
      setTxTotal(res?.total || txs.length)
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to load transactions' })
    }
    setTxLoading(false)
  }

  function toggleTxSelection(txId: string){
    setSelectedTxIds(prev => {
      const next = new Set(prev)
      if (next.has(txId)) next.delete(txId)
      else next.add(txId)
      return next
    })
  }

  function selectAllTxs(){
    setSelectedTxIds(new Set(availableTx.map(t => String(t._id))))
  }

  function deselectAllTxs(){
    setSelectedTxIds(new Set())
  }

  async function generateWithSelection(){
    if (selectedTxIds.size === 0){ setToast({ type: 'error', message: 'Select at least one transaction' }); return }
    
    const companyId = filters.companyId || (companies[0]?.id || '')
    if (!companyId){ setToast({ type: 'error', message: 'Select a company first' }); return }
    
    try {
      await corporateApi.generateClaim({
        companyId,
        fromDate: filters.from || undefined,
        toDate: filters.to || undefined,
        transactionIds: Array.from(selectedTxIds)
      })
      await load()
      setSelectedTxIds(new Set())
      setToast({ type: 'success', message: `Claim generated with ${selectedTxIds.size} transactions` })
    } catch (e: any){ setToast({ type: 'error', message: e?.message || 'Failed to generate claim' }) }
  }

  function openEditClaim(c: ClaimRow){
    setEditClaim(c)
    setEditStatus(c.status)
    setEditNotes(c.notes || '')
  }

  async function saveEditClaim(){
    if (!editClaim) return
    try {
      await corporateApi.updateClaim(String(editClaim._id), { 
        status: editStatus,
        notes: editNotes
      })
      await load()
      if (selected && String(selected._id) === String(editClaim._id)) await selectClaim(editClaim)
      setEditClaim(null)
      setToast({ type: 'success', message: 'Claim updated' })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to update claim' })
    }
  }

  return (
    <>
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
          <div className="flex items-end gap-2 md:col-span-7">
            <button onClick={()=>{ setPage(1); load() }} className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white">Apply</button>
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
                      <td className="px-2 py-2">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                          r.status === 'paid' ? 'bg-green-100 text-green-700' :
                          r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          r.status === 'locked' ? 'bg-amber-100 text-amber-700' :
                          r.status === 'exported' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-2 py-2 space-x-1">
                        <button onClick={()=>lockUnlock(r)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">{r.status==='locked' ? 'Unlock' : 'Lock'}</button>
                        <button onClick={()=>openEditClaim(r)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Edit</button>
                        <button onClick={()=>exportCsv(r)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Export CSV</button>
                        <button 
                          onClick={()=>removeClaim(r)} 
                          disabled={r.status !== 'open'}
                          title={r.status !== 'open' ? 'Unlock claim before deleting' : ''}
                          className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >Delete</button>
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
    <ConfirmDialog
      open={!!confirmDelete?.open}
      title="Confirm"
      message={confirmDelete?.claim ? `Delete claim ${confirmDelete.claim.claimNo || String((confirmDelete.claim as any)._id).slice(-6)}? This will revert all transactions back to accrued status.` : 'Delete this claim?'}
      confirmText="Delete"
      onCancel={()=>setConfirmDelete(null)}
      onConfirm={confirmRemoveClaim}
    />

    {/* Transaction Selection Section - Inline */}
    <section className="rounded-lg border border-violet-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Select Transactions for Claim</h3>
      </div>
        
        <div className="mb-3 flex items-center gap-3">
          <button onClick={selectAllTxs} className="rounded-md border border-slate-300 px-3 py-1 text-sm">Select All</button>
          <button onClick={deselectAllTxs} className="rounded-md border border-slate-300 px-3 py-1 text-sm">Deselect All</button>
          <span className="text-sm text-slate-600">
            Selected: {selectedTxIds.size} transactions
          </span>
        </div>

        {txLoading && <div className="text-sm text-slate-500">Loading...</div>}
        {!txLoading && availableTx.length === 0 && <div className="text-sm text-slate-500">No available transactions</div>}
        {!txLoading && availableTx.length > 0 && (
          <>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2 w-10">Select</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">MRN</th>
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {availableTx.map(t => (
                  <tr key={String(t._id)} className={`border-t border-slate-100 ${selectedTxIds.has(String(t._id)) ? 'bg-violet-50' : ''}`}>
                    <td className="px-3 py-2">
                      <input 
                        type="checkbox" 
                        checked={selectedTxIds.has(String(t._id))}
                        onChange={()=>toggleTxSelection(String(t._id))}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-2">{t.dateIso || '-'}</td>
                    <td className="px-3 py-2">{t.patientMrn || '-'}</td>
                    <td className="px-3 py-2">{t.patientName || '-'}</td>
                    <td className="px-3 py-2">{t.serviceType || '-'}</td>
                    <td className="px-3 py-2">{t.description || '-'}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatPKR(Number(t.netToCorporate||0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-600">Page {txPage} of {Math.max(1, Math.ceil(txTotal/txLimit))}</div>
            <div className="flex items-center gap-2">
              <select
                value={txLimit}
                onChange={e=>{ setTxLimit(Number(e.target.value)); setTxPage(1) }}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button 
                onClick={()=> setTxPage(p=>Math.max(1,p-1))} 
                disabled={txPage<=1} 
                className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
              >Prev</button>
              <button 
                onClick={()=> setTxPage(p=>p+1)} 
                disabled={txPage>=Math.ceil(txTotal/txLimit)} 
                className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
              >Next</button>
            </div>
          </div>
          </>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button 
            onClick={generateWithSelection} 
            disabled={selectedTxIds.size === 0}
            className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Generate Claim ({selectedTxIds.size} transactions)
          </button>
        </div>
      </section>

    {/* Edit Claim Modal */}
    {editClaim && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">Edit Claim</h3>
          
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Claim #</label>
              <div className="text-sm text-slate-600">{editClaim.claimNo || String(editClaim._id).slice(-6)}</div>
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select 
                value={editStatus} 
                onChange={e=>setEditStatus(e.target.value as typeof STATUSES[number])}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {editStatus === 'rejected' && (
                <p className="mt-1 text-xs text-amber-600">Warning: Rejecting will revert all transactions back to accrued status.</p>
              )}
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <textarea 
                value={editNotes}
                onChange={e=>setEditNotes(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                rows={3}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button onClick={()=>setEditClaim(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
            <button 
              onClick={saveEditClaim}
              className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    )}

    <Toast toast={toast} onClose={()=>setToast(null)} />
    </>
  )
}

function formatPKR(n: number){ try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` } }
