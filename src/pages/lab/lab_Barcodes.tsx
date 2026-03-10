import { useEffect, useMemo, useState } from 'react'
import { Calendar, Search } from 'lucide-react'
import { labApi } from '../../utils/api'

type LabTest = { id: string; name: string }

type Order = {
  id: string
  createdAt: string
  patient: { fullName: string; phone: string; mrn?: string }
  tests: string[]
  status: 'received' | 'completed' | 'returned'
  tokenNo?: string
  sampleTime?: string
  barcode?: string
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString() + ', ' + d.toLocaleTimeString()
}

function genBarcode(order: Order) {
  const d = new Date(order.createdAt)
  const y = d.getFullYear()
  const part = String(order.tokenNo || order.id || '').replace(/\s+/g, '').replace(/[^a-z0-9_-]/gi, '')
  return `BC-${y}-${part}`
}

async function makeBarcodeDataUrl(value: string): Promise<string> {
  try {
    const mod: any = await import('jsbarcode')
    const JsBarcode = mod?.default || mod
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value, { format: 'CODE128', displayValue: false, margin: 0, height: 72 })
    return canvas.toDataURL('image/png')
  } catch {
    return ''
  }
}

function downloadDataUrlPng(dataUrl: string, fileName: string) {
  try {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch {}
}

export default function Lab_Barcodes() {
  const [orders, setOrders] = useState<Order[]>([])
  const [tests, setTests] = useState<LabTest[]>([])
  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.name])), [tests])

  // Filters
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'all' | 'received' | 'completed'>('all')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Assign modal state
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignOrder, setAssignOrder] = useState<Order | null>(null)
  const [assignBarcodeValue, setAssignBarcodeValue] = useState('')
  const [assignBarcodePng, setAssignBarcodePng] = useState('')
  const [saving, setSaving] = useState(false)

  const isAssignedView = Boolean(String(assignOrder?.barcode || '').trim())

  const openAssign = async (o: Order) => {
    setAssignOrder(o)
    const b = String(o.barcode || '').trim() || genBarcode(o)
    setAssignBarcodeValue(b)
    setAssignBarcodePng('')
    setAssignOpen(true)
    const png = await makeBarcodeDataUrl(b)
    setAssignBarcodePng(png)
  }

  const closeAssign = () => {
    setAssignOpen(false)
    setAssignOrder(null)
    setAssignBarcodeValue('')
    setAssignBarcodePng('')
    setSaving(false)
  }

  const refresh = async () => {
    const [ordRes, tstRes] = await Promise.all([
      labApi.listOrders({ q: q || undefined, from: from || undefined, to: to || undefined, status: status === 'all' ? undefined : status, page, limit: rows }),
      labApi.listTests({ limit: 1000 }),
    ])
    const items: Order[] = (ordRes.items || []).map((x: any) => ({
      id: x._id,
      createdAt: x.createdAt || new Date().toISOString(),
      patient: x.patient || { fullName: '-', phone: '' },
      tests: x.tests || [],
      status: x.status || 'received',
      tokenNo: x.tokenNo,
      sampleTime: x.sampleTime,
      barcode: x.barcode,
    }))
    setOrders(items)
    setTests((tstRes.items || []).map((t: any) => ({ id: String(t._id), name: String(t.name || '') })))
    setTotal(Number(ordRes.total || items.length || 0))
    setTotalPages(Number(ordRes.totalPages || 1))
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await refresh()
      } catch (e) {
        console.error(e)
        if (mounted) {
          setOrders([])
          setTests([])
          setTotal(0)
          setTotalPages(1)
        }
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, from, to, status, page, rows])

  const onAssign = async () => {
    if (!assignOrder) return
    const barcode = String(assignBarcodeValue || '').trim()
    if (!barcode) return
    setSaving(true)
    try {
      await labApi.assignBarcode(assignOrder.id, barcode)
      closeAssign()
      await refresh()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  const downloadBarcode = () => {
    if (!assignBarcodePng || !assignBarcodeValue) return
    const file = `barcode-${assignBarcodeValue}.png`
    downloadDataUrlPng(assignBarcodePng, file)
  }

  const printBarcode = () => {
    if (!assignBarcodePng || !assignBarcodeValue) return
    const win = window.open('', 'print', 'width=800,height=650')
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>Barcode</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#0f172a}
        .wrap{display:flex;flex-direction:column;align-items:center;gap:10px}
        img{max-width:100%;height:auto}
        .code{font-weight:600;font-size:14px}
        @media print{ @page{ margin:8mm } }
      </style>
    </head><body>
      <div class="wrap">
        <div class="code">${assignBarcodeValue}</div>
        <img src="${assignBarcodePng}" alt="barcode"/>
      </div>
    </body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  const pageCount = totalPages
  const curPage = Math.min(page, pageCount)
  const start = Math.min((curPage - 1) * rows + 1, total)
  const end = Math.min((curPage - 1) * rows + orders.length, total)

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">Barcodes</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3" placeholder="Search by sample ID, patient, or token" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select value={status} onChange={e => { setStatus(e.target.value as any); setPage(1) }} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="all">All</option>
              <option value="received">received</option>
              <option value="completed">completed</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Rows</label>
            <select value={rows} onChange={e => { setRows(Number(e.target.value) || 20); setPage(1) }} className="w-full rounded-md border border-slate-300 px-3 py-2">
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
                <th className="px-3 py-2">Barcode</th>
                <th className="px-3 py-2">DateTime</th>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">Token No</th>
                <th className="px-3 py-2">Test(s)</th>
                <th className="px-3 py-2">MR No</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Sample Time</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const token = o.tokenNo || ''
                const testId = (o.tests || [])[0]
                const testName = (testsMap as any)[testId] || testId || '-'
                return (
                  <tr key={o.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">{o.barcode || '-'}</td>
                    <td className="px-3 py-2">{formatDateTime(o.createdAt)}</td>
                    <td className="px-3 py-2">{o.patient?.fullName || '-'}</td>
                    <td className="px-3 py-2">{token || '-'}</td>
                    <td className="px-3 py-2">{testName}</td>
                    <td className="px-3 py-2">{o.patient?.mrn || '-'}</td>
                    <td className="px-3 py-2">{o.patient?.phone || '-'}</td>
                    <td className="px-3 py-2">{o.sampleTime || '-'}</td>
                    <td className="px-3 py-2">{o.status}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => openAssign(o)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Assign Barcode</button>
                    </td>
                  </tr>
                )
              })}
              {orders.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={10}>No samples found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <div>Showing {start}-{end} of {total}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Prev</button>
            <div>Page {page} / {pageCount}</div>
            <button type="button" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page >= pageCount} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {assignOpen && assignOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <div className="text-base font-semibold text-slate-800">Assign Barcode</div>
                <div className="text-xs text-slate-500">Generate and assign a barcode to this sample.</div>
              </div>
              <button type="button" onClick={closeAssign} className="text-slate-500 hover:text-slate-700">×</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Sample ID</label>
                  <input value={assignOrder.tokenNo || assignOrder.id} readOnly className="w-full rounded-md border border-slate-300 px-3 py-2 bg-slate-50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Patient Name</label>
                  <input value={assignOrder.patient?.fullName || ''} readOnly className="w-full rounded-md border border-slate-300 px-3 py-2 bg-slate-50" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Tests</label>
                <input value={(testsMap as any)[(assignOrder.tests || [])[0]] || (assignOrder.tests || [])[0] || ''} readOnly className="w-full rounded-md border border-slate-300 px-3 py-2 bg-slate-50" />
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-800">Generated Barcode</div>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Barcode</label>
                  <input
                    value={assignBarcodeValue}
                    readOnly={isAssignedView}
                    onChange={async (e) => {
                      if (isAssignedView) return
                      const v = e.target.value
                      setAssignBarcodeValue(v)
                      setAssignBarcodePng('')
                      const png = await makeBarcodeDataUrl(v)
                      setAssignBarcodePng(png)
                    }}
                    className={isAssignedView ? "w-full rounded-md border border-slate-300 px-3 py-2 bg-slate-50" : "w-full rounded-md border border-slate-300 px-3 py-2"}
                  />
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 flex flex-col items-center justify-center">
                  {assignBarcodePng ? (
                    <>
                      <img src={assignBarcodePng} alt="barcode" className="max-w-full" />
                      <div className="mt-2 text-xs text-slate-600">{assignBarcodeValue}</div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-500">Generating preview...</div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={downloadBarcode} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Download</button>
                  <button type="button" onClick={printBarcode} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Print</button>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button type="button" onClick={closeAssign} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Close</button>
                  <button type="button" disabled={saving || isAssignedView} onClick={onAssign} className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Assign Barcode</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
