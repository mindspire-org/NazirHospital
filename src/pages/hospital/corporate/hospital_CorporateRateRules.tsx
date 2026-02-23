import { useEffect, useMemo, useState } from 'react'
import { corporateApi, hospitalApi, labApi, diagnosticApi } from '../../../utils/api'

const SCOPES = ['OPD','LAB','DIAG','IPD'] as const
const RULE_TYPES: Record<typeof SCOPES[number], Array<{ label: string; value: string }>> = {
  OPD: [
    { label: 'Default', value: 'default' },
    { label: 'Department', value: 'department' },
    { label: 'Doctor', value: 'doctor' },
  ],
  LAB: [
    { label: 'Default', value: 'default' },
    { label: 'Test', value: 'test' },
  ],
  DIAG: [
    { label: 'Default', value: 'default' },
    { label: 'Test', value: 'test' },
  ],
  IPD: [
    { label: 'Default', value: 'default' },
    { label: 'Bed Category', value: 'bedCategory' },
    { label: 'Procedure', value: 'procedure' },
    { label: 'Service/Item', value: 'service' },
  ],
}

const MODES = [
  { label: 'Fixed Price', value: 'fixedPrice' },
  { label: 'Percent Discount', value: 'percentDiscount' },
  { label: 'Fixed Discount', value: 'fixedDiscount' },
]

