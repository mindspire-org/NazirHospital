import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_EquipmentBreakdownRegister(){
  type Equipment = { id: string; name?: string; code?: string }
  type Breakdown = {
    _id: string
    equipmentId: string
    reportedAt: string
    restoredAt?: string
    description?: string
    rootCause?: string
    correctiveAction?: string
    severity?: 'low'|'medium'|'high'
    status?: 'Open'|'Closed'
    cost?: number
    createdAt?: string
  }

  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [items, setItems] = useState<Breakdown[]>([])
  const [loading, setLoading] = useState(false)

  const [equipmentId, setEquipmentId] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    // load equipment list for filter
    (async () => {
      try {
        const res = await hospitalApi.listEquipment({ limit: 1000 }) as any
        setEquipment((res?.items || []).map((r: any) => ({ id: r._id || r.id, name: r.name, code: r.code })))
      } catch {}
    })()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await hospitalApi.listEquipmentBreakdowns({ equipmentId: equipmentId || undefined, status: (status as any) || undefined, from: from || undefined, to: to || undefined, page: 1, limit: 1000 }) as any
      setItems(res?.items || [])
    } catch (e: any) {
      alert(e?.message || 'Failed to load breakdowns')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [equipmentId, status, from, to])

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    if (!ql) return items
    const byEqName = new Map(equipment.map(e => [e.id, `${e.name || ''} ${e.code || ''}`.toLowerCase()]))
    return items.filter(b => {
      const s = [
        byEqName.get(b.equipmentId) || '',
        b.description || '',
        b.rootCause || '',
        b.correctiveAction || '',
      ].join(' ').toLowerCase()
      return s.includes(ql)
    })
  }, [items, q, equipment])

  const exportCSV = () => {
    const header = ['Reported At','Restored At','Equipment','Severity','Status','Description','Root Cause','Corrective Action','Cost']
    const byEq = new Map(equipment.map(e => [e.id, `${e.name || ''}${e.code ? ' ['+e.code+']':''}`]))
    const rows = filtered.map(b => [
      b.reportedAt || '',
      b.restoredAt || '',
      byEq.get(b.equipmentId) || b.equipmentId,
      b.severity || '',
      b.status || '',
      (b.description || '').replace(/\n/g,' '),
      (b.rootCause || '').replace(/\n/g,' '),
      (b.correctiveAction || '').replace(/\n/g,' '),
      b.cost != null ? String(b.cost) : '',
    ])
    const csv = [header, ...rows].map(r => r.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'breakdown_register.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const printTable = () => {
    const byEq = new Map(equipment.map(e => [e.id, `${e.name || ''}${e.code ? ' ['+e.code+']':''}`]))
    const html = `<!doctype html><html><head><title>Breakdown Register</title>
      <style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{text-align:left;background:#f5f5f5}</style>
      </head><body>
      <h3>Breakdown Register</h3>
      <table><thead><tr>
        <th>Reported At</th><th>Restored At</th><th>Equipment</th><th>Severity</th><th>Status</th><th>Description</th><th>Root Cause</th><th>Corrective Action</th><th>Cost</th>
      </tr></thead><tbody>
      ${filtered.map(b => `
        <tr>
          <td>${b.reportedAt || ''}</td>
          <td>${b.restoredAt || ''}</td>
          <td>${byEq.get(b.equipmentId) || b.equipmentId}</td>
          <td>${b.severity || ''}</td>
          <td>${b.status || ''}</td>
          <td>${(b.description || '').replace(/</g,'&lt;')}</td>
          <td>${(b.rootCause || '').replace(/</g,'&lt;')}</td>
          <td>${(b.correctiveAction || '').replace(/</g,'&lt;')}</td>
          <td>${b.cost != null ? String(b.cost) : ''}</td>
        </tr>`).join('')}
      </tbody></table>
      <script>window.print()</script>
      </body></html>`
    const w = window.open('', '_blank')
    if (w){ w.document.write(html); w.document.close() }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Breakdown Register</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={equipmentId} onChange={e=>setEquipmentId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5">
            <option value="">All equipment</option>
            {equipment.map(e => (<option key={e.id} value={e.id}>{e.name || 'Equipment'}{e.code?` [${e.code}]`:''}</option>))}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5">
            <option value="">Any status</option>
            <option>Open</option>
            <option>Closed</option>
          </select>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          <span>to</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." className="rounded-md border border-slate-300 px-3 py-1.5" />
          <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">CSV</button>
          <button onClick={printTable} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Print</button>
        </div>
      </div>

      <div className="mt-4">
        {loading && <div className="text-sm text-slate-600">Loading...</div>}
        {!loading && (
          <div className="overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="px-2 py-2">Reported At</th>
                  <th className="px-2 py-2">Restored At</th>
                  <th className="px-2 py-2">Equipment</th>
                  <th className="px-2 py-2">Severity</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2">Root Cause</th>
                  <th className="px-2 py-2">Corrective Action</th>
                  <th className="px-2 py-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const e = equipment.find(x => x.id === b.equipmentId)
                  const eqName = e ? `${e.name || ''}${e.code ? ' ['+e.code+']':''}` : b.equipmentId
                  return (
                    <tr key={b._id} className="border-t">
                      <td className="px-2 py-2">{b.reportedAt || ''}</td>
                      <td className="px-2 py-2">{b.restoredAt || ''}</td>
                      <td className="px-2 py-2">{eqName}</td>
                      <td className="px-2 py-2 capitalize">{b.severity || ''}</td>
                      <td className="px-2 py-2">{b.status || ''}</td>
                      <td className="px-2 py-2">{b.description || ''}</td>
                      <td className="px-2 py-2">{b.rootCause || ''}</td>
                      <td className="px-2 py-2">{b.correctiveAction || ''}</td>
                      <td className="px-2 py-2 text-right">{b.cost != null ? b.cost.toFixed(2) : ''}</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td className="px-2 py-4 text-center text-slate-500" colSpan={9}>No records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
