import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { diagnosticApi } from '../../utils/api'
import { DiagnosticTemplateRegistry } from '../../components/diagnostic/registry'
import { CheckCircle2, Minus, Plus } from 'lucide-react'

type Order = { id: string; tokenNo?: string; createdAt?: string; patient: any; tests: string[]; referringConsultant?: string; items?: Array<{ testId: string; status: 'received'|'completed'|'returned'; sampleTime?: string; reportingTime?: string }>; status?: 'received'|'completed'|'returned' }
type Test = { id: string; name: string; templateHtml?: string; picturesEnabled?: boolean }

const FIELD_TEMPLATE_MARKER = 'HMS_FIELD_TEMPLATE'

type FieldTemplateDef = { fields: Array<{ id: string; label: string; parts?: number }> }

type FieldTemplateFormData = { kind: 'field_template'; fields: Array<{ id: string; label: string; values: string[] }> }

function parseFieldTemplateFromHtml(html: string): null | FieldTemplateDef{

  try {

    const s = String(html || '')

    const idx = s.indexOf(`<!--${FIELD_TEMPLATE_MARKER}:`)

    if (idx < 0) return null

    const end = s.indexOf('-->', idx)

    if (end < 0) return null

    const json = s.slice(idx + (`<!--${FIELD_TEMPLATE_MARKER}:`).length, end).trim()

    const parsed = JSON.parse(json)

    const fieldsIn = Array.isArray(parsed?.fields) ? parsed.fields : []

    const fields = fieldsIn

      .map((x: any) => ({ id: String(x?.id || ''), label: String(x?.label || ''), parts: Math.max(1, Math.min(6, Number(x?.parts || 1))) }))

      .filter((x: any) => x && x.id && typeof x.label === 'string')

    if (!fields.length) return null

    return { fields }

  } catch { return null }

}

function escapeHtml(s: string){

  return String(s || '')

    .replaceAll('&', '&amp;')

    .replaceAll('<', '&lt;')

    .replaceAll('>', '&gt;')

    .replaceAll('"', '&quot;')

    .replaceAll("'", '&#39;')

}

