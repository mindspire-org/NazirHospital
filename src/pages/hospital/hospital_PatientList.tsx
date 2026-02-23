import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { useNavigate } from 'react-router-dom'

type Row = {
  id: string
  mrn: string
  name: string
  doctor: string
  bed: string
  admitted: string
  status: 'admitted'|'discharged'
  admissionNo?: string
}

function formatDate(s?: string) {
  if (!s) return '-'
  const d = new Date(s)
  return d.toLocaleDateString()
}

export default function Hospital_PatientList() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ load() }, [])
  async function load(){
    setLoading(true)
    try {
      const res = await hospitalApi.listIPDAdmissions({ status: 'admitted', limit: 200 }) as any
      const items: Row[] = (res.admissions || []).map((e: any)=>({
        id: String(e._id),
        mrn: e.patientId?.mrn || '-',
        name: e.patientId?.fullName || '-',
        doctor: e.doctorId?.name || '-',
        bed: e.bedLabel || e.bedId || '-',
        admitted: e.startAt,
        status: e.status,
        admissionNo: e.admissionNo,
      }))
      setRows(items)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    const query = q.toLowerCase()
    return rows.filter(p => {
      const hay = `${p.name} ${p.mrn} ${p.bed} ${p.doctor}`.toLowerCase()
      return hay.includes(query)
    })
  }, [q, rows])

  async function discharge(id: string){
    try { await hospitalApi.dischargeIPD(id); await load() } catch (e: any){ alert(e?.message || 'Failed') }
  }

  // Transfer bed modal state
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferEncounterId, setTransferEncounterId] = useState<string | null>(null)
  const [bedsAvail, setBedsAvail] = useState<Array<{ _id: string; label: string }>>([])
  const [newBedId, setNewBedId] = useState('')

  async function openTransfer(id: string){
    setTransferEncounterId(id)
    setNewBedId('')
    setTransferOpen(true)
    try {
      const res = await hospitalApi.listBeds({ status: 'available' }) as any
      setBedsAvail(res.beds || [])
    } catch {}
  }

  async function submitTransfer(e: React.FormEvent){
    e.preventDefault()
    if (!transferEncounterId || !newBedId) return
    try {
      await hospitalApi.transferIPDBed(transferEncounterId, { newBedId })
      setTransferOpen(false)
      setTransferEncounterId(null)
      await load()
    } catch (err: any){
      alert(err?.message || 'Failed to transfer bed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">IPD Patient List</div>
        <div className="flex items-center gap-3">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, MRN, or bed" className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={rowsPerPage} onChange={e=>setRowsPerPage(parseInt(e.target.value))} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">SR.NO</th>
                <th className="px-4 py-2 font-medium">MRN</th>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Doctor</th>
                <th className="px-4 py-2 font-medium">Bed</th>
                <th className="px-4 py-2 font-medium">Admitted</th>
                <th className="px-4 py-2 font-medium">Admission #</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">Loading...</td></tr>
              )}
              {!loading && filtered.slice(0, rowsPerPage).map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{p.mrn}</td>
                  <td className="px-4 py-2 capitalize">{p.name}</td>
                  <td className="px-4 py-2">{p.doctor}</td>
                  <td className="px-4 py-2">{p.bed}</td>
                  <td className="px-4 py-2">{formatDate(p.admitted)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.admissionNo || '-'}</td>
                  <td className="px-4 py-2"><span className="rounded-full bg-navy px-2 py-1 text-xs text-white">{p.status === 'admitted' ? 'Admitted' : 'Discharged'}</span></td>
                  <td className="px-4 py-2">
                    {p.status === 'admitted' ? (
                      <div className="flex gap-2">
                        <button onClick={()=>navigate(`/hospital/patient/${p.id}`)} className="btn-outline-navy text-xs">View Profile</button>
                        <button onClick={()=>openTransfer(p.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Transfer Bed</button>
                        <button onClick={()=>discharge(p.id)} className="btn-outline-navy text-xs">Discharge</button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">No patients</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitTransfer} className="w-full max-w-md rounded-lg bg-white p-4 shadow">
            <div className="text-base font-semibold text-slate-800">Transfer Bed</div>
            <div className="mt-3">
              <div className="mb-1 text-sm text-slate-700">Select new bed</div>
              <select value={newBedId} onChange={e=>setNewBedId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="">Available beds</option>
                {bedsAvail.map(b => <option key={b._id} value={b._id}>{b.label}</option>)}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={()=>setTransferOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button type="submit" disabled={!newBedId} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Transfer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
