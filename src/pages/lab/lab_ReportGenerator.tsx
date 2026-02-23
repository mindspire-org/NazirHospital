import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, FileDown, Printer, Pencil } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { labApi } from '../../utils/api'
import { previewLabReportPdf, downloadLabReportPdf } from '../../utils/printLabReport'

type ResultRow = { id: string; test: string; normal?: string; unit?: string; value?: string; comment?: string; flag?: 'normal'|'abnormal'|'critical' }

type ResultRecord = { id: string; orderId: string; rows: ResultRow[]; interpretation?: string; createdAt: string }

type Order = {
  id: string
  createdAt: string
  patient: { fullName: string; phone: string; mrn?: string; cnic?: string; guardianName?: string }
  tests: string[]
  status: 'received'|'completed'
  tokenNo?: string
  sampleTime?: string
  reportingTime?: string
  referringConsultant?: string
}

type Track = { status: 'received' | 'completed'; sampleTime?: string; reportingTime?: string; tokenNo: string }

type LabTest = { id: string; name: string; category?: string }

function parseRange(r?: string) {
  if (!r) return null
  const m = r.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/)
  if (!m) return null
  return { min: Number(m[1]), max: Number(m[2]) }
}

function rowFlag(r: ResultRow) {
  if (r.flag === 'critical') return 'critical'
  if (r.flag === 'abnormal') return 'abnormal'
  if (r.flag === 'normal') return 'normal'
  if (!r.value) return 'unknown'
  const num = Number(r.value)
  if (Number.isNaN(num)) return 'unknown'
  const range = parseRange(r.normal)
  if (!range) return 'unknown'
  if (num < range.min || num > range.max) return 'abnormal'
  return 'normal'
}

function formatDateTime(iso: string) { const d = new Date(iso); return d.toLocaleDateString() + ', ' + d.toLocaleTimeString() }

