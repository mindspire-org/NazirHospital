import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, CheckCircle2, XCircle, Pencil, Search, Barcode } from 'lucide-react'
import { labApi } from '../../utils/api'
import { previewLabReportPdf } from '../../utils/printLabReport'

type ResultRow = { id: string; test: string; normal?: string; unit?: string; prevValue?: string; value?: string; flag?: 'normal'|'abnormal'|'critical'; comment?: string }

type ResultRecord = { id: string; orderId: string; rows: ResultRow[]; interpretation?: string; createdAt: string; submittedBy?: string; approvedBy?: string; approvedAt?: string }

type Order = {
  id: string
  createdAt: string
  patient: { fullName: string; phone: string; mrn?: string; age?: string; gender?: string; address?: string }
  tests: string[]
  status: 'received'|'completed'
  tokenNo?: string
  sampleTime?: string
  reportingTime?: string
  referringConsultant?: string
  barcode?: string
}

type Track = { status: 'received' | 'completed'; sampleTime?: string; reportingTime?: string; tokenNo: string }

type LabTest = { id: string; name: string; category?: string }

function genToken(dateIso: string, id: string) {
  const d = new Date(dateIso)
  const part = `${d.getDate().toString().padStart(2,'0')}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getFullYear()}`
  return `D${part}_${id.slice(-3)}`
}

function genBarcode(order: Order) {
  const d = new Date(order.createdAt)
  const y = d.getFullYear()
  const part = String(order.tokenNo || order.id || '').replace(/\s+/g, '').replace(/[^a-z0-9_-]/gi, '')
  return `BC-${y}-${part}`
}

