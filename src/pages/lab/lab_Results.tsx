import { useEffect, useMemo, useState } from 'react'
import { Search, ChevronLeft, Plus } from 'lucide-react'
import { labApi } from '../../utils/api'
import { useSearchParams } from 'react-router-dom'
import { previewLabReportPdf } from '../../utils/printLabReport'

type LabTest = {
  id: string
  name: string
  price: number
  parameter?: string
  unit?: string
  normalRangeMale?: string
  normalRangeFemale?: string
  normalRangePediatric?: string
  parameters?: Array<{ name: string; unit?: string; normalRangeMale?: string; normalRangeFemale?: string; normalRangePediatric?: string }>
}

type Order = {
  id: string
  createdAt: string
  patient: { fullName: string; phone: string; cnic?: string; guardianName?: string; age?: string; gender?: string; mrn?: string; address?: string }
  tests: string[]
  status: 'received'|'completed'
  tokenNo?: string
  sampleTime?: string
  reportingTime?: string
  returnedTests?: string[]
  referringConsultant?: string
}

type Track = { status: 'received' | 'completed'; sampleTime?: string; reportingTime?: string; tokenNo: string }

type ResultRow = { id: string; test: string; normal?: string; unit?: string; prevValue?: string; value?: string; flag?: 'normal'|'abnormal'|'critical'; comment?: string }

function formatDateTime(iso: string) { const d = new Date(iso); return d.toLocaleDateString() + ', ' + d.toLocaleTimeString() }

function genToken(dateIso: string, id: string) {
  const d = new Date(dateIso)
  const part = `${d.getDate().toString().padStart(2,'0')}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getFullYear()}`
  return `D${part}_${id.slice(-3)}`
}

 

