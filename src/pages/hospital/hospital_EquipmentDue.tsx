import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_EquipmentDue(){
  type Equipment = {
    id: string
    code?: string
    name: string
    category?: string
    locationDepartmentId?: string
    nextPpmDue?: string
    nextCalibDue?: string
  }
  type Department = { id: string; name: string }

  const [tab, setTab] = useState<'ppm'|'calibration'>('ppm')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [deps, setDeps] = useState<Department[]>([])
  const [ppmItems, setPpmItems] = useState<Equipment[]>([])
  const [calibItems, setCalibItems] = useState<Equipment[]>([])

  useEffect(() => {
    let cancelled = false
    async function load(){
      setLoading(true)
      try {
        const depRes = await hospitalApi.listDepartments() as any
        const departments: Department[] = (depRes.departments || depRes || []).map((d: any) => ({ id: String(d._id || d.id), name: d.name }))
        const params: any = { from: from || undefined, to: to || undefined }
        const ppmRes = await hospitalApi.listEquipmentDuePPM(params) as any
        const calibRes = await hospitalApi.listEquipmentDueCalibration(params) as any
        const mapEq = (arr: any[]) => (arr || []).map(r => ({ id: String(r._id || r.id), code: r.code, name: r.name, category: r.category, locationDepartmentId: r.locationDepartmentId? String(r.locationDepartmentId):'', nextPpmDue: r.nextPpmDue, nextCalibDue: r.nextCalibDue }))
        if (!cancelled){ setDeps(departments); setPpmItems(mapEq(ppmRes.items || ppmRes || [])); setCalibItems(mapEq(calibRes.items || calibRes || [])) }
      } catch {} finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [from, to])

  const depMap = useMemo(() => Object.fromEntries(deps.map(d => [d.id, d.name])), [deps])
  const lower = (s?: string) => String(s||'').toLowerCase()

  const filtered = useMemo(() => {
    const src = tab === 'ppm' ? ppmItems : calibItems
    return src.filter(it => {
      if (departmentId && it.locationDepartmentId !== departmentId) return false
      if (q){
        const qq = lower(q)
        if (!(lower(it.name).includes(qq) || lower(it.code).includes(qq) || lower(it.category).includes(qq))) return false
      }
      return true
    })
  }, [tab, ppmItems, calibItems, departmentId, q])

  const exportCSV = () => {
    const header = ['Code','Name','Category','Department', tab==='ppm'? 'Next PPM':'Next Calib']
    const lines = [header.join(',')]
    for (const it of filtered){
      const row = [it.code||'', it.name||'', it.category||'', depMap[it.locationDepartmentId||'']||'', tab==='ppm'? (it.nextPpmDue||'') : (it.nextCalibDue||'')]
        .map(v => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : String(v ?? ''))
      lines.push(row.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `equipment-due-${tab}-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Equipment Due</h2>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={()=>setTab('ppm')} className={`rounded-md px-3 py-1.5 ${tab==='ppm'?'bg-sky-600 text-white':'border border-slate-300'}`}>PPM Due</button>
          <button onClick={()=>setTab('calibration')} className={`rounded-md px-3 py-1.5 ${tab==='calibration'?'bg-sky-600 text-white':'border border-slate-300'}`}>Calibration Due</button>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." className="rounded-md border border-slate-300 px-3 py-1.5" />
          <select value={departmentId} onChange={e=>setDepartmentId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5">
            <option value="">All departments</option>
            {deps.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          <span>to</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
          <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Export</button>
        </div>
      </div>

      <div className="mt-4">
        {loading && <div className="text-sm text-slate-600">Loading...</div>}
        {!loading && (
          <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-700">
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Department</th>
                  <th className="px-3 py-2 text-left">{tab==='ppm'?'Next PPM':'Next Calib'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(it => (
                  <tr key={it.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{it.code||'-'}</td>
                    <td className="px-3 py-2">{it.name}</td>
                    <td className="px-3 py-2">{it.category||'-'}</td>
                    <td className="px-3 py-2">{depMap[it.locationDepartmentId||'']||'-'}</td>
                    <td className="px-3 py-2">{tab==='ppm'? (it.nextPpmDue||'-') : (it.nextCalibDue||'-')}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">No records</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
