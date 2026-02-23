import { useEffect, useMemo, useState } from 'react'
import { aestheticApi } from '../../utils/api'
import { Link } from 'react-router-dom'
import { Eye, RefreshCw, Search } from 'lucide-react'

export default function Aesthetic_Patients(){
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(25)
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'active'|'completed'|'unpaid'>('active')

  useEffect(()=>{ setList([]) }, [])

  const loadActive = async ()=>{
    setLoading(true)
    setErr('')
    try{
      const today = new Date(); today.setHours(0,0,0,0)
      const from = new Date(today.getTime() - 180 * 86400000).toISOString().slice(0,10)
      const r: any = await aestheticApi.listProcedureSessions({ from, page: 1, limit: 500 })
      const items: any[] = r?.items || []

      const byMrn = new Map<string, any>()
      for (const s of items){
        const mrn = String(s?.patientMrn || '')
        if (!mrn) continue
        const dateTs = new Date(s?.date || '').getTime() || 0
        const nextTs = s?.nextVisitDate ? new Date(String(s.nextVisitDate).slice(0,10) + 'T00:00:00').getTime() : 0
        const isOpen = String(s?.status || 'planned') !== 'done' && String(s?.status || 'planned') !== 'cancelled'
        const hasUpcoming = isOpen && !!nextTs && nextTs >= today.getTime()
        const existing = byMrn.get(mrn)
        const next = {
          mrn,
          patientName: s?.patientName,
          phone: s?.phone,
          lastVisitTs: dateTs,
          nextVisitTs: hasUpcoming ? nextTs : 0,
          balance: Number(s?.balance || 0),
          paid: Number(s?.paid || 0),
          total: Number(s?.price || 0) - Number(s?.discount || 0),
          hasOpen: isOpen,
        }
        if (!existing){
          byMrn.set(mrn, next)
          continue
        }
        existing.patientName = existing.patientName || next.patientName
        existing.phone = existing.phone || next.phone
        existing.lastVisitTs = Math.max(existing.lastVisitTs || 0, next.lastVisitTs || 0)
        existing.nextVisitTs = Math.min(
          existing.nextVisitTs || 0,
          next.nextVisitTs || 0,
        ) || Math.max(existing.nextVisitTs || 0, next.nextVisitTs || 0)
        existing.balance = Number(existing.balance || 0) + Number(next.balance || 0)
        existing.paid = Number(existing.paid || 0) + Number(next.paid || 0)
        existing.total = Number(existing.total || 0) + Number(next.total || 0)
        existing.hasOpen = Boolean(existing.hasOpen) || Boolean(next.hasOpen)
      }

      const rows = Array.from(byMrn.values())
        .sort((a,b)=> (b.nextVisitTs||0) - (a.nextVisitTs||0) || (b.lastVisitTs||0) - (a.lastVisitTs||0))
        .slice(0, Math.max(1, Number(limit||25)))

      setList(rows)
    } catch {
      setErr('Unable to load active patients.')
      setList([])
    }
    setLoading(false)
  }

  useEffect(()=>{ loadActive() }, [limit])

  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase()
    const rows = list
      .filter(p => {
        const unpaid = Number(p.balance || 0) > 0
        const completed = Number(p.nextVisitTs || 0) === 0 && !Boolean(p.hasOpen)
        const active = !completed
        if (statusFilter === 'active') return active
        if (statusFilter === 'unpaid') return completed && unpaid
        return completed && !unpaid
      })
    if (!q) return rows
    return rows.filter(p => [p.mrn, p.patientName, p.phone].filter(Boolean).some((v:any)=> String(v).toLowerCase().includes(q)))
  }, [list, query, statusFilter])

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-lg font-semibold">{statusFilter==='active'?'Active Patients':statusFilter==='unpaid'?'Unpaid Patients':'Completed Patients'}</div>
          <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
            <button
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${statusFilter==='active' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              onClick={()=>setStatusFilter('active')}
              type="button"
            >
              Active
            </button>
            <button
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${statusFilter==='unpaid' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              onClick={()=>setStatusFilter('unpaid')}
              type="button"
            >
              Unpaid
            </button>
            <button
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${statusFilter==='completed' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              onClick={()=>setStatusFilter('completed')}
              type="button"
            >
              Completed
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input value={query} onChange={e=>setQuery(e.target.value)} className="w-72 max-w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm" placeholder="Search by MRN, name, phone..." />
          </div>
          <select value={limit} onChange={e=>setLimit(parseInt(e.target.value))} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button onClick={loadActive} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">MRN</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Last Visit</th>
              <th className="px-3 py-2 text-left">Next Appointment</th>
              <th className="px-3 py-2 text-left">Balance</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {err && !loading && (
              <tr><td className="px-3 py-8 text-center text-rose-600" colSpan={7}>{err}</td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.mrn} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{p.mrn}</td>
                <td className="px-3 py-2">{p.patientName || '-'}</td>
                <td className="px-3 py-2">{p.phone || '-'}</td>
                <td className="px-3 py-2">{p.lastVisitTs ? new Date(p.lastVisitTs).toLocaleDateString() : '-'}</td>
                <td className="px-3 py-2">{p.nextVisitTs ? new Date(p.nextVisitTs).toLocaleDateString() : '-'}</td>
                <td className={`px-3 py-2 font-medium ${Number(p.balance||0) > 0 ? 'text-rose-700' : 'text-slate-700'}`}>Rs {Math.round(Number(p.balance||0)).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <Link
                    to={`/aesthetic/patients/mrn/${encodeURIComponent(p.mrn)}`}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    title="View Details"
                    aria-label={`View details for ${p.patientName || p.mrn}`}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && !err && (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={7}>
                  No patients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