export default function Lab_ReportGenerator() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId') || ''
  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await labApi.listResults({ orderId, limit: 1 })
        const rec = Array.isArray(res?.items) && res.items.length ? res.items[0] : null
        const status = String(rec?.reportStatus || 'pending')
        if (!cancelled && status !== 'approved') {
          navigate(`/lab/report-approval?orderId=${encodeURIComponent(orderId)}`)
        }
      } catch {
        if (!cancelled) navigate(`/lab/report-approval?orderId=${encodeURIComponent(orderId)}`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId, navigate])
  const [results, setResults] = useState<ResultRecord[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tests, setTests] = useState<LabTest[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [rowsPer, setRowsPer] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const reqSeq = useRef(0)
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const my = ++reqSeq.current
        const [resRes, ordRes, tstRes] = await Promise.all([
          labApi.listResults({ page, limit: rowsPer }),
          labApi.listOrders({ limit: 500 }),
          labApi.listTests({ limit: 1000 }),
        ])
        if (!mounted || my !== reqSeq.current) return
        const list = (resRes.items||[]).map((r:any)=>({ id: r._id, orderId: r.orderId, rows: r.rows||[], interpretation: r.interpretation, createdAt: r.createdAt || new Date().toISOString() }))
        setResults(list)
        setTotal(Number(resRes.total || list.length || 0))
        setTotalPages(Number(resRes.totalPages || 1))
        const o: Order[] = (ordRes.items||[]).map((x:any)=>({ id: x._id, createdAt: x.createdAt || new Date().toISOString(), patient: x.patient || { fullName: '-', phone: '' }, tests: x.tests||[], status: x.status || 'received', tokenNo: x.tokenNo, sampleTime: x.sampleTime, reportingTime: x.reportingTime, referringConsultant: x.referringConsultant }))
        setOrders(o)
        setTests((tstRes.items||[]).map((t:any)=>({ id: t._id, name: t.name, category: t.category||'' })))
      } catch (e){ console.error(e); setResults([]); setOrders([]); setTests([]) }
    })()
    return ()=>{ mounted = false }
  }, [page, rowsPer])

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try { const s = await labApi.getSettings(); if (mounted) setSettings(s) } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  const ordersMap = useMemo(() => Object.fromEntries(orders.map(o => [o.id, o])), [orders])
  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.name])), [tests])
  const track = useMemo<Record<string, Track>>(()=> Object.fromEntries(orders.map(o=> [o.id, { status: o.status, tokenNo: o.tokenNo || `D${new Date(o.createdAt).getDate().toString().padStart(2,'0')}${(new Date(o.createdAt).getMonth()+1).toString().padStart(2,'0')}${new Date(o.createdAt).getFullYear()}_${o.id.slice(-3)}`, sampleTime: o.sampleTime, reportingTime: o.reportingTime } as Track ])), [orders])

  type Enriched = { r: ResultRecord; order: Order | undefined; track: Track | undefined; flag: 'normal'|'abnormal'|'critical'|'unknown'; testsStr: string }
  const enriched: Enriched[] = useMemo(() => results.map((r) => {
    const order = ordersMap[r.orderId]
    const tr = track[r.orderId]
    const flagAgg = r.rows.reduce<'critical'|'abnormal'|'normal'|'unknown'>((acc, row) => {
      const f = rowFlag(row)
      if (f === 'critical') return 'critical'
      if (f === 'abnormal' && acc !== 'critical') return 'abnormal'
      if (f === 'normal' && acc === 'unknown') return 'normal'
      return acc
    }, 'unknown')
    const testsStr = order?.tests.map(id => testsMap[id]).filter(Boolean).join(', ') || ''
    return { r, order, track: tr, flag: flagAgg, testsStr }
  }), [results, ordersMap, track, testsMap])

  // Filters/search
  const [q, setQ] = useState('')
  const [flag, setFlag] = useState<'all'|'normal'|'abnormal'|'critical'|'unknown'>('all')

  const filtered = useMemo(() => enriched.filter(e => {
    if (flag !== 'all' && e.flag !== flag) return false
    const term = q.trim().toLowerCase()
    if (!term) return true
    return (
      e.order?.patient.fullName.toLowerCase().includes(term) ||
      (e.order?.patient.phone || '').toLowerCase().includes(term) ||
      (e.order?.patient.mrn || '').toLowerCase().includes(term) ||
      (e.track?.tokenNo || '').toLowerCase().includes(term) ||
      e.testsStr.toLowerCase().includes(term)
    )
  }), [enriched, q, flag])

  const pageCount = totalPages
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rowsPer + 1, total)
  const end = Math.min((curPage - 1) * rowsPer + filtered.length, total)
  const items = filtered

  const printRow = async (e: Enriched) => {
    const o = e.order; if (!o) return
    await previewLabReportPdf({
      tokenNo: e.track?.tokenNo || '-',
      createdAt: o.createdAt,
      sampleTime: e.track?.sampleTime,
      reportingTime: e.track?.reportingTime,
      patient: {
        fullName: o.patient.fullName,
        phone: o.patient.phone,
        mrn: o.patient.mrn,
      },
      rows: (e.r.rows||[]).map((row: ResultRow)=>({
        test: row.test,
        normal: row.normal,
        unit: row.unit,
        value: row.value,
        prevValue: (row as any).prevValue,
        flag: row.flag,
        comment: row.comment,
      })),
      interpretation: e.r.interpretation,
      referringConsultant: o.referringConsultant,
    })
  }

  const downloadRowPdf = async (e: Enriched) => {
    const o = e.order; if (!o) return
    await downloadLabReportPdf({
      tokenNo: e.track?.tokenNo || '-',
      createdAt: o.createdAt,
      sampleTime: e.track?.sampleTime,
      reportingTime: e.track?.reportingTime,
      patient: {
        fullName: o.patient.fullName,
        phone: o.patient.phone,
        mrn: o.patient.mrn,
      },
      rows: (e.r.rows||[]).map((row: ResultRow)=>({
        test: row.test,
        normal: row.normal,
        unit: row.unit,
        value: row.value,
        prevValue: (row as any).prevValue,
        flag: row.flag,
        comment: row.comment,
      })),
      interpretation: e.r.interpretation,
      referringConsultant: o.referringConsultant,
    })
  }

  const printCriticalList = () => {
    const crit = filtered.filter(e => e.flag === 'critical')
    const flatRows = crit.flatMap((e)=> e.r.rows.filter(r => rowFlag(r)==='critical').map(r=> ({ e, r })))
    const total = flatRows.length
    const now = new Date()
    const minDate = crit.length? new Date(Math.min(...crit.map(x=> new Date(x.r.createdAt).getTime()))) : null
    const maxDate = crit.length? new Date(Math.max(...crit.map(x=> new Date(x.r.createdAt).getTime()))) : null
    const fmt = (d: Date)=> d.toLocaleDateString()
    const rightNow = now.toLocaleDateString() + ' ' + now.toLocaleTimeString()
    const labName = (settings?.labName || 'Lab').toUpperCase()
    const getCategory = (e: Enriched, rowTest: string) => {
      const ids = e.order?.tests || []
      for (const id of ids){
        const t = tests.find(tt=>tt.id===id)
        if (!t) continue
        if (t.name && (rowTest?.toLowerCase()||'').includes(t.name.toLowerCase())) return t.category || ''
      }
      return (tests.find(tt=> (e.order?.tests||[])[0] === tt.id)?.category) || ''
    }
    const getTestName = (e: Enriched, rowTest: string) => {
      const ids = e.order?.tests || []
      for (const id of ids){
        const t = tests.find(tt=>tt.id===id)
        if (t && rowTest && rowTest.toLowerCase().includes((t.name||'').toLowerCase())) return t.name
      }
      return rowTest || ''
    }
    const rowsHtml = flatRows.map(({ e, r }, idx) => {
      const cat = esc(getCategory(e, r.test))
      const tname = esc(getTestName(e, r.test))
      return `<tr>
        <td class="cell">${idx+1}</td>
        <td class="cell">${esc(e.order?.patient.mrn || '')}</td>
        <td class="cell">${esc(e.track?.tokenNo || '')}</td>
        <td class="cell">${esc(new Date(e.r.createdAt).toLocaleDateString())}</td>
        <td class="cell">${esc(e.track?.reportingTime || '')}</td>
        <td class="cell">${esc(e.order?.patient.fullName || '')}</td>
        <td class="cell">${esc(e.order?.referringConsultant || '')}</td>
        <td class="cell">${cat}</td>
        <td class="cell">${tname}</td>
        <td class="cell">${esc(r.value || '')}</td>
        <td class="cell">${esc(r.normal || '')}</td>
      </tr>`
    }).join('')

    const win = window.open('', 'print', 'width=1000,height=700')
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>Critical Test Results</title><style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#111827;margin:16px}
      .row{display:flex;justify-content:space-between;align-items:flex-start}
      .title{font-size:20px;font-weight:800;letter-spacing:.5px}
      .sub{font-size:12px;color:#475569}
      .bar{margin:10px 0;padding:6px 10px;background:#111827;color:#fff;font-weight:700;text-align:center;border:1px solid #111827}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #111827;padding:6px 8px;text-align:left}
      th{background:#f3f4f6}
      .cell{white-space:nowrap}
      .footer{display:flex;justify-content:flex-end;align-items:center;margin-top:8px;border-top:2px solid #111827;padding-top:6px;font-weight:700}
    </style></head><body>`)
    win.document.write(`<div class="row">
      <div>
        <div class="title">${esc(labName)}</div>
      </div>
      <div style="text-align:right">
        <div class="sub">${rightNow}</div>
        <div class="sub"><strong>DURATION</strong> ${minDate && maxDate ? `(From ${fmt(minDate)} To ${fmt(maxDate)})` : '(All)'}</div>
      </div>
    </div>`)
    win.document.write(`<div class="bar">CRITICAL TEST RESULTS</div>`)
    win.document.write(`<table><thead><tr>
      <th>SMP #</th>
      <th>MR NO</th>
      <th>LAB #</th>
      <th>DATE</th>
      <th>REPORT TIME</th>
      <th>PATIENT NAME</th>
      <th>CONSULTANT</th>
      <th>HEADER</th>
      <th>TEST NAME</th>
      <th>RESULT</th>
      <th>REF. VALUE</th>
    </tr></thead><tbody>
      ${rowsHtml || `<tr><td colspan="11" style="text-align:center;padding:10px;color:#64748b">No critical results</td></tr>`}
    </tbody></table>`)
    win.document.write(`<div class="footer">TOTAL TESTS .&nbsp;&nbsp; ${total}</div>`)
    win.document.write('</body></html>'); win.document.close(); win.focus(); win.print();
  }

  

  const printList = () => {
    const win = window.open('', 'print', 'width=900,height=700')
    if (!win) return
    const rowsHtml = filtered.map((e, idx) => `<tr>
      <td>${idx+1}</td>
      <td>${formatDateTime(e.r.createdAt)}</td>
      <td>${esc(e.order?.patient.fullName || '-')}</td>
      <td>${esc(e.order?.patient.mrn || '-')}</td>
      <td>${esc(e.track?.tokenNo || '-')}</td>
      <td>${esc(e.testsStr || '-')}</td>
      <td>${esc(e.track?.reportingTime || '-')}</td>
      <td>${e.flag}</td>
    </tr>`).join('')
    win.document.write(`<!doctype html><html><head><title>Reports</title><style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#0f172a}
      h1{font-size:18px;margin:0 0 12px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #e2e8f0;padding:6px;text-align:left}
      th{background:#f8fafc}
    </style></head><body>`)
    win.document.write(`<h1>Report Register</h1>`)
    win.document.write(`<table><thead><tr><th>SR</th><th>Date</th><th>Patient</th><th>MR No</th><th>Token</th><th>Tests</th><th>Reporting Time</th><th>Flag</th></tr></thead><tbody>${rowsHtml}</tbody></table>`)
    win.document.write('</body></html>'); win.document.close(); win.focus(); win.print();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Report Generator</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search reports.." className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <select value={flag} onChange={e=>{ setFlag(e.target.value as any); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
            <option value="all">All Flags</option>
            <option value="normal">normal</option>
            <option value="abnormal">abnormal</option>
            <option value="critical">critical</option>
            <option value="unknown">unknown</option>
          </select>
          <button onClick={()=>{ flag==='critical' ? printCriticalList() : printList() }} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><FileDown className="h-4 w-4" /> PDF</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">SR.NO</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Patient</th>
              <th className="px-3 py-2">MR No</th>
              <th className="px-3 py-2">Token No</th>
              <th className="px-3 py-2">Sample Time</th>
              <th className="px-3 py-2">Reporting Time</th>
              <th className="px-3 py-2">Test</th>
              <th className="px-3 py-2">Flag</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e, idx) => (
              <tr key={e.r.id} className={`border-b border-slate-100 ${e.flag==='critical'?'bg-rose-50':''}`}>
                <td className="px-3 py-2">{start + idx + 1}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(e.r.createdAt)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{e.order?.patient.fullName}</td>
                <td className="px-3 py-2 whitespace-nowrap">{e.order?.patient.mrn || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{e.track?.tokenNo || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{e.track?.sampleTime || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{e.track?.reportingTime || '-'}</td>
                <td className="px-3 py-2">{e.testsStr || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${e.flag==='critical'?'bg-rose-100 text-rose-700': e.flag==='abnormal'?'bg-amber-100 text-amber-700': e.flag==='normal'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-700'}`}>{e.flag}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap"><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">approved</span></td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button onClick={()=>downloadRowPdf(e)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"><FileDown className="h-4 w-4" /> PDF</button>
                    <button onClick={()=>printRow(e)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> Print</button>
                    <button onClick={()=> navigate(`/lab/results?orderId=${e.r.orderId}`)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4" /> Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No reports</div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>{total === 0 ? '0' : `${start}-${end} of ${total}`}</div>
        <div className="flex items-center gap-2">
          <span>Page</span>
          <span>{page} / {Math.ceil(total / rowsPer)}</span>
          <select value={rowsPer} onChange={e=>{ setRowsPer(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
