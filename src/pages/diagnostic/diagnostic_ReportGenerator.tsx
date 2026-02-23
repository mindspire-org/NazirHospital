import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { diagnosticApi } from '../../utils/api'
import { DiagnosticTemplateRegistry } from '../../components/diagnostic/registry'
import { Pencil, Printer, Trash2 } from 'lucide-react'

type Result = { id: string; tokenNo?: string; testName: string; patient?: any; status: 'draft'|'final'; reportedAt?: string; formData?: any; images?: string[]; createdAt?: string; orderId?: string; testId?: string }

function escapeHtml(s: string){

  return String(s || '')

    .replaceAll('&', '&amp;')

    .replaceAll('<', '&lt;')

    .replaceAll('>', '&gt;')

    .replaceAll('"', '&quot;')

    .replaceAll("'", '&#39;')

}

function buildFieldTemplateResultHtml(fields: Array<{ label?: string; value?: string; values?: string[] }>){

  const safeFields = Array.isArray(fields) ? fields : []

  const groups: Record<string, Array<{ label: string; arr: string[]; isTwo: boolean }>> = {}
  const order: string[] = []

  for (const f of safeFields){
    const rawLabel = String(f?.label || '').trim()
    const labelKey = rawLabel || `__EMPTY__${Math.random().toString(16).slice(2)}`
    const label = escapeHtml(rawLabel)
    const arr = Array.isArray((f as any)?.values)
      ? ((f as any).values as any[]).map(x => String(x || ''))
      : [String((f as any)?.value || '')]
    const isTwo = Array.isArray((f as any)?.values) && arr.length === 2
    if (!groups[labelKey]){ groups[labelKey] = []; order.push(labelKey) }
    groups[labelKey].push({ label, arr, isTwo })
  }

  const renderItem = (it: { arr: string[]; isTwo: boolean }) => {
    if (it.isTwo){
      const left = escapeHtml(String(it.arr[0] || '').trim()) || '&nbsp;'
      const right = escapeHtml(String(it.arr[1] || '').trim()) || '&nbsp;'
      return `<table style="width:100%; border-collapse:collapse; table-layout:fixed;"><colgroup><col style=\"width:25%;\" /><col style=\"width:75%;\" /></colgroup><tr><td style=\"border:1px solid #94a3b8; padding:10px; vertical-align:top; font-weight:700;\">${left}</td><td style=\"border:1px solid #94a3b8; padding:10px; vertical-align:top;\">${right}</td></tr></table>`
    }
    const items = (it.arr || [])
      .flatMap(v => String(v || '').split(/\r?\n/))
      .map(x => x.trim())
      .filter(Boolean)
    return items.length
      ? `<ul class="ft-ul">${items.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
      : `<div class="ft-empty">&nbsp;</div>`
  }

  const blocks = order.map(key => {
    const items = groups[key] || []
    const label = items[0]?.label || ''
    const body = items.length && items.every(it => it.isTwo)
      ? (() => {
          const rows = items.map(it => {
            const left = escapeHtml(String(it.arr[0] || '').trim()) || '&nbsp;'
            const right = escapeHtml(String(it.arr[1] || '').trim()) || '&nbsp;'
            return `<tr><td style="border:1px solid #94a3b8; padding:10px; vertical-align:top; font-weight:700;">${left}</td><td style="border:1px solid #94a3b8; padding:10px; vertical-align:top;">${right}</td></tr>`
          }).join('')
          return `<table style="width:100%; border-collapse:collapse; table-layout:fixed;"><colgroup><col style=\"width:25%;\" /><col style=\"width:75%;\" /></colgroup>${rows}</table>`
        })()
      : items.map((it, idx) => {
          const mt = idx > 0 ? 'margin-top:6px;' : ''
          return `<div style="${mt}">${renderItem(it)}</div>`
        }).join('')
    return `

      <div class="ft-block">

        <div class="ft-label">${label}</div>

        ${body}

      </div>

    `
  }).join('')

  return `<div class="ft-wrap">${blocks}</div>`
}

