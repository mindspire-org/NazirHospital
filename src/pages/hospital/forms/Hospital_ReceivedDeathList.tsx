import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi, api as coreApi } from '../../../utils/api'

export default function Hospital_ReceivedDeathList(){
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
      // Preferred: server-side list endpoint
      const res: any = await hospitalApi.listIpdReceivedDeaths({ q, page, limit }).catch(()=>null)
      if (res && Array.isArray(res.results)){
        setRows(res.results)
        setTotal(res.total||res.results.length||0)
        return
      }
      // Fallback: scan discharged encounters and pick those with a saved form
      const encs: any = await hospitalApi.listIPDAdmissions({ status: 'discharged', q, page, limit }).catch(()=>null)
      const admissions = encs?.admissions||[]
      const mapped = await Promise.all(admissions.map(async (e: any)=>{
        try {
          const rd: any = await hospitalApi.getIpdReceivedDeath(String(e._id)).catch(()=>null)
          if (rd?.receivedDeath){
            return {
              _id: rd.receivedDeath._id,
              encounterId: String(e._id),
              createdAt: rd.receivedDeath.createdAt || e.startAt,
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

  async function onPrint(encounterId: string){
    try {
      const html = await coreApi(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death/print`) as any
      const w = window.open('', '_blank'); if (!w) return
      w.document.write(String(html)); w.document.close(); w.focus()
    } catch {}
  }

  function onDownloadPdf(encounterId: string){
    const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:'
    const isElectronUA = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')
    const apiBase = (import.meta as any).env?.VITE_API_URL || ((isFile || isElectronUA) ? 'http://127.0.0.1:4000/api' : 'http://localhost:4000/api')
    const url = `${apiBase}/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death/print-pdf`
    window.open(url, '_blank')
  }

  async function onDelete(encounterId: string){
    if (!confirm('Delete this form?')) return
    try { await hospitalApi.deleteIpdReceivedDeath(encounterId) } catch {}
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-800">Received Death Forms</div>
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
                    <button className="btn-outline-navy text-xs" onClick={()=> navigate(`/hospital/ipd/admissions/${encodeURIComponent(r.encounterId)}/forms/received-death`)}>Edit</button>
                    <button className="btn-outline-navy text-xs" onClick={()=> onPrint(String(r.encounterId))}>Print</button>
                    <button className="btn-outline-navy text-xs" onClick={()=> onDownloadPdf(String(r.encounterId))}>Download PDF</button>
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