export default function Lab_Results() {
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [tests, setTests] = useState<LabTest[]>([])
  const [track, setTrack] = useState<Record<string, Track>>({})
  const [tick, setTick] = useState(0)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  // Pagination and search for sample selection (must be declared before effects that use them)
  const [q, setQ] = useState('')
  const [rowsPer, setRowsPer] = useState(10)
  const [page, setPage] = useState(1)
  useEffect(() => {
    function onReturn(){ setTick(t=>t+1) }
    window.addEventListener('lab:return', onReturn as any)
    return ()=>{ window.removeEventListener('lab:return', onReturn as any) }
  }, [])
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const [ordersRes, testsRes] = await Promise.all([
          labApi.listOrders({ q: q || undefined, limit: rowsPer, page, status: 'received' }),
          labApi.listTests({ limit: 1000 }),
        ])
        if (!mounted) return
        const o: Order[] = (ordersRes.items||[]).map((x:any)=>({ id: x._id, createdAt: x.createdAt || new Date().toISOString(), patient: x.patient || { fullName: '-', phone: '' }, tests: x.tests||[], status: x.status || 'received', tokenNo: x.tokenNo, sampleTime: x.sampleTime, reportingTime: x.reportingTime, returnedTests: Array.isArray(x.returnedTests) ? x.returnedTests : [], referringConsultant: x.referringConsultant }))
        setOrders(o)
        setTotal(Number(ordersRes.total || o.length || 0))
        setTotalPages(Number(ordersRes.totalPages || 1))
        setTrack(Object.fromEntries(o.map(od=> [od.id, { status: od.status, tokenNo: od.tokenNo || genToken(od.createdAt, od.id), sampleTime: od.sampleTime, reportingTime: od.reportingTime } as Track ])))
        setTests((testsRes.items||[]).map((t:any)=>({ id: t._id, name: t.name, price: Number(t.price||0), parameter: t.parameter, unit: t.unit, normalRangeMale: t.normalRangeMale, normalRangeFemale: t.normalRangeFemale, normalRangePediatric: t.normalRangePediatric, parameters: Array.isArray(t.parameters)? t.parameters : [] })))
      } catch(e){ console.error(e); setOrders([]); setTests([]); setTrack({}); setTotal(0); setTotalPages(1) }
    })()
    return ()=>{ mounted = false }
  }, [tick, q, page, rowsPer])

  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t])), [tests])

  // Step 1: Select sample
  const pageCount = totalPages
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rowsPer + 1, total)
  const end = Math.min((curPage - 1) * rowsPer + orders.length, total)
  const items = orders

  const [selected, setSelected] = useState<Order | null>(null)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [existingResultId, setExistingResultId] = useState<string | null>(null)

  // Step 2: Entry form
  const [rows, setRows] = useState<ResultRow[]>([])
  const [interpretation, setInterpretation] = useState('')
  const [referring, setReferring] = useState('')
  // Previous results for the same patient + test
  const [prior, setPrior] = useState<Array<{ order: Order; result: { id: string; orderId: string; rows: any[]; interpretation?: string; createdAt: string } }>>([])
 

  const onSelect = (o: Order, testId: string) => {
    setSelected(o)
    setSelectedTestId(testId)
    setReferring(o.referringConsultant || '')
    // bootstrap rows from catalog only for the selected test
    const initial: ResultRow[] = []
    const t = testsMap[testId]
    if (t){
      const params = Array.isArray(t.parameters) ? t.parameters : []
      if (params.length){
        const names = new Set<string>()
        for (const p of params){
          initial.push({
            id: crypto.randomUUID(),
            test: p.name || t.name,
            normal: p.normalRangeMale || p.normalRangeFemale || p.normalRangePediatric || undefined,
            unit: p.unit || undefined,
          })
          if (p.name) names.add(String(p.name))
        }
        if ((t.parameter || '').trim() && !names.has(String(t.parameter).trim())){
          initial.push({
            id: crypto.randomUUID(),
            test: String(t.parameter).trim(),
            normal: t.normalRangeMale || t.normalRangeFemale || t.normalRangePediatric || undefined,
            unit: t.unit,
          })
        }
      } else {
        initial.push({
          id: crypto.randomUUID(),
          test: t.parameter || t.name,
          normal: t.normalRangeMale || t.normalRangeFemale || t.normalRangePediatric || undefined,
          unit: t.unit,
        })
      }
    }
    setRows(initial)
    // Load previous results for this patient + test and prefill prevValue column
    loadPreviousResults(o, testId)
  }

  const addRow = () => setRows(prev => [...prev, { id: crypto.randomUUID(), test: '', normal: '', unit: '', value: '', comment: '' }])
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id))

  const save = async () => {
    if (!selected) return false
    try {
      if (existingResultId){
        await labApi.updateResult(existingResultId, { rows, interpretation: interpretation.trim() || undefined })
        await labApi.updateOrderTrack(selected.id, { referringConsultant: (referring.trim() || undefined) as any })
      } else {
        await labApi.createResult({ orderId: selected.id, rows, interpretation: interpretation.trim() || undefined })
        const rep = new Date().toTimeString().slice(0,5)
        await labApi.updateOrderTrack(selected.id, { status: 'completed', reportingTime: rep, referringConsultant: (referring.trim() || undefined) as any })
      }
      setTick(t=>t+1)
      setSelected(null)
      setSelectedTestId(null)
      setExistingResultId(null)
      return true
    } catch (e){ console.error(e); return false }
  }

  async function loadPreviousResults(o: Order, testId: string){
    try{
      setPrior([])
      // Find prior completed orders for this patient (by MRN/phone/name) that include the same test
      const key = o.patient.mrn || o.patient.phone || o.patient.fullName || ''
      const ordRes: any = await labApi.listOrders({ q: key, status: 'completed', limit: 500 })
      const all: Order[] = (ordRes.items||[]).map((x:any)=>({ id: x._id, createdAt: x.createdAt || new Date().toISOString(), patient: x.patient || { fullName: '-', phone: '' }, tests: x.tests||[], status: x.status || 'received', tokenNo: x.tokenNo, sampleTime: x.sampleTime, reportingTime: x.reportingTime, referringConsultant: x.referringConsultant }))
      const samePatient = all.filter(or => {
        const a = o.patient || {}; const b = or.patient || {}
        if (a.mrn && b.mrn) return String(a.mrn) === String(b.mrn)
        if (a.phone && b.phone) return String(a.phone) === String(b.phone)
        return String(a.fullName||'').trim().toLowerCase() === String(b.fullName||'').trim().toLowerCase()
      })
      const sameTest = samePatient.filter(or => or.id !== o.id && Array.isArray(or.tests) && or.tests.map(String).includes(String(testId)))
      sameTest.sort((a,b)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime())
      const top = sameTest.slice(0, 5)
      const resPairs = await Promise.all(top.map(async (ord)=>{
        try{ const r = await labApi.listResults({ orderId: ord.id, limit: 1 }) as any; const rec = Array.isArray(r.items)&&r.items.length?r.items[0]:null; return [ord, rec] as const }catch{ return [ord, null] as const }
      }))
      const items: Array<{ order: Order; result: { id: string; orderId: string; rows: any[]; interpretation?: string; createdAt: string } }> = []
      for (const [ord, rec] of resPairs){
        if (rec){ items.push({ order: ord, result: { id: String(rec._id||rec.id), orderId: String(rec.orderId||ord.id), rows: rec.rows||[], interpretation: rec.interpretation, createdAt: String(rec.createdAt||ord.createdAt) } }) }
      }
      items.sort((a,b)=> new Date(b.result.createdAt||0).getTime() - new Date(a.result.createdAt||0).getTime())
      setPrior(items)
      // Prefill prev values in the grid from the most recent previous result if available
      const latest = items[0]
      if (latest){
        const map: Record<string,string> = {}
        for (const r of latest.result.rows||[]){ const keyName = String(r.test||'').trim().toLowerCase(); if (keyName) map[keyName] = String(r.value||'') }
        setRows(prev => prev.map(row => {
          const k = String(row.test||'').trim().toLowerCase()
          return { ...row, prevValue: map[k] ?? row.prevValue }
        }))
      }
    }catch(e){ console.error('Failed to load previous results', e); setPrior([]) }
  }

  // Deep link edit: /lab/results?orderId=<id>&token=<lab#>
  useEffect(()=>{
    const orderId = searchParams.get('orderId')
    const token = searchParams.get('token') || undefined
    if (!orderId) return
    let cancelled = false
    ;(async()=>{
      try {
        // Load existing result
        const res = await labApi.listResults({ orderId, limit: 1 })
        const rec = Array.isArray(res.items) && res.items.length ? res.items[0] : null
        // Load order - try token search first for quicker lookup
        let ord: any = null
        if (token){
          const o1 = await labApi.listOrders({ q: token, limit: 500 })
          ord = (o1.items||[]).find((x:any)=> String(x._id) === String(orderId)) || null
        }
        if (!ord){
          const o2 = await labApi.listOrders({ limit: 500 })
          ord = (o2.items||[]).find((x:any)=> String(x._id) === String(orderId)) || null
        }
        if (cancelled || !ord) return
        const o: Order = { id: ord._id, createdAt: ord.createdAt || new Date().toISOString(), patient: ord.patient || { fullName: '-', phone: '' }, tests: ord.tests||[], status: ord.status || 'received', tokenNo: ord.tokenNo, sampleTime: ord.sampleTime, reportingTime: ord.reportingTime, returnedTests: Array.isArray(ord.returnedTests)? ord.returnedTests: [], referringConsultant: ord.referringConsultant }
        setSelected(o)
        const tid = o.tests?.[0] ? String(o.tests[0]) : null
        setSelectedTestId(tid)
        if (rec){
          setRows((rec.rows||[]).map((r:any)=>({ id: r.id || crypto.randomUUID(), test: r.test, normal: r.normal, unit: r.unit, prevValue: r.prevValue, value: r.value, flag: r.flag, comment: r.comment })))
          setInterpretation(rec.interpretation || '')
          setExistingResultId(String(rec._id || rec.id))
        } else {
          setRows([])
          setInterpretation('')
          setExistingResultId(null)
        }
        setReferring(o.referringConsultant || '')
        setTrack(prev => ({ ...prev, [o.id]: { status: o.status, tokenNo: o.tokenNo || genToken(o.createdAt, o.id), sampleTime: o.sampleTime, reportingTime: o.reportingTime } }))
        if (tid){
          try { await loadPreviousResults(o, tid) } catch {}
        }
      } catch (e){ console.error(e) }
    })()
    return ()=>{ cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!selected) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Result Entry</h2>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-base font-semibold text-slate-800">Select Sample</div>
          <div className="text-xs text-slate-500">Choose a sample to enter test results</div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by ID, patient, token, CNIC, phone..." className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>
            <select value={rowsPer} onChange={e=>{ setRowsPer(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">SR.NO</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">Token</th>
                  <th className="px-3 py-2">MR No</th>
                  <th className="px-3 py-2">Test</th>
                  <th className="px-3 py-2">CNIC</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.reduce((acc: any[], o) => {
                  const token = (track[o.id]?.tokenNo || genToken(o.createdAt, o.id))
                  const returned = new Set((o.returnedTests||[]).map(String))
                  o.tests.forEach((tid, idx) => {
                    if (returned.has(String(tid))) return
                    const tname = testsMap[tid]?.name || '—'
                    acc.push(
                      <tr key={`${o.id}-${tid}-${idx}`} className="border-b border-slate-100">
                        <td className="px-3 py-2">{start + acc.length}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{o.patient.fullName}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{token}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{o.patient.mrn || '-'}</td>
                        <td className="px-3 py-2">{tname}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{o.patient.cnic || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{o.patient.phone || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${(track[o.id]?.status || 'received')==='completed'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-700'}`}>{track[o.id]?.status || 'received'}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button onClick={()=>onSelect(o, String(tid))} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white">Select</button>
                        </td>
                      </tr>
                    )
                  })
                  return acc
                }, [] as any[])}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="p-6 text-sm text-slate-500">No samples found</div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <div>{total === 0 ? '0' : `${start}-${end}`} of {total}</div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={curPage<=1} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40 hover:bg-slate-50">Prev</button>
              <div>Page {curPage} / {pageCount}</div>
              <button onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={curPage>=pageCount} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Entry Mode UI
  const patient = selected.patient
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={()=>{ setSelected(null); setSelectedTestId(null) }} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /> Back</button>
        <h2 className="text-2xl font-bold text-slate-900">Result Entry</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
          <div>Sample ID: <span className="font-mono">{selected.id}</span></div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600">Referring Consultant</label>
            <input value={referring} onChange={e=>setReferring(e.target.value)} className="w-64 rounded-md border border-slate-300 px-2 py-1.5" placeholder="Optional" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-slate-800">Parameters</div>
            <div className="text-xs text-slate-500">Patient: {patient.fullName} • Age: {patient.age || '-'} • Sex: {patient.gender || '-'} • Test: {selectedTestId ? (testsMap[selectedTestId]?.name || '-') : '-'}</div>
          </div>
          <button onClick={addRow} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" /> Add Row</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Test</th>
                <th className="px-3 py-2">Normal Value</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Previous Result</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Flag</th>
                <th className="px-3 py-2">Comment</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-2"><input value={r.test} onChange={e=>setRows(rows=>rows.map((x,idx)=>idx===i?{...x,test:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-2 py-1.5" /></td>
                  <td className="px-3 py-2"><input value={r.normal || ''} onChange={e=>setRows(rows=>rows.map((x,idx)=>idx===i?{...x,normal:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-2 py-1.5" /></td>
                  <td className="px-3 py-2"><input value={r.unit || ''} onChange={e=>setRows(rows=>rows.map((x,idx)=>idx===i?{...x,unit:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-2 py-1.5" /></td>
                  <td className="px-3 py-2"><input value={r.prevValue || ''} onChange={e=>setRows(rows=>rows.map((x,idx)=>idx===i?{...x,prevValue:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-2 py-1.5 font-semibold" placeholder="Optional" /></td>
                  <td className="px-3 py-2"><input value={r.value || ''} onChange={e=>setRows(rows=>rows.map((x,idx)=>idx===i?{...x,value:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-2 py-1.5" /></td>
                  <td className="px-3 py-2">
                    <select value={r.flag || ''} onChange={e=>setRows(rows=>rows.map((x,idx)=>idx===i?{...x,flag:(e.target.value||undefined) as any}:x))} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-semibold">
                      <option value="">—</option>
                      <option value="normal">normal</option>
                      <option value="abnormal">abnormal</option>
                      <option value="critical">critical</option>
                    </select>
                  </td>
                  <td className="px-3 py-2"><input value={r.comment || ''} onChange={e=>setRows(rows=>rows.map((x,idx)=>idx===i?{...x,comment:e.target.value}:x))} className="w-full rounded-md border border-slate-300 px-2 py-1.5" placeholder="Optional" /></td>
                  <td className="px-3 py-2 text-right"><button onClick={()=>removeRow(r.id)} className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">Interpretation</div>
        <textarea value={interpretation} onChange={e=>setInterpretation(e.target.value)} className="mt-2 h-32 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Clinical interpretation..."></textarea>
      </div>

      {/* Previous Results */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-base font-semibold text-slate-800">Previous Results{selectedTestId ? ` — ${testsMap[selectedTestId]?.name || ''}` : ''}</div>
          <div className="text-xs text-slate-500">{prior.length ? `${prior.length} record${prior.length>1?'s':''}` : 'No previous results'}</div>
        </div>
        {prior.length>0 && (
          <div className="space-y-3">
            {prior.map((p)=>{
              const token = p.order.tokenNo || genToken(p.order.createdAt, p.order.id)
              return (
                <div key={p.result.id} className="rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 text-sm">
                    <div className="text-slate-700">{new Date(p.result.createdAt).toLocaleString()} • Token: <span className="font-mono">{token}</span></div>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>{
                        previewLabReportPdf({
                          tokenNo: token,
                          createdAt: p.order.createdAt,
                          sampleTime: p.order.sampleTime,
                          reportingTime: p.order.reportingTime,
                          patient: { fullName: p.order.patient.fullName, phone: p.order.patient.phone, mrn: p.order.patient.mrn, age: p.order.patient.age, gender: p.order.patient.gender, address: p.order.patient.address },
                          rows: (p.result.rows||[]).map((r:any)=>({ test: r.test, normal: r.normal, unit: r.unit, value: r.value, prevValue: r.prevValue, flag: r.flag, comment: r.comment })),
                          interpretation: p.result.interpretation,
                          referringConsultant: p.order.referringConsultant,
                          profileLabel: (()=>{ const first = p.order.tests?.[0] ? String(p.order.tests[0]) : ''; return first ? (testsMap[first]?.name || '') : '' })(),
                        })
                      }} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Reprint</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto p-3">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-2 py-1 text-left">Test</th>
                          <th className="px-2 py-1 text-left">Value</th>
                          <th className="px-2 py-1 text-left">Unit</th>
                          <th className="px-2 py-1 text-left">Normal</th>
                          <th className="px-2 py-1 text-left">Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(p.result.rows||[]).map((r:any, i:number)=> (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="px-2 py-1">{r.test}</td>
                            <td className="px-2 py-1">{r.value || '-'}</td>
                            <td className="px-2 py-1">{r.unit || '-'}</td>
                            <td className="px-2 py-1">{r.normal || '-'}</td>
                            <td className="px-2 py-1">{r.flag || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {p.result.interpretation && (
                      <div className="mt-2 whitespace-pre-wrap text-xs text-slate-700"><span className="font-semibold">Interpretation:</span> {p.result.interpretation}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={()=>{
          const tokenNo = track[selected.id]?.tokenNo || genToken(selected.createdAt, selected.id)
          previewLabReportPdf({
            tokenNo,
            createdAt: selected.createdAt,
            sampleTime: track[selected.id]?.sampleTime,
            reportingTime: track[selected.id]?.reportingTime,
            patient: { fullName: patient.fullName, phone: patient.phone, mrn: patient.mrn, age: patient.age, gender: patient.gender, address: patient.address },
            rows,
            interpretation,
            referringConsultant: referring.trim() || undefined,
            profileLabel: selectedTestId ? (testsMap[selectedTestId]?.name || '') : undefined,
          })
        }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Print Report</button>
        <button onClick={()=>{ setSelected(null); setSelectedTestId(null) }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Back</button>
        <button onClick={save} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Submit</button>
      </div>
    </div>
  )
}
