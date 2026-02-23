import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_EquipmentKpis(){
  type KPIResponse = {
    ppm: { due: number; done: number; compliance: number }
    calibration: { due: number; done: number; compliance: number }
    breakdowns: { count: number; mtbfDays: number|null; downtimeDays: number; downtimePercent: number|null }
  }

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<KPIResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(){
      setLoading(true)
      try {
        const res = await hospitalApi.equipmentKpis({ from: from || undefined, to: to || undefined }) as any
        if (!cancelled) setData(res)
      } catch (e: any) {
        alert(e?.message || 'Failed to load KPIs')
      } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [from, to])

  const fmtPct = (n?: number | null) => (n == null ? '-' : `${(n*100).toFixed(1)}%`)
  const fmtNum = (n?: number | null) => (n == null ? '-' : String(Math.round((n + Number.EPSILON) * 10) / 10))

  const rows = useMemo(() => {
    const d = data
    if (!d) return null
    return {
      ppm: { due: d.ppm.due, done: d.ppm.done, compliancePct: d.ppm.compliance * 100 },
      calibration: { due: d.calibration.due, done: d.calibration.done, compliancePct: d.calibration.compliance * 100 },
      breakdowns: { count: d.breakdowns.count, mtbfDays: d.breakdowns.mtbfDays, downtimeDays: d.breakdowns.downtimeDays, downtimePct: d.breakdowns.downtimePercent != null ? d.breakdowns.downtimePercent * 100 : null },
    }
  }, [data])

  const exportCSV = () => {
    if (!rows) return
    const header = ['From','To','PPM Due','PPM Done','PPM Compliance %','Calib Due','Calib Done','Calib Compliance %','Breakdowns','MTBF Days','Downtime Days','Downtime %']
    const r = rows
    const vals = [
      from || '',
      to || '',
      r.ppm.due,
      r.ppm.done,
      (Math.round(r.ppm.compliancePct * 10) / 10).toFixed(1),
      r.calibration.due,
      r.calibration.done,
      (Math.round(r.calibration.compliancePct * 10) / 10).toFixed(1),
      r.breakdowns.count,
      r.breakdowns.mtbfDays == null ? '' : (Math.round(Number(r.breakdowns.mtbfDays) * 10) / 10).toFixed(1),
      r.breakdowns.downtimeDays == null ? '' : (Math.round(Number(r.breakdowns.downtimeDays) * 10) / 10).toFixed(1),
      r.breakdowns.downtimePct == null ? '' : (Math.round(Number(r.breakdowns.downtimePct) * 10) / 10).toFixed(1),
    ]
    const csv = [header, vals].map(row => row.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `equipment-kpis-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printView = () => {
    const d = rows
    const safe = (v: any) => (v == null ? '-' : String(v))
    const html = `<!doctype html><html><head><title>Equipment KPIs</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:16px}
        h2{margin:0 0 12px}
        .small{color:#555;margin-bottom:12px}
        .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .card{border:1px solid #ddd;border-radius:8px;padding:12px}
        .title{font-weight:600;margin-bottom:8px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #ccc;padding:6px;text-align:left;font-size:12px}
        th{background:#f5f5f5}
      </style>
    </head><body>
      <h2>Equipment KPIs</h2>
      <div class="small">Range: ${from || '-'} to ${to || '-'}</div>
      <div class="cards">
        <div class="card">
          <div class="title">PPM Compliance</div>
          <div>Due: ${safe(d?.ppm.due)}</div>
          <div>Done: ${safe(d?.ppm.done)}</div>
          <div>Compliance: ${safe((Math.round((d?.ppm.compliancePct || 0) * 10)/10).toFixed(1))}%</div>
        </div>
        <div class="card">
          <div class="title">Calibration Compliance</div>
          <div>Due: ${safe(d?.calibration.due)}</div>
          <div>Done: ${safe(d?.calibration.done)}</div>
          <div>Compliance: ${safe((Math.round((d?.calibration.compliancePct || 0) * 10)/10).toFixed(1))}%</div>
        </div>
        <div class="card">
          <div class="title">Breakdowns & Downtime</div>
          <div>Total Breakdowns: ${safe(d?.breakdowns.count)}</div>
          <div>MTBF (days): ${safe(d?.breakdowns.mtbfDays == null ? '-' : (Math.round(Number(d?.breakdowns.mtbfDays) * 10)/10).toFixed(1))}</div>
          <div>Downtime Days: ${safe(d?.breakdowns.downtimeDays == null ? '-' : (Math.round(Number(d?.breakdowns.downtimeDays) * 10)/10).toFixed(1))}</div>
          <div>Downtime %: ${safe(d?.breakdowns.downtimePct == null ? '-' : (Math.round(Number(d?.breakdowns.downtimePct) * 10)/10).toFixed(1))}</div>
        </div>
      </div>
      <script>window.print()</script>
    </body></html>`
    const w = window.open('', '_blank')
    if (w){ w.document.write(html); w.document.close() }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Equipment KPIs</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          <span>to</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Export</button>
          <button onClick={printView} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Print</button>
        </div>
      </div>

      <div className="mt-4">
        {loading && <div className="text-sm text-slate-600">Loading...</div>}
        {!loading && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-700">PPM Compliance</div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <div className="text-slate-600">Due</div>
                <div className="font-medium">{data?.ppm?.due ?? '-'}</div>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <div className="text-slate-600">Done</div>
                <div className="font-medium">{data?.ppm?.done ?? '-'}</div>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <div className="text-slate-600">Compliance</div>
                <div className="font-medium">{fmtPct(data?.ppm?.compliance)}</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-700">Calibration Compliance</div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <div className="text-slate-600">Due</div>
                <div className="font-medium">{data?.calibration?.due ?? '-'}</div>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <div className="text-slate-600">Done</div>
                <div className="font-medium">{data?.calibration?.done ?? '-'}</div>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <div className="text-slate-600">Compliance</div>
                <div className="font-medium">{fmtPct(data?.calibration?.compliance)}</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-700">Breakdowns & Downtime</div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <div className="text-slate-600">Total Breakdowns</div>
                <div className="font-medium">{data?.breakdowns?.count ?? '-'}</div>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <div className="text-slate-600">MTBF (days)</div>
                <div className="font-medium">{fmtNum(data?.breakdowns?.mtbfDays)}</div>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <div className="text-slate-600">Downtime Days</div>
                <div className="font-medium">{fmtNum(data?.breakdowns?.downtimeDays)}</div>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <div className="text-slate-600">Downtime %</div>
                <div className="font-medium">{fmtPct(data?.breakdowns?.downtimePercent)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