function buildFieldTemplateResultHtml(form: FieldTemplateFormData){

  const rows = (form.fields || []).map(f => {

    const label = escapeHtml(String(f.label || '').trim())

    const parts = Array.isArray((f as any).values) ? (f as any).values : [String((f as any).value || '')]
    const safeParts = parts.map((p: any) => escapeHtml(String(p || '').trim()))
    const cell = safeParts.length <= 1

      ? (safeParts[0] || '<br/>')

      : (safeParts.length === 2

          ? `<table style="width:100%; border-collapse:collapse; table-layout:fixed;"><colgroup><col style=\"width:25%;\" /><col style=\"width:75%;\" /></colgroup><tr>${safeParts.map((p: string, idx: number) => {
              const borderLeft = idx > 0 ? 'border-left:1px solid #94a3b8;' : ''
              return `<td style=\"${borderLeft} padding:10px; vertical-align:top;\">${p || '<br/>'}</td>`
            }).join('')}</tr></table>`

          : `<table style="width:100%; border-collapse:collapse; table-layout:fixed;"><tr>${safeParts.map((p: string, idx: number) => {
              const borderLeft = idx > 0 ? 'border-left:1px solid #94a3b8;' : ''
              return `<td style=\"${borderLeft} padding:10px; vertical-align:top;\">${p || '<br/>'}</td>`
            }).join('')}</tr></table>`)

    return `<tr><td style="border:1px solid #94a3b8; padding:10px; width:38%; font-weight:600; background:#f8fafc; vertical-align:top;">${label}</td><td style="border:1px solid #94a3b8; padding:0; vertical-align:top;">${cell}</td></tr>`

  }).join('')

  return `<table style="width:100%; border-collapse:collapse; table-layout:fixed;">${rows}</table>`

}

function formatDateTimeParts(iso?: string) {
  const d = new Date(iso || new Date().toISOString());
  return { date: d.toLocaleDateString(), time: d.toLocaleTimeString() }
}

export default function Diagnostic_ResultEntry(){
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const testsMap = useMemo(()=> Object.fromEntries(tests.map(t=>[t.id, t.name])), [tests])
  const testById = useMemo(()=> Object.fromEntries(tests.map(t=>[t.id, t])), [tests])

  const [resultMap, setResultMap] = useState<Record<string, { id: string; status: 'draft' | 'final' }>>({})

  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [selectedTestId, setSelectedTestId] = useState<string>('')
  const [value, setValue] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [fieldForm, setFieldForm] = useState<FieldTemplateFormData | null>(null)
  const [resultId, setResultId] = useState<string | null>(null)
  const [orderFromResult, setOrderFromResult] = useState<Order | null>(null)
  const selectedOrder = useMemo(()=> orders.find(o=>o.id===selectedOrderId) || orderFromResult || null, [orders, selectedOrderId, orderFromResult])
  const selectedTestName = useMemo(()=> testsMap[selectedTestId] || '', [testsMap, selectedTestId])
  const selectedTest = useMemo(()=> (selectedTestId ? (testById[selectedTestId] || null) : null), [testById, selectedTestId])
  const selectedFieldTemplateDef = useMemo(()=> {

    const tpl = String(selectedTest?.templateHtml || '')

    return parseFieldTemplateFromHtml(tpl)

  }, [selectedTest])
  const isFieldTemplate = !!selectedFieldTemplateDef

  const [dialogOpen, setDialogOpen] = useState(false)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [templateMappings, setTemplateMappings] = useState<Array<{ testId: string; templateKey: string }>>([])
  const templateKeyByTestId = useMemo(()=> Object.fromEntries((templateMappings||[]).map(m=> [String(m.testId), String(m.templateKey)])), [templateMappings])

  // Filters & pagination (aligned with Sample Tracking)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'all'|'received'|'completed'|'returned'>('completed')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Load tests list (for name mapping)
  useEffect(()=>{ (async()=>{
    try {
      const tr = await diagnosticApi.listTests({ limit: 1000 }) as any
      setTests(
        (tr?.items||tr||[]).map((t:any)=>({
          id: String(t._id||t.id),
          name: String(t.name||''),
          templateHtml: t.templateHtml || '',
          picturesEnabled: !!t.picturesEnabled,
        }))
      )
    } catch { setTests([]) }
  })() }, [])

  // Load template mappings from settings
  useEffect(()=>{ (async()=>{
    try {
      const s = await diagnosticApi.getSettings() as any
      const arr = Array.isArray(s?.templateMappings) ? s.templateMappings : []
      setTemplateMappings(arr.map((x:any)=> ({ testId: String(x.testId||''), templateKey: String(x.templateKey||'') })))
    } catch { setTemplateMappings([]) }
  })() }, [])

  // Load orders according to filters/pagination
  useEffect(()=>{ let mounted = true; (async()=>{
    try {
      // Important: always load orders without server-side status filtering,
      // then filter per-test status client-side based on order.items.
      const res = await diagnosticApi.listOrders({ q: q || undefined, from: from || undefined, to: to || undefined, page, limit: rows }) as any
      const items: Order[] = (res.items||[]).map((x:any)=>({ id: String(x._id), tokenNo: x.tokenNo, createdAt: x.createdAt, patient: x.patient, tests: x.tests||[], referringConsultant: x.referringConsultant, items: x.items||[], status: x.status }))
      if (mounted){ setOrders(items); setTotal(Number(res.total||items.length||0)); setTotalPages(Number(res.totalPages||1)) }
    } catch { if (mounted){ setOrders([]); setTotal(0); setTotalPages(1) } }
  })(); return ()=>{ mounted=false } }, [q, from, to, status, page, rows])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const pairs: Array<{ orderId: string; testId: string }> = []
        for (const o of orders) {
          const visibleTests = (o.tests || []).filter(tid => {
            const item = (o.items || []).find(i => i.testId === tid)
            const istatus: 'received' | 'completed' | 'returned' = (item?.status || 'received') as any
            if (status === 'all') return true
            return istatus === status
          })
          for (const tid of visibleTests) pairs.push({ orderId: o.id, testId: String(tid) })
        }
        const existingKeys = new Set(Object.keys(resultMap || {}))
        const need = pairs.filter(p => !existingKeys.has(`${p.orderId}:${p.testId}`))
        if (!need.length) return
        const resList = await Promise.all(
          need.map(async p => {
            try {
              const r = await diagnosticApi.listResults({ orderId: p.orderId, testId: p.testId, limit: 1 }) as any
              const item = (r?.items || [])[0]
              if (!item) return null
              return { key: `${p.orderId}:${p.testId}`, id: String(item._id || item.id || ''), status: String(item.status || 'draft') as any }
            } catch {
              return null
            }
          })
        )
        if (cancelled) return
        const patch: any = {}
        for (const rec of resList) {
          if (!rec || !rec.key || !rec.id) continue
          patch[rec.key] = { id: rec.id, status: rec.status }
        }
        if (Object.keys(patch).length) setResultMap(prev => ({ ...(prev || {}), ...patch }))
      } catch {}
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, status])

  // When order/test change, load existing result or clear
  useEffect(()=>{ (async()=>{
    setValue(''); setImages([]); setResultId(null); setFieldForm(null)
    if (!selectedOrderId || !selectedTestId) return
    try {
      const r = await diagnosticApi.listResults({ orderId: selectedOrderId, testId: selectedTestId, limit: 1 }) as any
      const item = (r?.items||[])[0]
      if (item){
        setResultId(String(item._id))
        const fd = (item as any)?.formData
        if (fd && typeof fd === 'object' && String((fd as any)?.kind || '') === 'field_template' && Array.isArray((fd as any)?.fields)){

          const fieldsIn = (fd as any).fields

          setFieldForm({
            kind: 'field_template',
            fields: fieldsIn.map((x: any) => {
              const values = Array.isArray(x?.values) ? x.values : [String(x?.value || '')]
              return { id: String(x?.id || ''), label: String(x?.label || ''), values: values.map((v: any) => String(v || '')) }
            }).filter((x: any) => x && x.id),
          })

          setValue('')

        } else {

          setFieldForm(null)

          setValue(typeof fd === 'string' ? fd : JSON.stringify(fd || ''))

        }
        setImages(Array.isArray((item as any)?.images) ? (item as any).images.map(String) : [])
      } else {
        const t = testById[selectedTestId]
        const tpl = String(t?.templateHtml || '')

        const parsedField = parseFieldTemplateFromHtml(tpl)

        if (parsedField) {

          setFieldForm({
            kind: 'field_template',
            fields: parsedField.fields.map(f => {
              const parts = Math.max(1, Math.min(6, Number((f as any)?.parts || 1)))
              return { id: String(f.id), label: String(f.label || ''), values: Array.from({ length: parts }).map(() => '') }
            }),
          })

          setValue('')

        } else {

          if (tpl) setValue(tpl)

        }
      }
    } catch {}
  })() }, [selectedOrderId, selectedTestId])

  // Support deep-linking via query params (orderId, testId, resultId)
  useEffect(()=>{ (async()=>{
    const oid = searchParams.get('orderId') || ''
    const tid = searchParams.get('testId') || ''
    const rid = searchParams.get('resultId') || ''
    if (oid) setSelectedOrderId(oid)
    if (tid) setSelectedTestId(tid)
    if (rid){
      try {
        const r = await diagnosticApi.getResult(rid) as any
        if (r){
          setResultId(String(r._id))
          const fd = (r as any)?.formData
          setValue(typeof fd === 'string' ? fd : JSON.stringify(fd || ''))
          setImages(Array.isArray((r as any)?.images) ? (r as any).images.map(String) : [])
          if (r.orderId) setSelectedOrderId(String(r.orderId))
          if (r.testId) setSelectedTestId(String(r.testId))
          // Provide snapshot so Print/Finalize works even if the order is not in the received list
          setOrderFromResult({ id: String(r.orderId), tokenNo: r.tokenNo, createdAt: r.createdAt, patient: r.patient||{}, tests: Array.isArray((r as any)?.tests)? (r as any).tests : [], referringConsultant: (r as any)?.patient?.referringConsultant, items: [], status: undefined as any })
          // Ensure testsMap can resolve test name for form selection
          if (r.testId && r.testName){
            setTests(prev => prev.some(t=> t.id === String(r.testId)) ? prev : [...prev, { id: String(r.testId), name: String(r.testName) }])
          }
          setDialogOpen(true)
        }
      } catch {}
    }
  })() }, [searchParams])

  useEffect(() => {
    if (!dialogOpen) return
    try {
      const el = editorRef.current
      if (!el) return
      if (isFieldTemplate) return

      if ((el.innerHTML || '') !== (value || '')) el.innerHTML = value || ''
    } catch {}
  }, [dialogOpen, value, isFieldTemplate])

  const extractTableOnlyHtml = (raw: string) => {
    try {
      const doc = new DOMParser().parseFromString(String(raw || ''), 'text/html')
      const table = doc.querySelector('table')
      const html = table ? String((table as any).outerHTML || '') : ''
      return html
    } catch {
      return ''
    }
  }

  const isSelectionInsideTableCell = () => {
    try {
      const root = editorRef.current
      if (!root) return false
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return false
      const node = sel.anchorNode as any
      const el = (node?.nodeType === 1 ? node : node?.parentElement) as HTMLElement | null
      if (!el) return false
      const cell = el.closest('td,th')
      if (!cell) return false
      return root.contains(cell)
    } catch {
      return false
    }
  }

  const enforceTableOnly = () => {
    try {
      const root = editorRef.current
      if (!root) return
      const next = extractTableOnlyHtml(root.innerHTML || '')
      if ((root.innerHTML || '') !== next) root.innerHTML = next
      if (value !== next) setValue(next)
    } catch {}
  }

  const onPickImages = async (files: FileList | null) => {
    if (!files || !files.length) return
    const readOne = (f: File) => new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result || ''))
      r.onerror = () => reject(new Error('Failed to read file'))
      r.readAsDataURL(f)
    })
    try {
      const next = await Promise.all(Array.from(files).map(readOne))
      setImages(prev => [...prev, ...next].filter(Boolean))
    } catch {}
  }

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx))

  const closeDialog = () => {
    setDialogOpen(false)
    setSelectedOrderId('')
    setSelectedTestId('')
    setValue('')
    setImages([])
    setResultId(null)
    setOrderFromResult(null)
  }

  async function save(){
    if (!selectedOrder || !selectedTestId) return
    const formDataToSave: any = isFieldTemplate && fieldForm

      ? fieldForm

      : extractTableOnlyHtml(editorRef.current ? (editorRef.current.innerHTML || '') : value)

    const formDataForUpdate: any = formDataToSave
    const payload = {
      orderId: selectedOrder.id,
      testId: selectedTestId,
      testName: selectedTestName,
      tokenNo: selectedOrder.tokenNo,
      patient: selectedOrder.patient,
      formData: formDataToSave,
      images,
      status: 'final',
      reportedAt: new Date().toISOString(),
    }
    const mapKey = `${selectedOrder.id}:${selectedTestId}`
    if (resultId){
      await diagnosticApi.updateResult(resultId, { formData: formDataForUpdate, images, status: 'final', reportedAt: payload.reportedAt })
      setResultMap(prev => ({ ...(prev || {}), [mapKey]: { id: String(resultId), status: 'final' } }))
    } else {
      const created = await diagnosticApi.createResult(payload as any) as any
      const createdId = String(created?._id || created?.id || '')
      if (createdId) {
        setResultId(createdId)
        setResultMap(prev => ({ ...(prev || {}), [mapKey]: { id: createdId, status: 'final' } }))
      }
    }
    // Optimistically mark this test as completed so it disappears from the list (received filter)
    setOrders(prev => prev.map(o => {
      if (o.id !== selectedOrder.id) return o
      const items = Array.isArray(o.items) ? o.items.slice() : []
      const idx = items.findIndex(i=> i.testId===selectedTestId)
      const now = new Date().toISOString()
      if (idx>=0) items[idx] = { ...items[idx], status: 'completed', reportingTime: now }
      else items.push({ testId: selectedTestId, status: 'completed', reportingTime: now })
      return { ...o, items }
    }))
    // Clear selection
    closeDialog()
    alert('Result finalized')
  }

  async function printNow(){
    if (!selectedOrder || !selectedTestId) return
    const htmlValue = isFieldTemplate && fieldForm

      ? buildFieldTemplateResultHtml(fieldForm)

      : (editorRef.current ? (editorRef.current.innerHTML || '') : value)
    const key = templateKeyByTestId[selectedTestId]
    const tpl = key ? (DiagnosticTemplateRegistry as any)[key] : null
    if (!tpl || !tpl.print){ alert('No report template mapped for this test. Please set mapping in Diagnostic Settings.'); return }
    await tpl.print({ tokenNo: selectedOrder.tokenNo, createdAt: selectedOrder.createdAt, reportedAt: new Date().toISOString(), patient: selectedOrder.patient, value: htmlValue, referringConsultant: selectedOrder.referringConsultant })
  }

  // Pagination helpers
  const pageCount = Math.max(1, totalPages)

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-2xl font-bold text-slate-900">Result Entry</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[260px] flex-1">
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by token, patient, or test..." className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <button onClick={()=>{ setStatus('all'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='all'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>All</button>
            <button onClick={()=>{ setStatus('received'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='received'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Received</button>
            <button onClick={()=>{ setStatus('completed'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='completed'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Completed</button>
            <button onClick={()=>{ setStatus('returned'); setPage(1) }} className={`rounded-md px-3 py-1.5 border ${status==='returned'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Returned</button>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span>Rows</span>
            <select value={rows} onChange={e=>{ setRows(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">DateTime</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Token No</th>
              <th className="px-4 py-2">Test</th>
              <th className="px-4 py-2">MR No</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.reduce((acc: any[], o) => {
              const token = o.tokenNo || '-'
              const visibleTests = (o.tests||[]).filter((tid)=>{
                const item = (o.items||[]).find(i=> i.testId===tid)
                const istatus: 'received'|'completed'|'returned' = (item?.status || 'received') as any
                if (status==='all') return true
                return istatus === status
              })
              visibleTests.forEach((tid, idx) => {
                const tname = testsMap[tid] || '—'
                const isActive = selectedOrderId===o.id && selectedTestId===tid
                const key = `${o.id}:${String(tid)}`
                const existing = (resultMap || {})[key]
                const hasResult = !!existing?.id && (existing?.status === 'final' || existing?.status === 'draft')
                acc.push(
                  <tr key={`${o.id}-${tid}-${idx}`} className={`border-b border-slate-100 ${isActive? 'bg-violet-50' : ''}`}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="leading-tight">
                        <div>{formatDateTimeParts(o.createdAt||'').date}</div>
                        <div className="text-xs text-slate-500">{formatDateTimeParts(o.createdAt||'').time}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient?.fullName || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{token}</td>
                    <td className="px-4 py-2">{tname}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient?.mrn || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient?.phone || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        onClick={()=>{
                          setOrderFromResult(null)
                          setSelectedOrderId(o.id)
                          setSelectedTestId(String(tid))
                          if (existing?.id) setResultId(String(existing.id))
                          setDialogOpen(true)
                        }}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white ${hasResult ? 'bg-slate-700 hover:bg-slate-800' : 'bg-violet-600 hover:bg-violet-700'}`}
                      >
                        {hasResult && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                        {hasResult ? 'Edit' : 'Enter Result'}
                      </button>
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

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>{total === 0 ? '0' : `${Math.min((Math.min(page, pageCount) - 1) * rows + 1, total)}-${Math.min((Math.min(page, pageCount) - 1) * rows + orders.length, total)}`} of {total}</div>
        <div className="flex items-center gap-2">
          <button disabled={page<=1} onClick={()=> setPage(p=> Math.max(1, p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Prev</button>
          <span>{Math.min(page, pageCount)} / {pageCount}</span>
          <button disabled={page>=pageCount} onClick={()=> setPage(p=> p+1)} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>

      {dialogOpen && selectedOrder && selectedTestId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-2 sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-start justify-between border-b border-slate-200">
              <div className="p-4 sm:p-6">
                <div className="text-lg font-semibold text-slate-800">Enter Result</div>
                <div className="mt-1 text-sm text-slate-600">
                  {selectedOrder?.patient?.fullName || '-'}
                  {' · '}
                  Token: {selectedOrder?.tokenNo || '-'}
                  {' · '}
                  Test: {selectedTestName || '-'}
                </div>
              </div>
              <button onClick={closeDialog} className="p-4 sm:p-6 text-slate-500 hover:text-slate-700 text-xl">✖</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {!isFieldTemplate && (

                <>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          editorRef.current?.focus()
                          document.execCommand('bold')
                        } catch {}
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-slate-200"
                      aria-label="Bold"
                    >
                      <span className="font-bold">B</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          editorRef.current?.focus()
                          document.execCommand('underline')
                        } catch {}
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-slate-200"
                      aria-label="Underline"
                    >
                      <span className="underline">U</span>
                    </button>
                  </div>

                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => setValue(editorRef.current?.innerHTML || '')}
                    onBlur={enforceTableOnly}
                    onKeyDown={e => {
                      if (!isSelectionInsideTableCell()) {
                        const allowed = ['Escape', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
                        if (!allowed.includes(e.key)) e.preventDefault()
                      }
                    }}
                    onPaste={e => {
                      if (!isSelectionInsideTableCell()) {
                        e.preventDefault()
                        return
                      }
                      try {
                        setTimeout(() => enforceTableOnly(), 0)
                      } catch {}
                    }}
                    className="mt-3 min-h-[320px] w-full bg-white p-3 text-sm outline-none"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                  />

                </>

              )}

              {isFieldTemplate && fieldForm && (

                <div className="mt-3 space-y-4">

                  {(() => {
                    const fields = fieldForm.fields || []
                    type Block =
                      | { kind: 'single'; field: typeof fields[number]; idx: number }
                      | { kind: 'group'; label: string; items: Array<{ field: typeof fields[number]; idx: number }> }

                    const blocks: Block[] = []
                    const groupIndexByLabel = new Map<string, number>()

                    for (let i = 0; i < fields.length; i++){
                      const f = fields[i]
                      const label = String(f?.label || '').trim()
                      const isSplit = (f.values || []).length === 2
                      if (isSplit && label){
                        const existingIdx = groupIndexByLabel.get(label)
                        if (existingIdx == null){
                          groupIndexByLabel.set(label, blocks.length)
                          blocks.push({ kind: 'group', label, items: [{ field: f, idx: i }] })
                        } else {
                          const b = blocks[existingIdx]
                          if (b && b.kind === 'group') b.items.push({ field: f, idx: i })
                          else blocks.push({ kind: 'single', field: f, idx: i })
                        }
                      } else {
                        blocks.push({ kind: 'single', field: f, idx: i })
                      }
                    }

                    const renderSplitInputs = (f: any, placeholderBase?: string, placeholderIdx?: number) => (
                      <div className="flex gap-2">
                        {(f.values || ['', '']).map((val: string, partIdx: number) => (
                          <textarea
                            key={`${f.id}-${partIdx}`}
                            value={val}
                            onChange={e => {
                              const v = e.target.value
                              setFieldForm(prev => {
                                if (!prev) return prev
                                return {
                                  ...prev,
                                  fields: (prev.fields || []).map(x => {
                                    if (x.id !== f.id) return x
                                    const arr = Array.isArray((x as any).values) ? (x as any).values.slice() : ['', '']
                                    arr[partIdx] = v
                                    return { ...x, values: arr }
                                  }),
                                }
                              })
                            }}
                            placeholder={`Enter ${placeholderBase || f.label || 'value'}${placeholderIdx != null ? `(${placeholderIdx})` : ''}`}
                            className={`min-h-[86px] rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 ${partIdx === 0 ? 'w-[25%] flex-none' : 'flex-1'}`}
                          />
                        ))}
                      </div>
                    )

                    return blocks.map((b, bIdx) => {
                      if (b.kind === 'group'){
                        return (
                          <div key={`g-${bIdx}-${b.label}`} className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-slate-800">{b.label}</div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFieldForm(prev => {
                                      if (!prev) return prev
                                      const label = String(b.label || '').trim()
                                      const next = (prev.fields || []).slice()
                                      const matches = next
                                        .map((f, idx) => ({ f, idx }))
                                        .filter(({ f }) => String(f?.label || '').trim() === label && Array.isArray((f as any).values) && ((f as any).values || []).length === 2)
                                      const insertAt = matches.length ? (matches[matches.length - 1].idx + 1) : next.length
                                      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
                                      const newField: any = { id, label, values: ['', ''] }
                                      next.splice(insertAt, 0, newField)
                                      return { ...prev, fields: next }
                                    })
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                  title="Add split field"
                                  aria-label="Add split field"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFieldForm(prev => {
                                      if (!prev) return prev
                                      const label = String(b.label || '').trim()
                                      const next = (prev.fields || []).slice()
                                      const matches = next
                                        .map((f, idx) => ({ f, idx }))
                                        .filter(({ f }) => String(f?.label || '').trim() === label && Array.isArray((f as any).values) && ((f as any).values || []).length === 2)
                                      if (matches.length <= 1) return prev
                                      const removeIdx = matches[matches.length - 1].idx
                                      next.splice(removeIdx, 1)
                                      return { ...prev, fields: next }
                                    })
                                  }}
                                  disabled={b.items.length <= 1}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Remove split field"
                                  aria-label="Remove split field"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {b.items.map((it, j) => (
                                <div key={it.field.id} className="space-y-1">
                                  {renderSplitInputs(it.field, b.label, j + 1)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }

                      const f = b.field
                      const idx = b.idx
                      return (
                        <div key={f.id} className="space-y-1">
                          <div className="text-sm font-semibold text-slate-800">{f.label || `Field ${idx + 1}`}</div>
                          {(f.values || []).length === 2 ? (
                            renderSplitInputs(f)
                          ) : (
                            <div className={`grid gap-2 ${Math.max(1, (f.values || []).length) > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                              {(f.values && f.values.length ? f.values : ['']).map((val: string, partIdx: number) => (
                                <textarea
                                  key={`${f.id}-${partIdx}`}
                                  value={val}
                                  onChange={e => {
                                    const v = e.target.value
                                    setFieldForm(prev => {
                                      if (!prev) return prev
                                      return {
                                        ...prev,
                                        fields: (prev.fields || []).map(x => {
                                          if (x.id !== f.id) return x
                                          const arr = Array.isArray((x as any).values) ? (x as any).values.slice() : ['']
                                          arr[partIdx] = v
                                          return { ...x, values: arr }
                                        }),
                                      }
                                    })
                                  }}
                                  placeholder={`Enter ${f.label || 'value'}${(f.values || []).length > 1 ? ` (${partIdx + 1})` : ''}`}
                                  className="min-h-[86px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}

                </div>

              )}

              {!!testById[selectedTestId]?.picturesEnabled && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-800">Images</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e => onPickImages(e.target.files)} />
                      Upload Images
                    </label>
                    <div className="text-xs text-slate-500">(Multiple images supported)</div>
                  </div>
                  {images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {images.map((src, idx) => (
                        <div key={`${idx}-${src.slice(0,20)}`} className="relative overflow-hidden rounded-lg border border-slate-200">
                          <img src={src} alt="result" className="h-28 w-full object-cover" />
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute right-1 top-1 rounded bg-white/90 px-2 py-1 text-xs text-rose-700 hover:bg-white"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 sm:p-6">
              <button onClick={printNow} disabled={!selectedOrderId || !selectedTestId} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Print</button>
              <button onClick={()=>save()} disabled={!selectedOrderId || !selectedTestId} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Finalize</button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  )
}