function normalizeResultValueHtml(formData: any): string{

  if (formData == null) return ''

  if (typeof formData === 'string') return String(formData || '')

  if (typeof formData === 'object'){

    if (String((formData as any)?.kind || '') === 'field_template' && Array.isArray((formData as any)?.fields)){

      const fields = (formData as any).fields.map((x: any) => ({ label: String(x?.label || ''), value: String(x?.value || ''), values: Array.isArray(x?.values) ? x.values.map((v: any) => String(v || '')) : undefined }))

      return buildFieldTemplateResultHtml(fields)

    }

  }

  try { return escapeHtml(JSON.stringify(formData)) } catch { return '' }

}

export default function Diagnostic_ReportGenerator(){
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'all'|'draft'|'final'>('all')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<Result[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [templateMappings, setTemplateMappings] = useState<Array<{ testId: string; templateKey: string }>>([])

  const settingsRef = useRef<any>(null)

  useEffect(()=>{ let mounted = true; (async()=>{
    try {
      const res = await diagnosticApi.listResults({ q: q||undefined, from: from||undefined, to: to||undefined, status: status==='all'? undefined : status, page, limit: rows }) as any
      const arr: Result[] = (res.items||[]).map((x:any)=>({ id: String(x._id), tokenNo: x.tokenNo, testName: x.testName, patient: x.patient, status: x.status||'draft', reportedAt: x.reportedAt, formData: x.formData, images: Array.isArray(x.images) ? x.images.map((s:any)=>String(s||'')) : [], createdAt: x.createdAt, orderId: String(x.orderId||''), testId: String(x.testId||'') }))
      if (mounted){ setItems(arr); setTotal(Number(res.total||arr.length||0)); setTotalPages(Number(res.totalPages||1)) }
    } catch { if (mounted){ setItems([]); setTotal(0); setTotalPages(1) } }
  })(); return ()=>{ mounted=false } }, [q, from, to, status, page, rows])

  useEffect(()=>{ (async()=>{
    try {
      const s = await diagnosticApi.getSettings() as any
      const arr = Array.isArray(s?.templateMappings) ? s.templateMappings : []
      settingsRef.current = s
      setTemplateMappings(arr.map((x:any)=> ({ testId: String(x.testId||''), templateKey: String(x.templateKey||'') })))
    } catch { setTemplateMappings([]) }
  })() }, [])

  const pageCount = Math.max(1, totalPages)
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + items.length, total)

  function printHtmlWithDiagnosticChrome(input: {
    tokenNo?: string
    createdAt?: string
    reportedAt?: string
    patient: { fullName?: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
    valueHtml: string
    images?: string[]
    referringConsultant?: string
    title?: string
    autoPrint?: boolean
  }){
    const s: any = settingsRef.current || {}
    const name = s?.diagnosticName || 'Diagnostic Center'
    const address = s?.address || '-'
    const phone = s?.phone || ''
    const email = s?.email || ''
    const department = s?.department || 'Department of Diagnostics'
    const logoRaw = s?.logoDataUrl || s?.logoUrl || s?.logo || ''
    const footer = s?.reportFooter || ''

    const rawBase = (import.meta as any).env?.VITE_API_URL as string | undefined
    const apiBase = rawBase
      ? (/^https?:/i.test(rawBase) ? rawBase : `http://127.0.0.1:4000${rawBase}`)
      : 'http://127.0.0.1:4000/api'
    const backendBase = String(apiBase || '').replace(/\/api\/?$/i, '')

    const esc = (x: any)=> String(x==null?'':x)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;')
    const fmt = (iso?: string)=>{ const d = iso? new Date(iso): new Date(); return d.toLocaleDateString()+" "+d.toLocaleTimeString() }

    const consultants = ((()=>{
      const arr: Array<{ name?: string; degrees?: string; title?: string }> = []
      arr.push({ name: (s as any)?.consultantName, degrees: (s as any)?.consultantDegrees, title: (s as any)?.consultantTitle })
      const extra = Array.isArray((s as any)?.consultants) ? (s as any).consultants : []
      for (const c of extra) arr.push({ name: c?.name, degrees: c?.degrees, title: c?.title })
      const filtered = arr.filter(c => (c?.name || c?.degrees || c?.title))
      const out = filtered.slice(0,3)
      if (out.length === 1){ while (out.length < 3) out.push(out[0]) }
      return out
    })())

    const bodyTitle = (input.title || '').trim()
      ? `<div class="title-mid">${esc(input.title || '')}</div>`
      : ''

    const imgs = Array.isArray(input.images) ? input.images.map(s=>String(s||'')).filter(Boolean) : []
    const normalizeSrc = (u: string) => {
      const v = String(u || '').trim()
      if (!v) return ''
      if (/^(data:|blob:)/i.test(v)) return v
      if (/^https?:/i.test(v)) return v
      if (v.startsWith('/')) return `${backendBase}${v}`
      return `${backendBase}/${v}`
    }
    const safeSrc = (u: string) => normalizeSrc(u).replace(/"/g, '&quot;')

    const logoSrc = normalizeSrc(String(logoRaw || ''))

    const imgGridClass = imgs.length === 1

      ? 'img-grid one'

      : imgs.length === 2

        ? 'img-grid two'

        : 'img-grid three'

    const imagesHtml = imgs.length
      ? `
        <div class="img-sec">
          <div class="img-title">Images</div>
          <div class="${imgGridClass}">
            ${imgs.map((u, idx)=>{

              const extra = (imgs.length === 3 && idx === 2) ? ' img-item--center' : ''

              return `<div class=\"img-item${extra}\"><img src=\"${safeSrc(u)}\" alt=\"img\"/></div>`

            }).join('')}
          </div>
        </div>
      `
      : ''

    const overlayId = 'diagnostic-report-overlay'
    const old = document.getElementById(overlayId); if (old) old.remove()
    const overlay = document.createElement('div')
    overlay.id = overlayId
    overlay.style.position = 'fixed'
    overlay.style.inset = '0'
    overlay.style.background = 'rgba(15,23,42,0.5)'
    overlay.style.zIndex = '9999'
    overlay.style.display = 'flex'
    overlay.style.alignItems = 'center'
    overlay.style.justifyContent = 'center'
    overlay.style.padding = '16px'

    const html = `
    <style>
      :root{--print-footer-space:56mm}
      .toolbar{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc;flex-wrap:wrap}
      .toolbar-title{font-weight:700;color:#0f172a}
      .btn{border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;font-size:12px;color:#334155;background:#fff}
      .wrap{background:#fff;width:100%;padding:16px 20px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#0f172a;overflow:auto;max-height:calc(100vh - 32px)}
      .hdr{display:grid;grid-template-columns:96px 1fr 96px;align-items:center}
      .hdr .title{font-size:28px;font-weight:800;text-align:center}
      .hdr .muted{color:#64748b;font-size:12px;text-align:center}
      .dept{font-style:italic;text-align:center;margin:8px 0 4px 0}
      .hr{border-bottom:2px solid #0f172a;margin:6px 0}
      .box{border:0;border-radius:0;padding:0;margin:8px 0}
      .kv{display:grid;grid-template-columns: 130px minmax(0,1fr) 130px minmax(0,1fr) 130px minmax(0,1fr);gap:4px 10px;font-size:12px;align-items:start}
      .kv > div{line-height:1.2}
      .kv > div:nth-child(2n){word-break:break-word}
      .title-mid{font-size:18px;font-weight:800;text-align:center;margin-top:4px}
      .content{font-size:14px;line-height:1.5}
      .ft-wrap{margin-top:10px}
      .ft-block{margin:12px 0}
      .ft-label{font-weight:800;margin:0 0 6px 0; font-size:14px}
      .ft-ul{margin:0; padding-left:18px; list-style-type: disc; list-style-position: outside}
      .ft-ul li{margin:2px 0; display:list-item; list-style-type: disc}
      .ft-empty{border:1px solid #e2e8f0; min-height:24px}
      /* EXACT lab report table styling */
      table{width:100%;border-collapse:collapse;margin-top:10px;border:1px solid #0f172a}
      th,td{padding:8px;border:1px solid #0f172a;vertical-align:top}
      th{padding:10px;border-bottom:2px solid #0f172a;text-align:left}
      /* prevent awkward page breaks */
      .box, table, .hdr, .dept, .hr, .sign, .img-sec { break-inside: avoid }
      /* Images */
      .img-sec{margin-top:12px}
      .img-title{font-size:16px;font-weight:800;margin:8px 0 6px 0}
      .img-grid{display:grid;gap:10px}
      .img-grid.one{grid-template-columns:minmax(0,1fr);justify-items:center}
      .img-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
      .img-grid.three{grid-template-columns:repeat(2,minmax(0,1fr))}
      .img-item{border:0;border-radius:0;overflow:hidden;background:#fff}
      .img-grid.one .img-item{max-width:420px;width:70%}
      .img-grid.three .img-item--center{grid-column:1 / span 2;justify-self:center;max-width:420px;width:70%}
      .img-item img{display:block;width:100%;height:auto}
      .footnote{margin-top:24px;text-align:center;color:#475569}
      .foot-hr{border-bottom:1px solid #334155;margin:10px 0}
      .sign{display:flex;justify-content:space-between;align-items:flex-start}
      .sign .cols{display:grid;gap:12px}
      .sign .left{font-size:14px}
      .sign .name{font-weight:800}
      .sign .title{font-weight:700}
      .print-footer{margin-top:6px}
      @media (max-width: 640px){
        .wrap{padding:12px 12px;max-height:calc(100vh - 20px)}
        .hdr{grid-template-columns:72px 1fr 0px}
        .hdr .title{font-size:20px}
        .kv{grid-template-columns:110px minmax(0,1fr)}
        .img-grid.one,.img-grid.two,.img-grid.three{grid-template-columns:repeat(1,minmax(0,1fr));justify-items:stretch}
        .img-grid.one .img-item,.img-grid.three .img-item--center{width:100%;max-width:none}
      }
      @media print{
        @page { size: A4 portrait; margin: 12mm }
        html, body{ margin:0 !important; background:#fff !important }
        *{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important }
        body > :not(#${overlayId}){ display:none !important }
        #${overlayId}{
          position:static !important;
          inset:auto !important;
          background:#fff !important;
          padding:0 !important;
          display:block !important;
          overflow:visible !important;
        }
        .toolbar{ display:none !important }
        .wrap{ background:#fff !important; padding:0 !important; max-height:none !important; overflow:visible !important; padding-bottom: var(--print-footer-space) !important }
        .content{ background:#fff !important }
        .img-sec{ background:#fff !important }
        .img-item{ background:#fff !important }
        table, tr, th, td{ background:#fff !important }
        .img-item{ overflow:visible !important }
        .print-footer{
          position:fixed !important;
          left:0 !important;
          right:0 !important;
          bottom:0 !important;
          background:#fff !important;
          padding-top:2mm !important;
          break-inside:avoid !important;
        }
        .sign{ break-inside:avoid !important }
        .sign .cols{ display:flex !important; justify-content:space-between !important; align-items:flex-start !important; gap:12px !important; width:100% !important }
        .footnote{margin-top:0 !important}
        .foot-hr{margin:6px 0 !important}
      }
    </style>
    <div class="toolbar">
      <div class="toolbar-title">Report Preview</div>
      <div>
        <button class="btn" id="diagnostic-report-print">Print (Ctrl+P)</button>
        <button class="btn" id="diagnostic-report-close" style="margin-left:8px">Close (Ctrl+D)</button>
      </div>
    </div>
    <div class="wrap">
        <div class="hdr">
          <div>${logoSrc? `<img src="${safeSrc(logoSrc)}" alt="logo" style="height:70px;width:auto;object-fit:contain"/>` : ''}</div>
          <div>
            <div class="title">${esc(name)}</div>
            <div class="muted">${esc(address)}</div>
            <div class="muted">Ph: ${esc(phone)} ${email? ' • '+esc(email): ''}</div>
          </div>
          <div></div>
        </div>
        <div class="dept">${esc(department)}</div>
        <div class="hr"></div>
        <div class="box">
          <div class="kv">
            <div>Medical Record No :</div><div>${esc(input.patient?.mrn || '-')}</div>
            <div>Sample No / Lab No :</div><div>${esc(input.tokenNo || '-')}</div>
            <div>Patient Name :</div><div>${esc(input.patient?.fullName || '-')}</div>
            <div>Age / Gender :</div><div>${esc(input.patient?.age || '')} / ${esc(input.patient?.gender || '')}</div>
            <div>Reg. & Sample Time :</div><div>${fmt(input.createdAt)}</div>
            <div>Reporting Time :</div><div>${fmt(input.reportedAt || new Date().toISOString())}</div>
            <div>Contact No :</div><div>${esc(input.patient?.phone || '-')}</div>
            <div>Referring Consultant :</div><div>${esc(input.referringConsultant || '-')}</div>
            <div>Address :</div><div>${esc(input.patient?.address || '-')}</div>
          </div>
        </div>
        ${bodyTitle}
        <div class="content">${String(input.valueHtml || '')}</div>
        ${imagesHtml}
        <div class="print-footer">
          ${String(footer||'').trim() ? `<div class="footnote" style="margin-top:6px">${esc(footer)}</div>` : ''}
          <div class="foot-hr"></div>
          <div class="sign">
            <div class="cols" style="grid-template-columns: repeat(${consultants.length || 1}, 1fr)">
              ${consultants.map(c=>`
                <div class="left">
                  ${(c.name||'').trim()? `<div class=\"name\">${esc(c.name)}</div>`:''}
                  ${(c.degrees||'').trim()? `<div>${esc(c.degrees)}</div>`:''}
                  ${(c.title||'').trim()? `<div class=\"title\">${esc(c.title)}</div>`:''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `

    overlay.innerHTML = html
    document.body.appendChild(overlay)

    const waitForImages = async (timeoutMs: number) => {
      try {
        const imgs = Array.from(overlay.querySelectorAll('img')) as HTMLImageElement[]
        if (!imgs.length) return
        const startedAt = Date.now()
        await Promise.race([
          Promise.all(imgs.map(img => new Promise<void>((resolve)=>{
            try {
              if (img.complete && (img.naturalWidth || 0) > 0) { resolve(); return }
              const done = () => { try { img.removeEventListener('load', done); img.removeEventListener('error', done) } catch {}; resolve() }
              img.addEventListener('load', done)
              img.addEventListener('error', done)
            } catch { resolve() }
          }))),
          new Promise<void>((resolve)=>{
            const tick = () => {
              if ((Date.now() - startedAt) >= timeoutMs) { resolve(); return }
              setTimeout(tick, 50)
            }
            tick()
          }),
        ])
      } catch {}
    }

    const onClose = ()=> { try { document.removeEventListener('keydown', onKey); overlay.remove() } catch {} }
    const onPrint = async ()=> {
      try { await waitForImages(5000) } catch {}
      const toolbarEl = overlay.querySelector('.toolbar') as HTMLElement | null
      const prevToolbarDisplay = toolbarEl ? toolbarEl.style.display : ''
      try { if (toolbarEl) toolbarEl.style.display = 'none' } catch {}
      const restoreToolbar = () => {
        try { if (toolbarEl) toolbarEl.style.display = prevToolbarDisplay } catch {}
        try { window.removeEventListener('afterprint', restoreToolbar) } catch {}
      }
      try { window.addEventListener('afterprint', restoreToolbar) } catch {}
      try{
        const api = (window as any).electronAPI
        if (api && typeof api.printPreviewCurrent === 'function') { api.printPreviewCurrent({}); return }
      }catch{}
      try { window.print() } catch {}
      try { setTimeout(restoreToolbar, 250) } catch {}
    }
    const onKey = (e: KeyboardEvent)=> {
      if ((e.ctrlKey||e.metaKey) && (e.key==='d' || e.key==='D')) { e.preventDefault(); onClose() }
      if ((e.ctrlKey||e.metaKey) && (e.key==='p' || e.key==='P')) { /* allow print */ }
      if (e.key === 'Escape') onClose()
    }
    document.getElementById('diagnostic-report-close')?.addEventListener('click', onClose)
    document.getElementById('diagnostic-report-print')?.addEventListener('click', onPrint)
    document.addEventListener('keydown', onKey)
    if (input.autoPrint) { try { void onPrint() } catch {} }
  }

  async function previewItem(r: Result){
    if (!settingsRef.current){
      try {
        const s = await diagnosticApi.getSettings() as any
        settingsRef.current = s
      } catch {}
    }
    let db: any = null
    try {
      db = await diagnosticApi.getResult(String(r.id))
    } catch {
      db = null
    }

    const valueFromDb = db && db.formData != null
      ? normalizeResultValueHtml(db.formData)
      : normalizeResultValueHtml(r.formData)

    const imagesFromDb = Array.isArray(db?.images) ? db.images.map((s: any) => String(s || '')).filter(Boolean) : null
    const images = imagesFromDb || (Array.isArray(r.images) ? r.images : [])

    printHtmlWithDiagnosticChrome({
      tokenNo: r.tokenNo,
      createdAt: r.createdAt,
      reportedAt: r.reportedAt || r.createdAt,
      patient: (r.patient || {}) as any,
      valueHtml: valueFromDb,
      images,
      referringConsultant: (r as any)?.patient?.referringConsultant,
      title: String(r.testName || 'REPORT'),
      autoPrint: false,
    })
  }

  async function printItem(r: Result){
    if (!settingsRef.current){
      try {
        const s = await diagnosticApi.getSettings() as any
        settingsRef.current = s
      } catch {}
    }
    let db: any = null
    try {
      db = await diagnosticApi.getResult(String(r.id))
    } catch {
      db = null
    }

    const valueFromDb = db && db.formData != null
      ? normalizeResultValueHtml(db.formData)
      : normalizeResultValueHtml(r.formData)

    const imagesFromDb = Array.isArray(db?.images) ? db.images.map((s: any) => String(s || '')).filter(Boolean) : null
    const images = imagesFromDb || (Array.isArray(r.images) ? r.images : [])

    const mapped = (templateMappings||[]).find(m=> String(m.testId) === String(r.testId))
    const key = mapped?.templateKey
    const tpl = key ? (DiagnosticTemplateRegistry as any)[key] : null
    if (!tpl || !tpl.print){
      try {
        printHtmlWithDiagnosticChrome({
          tokenNo: r.tokenNo,
          createdAt: r.createdAt,
          reportedAt: r.reportedAt || r.createdAt,
          patient: (r.patient || {}) as any,
          valueHtml: valueFromDb,
          images,
          referringConsultant: (r as any)?.patient?.referringConsultant,
          title: String(r.testName || 'REPORT'),
          autoPrint: true,
        })
      } catch {
        alert('No report template mapped for this test. Please set mapping in Diagnostic Settings.')
      }
      return
    }
    await tpl.print({ tokenNo: r.tokenNo, createdAt: r.createdAt, reportedAt: r.reportedAt||r.createdAt, patient: r.patient as any, value: valueFromDb, images, referringConsultant: (r as any)?.patient?.referringConsultant })
  }

  function editItem(r: Result){
    const search = new URLSearchParams()
    search.set('resultId', r.id)
    if (r.orderId) search.set('orderId', String(r.orderId))
    if (r.testId) search.set('testId', String(r.testId))
    navigate(`/diagnostic/result-entry?${search.toString()}`)
  }

  async function deleteItem(r: Result){
    if (!confirm('Delete this result?')) return
    try {
      await diagnosticApi.deleteResult(r.id)
      setItems(prev => prev.filter(x => x.id !== r.id))
    } catch {}
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h2 className="text-xl font-semibold text-slate-800">Report Generator</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="min-w-[260px] flex-1">
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by token, patient, or test..." className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <button onClick={()=>setStatus('all')} className={`rounded-md px-3 py-1.5 border ${status==='all'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>All</button>
            <button onClick={()=>setStatus('draft')} className={`rounded-md px-3 py-1.5 border ${status==='draft'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Draft</button>
            <button onClick={()=>setStatus('final')} className={`rounded-md px-3 py-1.5 border ${status==='final'?'bg-slate-900 text-white border-slate-900':'border-slate-300 text-slate-700'}`}>Final</button>
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
              <th className="px-4 py-2">MR#</th>
              <th className="px-4 py-2">Token</th>
              <th className="px-4 py-2">Test</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="leading-tight">
                    <div>{new Date(r.createdAt || '').toLocaleDateString()}</div>
                    <div className="text-xs text-slate-500">{new Date(r.createdAt || '').toLocaleTimeString()}</div>
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{r.patient?.fullName || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{(r as any)?.patient?.mrn || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{r.tokenNo || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{r.testName}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${r.status==='final'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-700'}`}>{r.status}</span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button onClick={()=>previewItem(r)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50">PDF</button>
                    <button onClick={()=>printItem(r)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> Print</button>
                    <button onClick={()=>editItem(r)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-violet-300 bg-white text-violet-700 hover:bg-violet-50" title="Edit" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={()=>deleteItem(r)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-300 bg-white text-rose-700 hover:bg-rose-50" title="Delete" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No results</div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>{total === 0 ? '0' : `${start}-${end}`} of {total}</div>
        <div className="flex items-center gap-2">
          <button disabled={curPage<=1} onClick={()=> setPage(p=> Math.max(1, p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Prev</button>
          <span>{curPage} / {pageCount}</span>
          <button disabled={curPage>=pageCount} onClick={()=> setPage(p=> p+1)} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
      
    </div>
  )
}