export default function Hospital_CorporateRateRules(){
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; fee?: number }>>([])
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; baseFee?: number }>>([])
  const [labTests, setLabTests] = useState<Array<{ id: string; name: string; price?: number }>>([])
  const [diagTests, setDiagTests] = useState<Array<{ id: string; name: string; price?: number }>>([])
  const [filters, setFilters] = useState<{ companyId: string; scope: typeof SCOPES[number] | '' }>({ companyId: '', scope: '' })
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const [c, d, deps, lt, dt] = await Promise.all([
          corporateApi.listCompanies() as any,
          hospitalApi.listDoctors() as any,
          hospitalApi.listDepartments() as any,
          labApi.listTests({ limit: 1000 }) as any,
          diagnosticApi.listTests({ limit: 1000 }) as any,
        ])
        if (!mounted) return
        setCompanies((c?.companies||[]).map((x:any)=>({ id: String(x._id||x.id), name: x.name })))
        setDoctors(((d?.doctors)||[]).map((x:any)=>({ id: String(x._id||x.id), name: x.name, fee: Number(x.opdBaseFee||0) })))
        const depArr: any[] = (deps?.departments || deps?.data || []) as any[]
        setDepartments((depArr||[]).map((x:any)=>({ id: String(x._id||x.id), name: x.name, baseFee: Number(x.opdBaseFee||0) })))
        setLabTests(((lt?.items)||[]).map((x:any)=>({ id: String(x._id||x.id), name: x.name, price: Number(x.price||0) })))
        setDiagTests(((dt?.items)||[]).map((x:any)=>({ id: String(x._id||x.id), name: x.name, price: Number(x.price||0) })))
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  async function load(){
    setLoading(true)
    try {
      const res = await corporateApi.listRateRules({ companyId: filters.companyId || undefined, scope: (filters.scope || undefined) as any, page, limit }) as any
      setRows(res?.rules || res?.items || [])
      const t = (res?.total ?? res?.count ?? res?.totalCount)
      setTotal(typeof t === 'number' ? t : null)
    } catch { setRows([]) }
    setLoading(false)
  }
  useEffect(()=>{ load() }, [filters.companyId, filters.scope, page, limit])

  // Create form
  const [createForm, setCreateForm] = useState<any>({ companyId: '', scope: 'OPD', ruleType: 'default', refId: '', visitType: 'any', mode: 'fixedPrice', value: 0, priority: 100, effectiveFrom: '', effectiveTo: '', active: true })
  const ruleTypeOptions = useMemo(()=> RULE_TYPES[(createForm.scope||'OPD') as typeof SCOPES[number]] || [], [createForm.scope])
  const showVisitType = createForm.scope === 'OPD'
  const showRefId = createForm.ruleType && createForm.ruleType !== 'default'

  // Open dialog helpers
  function openAdd(){
    setEditId(null)
    setCreateForm({
      companyId: filters.companyId || '',
      scope: (filters.scope as any) || 'OPD',
      ruleType: 'default',
      refId: '',
      visitType: 'any',
      mode: 'fixedPrice',
      value: 0,
      priority: 100,
      effectiveFrom: '',
      effectiveTo: '',
      active: true,
    })
    setShowAdd(true)
  }
  useEffect(()=>{
    if (!showAdd) return
    const onKey = (e: KeyboardEvent)=>{ if (e.key === 'Escape') { setShowAdd(false); setEditId(null) } }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [showAdd])

  const originalPrice = useMemo(()=>{
    if (createForm.scope === 'OPD'){
      if (createForm.ruleType === 'doctor') return doctors.find(d=>d.id===String(createForm.refId))?.fee || 0
      if (createForm.ruleType === 'department') return departments.find(d=>d.id===String(createForm.refId))?.baseFee || 0
      return 0
    }
    if (createForm.scope === 'LAB' && createForm.ruleType === 'test') return labTests.find(t=>t.id===String(createForm.refId))?.price || 0
    if (createForm.scope === 'DIAG' && createForm.ruleType === 'test') return diagTests.find(t=>t.id===String(createForm.refId))?.price || 0
    return 0
  }, [createForm.scope, createForm.ruleType, createForm.refId, doctors, departments, labTests, diagTests])

  useEffect(()=>{
    if (createForm.mode === 'fixedPrice' && originalPrice > 0){
      // Prefill value only when blank or zero
      if (!createForm.value || Number(createForm.value) === 0){
        setCreateForm((f:any)=> ({ ...f, value: originalPrice }))
      }
    }
  }, [createForm.mode, originalPrice])

  async function create(){
    try {
      if (!createForm.companyId) { alert('Select company'); return }
      setCreating(true)
      const payload: any = {
        companyId: createForm.companyId,
        scope: createForm.scope,
        ruleType: createForm.ruleType,
        refId: showRefId ? (createForm.refId || '') : undefined,
        visitType: showVisitType ? (createForm.visitType || 'any') : undefined,
        mode: createForm.mode,
        value: Number(createForm.value||0),
        priority: Number(createForm.priority||100),
        effectiveFrom: createForm.effectiveFrom || undefined,
        effectiveTo: createForm.effectiveTo || undefined,
        active: !!createForm.active,
      }
      if (editId){
        await corporateApi.updateRateRule(editId, payload)
        setEditId(null)
      } else {
        await corporateApi.createRateRule(payload)
      }
      // reset minimal fields but keep selected company/scope/ruleType for speed
      setCreateForm((f:any)=> ({ ...f, refId: '', value: 0, priority: 100 }))
      setShowAdd(false)
      await load()
    } catch (e: any){ alert(e?.message || 'Failed to create rate rule') }
    finally { setCreating(false) }
  }

  function startEdit(r: any){
    setEditId(String(r._id))
    setCreateForm({
      companyId: String(r.companyId||''),
      scope: r.scope,
      ruleType: r.ruleType,
      refId: r.refId || '',
      visitType: r.visitType || (r.scope==='OPD' ? 'any' : undefined),
      mode: r.mode,
      value: r.value,
      priority: r.priority ?? 100,
      effectiveFrom: r.effectiveFrom ? String(r.effectiveFrom).slice(0,10) : '',
      effectiveTo: r.effectiveTo ? String(r.effectiveTo).slice(0,10) : '',
      active: r.active !== false,
    })
    setShowAdd(true)
  }

  async function remove(id: string){
    if (!confirm('Delete this rule?')) return
    try { await corporateApi.deleteRateRule(id); await load() } catch (e: any){ alert(e?.message || 'Failed to delete rule') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Corporate Rate Rules</h2>
        <button onClick={openAdd} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Add Rule</button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-5xl rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">{editId ? 'Edit Rule' : 'Add Rule'}</div>
              <button onClick={()=>{ setShowAdd(false); setEditId(null) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm">Close</button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Company</label>
                <select value={createForm.companyId} onChange={e=>setCreateForm((f:any)=>({ ...f, companyId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Scope</label>
                <select value={createForm.scope} onChange={e=>setCreateForm((f:any)=>({ ...f, scope: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                  {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Rule Type</label>
                <select value={createForm.ruleType} onChange={e=>setCreateForm((f:any)=>({ ...f, ruleType: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                  {ruleTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              {showRefId && createForm.scope === 'OPD' && createForm.ruleType === 'doctor' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Doctor</label>
                  <select value={createForm.refId} onChange={e=>setCreateForm((f:any)=>({ ...f, refId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                    <option value="">Select Doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {showRefId && createForm.scope === 'OPD' && createForm.ruleType === 'department' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Department</label>
                  <select value={createForm.refId} onChange={e=>setCreateForm((f:any)=>({ ...f, refId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {showRefId && createForm.scope === 'LAB' && createForm.ruleType === 'test' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Lab Test</label>
                  <select value={createForm.refId} onChange={e=>setCreateForm((f:any)=>({ ...f, refId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                    <option value="">Select Lab Test</option>
                    {labTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              {showRefId && createForm.scope === 'DIAG' && createForm.ruleType === 'test' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Diagnostic Test</label>
                  <select value={createForm.refId} onChange={e=>setCreateForm((f:any)=>({ ...f, refId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                    <option value="">Select Diagnostic Test</option>
                    {diagTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              {showRefId && !(createForm.scope === 'OPD' && (createForm.ruleType === 'doctor' || createForm.ruleType === 'department')) && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Reference ID</label>
                  <input value={createForm.refId} onChange={e=>setCreateForm((f:any)=>({ ...f, refId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="doctorId / departmentId / testId / bedCategory / procedureKey / serviceKey" />
                </div>
              )}
              {showVisitType && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Visit Type</label>
                  <select value={createForm.visitType} onChange={e=>setCreateForm((f:any)=>({ ...f, visitType: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                    <option value="any">Any</option>
                    <option value="new">New</option>
                    <option value="followup">Follow-up</option>
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Pricing Mode</label>
                <select value={createForm.mode} onChange={e=>setCreateForm((f:any)=>({ ...f, mode: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                  {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Value</label>
                <input value={createForm.value} onChange={e=>setCreateForm((f:any)=>({ ...f, value: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Amount or %" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Original Price</label>
                <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{formatPKR(originalPrice)}</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Priority</label>
                <input value={createForm.priority} onChange={e=>setCreateForm((f:any)=>({ ...f, priority: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Effective From</label>
                <input type="date" value={createForm.effectiveFrom} onChange={e=>setCreateForm((f:any)=>({ ...f, effectiveFrom: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Effective To</label>
                <input type="date" value={createForm.effectiveTo} onChange={e=>setCreateForm((f:any)=>({ ...f, effectiveTo: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <div className="flex items-center gap-2">
                <input id="rule-active" type="checkbox" checked={!!createForm.active} onChange={e=>setCreateForm((f:any)=>({ ...f, active: e.target.checked }))} />
                <label htmlFor="rule-active" className="text-xs text-slate-700">Active</label>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>{ setShowAdd(false); setEditId(null) }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={create} disabled={creating} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">{creating ? (editId ? 'Saving...' : 'Creating...') : (editId ? 'Save Changes' : 'Create Rule')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Company</label>
            <select value={filters.companyId} onChange={e=>{ setPage(1); setFilters(s=>({ ...s, companyId: e.target.value })) }} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Scope</label>
            <select value={filters.scope} onChange={e=>{ setPage(1); setFilters(s=>({ ...s, scope: e.target.value as any })) }} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">All</option>
              {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Create moved to modal above */}

      {/* List */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-slate-700">Rules</div>
        {loading && <div className="text-sm text-slate-500">Loading...</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-slate-500">No rules</div>}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-2">Company</th>
                  <th className="px-2 py-2">Scope</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Ref</th>
                  <th className="px-2 py-2">Visit</th>
                  <th className="px-2 py-2">Mode</th>
                  <th className="px-2 py-2">Value</th>
                  <th className="px-2 py-2">Priority</th>
                  <th className="px-2 py-2">Active</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r:any)=> (
                  <tr key={String(r._id)} className="border-t border-slate-100">
                    <td className="px-2 py-2">{companies.find(c=>c.id===String(r.companyId))?.name || String(r.companyId)}</td>
                    <td className="px-2 py-2">{r.scope}</td>
                    <td className="px-2 py-2">{r.ruleType}</td>
                    <td className="px-2 py-2">{
                      (r.scope==='OPD' && r.ruleType==='doctor') ? (doctors.find(d=>d.id===String(r.refId))?.name || r.refId || '-') :
                      (r.scope==='OPD' && r.ruleType==='department') ? (departments.find(d=>d.id===String(r.refId))?.name || r.refId || '-') :
                      (r.scope==='LAB' && r.ruleType==='test') ? (labTests.find(t=>t.id===String(r.refId))?.name || r.refId || '-') :
                      (r.scope==='DIAG' && r.ruleType==='test') ? (diagTests.find(t=>t.id===String(r.refId))?.name || r.refId || '-') :
                      (r.refId || '-')
                    }</td>
                    <td className="px-2 py-2">{r.visitType || '-'}</td>
                    <td className="px-2 py-2">{r.mode}</td>
                    <td className="px-2 py-2">{r.value}</td>
                    <td className="px-2 py-2">{r.priority ?? 100}</td>
                    <td className="px-2 py-2">{r.active!==false ? 'Yes' : 'No'}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button onClick={()=>startEdit(r)} className="rounded-md border border-slate-300 px-2 py-1 text-slate-700">Edit</button>
                        <button onClick={()=>remove(String(r._id))} className="rounded-md border border-rose-300 px-2 py-1 text-rose-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
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
    </div>
  )
}

function formatPKR(n: number){ try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${Number(n||0).toFixed(2)}` } }
