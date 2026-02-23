import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_EquipmentCondemnationRegister(){
  type Equipment = { id: string; name?: string; code?: string }
  type Condemn = {
    _id: string
    equipmentId: string
    proposedAt?: string
    reason?: string
    approvedBy?: string
    approvedAt?: string
    status?: 'Proposed'|'Approved'|'Disposed'
    disposalMethod?: string
    disposalDate?: string
    notes?: string
    createdAt?: string
  }

  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [items, setItems] = useState<Condemn[]>([])
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
      const res = await hospitalApi.listEquipmentCondemnations({ equipmentId: equipmentId || undefined, status: (status as any) || undefined, from: from || undefined, to: to || undefined, page: 1, limit: 1000 }) as any
      setItems(res?.items || [])
    } catch (e: any) {
      alert(e?.message || 'Failed to load condemnations')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [equipmentId, status, from, to])

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    if (!ql) return items
    const byEqName = new Map(equipment.map(e => [e.id, `${e.name || ''} ${e.code || ''}`.toLowerCase()]))
    return items.filter(it => {
      const s = [
        byEqName.get(it.equipmentId) || '',
        it.reason || '',
        it.approvedBy || '',
        it.disposalMethod || '',
        it.notes || '',
      ].join(' ').toLowerCase()
      return s.includes(ql)
    })
  }, [items, q, equipment])

  const exportCSV = () => {
    const header = ['Proposed At','Approved At','Disposal Date','Equipment','Status','Reason','Approved By','Disposal Method','Notes']
    const byEq = new Map(equipment.map(e => [e.id, `${e.name || ''}${e.code ? ' ['+e.code+']':''}`]))
    const rows = filtered.map(it => [
      it.proposedAt || '',
      it.approvedAt || '',
      it.disposalDate || '',
      byEq.get(it.equipmentId) || it.equipmentId,
      it.status || '',
      (it.reason || '').replace(/\n/g,' '),
      it.approvedBy || '',
      it.disposalMethod || '',
      (it.notes || '').replace(/\n/g,' '),
    ])
    const csv = [header, ...rows].map(r => r.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'condemnation_register.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const printTable = () => {
    const byEq = new Map(equipment.map(e => [e.id, `${e.name || ''}${e.code ? ' ['+e.code+']':''}`]))
    const html = `<!doctype html><html><head><title>Condemnation Register</title>
      <style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{text-align:left;background:#f5f5f5}</style>
      </head><body>
      <h3>Condemnation Register</h3>
      <table><thead><tr>
        <th>Proposed At</th><th>Approved At</th><th>Disposal Date</th><th>Equipment</th><th>Status</th><th>Reason</th><th>Approved By</th><th>Disposal Method</th><th>Notes</th>
      </tr></thead><tbody>
      ${filtered.map(it => `
        <tr>
          <td>${it.proposedAt || ''}</td>
          <td>${it.approvedAt || ''}</td>
          <td>${it.disposalDate || ''}</td>
          <td>${byEq.get(it.equipmentId) || it.equipmentId}</td>
          <td>${it.status || ''}</td>
          <td>${(it.reason || '').replace(/</g,'&lt;')}</td>
          <td>${(it.approvedBy || '').replace(/</g,'&lt;')}</td>
          <td>${(it.disposalMethod || '').replace(/</g,'&lt;')}</td>
          <td>${(it.notes || '').replace(/</g,'&lt;')}</td>
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
        <h2 className="text-xl font-semibold text-slate-800">Condemnation Register</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={equipmentId} onChange={e=>setEquipmentId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5">
            <option value="">All equipment</option>
            {equipment.map(e => (<option key={e.id} value={e.id}>{e.name || 'Equipment'}{e.code?` [${e.code}]`:''}</option>))}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5">
            <option value="">Any status</option>
            <option>Proposed</option>
            <option>Approved</option>
            <option>Disposed</option>
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
                  <th className="px-2 py-2">Proposed At</th>
                  <th className="px-2 py-2">Approved At</th>
                  <th className="px-2 py-2">Disposal Date</th>
                  <th className="px-2 py-2">Equipment</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Reason</th>
                  <th className="px-2 py-2">Approved By</th>
                  <th className="px-2 py-2">Disposal Method</th>
                  <th className="px-2 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(it => {
                  const e = equipment.find(x => x.id === it.equipmentId)
                  const eqName = e ? `${e.name || ''}${e.code ? ' ['+e.code+']':''}` : it.equipmentId
                  return (
                    <tr key={it._id} className="border-t">
                      <td className="px-2 py-2">{it.proposedAt || ''}</td>
                      <td className="px-2 py-2">{it.approvedAt || ''}</td>
                      <td className="px-2 py-2">{it.disposalDate || ''}</td>
                      <td className="px-2 py-2">{eqName}</td>
                      <td className="px-2 py-2">{it.status || ''}</td>
                      <td className="px-2 py-2">{it.reason || ''}</td>
                      <td className="px-2 py-2">{it.approvedBy || ''}</td>
                      <td className="px-2 py-2">{it.disposalMethod || ''}</td>
                      <td className="px-2 py-2">{it.notes || ''}</td>
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
