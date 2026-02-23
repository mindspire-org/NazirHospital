import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'

export default function Hospital_ShortStayList(){
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ load() }, [page, limit])

  async function load(){
    setLoading(true)
    try {
      // Try list API
      const res: any = await hospitalApi.listIpdShortStays({ q, page, limit }).catch(()=>null)
      if (res && Array.isArray(res.results)){
        setRows(res.results)
        setTotal(res.total||res.results.length||0)
        return
      }
      // Fallback: scan discharged encounters and include those with a short-stay doc
      const encs: any = await hospitalApi.listIPDAdmissions({ status: 'discharged', q, page, limit }).catch(()=>null)
      const admissions = encs?.admissions||[]
      const mapped = await Promise.all(admissions.map(async (e: any)=>{
        try {
          const ss: any = await hospitalApi.getIpdShortStay(String(e._id)).catch(()=>null)
          if (ss?.shortStay){
            return {
              _id: ss.shortStay._id,
              encounterId: String(e._id),
              createdAt: ss.shortStay.createdAt || e.startAt,
              patientName: e.patientId?.fullName,
              mrn: e.patientId?.mrn,
              cnic: e.patientId?.cnicNormalized,
              phone: e.patientId?.phoneNormalized,
              department: e.departmentId?.name,
            }
          }
        } catch {}
        return null
      }))
      const rows = mapped.filter(Boolean) as any[]
      setRows(rows)
      setTotal(rows.length)
    } finally { setLoading(false) }
  }

  function sr(idx: number){ return (page-1)*limit + idx + 1 }

  async function onDelete(encounterId: string){
    if (!confirm('Delete this form?')) return
    try { await hospitalApi.deleteIpdShortStay(encounterId) } catch {}
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-800">Short Stay Forms</div>
        <div className="flex items-center gap-2">
          <input className="border rounded-md px-2 py-1 text-sm" placeholder="Search name / MRN / CNIC / phone / dept" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter') { setPage(1); load() } }} />
          <button className="btn-outline-navy text-sm" onClick={()=>{ setPage(1); load() }} disabled={loading}>Search</button>
        </div>
      </div>

      <div className="overflow-auto border rounded-md">
        <table className="min-w-[800px] w-full">
          <thead>
            <tr className="bg-slate-100 text-left text-sm text-slate-700">
              <th className="px-3 py-2">Sr #</th>
              <th className="px-3 py-2">Patient</th>
              <th className="px-3 py-2">MRN</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">CNIC</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((r, i)=> (
              <tr key={r._id} className="border-t">
                <td className="px-3 py-2">{sr(i)}</td>
                <td className="px-3 py-2">{r.patientName||'-'}</td>
                <td className="px-3 py-2">{r.mrn||'-'}</td>
                <td className="px-3 py-2">{r.department||'-'}</td>
                <td className="px-3 py-2">{r.cnic||'-'}</td>
                <td className="px-3 py-2">{r.phone||'-'}</td>
                <td className="px-3 py-2">{new Date(r.createdAt||r._id?.toString?.()).toLocaleString?.()||''}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="btn-outline-navy text-xs" onClick={()=> navigate(`/hospital/ipd/admissions/${encodeURIComponent(r.encounterId)}/forms/short-stay`)}>Edit</button>
                    <button className="btn-outline-navy text-xs" onClick={()=> navigate(`/hospital/ipd/admissions/${encodeURIComponent(r.encounterId)}/forms/short-stay`)}>Print</button>
                    <button className="btn-outline-navy text-xs" onClick={()=> onDelete(String(r.encounterId))}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="px-3 py-6 text-slate-500" colSpan={8}>{loading? 'Loading...':'No records found'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 text-sm">
        <span>Rows:</span>
        <select className="border rounded px-2 py-1" value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)||20); setPage(1) }}>
          {[10,20,50,100].map(n=> <option key={n} value={n}>{n}</option>)}
        </select>
        <span>Page {page} of {Math.max(1, Math.ceil(total/limit)||1)}</span>
        <button className="btn-outline-navy" disabled={page<=1} onClick={()=> setPage(p=>Math.max(1,p-1))}>Prev</button>
        <button className="btn-outline-navy" disabled={page>=Math.ceil(total/limit)} onClick={()=> setPage(p=>p+1)}>Next</button>
      </div>
    </div>
  )
}
