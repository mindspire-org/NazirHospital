import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_Equipment(){
  type Equipment = {
    id: string
    code?: string
    name: string
    category?: string
    make?: string
    model?: string
    serialNo?: string
    purchaseDate?: string
    locationDepartmentId?: string
    status?: 'Working'|'UnderMaintenance'|'NotWorking'|'Condemned'|'Spare'
    requiresCalibration?: boolean
    calibFrequencyMonths?: number
    ppmFrequencyMonths?: number
    nextPpmDue?: string
    nextCalibDue?: string
    lastPpmDoneAt?: string
    lastCalibDoneAt?: string
    createdAt?: string
  }

  

  
  type Department = { id: string; name: string }

  const [items, setItems] = useState<Equipment[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<any>({ name: '', code: '', category: '', make: '', model: '', serialNo: '', purchaseDate: '', locationDepartmentId: '', status: 'Working', requiresCalibration: false, calibFrequencyMonths: '', ppmFrequencyMonths: '' })

  const [editId, setEditId] = useState<string|null>(null)
  const [editForm, setEditForm] = useState<any>({ name: '', code: '', category: '', make: '', model: '', serialNo: '', purchaseDate: '', locationDepartmentId: '', status: 'Working', requiresCalibration: false, calibFrequencyMonths: '', ppmFrequencyMonths: '' })

  const [ppmForId, setPpmForId] = useState<string|null>(null)
  const [ppmForm, setPpmForm] = useState<any>({ performedAt: '', nextDue: '', doneBy: '', notes: '', cost: '' })

  const [calibForId, setCalibForId] = useState<string|null>(null)
  const [calibForm, setCalibForm] = useState<any>({ performedAt: '', nextDue: '', labName: '', certificateNo: '', result: '', validTo: '', notes: '', cost: '' })

  const [breakdownForId, setBreakdownForId] = useState<string|null>(null)
  const [breakdownForm, setBreakdownForm] = useState<any>({ reportedAt: '', restoredAt: '', description: '', rootCause: '', correctiveAction: '', severity: 'medium', status: 'Open', cost: '' })

  const [condemnForId, setCondemnForId] = useState<string|null>(null)
  const [condemnForm, setCondemnForm] = useState<any>({ proposedAt: '', reason: '', approvedBy: '', approvedAt: '', status: 'Proposed', disposalMethod: '', disposalDate: '', notes: '' })

  // History modal (PPM / Calibration)
  const [historyForId, setHistoryForId] = useState<string|null>(null)
  const [historyTab, setHistoryTab] = useState<'ppm'|'calib'>('ppm')
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [ppmHistory, setPpmHistory] = useState<any[]>([])
  const [calibHistory, setCalibHistory] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    async function load(){
      setLoading(true)
      try {
        const depRes = await hospitalApi.listDepartments() as any
        const deps: Department[] = (depRes.departments || depRes || []).map((d: any) => ({ id: String(d._id || d.id), name: d.name }))
        const listRes = await hospitalApi.listEquipment({ q, category: category || undefined, status: status as any || undefined, departmentId: departmentId || undefined, from: from || undefined, to: to || undefined, limit: 500 }) as any
        const eqs: Equipment[] = (listRes.items || listRes || []).map((r: any) => ({
          id: String(r._id || r.id), code: r.code, name: r.name, category: r.category, make: r.make, model: r.model, serialNo: r.serialNo, purchaseDate: r.purchaseDate, locationDepartmentId: r.locationDepartmentId? String(r.locationDepartmentId) : '', status: r.status, requiresCalibration: !!r.requiresCalibration, calibFrequencyMonths: r.calibFrequencyMonths, ppmFrequencyMonths: r.ppmFrequencyMonths, nextPpmDue: r.nextPpmDue, nextCalibDue: r.nextCalibDue, lastPpmDoneAt: r.lastPpmDoneAt, lastCalibDoneAt: r.lastCalibDoneAt, createdAt: r.createdAt ? new Date(r.createdAt).toISOString().slice(0,10) : undefined
        }))
        if (!cancelled){ setDepartments(deps); setItems(eqs) }
      } catch {} finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [q, category, status, departmentId, from, to, refresh])

  const filtered = useMemo(() => items, [items])

  const exportCSV = () => {
    const header = ['Code','Name','Category','Make','Model','Serial No','Department','Status','Requires Calib','PPM Freq (m)','Calib Freq (m)','Next PPM','Next Calib']
    const lines = [header.join(',')]
    const depMap = Object.fromEntries(departments.map(d => [d.id, d.name]))
    for (const it of filtered) {
      const row = [it.code||'', it.name||'', it.category||'', it.make||'', it.model||'', it.serialNo||'', depMap[it.locationDepartmentId||'']||'', it.status||'', it.requiresCalibration? 'Yes':'No', it.ppmFrequencyMonths||'', it.calibFrequencyMonths||'', it.nextPpmDue||'', it.nextCalibDue||'']
        .map(v => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : String(v ?? ''))
      lines.push(row.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `equipment-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openAdd = () => { setAddForm({ name: '', code: '', category: '', make: '', model: '', serialNo: '', purchaseDate: '', locationDepartmentId: '', status: 'Working', requiresCalibration: false, calibFrequencyMonths: '', ppmFrequencyMonths: '' }); setShowAdd(true) }
  const saveAdd = async () => {
    if (!addForm.name.trim()) return
    try {
      const payload: any = {
        name: addForm.name.trim(),
        code: addForm.code || undefined,
        category: addForm.category || undefined,
        make: addForm.make || undefined,
        model: addForm.model || undefined,
        serialNo: addForm.serialNo || undefined,
        purchaseDate: addForm.purchaseDate || undefined,
        locationDepartmentId: addForm.locationDepartmentId || undefined,
        status: addForm.status || undefined,
        requiresCalibration: !!addForm.requiresCalibration,
        calibFrequencyMonths: addForm.calibFrequencyMonths? Number(addForm.calibFrequencyMonths) : undefined,
        ppmFrequencyMonths: addForm.ppmFrequencyMonths? Number(addForm.ppmFrequencyMonths) : undefined,
      }
      await hospitalApi.createEquipment(payload)
      setShowAdd(false)
      setRefresh(x => x + 1)
    } catch (e: any) { alert(e?.message || 'Failed to save') }
  }

  const openEdit = (id: string) => {
    const it = items.find(x => x.id === id); if (!it) return
    setEditId(id)
    setEditForm({
      name: it.name || '', code: it.code || '', category: it.category || '', make: it.make || '', model: it.model || '', serialNo: it.serialNo || '', purchaseDate: it.purchaseDate || '', locationDepartmentId: it.locationDepartmentId || '', status: it.status || 'Working', requiresCalibration: !!it.requiresCalibration, calibFrequencyMonths: it.calibFrequencyMonths != null ? String(it.calibFrequencyMonths) : '', ppmFrequencyMonths: it.ppmFrequencyMonths != null ? String(it.ppmFrequencyMonths) : ''
    })
  }
  const saveEdit = async () => {
    if (!editId) return
    try {
      const payload: any = {
        name: editForm.name.trim() || 'Equipment',
        code: editForm.code || undefined,
        category: editForm.category || undefined,
        make: editForm.make || undefined,
        model: editForm.model || undefined,
        serialNo: editForm.serialNo || undefined,
        purchaseDate: editForm.purchaseDate || undefined,
        locationDepartmentId: editForm.locationDepartmentId || undefined,
        status: editForm.status || undefined,
        requiresCalibration: !!editForm.requiresCalibration,
        calibFrequencyMonths: editForm.calibFrequencyMonths? Number(editForm.calibFrequencyMonths) : undefined,
        ppmFrequencyMonths: editForm.ppmFrequencyMonths? Number(editForm.ppmFrequencyMonths) : undefined,
      }
      await hospitalApi.updateEquipment(editId, payload)
      setEditId(null)
      setRefresh(x => x + 1)
    } catch (e: any) { alert(e?.message || 'Failed to update') }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this equipment?')) return
    try { await hospitalApi.deleteEquipment(id); setItems(prev => prev.filter(x => x.id !== id)) } catch (e: any) { alert(e?.message || 'Failed to delete') }
  }

  const openPPM = (id: string) => { setPpmForId(id); setPpmForm({ performedAt: new Date().toISOString().slice(0,10), nextDue: '', doneBy: '', notes: '', cost: '' }) }
  const savePPM = async () => {
    if (!ppmForId) return
    if (!ppmForm.performedAt) return
    try {
      const payload = { equipmentId: ppmForId, performedAt: ppmForm.performedAt, nextDue: ppmForm.nextDue || undefined, doneBy: ppmForm.doneBy || undefined, notes: ppmForm.notes || undefined, cost: ppmForm.cost? Number(ppmForm.cost) : undefined }
      await hospitalApi.createEquipmentPPM(payload)
      setPpmForId(null)
      setRefresh(x => x + 1)
    } catch (e: any) { alert(e?.message || 'Failed to log PPM') }
  }

  const openCalibration = (id: string) => { setCalibForId(id); setCalibForm({ performedAt: new Date().toISOString().slice(0,10), nextDue: '', labName: '', certificateNo: '', result: 'Pass', validTo: '', notes: '', cost: '' }) }
  const saveCalibration = async () => {
    if (!calibForId) return
    if (!calibForm.performedAt) return
    try {
      const payload = { equipmentId: calibForId, performedAt: calibForm.performedAt, nextDue: calibForm.nextDue || undefined, labName: calibForm.labName || undefined, certificateNo: calibForm.certificateNo || undefined, result: calibForm.result || undefined, validTo: calibForm.validTo || undefined, notes: calibForm.notes || undefined, cost: calibForm.cost? Number(calibForm.cost) : undefined }
      await hospitalApi.createEquipmentCalibration(payload as any)
      setCalibForId(null)
      setRefresh(x => x + 1)
    } catch (e: any) { alert(e?.message || 'Failed to log calibration') }
  }

  // History (PPM / Calibration)
  const openHistory = (id: string) => {
    setHistoryForId(id)
    setHistoryTab('ppm')
    setHistoryFrom('')
    setHistoryTo('')
  }

  useEffect(() => {
    if (!historyForId) return
    let cancelled = false
    async function load(){
      setHistoryLoading(true)
      try {
        const [ppmRes, calibRes] = await Promise.all([
          hospitalApi.listEquipmentPPM({ equipmentId: historyForId || undefined, from: historyFrom || undefined, to: historyTo || undefined, page: 1, limit: 1000 }) as any,
          hospitalApi.listEquipmentCalibrations({ equipmentId: historyForId || undefined, from: historyFrom || undefined, to: historyTo || undefined, page: 1, limit: 1000 }) as any,
        ])
        if (!cancelled){
          setPpmHistory(ppmRes?.items || ppmRes || [])
          setCalibHistory(calibRes?.items || calibRes || [])
        }
      } catch {} finally { if (!cancelled) setHistoryLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [historyForId, historyFrom, historyTo])

  const exportHistoryCSV = () => {
    const isPPM = historyTab === 'ppm'
    if (isPPM){
      const header = ['Performed At','Next Due','Done By','Notes','Cost']
      const rows = ppmHistory.map((r:any)=>[
        r.performedAt||'', r.nextDue||'', r.doneBy||'', (r.notes||'').replace(/\n/g,' '), r.cost!=null?String(r.cost):''
      ])
      const csv = [header, ...rows].map(r => r.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='equipment_ppm_history.csv'; a.click(); URL.revokeObjectURL(url)
    } else {
      const header = ['Performed At','Next Due','Lab Name','Certificate No','Result','Valid To','Notes','Cost']
      const rows = calibHistory.map((r:any)=>[
        r.performedAt||'', r.nextDue||'', r.labName||'', r.certificateNo||'', r.result||'', r.validTo||'', (r.notes||'').replace(/\n/g,' '), r.cost!=null?String(r.cost):''
      ])
      const csv = [header, ...rows].map(r => r.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='equipment_calibration_history.csv'; a.click(); URL.revokeObjectURL(url)
    }
  }

  const printHistory = () => {
    const isPPM = historyTab === 'ppm'
    const html = isPPM ? `<!doctype html><html><head><title>PPM History</title>
      <style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{text-align:left;background:#f5f5f5}</style>
      </head><body><h3>PPM History</h3><table><thead><tr>
        <th>Performed At</th><th>Next Due</th><th>Done By</th><th>Notes</th><th>Cost</th>
      </tr></thead><tbody>
      ${ppmHistory.map((r:any)=>`<tr><td>${r.performedAt||''}</td><td>${r.nextDue||''}</td><td>${r.doneBy||''}</td><td>${(r.notes||'').replace(/</g,'&lt;')}</td><td>${r.cost!=null?String(r.cost):''}</td></tr>`).join('')}
      </tbody></table><script>window.print()</script></body></html>`
    : `<!doctype html><html><head><title>Calibration History</title>
      <style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{text-align:left;background:#f5f5f5}</style>
      </head><body><h3>Calibration History</h3><table><thead><tr>
        <th>Performed At</th><th>Next Due</th><th>Lab Name</th><th>Certificate No</th><th>Result</th><th>Valid To</th><th>Notes</th><th>Cost</th>
      </tr></thead><tbody>
      ${calibHistory.map((r:any)=>`<tr><td>${r.performedAt||''}</td><td>${r.nextDue||''}</td><td>${(r.labName||'').replace(/</g,'&lt;')}</td><td>${(r.certificateNo||'').replace(/</g,'&lt;')}</td><td>${(r.result||'').replace(/</g,'&lt;')}</td><td>${r.validTo||''}</td><td>${(r.notes||'').replace(/</g,'&lt;')}</td><td>${r.cost!=null?String(r.cost):''}</td></tr>`).join('')}
      </tbody></table><script>window.print()</script></body></html>`
    const w = window.open('', '_blank'); if (w){ w.document.write(html); w.document.close() }
  }

  // Breakdown & Condemnation
  const openBreakdown = (id: string) => { setBreakdownForId(id); setBreakdownForm({ reportedAt: new Date().toISOString().slice(0,10), restoredAt: '', description: '', rootCause: '', correctiveAction: '', severity: 'medium', status: 'Open', cost: '' }) }
  const saveBreakdown = async () => {
    if (!breakdownForId) return
    if (!breakdownForm.reportedAt) return
    try {
      const payload = {
        equipmentId: breakdownForId,
        reportedAt: breakdownForm.reportedAt,
        restoredAt: breakdownForm.restoredAt || undefined,
        description: breakdownForm.description || undefined,
        rootCause: breakdownForm.rootCause || undefined,
        correctiveAction: breakdownForm.correctiveAction || undefined,
        severity: breakdownForm.severity || undefined,
        status: breakdownForm.status || undefined,
        cost: breakdownForm.cost? Number(breakdownForm.cost) : undefined,
      }
      await hospitalApi.createEquipmentBreakdown(payload as any)
      setBreakdownForId(null)
      setRefresh(x => x + 1)
    } catch (e: any) { alert(e?.message || 'Failed to log breakdown') }
  }

  const openCondemn = (id: string) => { setCondemnForId(id); setCondemnForm({ proposedAt: new Date().toISOString().slice(0,10), reason: '', approvedBy: '', approvedAt: '', status: 'Proposed', disposalMethod: '', disposalDate: '', notes: '' }) }
  const saveCondemn = async () => {
    if (!condemnForId) return
    try {
      const payload = {
        equipmentId: condemnForId,
        proposedAt: condemnForm.proposedAt || undefined,
        reason: condemnForm.reason || undefined,
        approvedBy: condemnForm.approvedBy || undefined,
        approvedAt: condemnForm.approvedAt || undefined,
        status: condemnForm.status || undefined,
        disposalMethod: condemnForm.disposalMethod || undefined,
        disposalDate: condemnForm.disposalDate || undefined,
        notes: condemnForm.notes || undefined,
      }
      await hospitalApi.createEquipmentCondemnation(payload as any)
      setCondemnForId(null)
      setRefresh(x => x + 1)
    } catch (e: any) { alert(e?.message || 'Failed to log condemnation') }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Equipment</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." className="rounded-md border border-slate-300 px-3 py-1.5" />
          <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Category" className="rounded-md border border-slate-300 px-3 py-1.5" />
          <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5">
            <option value="">Any status</option>
            <option>Working</option>
            <option>UnderMaintenance</option>
            <option>NotWorking</option>
            <option>Condemned</option>
            <option>Spare</option>
          </select>
          <select value={departmentId} onChange={e=>setDepartmentId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5">
            <option value="">All departments</option>
            {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          <span>to</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Export</button>
          <button onClick={openAdd} className="rounded-md bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-700">+ Add Equipment</button>
        </div>
      </div>

      <div className="mt-4">
        {loading && <div className="text-sm text-slate-600">Loading...</div>}
        {!loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(it => (
              <div key={it.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold text-slate-800">{it.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{it.code || it.category || ''}</div>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button onClick={()=>openPPM(it.id)} className="rounded-md border border-slate-200 px-2 py-1 text-emerald-700 hover:bg-emerald-50" title="Log PPM">PPM</button>
                    <button onClick={()=>openCalibration(it.id)} className="rounded-md border border-slate-200 px-2 py-1 text-sky-700 hover:bg-sky-50" title="Log Calibration">Calib</button>
                    <button onClick={()=>openBreakdown(it.id)} className="rounded-md border border-slate-200 px-2 py-1 text-amber-700 hover:bg-amber-50" title="Log Breakdown">Breakdown</button>
                    <button onClick={()=>openHistory(it.id)} className="rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50" title="History">History</button>
                    <button onClick={()=>openCondemn(it.id)} className="rounded-md border border-slate-200 px-2 py-1 text-rose-700 hover:bg-rose-50" title="Log Condemnation">Condemn</button>
                    <button onClick={()=>openEdit(it.id)} className="rounded-md border border-slate-200 px-2 py-1 text-violet-700 hover:bg-violet-50" title="Edit">✏️</button>
                    <button onClick={()=>deleteItem(it.id)} className="rounded-md border border-slate-200 px-2 py-1 text-rose-700 hover:bg-rose-50" title="Delete">🗑️</button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div><span className="font-medium text-slate-700">Status:</span> {it.status || '-'}</div>
                  <div><span className="font-medium text-slate-700">Dept:</span> {departments.find(d=>d.id===it.locationDepartmentId)?.name || '-'}</div>
                  <div><span className="font-medium text-slate-700">Serial:</span> {it.serialNo || '-'}</div>
                  <div><span className="font-medium text-slate-700">Purchase:</span> {it.purchaseDate || '-'}</div>
                  <div><span className="font-medium text-slate-700">Next PPM:</span> {it.nextPpmDue || '-'}</div>
                  <div><span className="font-medium text-slate-700">Next Calib:</span> {it.nextCalibDue || '-'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      {historyForId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Equipment History</h3>
                <p className="text-sm text-slate-600">{items.find(x=>x.id===historyForId)?.name || ''}</p>
              </div>
              <button onClick={()=>setHistoryForId(null)} className="text-slate-500">✖</button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                <button onClick={()=>setHistoryTab('ppm')} className={`px-3 py-1.5 ${historyTab==='ppm'?'bg-violet-600 text-white':'bg-white text-slate-700'}`}>PPM</button>
                <button onClick={()=>setHistoryTab('calib')} className={`px-3 py-1.5 ${historyTab==='calib'?'bg-violet-600 text-white':'bg-white text-slate-700'}`}>Calibration</button>
              </div>
              <input type="date" value={historyFrom} onChange={e=>setHistoryFrom(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
              <span>to</span>
              <input type="date" value={historyTo} onChange={e=>setHistoryTo(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
              <button onClick={exportHistoryCSV} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">CSV</button>
              <button onClick={printHistory} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Print</button>
            </div>
            <div className="mt-3">
              {historyLoading && <div className="text-sm text-slate-600">Loading...</div>}
              {!historyLoading && historyTab==='ppm' && (
                <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
                  <table className="min-w-[800px] w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-700">
                        <th className="px-2 py-2">Performed At</th>
                        <th className="px-2 py-2">Next Due</th>
                        <th className="px-2 py-2">Done By</th>
                        <th className="px-2 py-2">Notes</th>
                        <th className="px-2 py-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ppmHistory.map((r:any,idx:number)=> (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-2">{r.performedAt||''}</td>
                          <td className="px-2 py-2">{r.nextDue||''}</td>
                          <td className="px-2 py-2">{r.doneBy||''}</td>
                          <td className="px-2 py-2">{r.notes||''}</td>
                          <td className="px-2 py-2 text-right">{r.cost!=null?Number(r.cost).toFixed(2):''}</td>
                        </tr>
                      ))}
                      {ppmHistory.length===0 && (<tr><td className="px-2 py-4 text-center text-slate-500" colSpan={5}>No records</td></tr>)}
                    </tbody>
                  </table>
                </div>
              )}
              {!historyLoading && historyTab==='calib' && (
                <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-700">
                        <th className="px-2 py-2">Performed At</th>
                        <th className="px-2 py-2">Next Due</th>
                        <th className="px-2 py-2">Lab Name</th>
                        <th className="px-2 py-2">Certificate No</th>
                        <th className="px-2 py-2">Result</th>
                        <th className="px-2 py-2">Valid To</th>
                        <th className="px-2 py-2">Notes</th>
                        <th className="px-2 py-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calibHistory.map((r:any,idx:number)=> (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-2">{r.performedAt||''}</td>
                          <td className="px-2 py-2">{r.nextDue||''}</td>
                          <td className="px-2 py-2">{r.labName||''}</td>
                          <td className="px-2 py-2">{r.certificateNo||''}</td>
                          <td className="px-2 py-2">{r.result||''}</td>
                          <td className="px-2 py-2">{r.validTo||''}</td>
                          <td className="px-2 py-2">{r.notes||''}</td>
                          <td className="px-2 py-2 text-right">{r.cost!=null?Number(r.cost).toFixed(2):''}</td>
                        </tr>
                      ))}
                      {calibHistory.length===0 && (<tr><td className="px-2 py-4 text-center text-slate-500" colSpan={8}>No records</td></tr>)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setHistoryForId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {breakdownForId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">Log Breakdown</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Reported At</label>
                <input type="date" value={breakdownForm.reportedAt} onChange={e=>setBreakdownForm((f:any)=>({ ...f, reportedAt: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Restored At</label>
                <input type="date" value={breakdownForm.restoredAt} onChange={e=>setBreakdownForm((f:any)=>({ ...f, restoredAt: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm text-slate-700">Description</label>
                <textarea value={breakdownForm.description} onChange={e=>setBreakdownForm((f:any)=>({ ...f, description: e.target.value }))} rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm text-slate-700">Root Cause</label>
                <input value={breakdownForm.rootCause} onChange={e=>setBreakdownForm((f:any)=>({ ...f, rootCause: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm text-slate-700">Corrective Action</label>
                <input value={breakdownForm.correctiveAction} onChange={e=>setBreakdownForm((f:any)=>({ ...f, correctiveAction: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Severity</label>
                <select value={breakdownForm.severity} onChange={e=>setBreakdownForm((f:any)=>({ ...f, severity: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Status</label>
                <select value={breakdownForm.status} onChange={e=>setBreakdownForm((f:any)=>({ ...f, status: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Cost</label>
                <input type="number" value={breakdownForm.cost} onChange={e=>setBreakdownForm((f:any)=>({ ...f, cost: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setBreakdownForId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveBreakdown} className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {condemnForId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">Log Condemnation</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Proposed At</label>
                <input type="date" value={condemnForm.proposedAt} onChange={e=>setCondemnForm((f:any)=>({ ...f, proposedAt: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Status</label>
                <select value={condemnForm.status} onChange={e=>setCondemnForm((f:any)=>({ ...f, status: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                  <option value="Proposed">Proposed</option>
                  <option value="Approved">Approved</option>
                  <option value="Disposed">Disposed</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm text-slate-700">Reason</label>
                <textarea value={condemnForm.reason} onChange={e=>setCondemnForm((f:any)=>({ ...f, reason: e.target.value }))} rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Approved By</label>
                <input value={condemnForm.approvedBy} onChange={e=>setCondemnForm((f:any)=>({ ...f, approvedBy: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Approved At</label>
                <input type="date" value={condemnForm.approvedAt} onChange={e=>setCondemnForm((f:any)=>({ ...f, approvedAt: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Disposal Method</label>
                <input value={condemnForm.disposalMethod} onChange={e=>setCondemnForm((f:any)=>({ ...f, disposalMethod: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Disposal Date</label>
                <input type="date" value={condemnForm.disposalDate} onChange={e=>setCondemnForm((f:any)=>({ ...f, disposalDate: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm text-slate-700">Notes</label>
                <textarea value={condemnForm.notes} onChange={e=>setCondemnForm((f:any)=>({ ...f, notes: e.target.value }))} rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setCondemnForId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveCondemn} className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700">Save</button>
            </div>
          </div>
        </div>
      )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Add Equipment</h3>
                <p className="text-sm text-slate-600">Register a new equipment asset.</p>
              </div>
              <button onClick={()=>setShowAdd(false)} className="text-slate-500">✖</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Name</label>
                <input value={addForm.name} onChange={e=>setAddForm((f:any)=>({ ...f, name: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Code</label>
                <input value={addForm.code} onChange={e=>setAddForm((f:any)=>({ ...f, code: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Category</label>
                <input value={addForm.category} onChange={e=>setAddForm((f:any)=>({ ...f, category: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Department</label>
                <select value={addForm.locationDepartmentId} onChange={e=>setAddForm((f:any)=>({ ...f, locationDepartmentId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                  <option value="">Select</option>
                  {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Make</label>
                <input value={addForm.make} onChange={e=>setAddForm((f:any)=>({ ...f, make: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Model</label>
                <input value={addForm.model} onChange={e=>setAddForm((f:any)=>({ ...f, model: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Serial No</label>
                <input value={addForm.serialNo} onChange={e=>setAddForm((f:any)=>({ ...f, serialNo: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Purchase Date</label>
                <input type="date" value={addForm.purchaseDate} onChange={e=>setAddForm((f:any)=>({ ...f, purchaseDate: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Status</label>
                <select value={addForm.status} onChange={e=>setAddForm((f:any)=>({ ...f, status: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                  <option>Working</option>
                  <option>UnderMaintenance</option>
                  <option>NotWorking</option>
                  <option>Condemned</option>
                  <option>Spare</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={!!addForm.requiresCalibration} onChange={e=>setAddForm((f:any)=>({ ...f, requiresCalibration: e.target.checked }))} /> Requires Calibration
                </label>
                <input type="number" placeholder="Calibration Freq (months)" value={addForm.calibFrequencyMonths} onChange={e=>setAddForm((f:any)=>({ ...f, calibFrequencyMonths: e.target.value }))} className="w-56 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
                <input type="number" placeholder="PPM Freq (months)" value={addForm.ppmFrequencyMonths} onChange={e=>setAddForm((f:any)=>({ ...f, ppmFrequencyMonths: e.target.value }))} className="w-56 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setShowAdd(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveAdd} className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">Edit Equipment</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Name</label>
                <input value={editForm.name} onChange={e=>setEditForm((f:any)=>({ ...f, name: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Code</label>
                <input value={editForm.code} onChange={e=>setEditForm((f:any)=>({ ...f, code: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Category</label>
                <input value={editForm.category} onChange={e=>setEditForm((f:any)=>({ ...f, category: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Department</label>
                <select value={editForm.locationDepartmentId} onChange={e=>setEditForm((f:any)=>({ ...f, locationDepartmentId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                  <option value="">Select</option>
                  {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Make</label>
                <input value={editForm.make} onChange={e=>setEditForm((f:any)=>({ ...f, make: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Model</label>
                <input value={editForm.model} onChange={e=>setEditForm((f:any)=>({ ...f, model: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Serial No</label>
                <input value={editForm.serialNo} onChange={e=>setEditForm((f:any)=>({ ...f, serialNo: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Purchase Date</label>
                <input type="date" value={editForm.purchaseDate} onChange={e=>setEditForm((f:any)=>({ ...f, purchaseDate: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Status</label>
                <select value={editForm.status} onChange={e=>setEditForm((f:any)=>({ ...f, status: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                  <option>Working</option>
                  <option>UnderMaintenance</option>
                  <option>NotWorking</option>
                  <option>Condemned</option>
                  <option>Spare</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={!!editForm.requiresCalibration} onChange={e=>setEditForm((f:any)=>({ ...f, requiresCalibration: e.target.checked }))} /> Requires Calibration
                </label>
                <input type="number" placeholder="Calibration Freq (months)" value={editForm.calibFrequencyMonths} onChange={e=>setEditForm((f:any)=>({ ...f, calibFrequencyMonths: e.target.value }))} className="w-56 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
                <input type="number" placeholder="PPM Freq (months)" value={editForm.ppmFrequencyMonths} onChange={e=>setEditForm((f:any)=>({ ...f, ppmFrequencyMonths: e.target.value }))} className="w-56 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setEditId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveEdit} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800">Save</button>
            </div>
          </div>
        </div>
      )}

      {ppmForId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">Log PPM</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Performed At</label>
                <input type="date" value={ppmForm.performedAt} onChange={e=>setPpmForm((f:any)=>({ ...f, performedAt: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Next Due</label>
                <input type="date" value={ppmForm.nextDue} onChange={e=>setPpmForm((f:any)=>({ ...f, nextDue: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Done By</label>
                <input value={ppmForm.doneBy} onChange={e=>setPpmForm((f:any)=>({ ...f, doneBy: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Notes</label>
                <textarea value={ppmForm.notes} onChange={e=>setPpmForm((f:any)=>({ ...f, notes: e.target.value }))} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Cost</label>
                <input type="number" value={ppmForm.cost} onChange={e=>setPpmForm((f:any)=>({ ...f, cost: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setPpmForId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={savePPM} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {calibForId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">Log Calibration</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Performed At</label>
                <input type="date" value={calibForm.performedAt} onChange={e=>setCalibForm((f:any)=>({ ...f, performedAt: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Next Due</label>
                <input type="date" value={calibForm.nextDue} onChange={e=>setCalibForm((f:any)=>({ ...f, nextDue: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Lab Name</label>
                <input value={calibForm.labName} onChange={e=>setCalibForm((f:any)=>({ ...f, labName: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Certificate No</label>
                <input value={calibForm.certificateNo} onChange={e=>setCalibForm((f:any)=>({ ...f, certificateNo: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Result</label>
                <input value={calibForm.result} onChange={e=>setCalibForm((f:any)=>({ ...f, result: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Valid To</label>
                <input type="date" value={calibForm.validTo} onChange={e=>setCalibForm((f:any)=>({ ...f, validTo: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Notes</label>
                <textarea value={calibForm.notes} onChange={e=>setCalibForm((f:any)=>({ ...f, notes: e.target.value }))} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Cost</label>
                <input type="number" value={calibForm.cost} onChange={e=>setCalibForm((f:any)=>({ ...f, cost: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setCalibForId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveCalibration} className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
