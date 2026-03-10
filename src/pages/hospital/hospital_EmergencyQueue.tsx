import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { hospitalApi } from '../../utils/api'

type EmergencyStatus = 'active' | 'admitted' | 'discharged'

type EmergencyRow = {
  id: string
  tokenNo: string
  time: string
  mrn: string
  patientName: string
  age?: string
  gender?: string
  phone?: string
  doctor?: string
  status: EmergencyStatus
  triage?: 'red'|'yellow'|'green'
}

function Badge({ tone, children }: { tone: 'slate'|'amber'|'emerald'|'rose'|'violet'; children: React.ReactNode }){
  const map: Record<string,string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>
}

export default function Hospital_EmergencyQueue(){
  const navigate = useNavigate()
  const [rows, setRows] = useState<EmergencyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'All'|EmergencyStatus>('All')

  useEffect(() => {
    let cancelled = false
    async function load(){
      setLoading(true)
      try{
        const deps: any = await hospitalApi.listDepartments() as any
        const list: any[] = deps?.departments || deps || []
        const er = list.find((d: any) => String(d?.name || '').trim().toLowerCase() === 'emergency')
        const departmentId = er?._id || er?.id
        if (!departmentId){
          if (!cancelled) setRows([])
          return
        }
        const res: any = await hospitalApi.listTokens({ departmentId: String(departmentId), status: 'queued' })
        const res2: any = await hospitalApi.listTokens({ departmentId: String(departmentId), status: 'in-progress' })
        const toks: any[] = [...(res?.tokens || []), ...(res2?.tokens || [])]
        const mapped: EmergencyRow[] = toks.map((t: any) => {
          const p = t.patientId || {}
          const docName = t.doctorId?.name || t.doctorId?.fullName || t.doctorId?.username || ''
          const when = t.createdAt ? new Date(t.createdAt) : null
          const time = when ? when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
          const st: EmergencyStatus = (t.status === 'queued' || t.status === 'in-progress') ? 'active' : (t.status === 'completed' ? 'discharged' : 'active')
          return {
            id: String(t._id || t.id),
            tokenNo: String(t.tokenNo || ''),
            time,
            mrn: String(p.mrn || t.mrn || ''),
            patientName: String(p.fullName || t.patientName || ''),
            age: String(p.age || ''),
            gender: String(p.gender || ''),
            phone: String(p.phoneNormalized || ''),
            doctor: docName ? String(docName) : undefined,
            status: st,
          }
        })
        if (!cancelled) setRows(mapped)
      }catch{
        if (!cancelled) setRows([])
      }finally{
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    return rows.filter(r => {
      if (status !== 'All' && r.status !== status) return false
      if (!qq) return true
      const hay = [r.tokenNo, r.mrn, r.patientName, r.phone, r.doctor, r.time, r.gender, r.status].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(qq)
    })
  }, [q, rows, status])

  const openChart = (r: EmergencyRow) => {
    navigate(`/hospital/emergency/${encodeURIComponent(r.id)}`)
  }

  const triageTone = (t?: EmergencyRow['triage']) => {
    if (t === 'red') return 'rose'
    if (t === 'yellow') return 'amber'
    if (t === 'green') return 'emerald'
    return 'slate'
  }

  const statusTone = (s: EmergencyRow['status']) => {
    if (s === 'active') return 'violet'
    if (s === 'admitted') return 'amber'
    return 'emerald'
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Emergency</h2>
          <div className="mt-1 text-sm text-slate-600">Queue & active cases (frontend scaffold)</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search by token#, MR#, patient, phone, doctor..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
        <select value={status} onChange={e=>setStatus(e.target.value as any)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="admitted">Admitted</option>
          <option value="discharged">Discharged</option>
        </select>
        <div className="flex items-center justify-end text-sm text-slate-600">Rows: <span className="ml-1 font-semibold text-slate-800">{filtered.length}</span></div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Time</th>
              <th className="px-4 py-2 text-left font-medium">Token</th>
              <th className="px-4 py-2 text-left font-medium">MRN</th>
              <th className="px-4 py-2 text-left font-medium">Patient</th>
              <th className="px-4 py-2 text-left font-medium">Doctor</th>
              <th className="px-4 py-2 text-left font-medium">Triage</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">{r.time}</td>
                <td className="px-4 py-2 font-medium">{r.tokenNo}</td>
                <td className="px-4 py-2">{r.mrn}</td>
                <td className="px-4 py-2">{r.patientName}</td>
                <td className="px-4 py-2">{r.doctor || '—'}</td>
                <td className="px-4 py-2">
                  <Badge tone={triageTone(r.triage) as any}>{String(r.triage || '—').toUpperCase()}</Badge>
                </td>
                <td className="px-4 py-2">
                  <Badge tone={statusTone(r.status) as any}>{r.status.toUpperCase()}</Badge>
                </td>
                <td className="px-4 py-2">
                  <button onClick={()=>openChart(r)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