export default function Lab_ReportApproval() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId') || ''
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [result, setResult] = useState<ResultRecord | null>(null)
  const [tests, setTests] = useState<LabTest[]>([])
  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.name])), [tests])

  const [q, setQ] = useState('')
  const [listLoading, setListLoading] = useState(false)
  const [list, setList] = useState<Array<{ order: Order; result: any }>>([])

  useEffect(() => {
    let mounted = true
    setLoading(false)
    setOrder(null)
    setResult(null)
    if (!orderId) return
    setLoading(true)
    ;(async () => {
      try {
        const [ordRes, resRes, tstRes] = await Promise.all([
          labApi.listOrders({ limit: 500 }),
          labApi.listResults({ orderId, limit: 1 }),
          labApi.listTests({ limit: 1000 }),
        ])
        if (!mounted) return
        const found = (ordRes.items || []).find((x: any) => String(x._id) === String(orderId))
        const o: Order | null = found
          ? {
              id: found._id,
              createdAt: found.createdAt || new Date().toISOString(),
              patient: found.patient || { fullName: '-', phone: '' },
              tests: found.tests || [],
              status: found.status || 'received',
              tokenNo: found.tokenNo,
              sampleTime: found.sampleTime,
              reportingTime: found.reportingTime,
              referringConsultant: found.referringConsultant,
              barcode: found.barcode,
            }
          : null
        setOrder(o)

        const rec = Array.isArray(resRes.items) && resRes.items.length ? resRes.items[0] : null
        setResult(
          rec
            ? {
                id: String(rec._id || rec.id),
                orderId: String(rec.orderId || orderId),
                rows: (rec.rows || []).map((r: any) => ({
                  id: String(r.id || crypto.randomUUID()),
                  test: String(r.test || ''),
                  normal: r.normal,
                  unit: r.unit,
                  prevValue: r.prevValue,
                  value: r.value,
                  flag: r.flag,
                  comment: r.comment,
                })),
                interpretation: rec.interpretation,
                createdAt: String(rec.createdAt || new Date().toISOString()),
                submittedBy: rec.submittedBy,
                approvedBy: rec.approvedBy,
                approvedAt: rec.approvedAt,
              }
            : null
        )

        setTests((tstRes.items || []).map((t: any) => ({ id: t._id, name: t.name, category: t.category || '' })))
      } catch (e) {
        console.error(e)
        if (mounted) {
          setOrder(null)
          setResult(null)
          setTests([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [orderId])

  useEffect(() => {
    let mounted = true
    if (orderId) return
    setListLoading(true)
    ;(async () => {
      try {
        const [ordRes, resRes, tstRes] = await Promise.all([
          labApi.listOrders({ status: 'completed', q: q || undefined, limit: 500 }),
          labApi.listResults({ limit: 500 }),
          labApi.listTests({ limit: 1000 }),
        ])
        if (!mounted) return
        const orders: Order[] = (ordRes.items || []).map((x: any) => ({
          id: x._id,
          createdAt: x.createdAt || new Date().toISOString(),
          patient: x.patient || { fullName: '-', phone: '' },
          tests: x.tests || [],
          status: x.status || 'completed',
          tokenNo: x.tokenNo,
          sampleTime: x.sampleTime,
          reportingTime: x.reportingTime,
          referringConsultant: x.referringConsultant,
          barcode: x.barcode,
        }))
        const results: any[] = (resRes.items || [])
        const resultByOrderId = new Map<string, any>()
        for (const r of results) {
          const oid = String(r?.orderId || '')
          if (!oid) continue
          if (!resultByOrderId.has(oid)) resultByOrderId.set(oid, r)
        }
        setTests((tstRes.items || []).map((t: any) => ({ id: t._id, name: t.name, category: t.category || '' })))
        setList(
          orders
            .map(o => ({ order: o, result: resultByOrderId.get(String(o.id)) || null }))
            .filter(x => {
              if (!x.result) return false
              const st = String((x.result as any)?.reportStatus || 'pending')
              return st !== 'approved'
            })
        )
      } catch (e) {
        console.error(e)
        if (mounted) {
          setList([])
          setTests([])
        }
      } finally {
        if (mounted) setListLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [orderId, q])

  const tokenNo = useMemo(() => {
    if (!order) return '-'
    return order.tokenNo || genToken(order.createdAt, order.id)
  }, [order])

  const track: Track | null = useMemo(() => {
    if (!order) return null
    return {
      status: order.status,
      tokenNo,
      sampleTime: order.sampleTime,
      reportingTime: order.reportingTime,
    }
  }, [order, tokenNo])

  const testsStr = useMemo(() => {
    if (!order) return ''
    return (order.tests || []).map(id => testsMap[id]).filter(Boolean).join(', ')
  }, [order, testsMap])

  const isApproved = useMemo(() => {
    return String((result as any)?.reportStatus || 'pending') === 'approved'
  }, [result])

  const preview = async () => {
    if (!order || !result) return
    await previewLabReportPdf({
      tokenNo,
      barcode: order.barcode,
      createdAt: order.createdAt,
      sampleTime: track?.sampleTime,
      reportingTime: track?.reportingTime,
      patient: {
        fullName: order.patient.fullName,
        phone: order.patient.phone,
        mrn: order.patient.mrn,
        age: order.patient.age,
        gender: order.patient.gender,
        address: order.patient.address,
      },
      rows: result.rows,
      interpretation: result.interpretation,
      referringConsultant: order.referringConsultant,
      profileLabel: testsStr,
    })
  }

  if (!orderId) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-2xl font-bold text-slate-900">Report Approval</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by token / patient / MRN..." className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">MR No</th>
                <th className="px-3 py-2">Token</th>
                <th className="px-3 py-2">Barcode</th>
                <th className="px-3 py-2">Test(s)</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Submitted By</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(({ order, result }) => {
                const token = order.tokenNo || genToken(order.createdAt, order.id)
                const testsStr = (order.tests || []).map(id => testsMap[id]).filter(Boolean).join(', ')
                const st = String(result?.reportStatus || 'pending')
                return (
                  <tr key={order.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{order.patient.fullName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{order.patient.mrn || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono">{token}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs">
                        <Barcode className="h-4 w-4 text-slate-400" />
                        <span className="font-mono">{order.barcode || genBarcode(order)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{testsStr || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${st === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{st}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{String((result as any)?.submittedBy || '-')}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button onClick={() => navigate(`/lab/report-approval?orderId=${encodeURIComponent(order.id)}`)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Open</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!listLoading && list.length === 0 && (
            <div className="p-6 text-sm text-slate-500">No completed results found</div>
          )}
          {listLoading && <div className="p-6 text-sm text-slate-600">Loading...</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Report Approval</h2>
            <div className="mt-1 text-sm text-slate-600">
              Token: <span className="font-mono">{tokenNo}</span>
              {' · '}
              Patient: {order?.patient?.fullName || '-'}
              {' · '}
              MR No: {order?.patient?.mrn || '-'}
            </div>
            <div className="mt-1 text-xs text-slate-500">Tests: {testsStr || '-'}</div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs ${isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {isApproved ? 'approved' : 'pending approval'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {loading && <div className="text-sm text-slate-600">Loading...</div>}
        {!loading && (!order || !result) && (
          <div className="text-sm text-slate-600">No result found for this order.</div>
        )}

        {!loading && order && result && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-slate-700">
                Review the report before final approval.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={preview}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4" /> Preview
                </button>
                <button
                  onClick={() => navigate(`/lab/results?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(tokenNo)}`)}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" /> Edit Result
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Test</th>
                    <th className="px-3 py-2">Normal</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Prev</th>
                    <th className="px-3 py-2">Value</th>
                    <th className="px-3 py-2">Flag</th>
                    <th className="px-3 py-2">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map(r => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{r.test}</td>
                      <td className="px-3 py-2">{r.normal || '-'}</td>
                      <td className="px-3 py-2">{r.unit || '-'}</td>
                      <td className="px-3 py-2">{r.prevValue || '-'}</td>
                      <td className="px-3 py-2 font-semibold">{r.value || '-'}</td>
                      <td className="px-3 py-2">{r.flag || '-'}</td>
                      <td className="px-3 py-2">{r.comment || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.interpretation && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-semibold">Interpretation</div>
                <div className="mt-1 whitespace-pre-wrap">{result.interpretation}</div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => {
                  navigate(`/lab/results?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(tokenNo)}`)
                }}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <XCircle className="h-4 w-4" /> Reject / Edit
              </button>
              <button
                onClick={async () => {
                  if (!result) return
                  try {
                    await labApi.updateResult(result.id, { reportStatus: 'approved', approvedAt: new Date().toISOString() })
                    navigate('/lab/report-approval')
                  } catch (e) {
                    console.error(e)
                    alert('Failed to approve report')
                  }
                }}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve & Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
