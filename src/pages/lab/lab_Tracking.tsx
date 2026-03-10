import { useEffect, useMemo, useState } from 'react'
import { Search, Calendar, Printer, Trash2, Edit, RotateCcw, DollarSign, Barcode } from 'lucide-react'
import { labApi } from '../../utils/api'
import Lab_ReasonDialog from '../../components/lab/lab_ReasonDialog'
import { printLabTokenSlip } from '../../utils/printLabToken'

type LabTest = { id: string; name: string; price?: number }

type Order = {
  id: string
  createdAt: string
  patient: { fullName: string; phone: string; cnic?: string; guardianName?: string; mrn?: string }
  tests: string[]
  status: 'received'|'completed'|'returned'
  returnedTests?: string[]
  tokenNo?: string
  sampleTime?: string
  subtotal?: number
  discount?: number
  net?: number
  receivedAmount?: number
  receivableAmount?: number
  barcode?: string
  createdByUsername?: string
}


function formatDateTime(iso: string) {
  const d = new Date(iso); return d.toLocaleDateString() + ', ' + d.toLocaleTimeString()
}

function genBarcode(order: Order) {
  const d = new Date(order.createdAt)
  const y = d.getFullYear()
  const part = String(order.tokenNo || order.id || '').replace(/\s+/g, '').replace(/[^a-z0-9_-]/gi, '')
  return `BC-${y}-${part}`
}

