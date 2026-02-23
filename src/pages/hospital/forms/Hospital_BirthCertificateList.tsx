import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../../utils/api'
import Hospital_BirthCertificateForm from '../../../components/hospital/hospital_BirthCertificateForm'

export default function Hospital_BirthCertificateList(){
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [encounterId, setEncounterId] = useState('')
  const [docId, setDocId] = useState<string|undefined>(undefined)

  useEffect(()=>{ load() }, [page, limit])

  async function load(){
    setLoading(true)
    try {
      const res: any = await hospitalApi.listIpdBirthCertificates({ q, page, limit }).catch(()=>null)
      if (res && Array.isArray(res.results)){
        setRows(res.results)
        setTotal(res.total||res.results.length||0)
        return
      }
      const encs: any = await hospitalApi.listIPDAdmissions({ status: 'discharged', q, page, limit }).catch(()=>null)
      const admissions = encs?.admissions||[]
      const mapped = await Promise.all(admissions.map(async (e: any)=>{
        try {
          const bc: any = await hospitalApi.getIpdBirthCertificate(String(e._id)).catch(()=>null)
          if (bc?.birthCertificate){
            const c = bc.birthCertificate
            return {
              _id: c._id,
              encounterId: String(e._id),
              createdAt: c.createdAt || e.startAt,
              motherName: c.motherName || (e.patientId?.fullName || ''),
              mrNumber: c.mrNumber || e.patientId?.mrn,
              phone: c.phone || e.patientId?.phoneNormalized,
              dateOfBirth: c.dateOfBirth,
              timeOfBirth: c.timeOfBirth,
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

  function onDownloadPdf(id: string){
    const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:'
    const isElectronUA = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')
    const apiBase = (import.meta as any).env?.VITE_API_URL || ((isFile || isElectronUA) ? 'http://127.0.0.1:4000/api' : 'http://localhost:4000/api')
    const url = `${apiBase}/hospital/ipd/forms/birth-certificates/${encodeURIComponent(id)}/print-pdf`
    window.open(url, '_blank')
  }

  async function onDelete(id: string){
    if (!confirm('Delete this form?')) return
    try { await hospitalApi.deleteBirthCertificateById(id) } catch {}
    load()
  }

  // No patient prefill; manual entry in form

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-800">Birth Certificates</div>
        <div className="flex items-center gap-2">
          <input className="border rounded-md px-2 py-1 text-sm" placeholder="Search mother / MRN / phone" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter') { setPage(1); load() } }} />
          <button className="btn-outline-navy text-sm" onClick={()=>{ setPage(1); load() }} disabled={loading}>Search</button>
          <button className="btn text-sm" onClick={()=>{ setShowModal(true); setEncounterId('') }}>New Birth Certificate</button>
        </div>
      </div>

      <div className="overflow-auto border rounded-md">
        <table className="min-w-[800px] w-full">
          <thead>
            <tr className="bg-slate-100 text-left text-sm text-slate-700">
              <th className="px-3 py-2">Sr No</th>
              <th className="px-3 py-2">Date Time</th>
              <th className="px-3 py-2">Mother Name</th>
              <th className="px-3 py-2">MR Number</th>
              <th className="px-3 py-2">Phone Number</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((r, i)=> (
              <tr key={r._id} className="border-t">
                <td className="px-3 py-2">{r.srNo || sr(i)}</td>
                <td className="px-3 py-2">{(r.dateOfBirth? new Date(r.dateOfBirth).toLocaleDateString() : '') + (r.timeOfBirth? (' ' + r.timeOfBirth) : '')}</td>
                <td className="px-3 py-2">{r.motherName||'-'}</td>
                <td className="px-3 py-2">{r.mrNumber||'-'}</td>
                <td className="px-3 py-2">{r.phone||'-'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="btn-outline-navy text-xs" onClick={()=> { setShowModal(true); setDocId(String(r._id)); setEncounterId('') }}>Edit</button>
                    <button className="btn-outline-navy text-xs" onClick={()=> onDownloadPdf(String(r._id))}>Download PDF</button>
                    <button className="btn-outline-navy text-xs" onClick={()=> onDelete(String(r._id))}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="px-3 py-6 text-slate-500" colSpan={6}>{loading? 'Loading...':'No records found'}</td></tr>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-[95vw] max-w-4xl p-4 relative">
            <div className="absolute right-3 top-3">
              <button className="btn-outline-navy text-xs" onClick={()=> { setShowModal(false); load() }}>Close</button>
            </div>
            <div className="text-lg font-semibold text-slate-800 mb-3">New Birth Certificate</div>
            <div className="border rounded-md p-3">
              <Hospital_BirthCertificateForm encounterId={encounterId} docId={docId} showPatientHeader={false} onSaved={()=> load()} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