export default function Lab_Tracking() {
  const [orders, setOrders] = useState<Order[]>([])
  const [tests, setTests] = useState<LabTest[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  // no tick needed; backend drives pagination

  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.name])), [tests])
  const testsPriceMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, Number(t.price||0)])), [tests])

  // Filters
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'all' | 'received' | 'completed'>('all')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveToken, setReceiveToken] = useState<string>('')
  const [receiveAmount, setReceiveAmount] = useState<string>('')

  const [editOpen, setEditOpen] = useState(false)
  const [editToken, setEditToken] = useState('')
  const [editTests, setEditTests] = useState<string[]>([])
  const [editDiscount, setEditDiscount] = useState('0')
  const [editReceived, setEditReceived] = useState('0')
  const [editSearch, setEditSearch] = useState('')

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const [ordRes, tstRes] = await Promise.all([
          labApi.listOrders({ q: q || undefined, from: from || undefined, to: to || undefined, status: status==='all'? undefined : status, page, limit: rows }),
          labApi.listTests({ limit: 1000 }),
        ])
        if (!mounted) return
        const items: Order[] = (ordRes.items||[]).map((x:any)=>({ id: x._id, createdAt: x.createdAt || new Date().toISOString(), patient: x.patient || { fullName: '-', phone: '' }, tests: x.tests || [], status: x.status || 'received', returnedTests: Array.isArray(x.returnedTests)? x.returnedTests : [], tokenNo: x.tokenNo, sampleTime: x.sampleTime, subtotal: Number(x.subtotal||0), discount: Number(x.discount||0), net: Number(x.net||0), receivedAmount: Number(x.receivedAmount||0), receivableAmount: Number(x.receivableAmount||0), barcode: x.barcode, createdByUsername: x.createdByUsername }))
        setOrders(items)
        setTotal(Number(ordRes.total||items.length||0))
        setTotalPages(Number(ordRes.totalPages||1))
        setTests((tstRes.items||[]).map((t:any)=>({ id: t._id, name: t.name, price: Number(t.price||0) })))
      } catch(e){ console.error(e); setOrders([]); setTests([]); setTotal(0); setTotalPages(1) }
    })()
    return ()=>{ mounted = false }
  }, [q, from, to, status, page, rows])

  const pageCount = totalPages
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + orders.length, total)
  const items = orders

  const downloadRegister = () => {
    const win = window.open('', 'print', 'width=900,height=700')
    if (!win) return
    const rowsHtml = items.map(o => {
      const token = o.tokenNo || genToken(o.createdAt, o.id)
      return o.tests.map(tid => {
        const tname = testsMap[tid] || '-'
        return `<tr>
          <td>${formatDateTime(o.createdAt)}</td>
          <td>${escapeHtml(o.patient.fullName)}</td>
          <td>${token}</td>
          <td>${escapeHtml(tname)}</td>
          <td>${escapeHtml(o.patient.mrn || '-')}</td>
          <td>${escapeHtml(o.patient.phone || '-')}</td>
          <td>${o.sampleTime || '-'}</td>
          <td>${o.status}</td>
          <td>${escapeHtml(o.createdByUsername || '-')}</td>
        </tr>`
      }).join('')
    }).join('')
    win.document.write(`<!doctype html><html><head><title>Daily Register</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#0f172a}
        h1{font-size:18px;margin:0 0 12px 0}
        .meta{font-size:12px;color:#475569;margin-bottom:12px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #e2e8f0;padding:6px;text-align:left}
        th{background:#f8fafc}
      </style>
    </head><body>`)
    win.document.write(`<h1>Lab Daily Register</h1>`)
    win.document.write(`<div class="meta">Generated: ${new Date().toLocaleString()}</div>`)
    win.document.write(`<div class="meta">Filters — Status: ${status}, From: ${from||'-'} To: ${to||'-'}; Search: ${q||'-'}; Page Count: ${total}</div>`)
    win.document.write(`<table><thead><tr>
      <th>Date</th><th>Patient</th><th>Token</th><th>Tests</th><th>MR No</th><th>Phone</th><th>Sample Time</th><th>Status</th><th>Performed By</th>
    </tr></thead><tbody>${rowsHtml}</tbody></table>`)
    win.document.write('</body></html>')
    win.document.close(); win.focus(); win.print();
  }

  const openEdit = (tokenNo: string) => {
    const same = orders.filter(o => (o.tokenNo || genToken(o.createdAt, o.id)) === tokenNo)
    const testIds = Array.from(new Set(same.flatMap(o => o.tests || [])))
    const any = same[0]
    setEditToken(tokenNo)
    setEditTests(testIds)
    setEditDiscount(String(Math.max(0, Number(any?.discount || 0))))
    setEditReceived(String(Math.max(0, Number(any?.receivedAmount || 0))))
    setEditSearch('')
    setEditOpen(true)
  }

  const submitEdit = async () => {
    const tokenNo = String(editToken || '').trim()
    if (!tokenNo) return
    const discount = Math.max(0, Number(editDiscount) || 0)
    const receivedAmount = Math.max(0, Number(editReceived) || 0)
    const testsArr = Array.from(new Set((editTests || []).map(String))).filter(Boolean)
    if (!testsArr.length) return
    try {
      const r: any = await labApi.updateToken(tokenNo, { tests: testsArr, discount, receivedAmount })
      const rec = Number(r?.receivedAmount || 0)
      const recvbl = Number(r?.receivableAmount || 0)
      // Refresh list after edit (simplest)
      const ordRes: any = await labApi.listOrders({ q: q || undefined, from: from || undefined, to: to || undefined, status: status==='all'? undefined : status, page, limit: rows })
      const items: Order[] = (ordRes.items||[]).map((x:any)=>({ id: x._id, createdAt: x.createdAt || new Date().toISOString(), patient: x.patient || { fullName: '-', phone: '' }, tests: x.tests || [], status: x.status || 'received', returnedTests: Array.isArray(x.returnedTests)? x.returnedTests : [], tokenNo: x.tokenNo, sampleTime: x.sampleTime, subtotal: Number(x.subtotal||0), discount: Number(x.discount||0), net: Number(x.net||0), receivedAmount: Number(x.receivedAmount||0), receivableAmount: Number(x.receivableAmount||0) }))
      setOrders(items)
      setTotal(Number(ordRes.total||items.length||0))
      setTotalPages(Number(ordRes.totalPages||1))
      setNotice({ text: `Token updated. Received ${rec}, Receivable ${recvbl}`, kind: 'success' })
      setEditOpen(false)
    } catch (e){
      console.error(e)
      setNotice({ text: 'Failed to update token', kind: 'error' })
    }
  }

  const setSampleTimeFor = async (id: string, t: string) => {
    try { await labApi.updateOrderTrack(id, { sampleTime: t }) } catch(e){ console.error(e) }
    setOrders(prev => prev.map(o => o.id===id ? { ...o, sampleTime: t } : o))
  }

  const openReceive = (tokenNo: string) => {
    setReceiveToken(tokenNo)
    setReceiveAmount('')
    setReceiveOpen(true)
  }

  const submitReceive = async () => {
    const tokenNo = String(receiveToken || '').trim()
    const amount = Math.max(0, Number(receiveAmount) || 0)
    if (!tokenNo || !amount) return
    try {
      const r: any = await labApi.receiveTokenPayment(tokenNo, { amount })
      const rec = Number(r?.receivedAmount || 0)
      const recvbl = Number(r?.receivableAmount || 0)
      setOrders(prev => prev.map(o => (o.tokenNo || genToken(o.createdAt, o.id)) === tokenNo ? { ...o, receivedAmount: rec, receivableAmount: recvbl } : o))
      setNotice({ text: 'Payment received', kind: 'success' })
      setReceiveOpen(false)
    } catch (e){
      console.error(e)
      setNotice({ text: 'Failed to receive payment', kind: 'error' })
    }
  }

  // Reason dialog state
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reasonMode, setReasonMode] = useState<'return'|'undo'>('return')
  const [reasonCtx, setReasonCtx] = useState<{ id: string; testId: string } | null>(null)

  // Delete confirm state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openReturn = (id: string, testId: string) => { setReasonMode('return'); setReasonCtx({ id, testId }); setReasonOpen(true) }
  const openUndo = (id: string, testId: string) => { setReasonMode('undo'); setReasonCtx({ id, testId }); setReasonOpen(true) }

  const onReasonConfirm = async (note: string) => {
    if (!reasonCtx) return
    const { id, testId } = reasonCtx
    const o = orders.find(x => x.id === id); if (!o) { setReasonOpen(false); return }
    const tokenNo = o.tokenNo || genToken(o.createdAt, o.id)
    try {
      if (reasonMode === 'return'){
        await labApi.createReturn({ type: 'Customer', datetime: new Date().toISOString(), reference: tokenNo, party: o.patient.fullName, testId: String(testId), note: note || undefined, lines: [] })
        setOrders(prev => prev.map(x => {
          if (x.id !== id) return x
          const rt = new Set<string>([...(x.returnedTests||[]).map(String), String(testId)])
          const allReturned = rt.size >= (x.tests||[]).length
          return { ...x, returnedTests: Array.from(rt), status: allReturned ? 'returned' : x.status }
        }))
        try { window.dispatchEvent(new CustomEvent('lab:return', { detail: { reference: tokenNo } })) } catch {}
      } else {
        await labApi.undoReturn({ reference: tokenNo, testId: String(testId), note: note || undefined })
        setOrders(prev => prev.map(x => {
          if (x.id !== id) return x
          const before = new Set<string>((x.returnedTests||[]).map(String))
          before.delete(String(testId))
          const allReturned = before.size >= (x.tests||[]).length
          return { ...x, returnedTests: Array.from(before), status: allReturned ? 'returned' : 'received' }
        }))
        try { window.dispatchEvent(new CustomEvent('lab:return', { detail: { reference: tokenNo, undo: true } })) } catch {}
      }
    } catch (e){ console.error(e); setNotice({ text: `Failed to ${reasonMode==='return'?'return':'undo'} test`, kind: 'error' }); try { setTimeout(()=> setNotice(null), 2500) } catch {} }
    setReasonOpen(false)
  }

  const requestDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true) }
  const performDelete = async () => {
    const id = deleteId; if (!id) { setDeleteOpen(false); return }
    try {
      await labApi.deleteOrder(id)
      setOrders(prev => prev.filter(o => o.id !== id))
      setNotice({ text: 'Sample deleted', kind: 'success' })
    } catch (e){ console.error(e); setNotice({ text: 'Failed to delete sample', kind: 'error' }) }
    finally {
      setDeleteOpen(false); setDeleteId(null); try { setTimeout(()=> setNotice(null), 2500) } catch {}
    }
  }

  const printToken = async (id: string) => {
    const o = orders.find(x => x.id === id); if (!o) return
    const tokenNo = o.tokenNo || genToken(o.createdAt, id)
    // Group all orders sharing the same token to build a single slip like Sample Intake
    const sameToken = orders.filter(x => (x.tokenNo || genToken(x.createdAt, x.id)) === tokenNo)
    const testIds = Array.from(new Set(sameToken.flatMap(x => x.tests)))
    // Prefer saved per-order subtotals for exact historical pricing; fallback to catalog price
    const priceByTestId: Record<string, number> = {}
    sameToken.forEach(x => {
      const t = (x.tests||[])[0]
      if (t && priceByTestId[t] == null) priceByTestId[t] = Number(x.subtotal||0)
    })
    const rows = testIds.map(tid => ({ name: testsMap[tid] || tid, price: (priceByTestId[tid] != null) ? Number(priceByTestId[tid]) : Number(testsPriceMap[tid] || 0) }))
    const subtotal = rows.reduce((s,r)=> s + Number(r.price||0), 0)
    const discount = sameToken.reduce((s,x)=> s + Number(x.discount||0), 0)
    const net = Math.max(0, subtotal - discount)
    // Try to enrich patient info (age, gender) and printedBy
    let age: string | undefined = (o as any)?.patient?.age ? String((o as any).patient.age) : undefined
    let gender: string | undefined = (o as any)?.patient?.gender ? String((o as any).patient.gender) : undefined
    try {
      if (!age || !gender){
        let p: any = null
        if (o.patient?.mrn){
          const r: any = await labApi.getPatientByMrn(o.patient.mrn).catch(()=>null)
          p = r?.patient || r
        } else if (o.patient?.phone){
          const r: any = await labApi.searchPatients({ phone: o.patient.phone, limit: 1 }).catch(()=>null)
          p = (r?.items?.[0]) || (Array.isArray(r)? r[0] : null)
        }
        if (p){
          if (!gender && p.gender) gender = String(p.gender)
          if (!age){
            if (p.age) age = String(p.age)
            else if (p.dateOfBirth || p.dob){
              const dob = String(p.dateOfBirth || p.dob)
              const d = new Date(dob); const now = new Date();
              if (!isNaN(d.getTime())){
                let years = now.getFullYear() - d.getFullYear();
                const m = now.getMonth() - d.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--
                age = String(years)
              }
            }
          }
        }
      }
    } catch {}
    let printedBy = ''
    try {
      const raw = localStorage.getItem('lab.session')
      if (raw){ const s = JSON.parse(raw||'{}'); printedBy = s?.username || s?.user?.username || '' }
      if (!printedBy){
        const d = localStorage.getItem('diagnostic.user'); if (d){ const u = JSON.parse(d||'{}'); printedBy = u?.username || u?.name || '' }
      }
      if (!printedBy){
        const h = localStorage.getItem('hospital.session'); if (h){ const u = JSON.parse(h||'{}'); printedBy = u?.username || '' }
      }
    } catch {}
    await printLabTokenSlip({ tokenNo, createdAt: o.createdAt, patient: { fullName: o.patient.fullName, mrn: o.patient.mrn, phone: o.patient.phone, gender, age }, tests: rows, subtotal, discount, net, printedBy })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-2xl font-bold text-slate-900">Sample Tracking</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by sample ID, patient, or test..." className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            <Lab_ReasonDialog open={reasonOpen} title={reasonMode==='return'?'Return Reason':'Undo Return Reason'} placeholder="Reason (optional)" confirmText={reasonMode==='return'?'Return':'Undo'} onConfirm={onReasonConfirm} onClose={()=>setReasonOpen(false)} />
    </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900" />
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900" />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <button type="button" onClick={()=>setStatus('all')} className={`rounded-md px-3 py-1.5 border ${status==='all'?'bg-sky-600 text-white border-sky-600':'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>All</button>
            <button type="button" onClick={()=>setStatus('received')} className={`rounded-md px-3 py-1.5 border ${status==='received'?'bg-sky-600 text-white border-sky-600':'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>Received</button>
            <button type="button" onClick={()=>setStatus('completed')} className={`rounded-md px-3 py-1.5 border ${status==='completed'?'bg-sky-600 text-white border-sky-600':'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>Completed</button>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span>Rows</span>
            <select value={rows} onChange={e=>{ setRows(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button type="button" onClick={downloadRegister} className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Download Daily Register</button>
          </div>
        </div>
        {notice && (
          <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${notice.kind==='success'? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Token No</th>
              <th className="px-4 py-2">Barcode</th>
              <th className="px-4 py-2">Test(s)</th>
              <th className="px-4 py-2">MR No</th>
              <th className="px-4 py-2">CNIC</th>
              <th className="px-4 py-2">Father Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Sample Time</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Received</th>
              <th className="px-4 py-2">Receivable</th>
              <th className="px-4 py-2">Performed By</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.reduce((acc: any[], o) => {
              const token = o.tokenNo || genToken(o.createdAt, o.id)
              o.tests.forEach((tid, idx) => {
                const tname = testsMap[tid] || '—'
                const isReturned = Array.isArray(o.returnedTests) ? o.returnedTests.map(String).includes(String(tid)) : false
                const rowStatus = isReturned ? 'returned' : o.status
                acc.push(
                  <tr key={`${o.id}-${tid}-${idx}`} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/70">
                    <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient.fullName}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{token}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs">
                        <Barcode className="h-4 w-4 text-slate-400" />
                        <span className="font-mono">{o.barcode || genBarcode(o)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">{tname}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient.mrn || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient.cnic || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient.guardianName || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.patient.phone || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <input type="time" value={o.sampleTime || ''} onChange={e=>setSampleTimeFor(o.id, e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900" />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${rowStatus==='completed'?'bg-emerald-100 text-emerald-700':(rowStatus==='returned'?'bg-rose-100 text-rose-700':'bg-slate-100 text-slate-700')}`}>{rowStatus}</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{Number(o.receivedAmount||0).toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{Number(o.receivableAmount||0).toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{o.createdByUsername || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={()=>printToken(o.id)} title="Print Token" className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"><Printer className="h-4 w-4" /></button>
                        <button type="button" onClick={()=>openEdit(token)} title="Edit" className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"><Edit className="h-4 w-4" /></button>
                        {Number(o.receivableAmount||0) > 0 ? (
                          <button type="button" onClick={()=>openReceive(token)} title="Receive Payment" className="inline-flex items-center justify-center rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"><DollarSign className="h-4 w-4" /></button>
                        ) : null}
                        {rowStatus==='received' ? (
                          <button type="button" onClick={()=>openReturn(o.id, String(tid))} title="Return" className="inline-flex items-center justify-center rounded-md p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"><RotateCcw className="h-4 w-4" /></button>
                        ) : null}
                        {rowStatus==='returned' ? (
                          <button type="button" onClick={()=>openUndo(o.id, String(tid))} title="Undo Return" className="inline-flex items-center justify-center rounded-md p-1.5 text-violet-600 hover:bg-violet-50 hover:text-violet-700"><RotateCcw className="h-4 w-4" /></button>
                        ) : null}
                        <button type="button" onClick={()=>requestDelete(o.id)} title="Delete" className="inline-flex items-center justify-center rounded-md p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                      </div>
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
        <div>{total === 0 ? '0' : `${start}-${end}`} of {total}</div>
        <div className="flex items-center gap-2">
          <span>Page</span>
          <span>{curPage} / {pageCount}</span>
        </div>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Delete</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete this sample? This will remove the order and any associated results.</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>{ setDeleteOpen(false); setDeleteId(null) }} className="btn-outline-navy">Cancel</button>
              <button type="button" onClick={performDelete} className="btn bg-rose-600 hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {receiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Receive Payment</div>
            <div className="px-5 py-4 text-sm text-slate-700 space-y-3">
              <div>
                <div className="text-xs text-slate-500">Token</div>
                <div className="mt-1 font-mono text-slate-900">{receiveToken}</div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Amount</label>
                <input value={receiveAmount} onChange={e=>setReceiveAmount(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0" autoFocus />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setReceiveOpen(false)} className="btn-outline-navy">Cancel</button>
              <button type="button" onClick={submitReceive} className="btn bg-emerald-600 hover:bg-emerald-700">Receive</button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Edit Token</div>
            <div className="px-5 py-4 text-sm text-slate-700 space-y-4">
              <div>
                <div className="text-xs text-slate-500">Token</div>
                <div className="mt-1 font-mono text-slate-900">{editToken}</div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Discount</label>
                  <input value={editDiscount} onChange={e=>setEditDiscount(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Received</label>
                  <input value={editReceived} onChange={e=>setEditReceived(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0" />
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-slate-600">Selected Tests ({editTests.length})</div>
                <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200">
                  {editTests.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-slate-500">No tests selected</div>
                  ) : (
                    editTests.map((id) => {
                      const t = tests.find(x => x.id === id)
                      return (
                        <label key={id} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-100 last:border-b-0">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={()=> setEditTests(prev => prev.filter(x => x !== id))}
                            />
                            <span className="text-slate-800">{t?.name || id}</span>
                          </div>
                          <div className="text-xs text-slate-500">{Number(t?.price||0).toLocaleString()}</div>
                        </label>
                      )
                    })
                  )}
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-xs font-medium text-slate-600">Add Test</div>
                  <input value={editSearch} onChange={e=>setEditSearch(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Search test by name..." />
                  {(editSearch.trim().length > 0) && (
                    <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-slate-200">
                      {tests
                        .filter(t => !editTests.includes(t.id))
                        .filter(t => t.name.toLowerCase().includes(editSearch.trim().toLowerCase()))
                        .slice(0, 30)
                        .map(t => (
                          <button
                            type="button"
                            key={t.id}
                            onClick={() => { setEditTests(prev => Array.from(new Set([...prev, t.id]))); setEditSearch('') }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            <div className="text-slate-800">{t.name}</div>
                            <div className="text-xs text-slate-500">{Number(t.price||0).toLocaleString()}</div>
                          </button>
                        ))}
                      {tests
                        .filter(t => !editTests.includes(t.id))
                        .filter(t => t.name.toLowerCase().includes(editSearch.trim().toLowerCase())).length === 0 && (
                          <div className="px-3 py-3 text-xs text-slate-500">No matches</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setEditOpen(false)} className="btn-outline-navy">Cancel</button>
              <button type="button" onClick={submitEdit} className="btn bg-violet-700 hover:bg-violet-800">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function genToken(dateIso: string, id: string) {
  const d = new Date(dateIso)
  const part = `${d.getDate().toString().padStart(2,'0')}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getFullYear()}`
  return `D${part}_${id.slice(-3)}`
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
