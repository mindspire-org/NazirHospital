import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hospitalApi, labApi } from '../../utils/api'

export default function Pharmacy_PrescriptionIntake(){
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [header, setHeader] = useState<{ patient?: string; mrn?: string; doctor?: string; date?: string } | null>(null)
  const [items, setItems] = useState<Array<{ name: string; frequency?: string; duration?: string; qty: number }>>([])

  useEffect(() => { (async () => {
    if (!id) { setError('Missing id'); setLoading(false); return }
    try {
      const { prescription } = await hospitalApi.getPrescription(id) as any
      const dt = new Date(prescription?.createdAt || Date.now())
      let patName = prescription?.encounterId?.patientId?.fullName || '-'
      let mrn = prescription?.encounterId?.patientId?.mrn || ''
      try {
        if (mrn) {
          const resp: any = await labApi.getPatientByMrn(mrn)
          patName = resp?.patient?.fullName || patName
        }
      } catch {}
      setHeader({ patient: patName, mrn, doctor: prescription?.encounterId?.doctorId?.name || '-', date: dt.toLocaleString() })
      const mapped = (prescription?.items || []).map((m: any) => ({
        name: String(m.name||'').trim(),
        frequency: m.frequency || undefined,
        duration: m.duration || undefined,
        qty: (()=>{ const n = parseInt(String(m.dose||'').replace(/[^\d]/g,'')); return isNaN(n) || n<=0 ? 1 : n })(),
      }))
      setItems(mapped)
      setError('')
    } catch (e: any) {
      setError(e?.message || 'Failed to load prescription')
    } finally {
      setLoading(false)
    }
  })() }, [id])

  const canProcess = useMemo(() => items.length > 0 && items.every(it => it.name && it.qty>0), [items])

  const process = () => {
    try {
      const lines = items.map(it => ({ name: it.name, qty: Math.max(1, it.qty|0) }))
      localStorage.setItem('pharmacy.pos.pendingAddLines', JSON.stringify(lines))
      navigate('/pharmacy/pos')
      // POS will read the storage and add lines automatically
    } catch (e) {
      alert('Failed to forward to POS')
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold text-slate-800">Process Prescription</div>
      {loading && <div className="text-sm text-slate-600">Loading...</div>}
      {error && !loading && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {header && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <div className="flex flex-wrap items-center gap-4">
            <div><span className="font-semibold">Patient:</span> {header.patient}</div>
            <div><span className="font-semibold">MR:</span> {header.mrn}</div>
            <div><span className="font-semibold">Doctor:</span> {header.doctor}</div>
            <div className="ml-auto"><span className="font-semibold">Date:</span> {header.date}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Medicines</div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="border border-slate-200 px-2 py-1 text-left">Medicine</th>
                  <th className="w-28 border border-slate-200 px-2 py-1">Frequency</th>
                  <th className="w-24 border border-slate-200 px-2 py-1">Duration</th>
                  <th className="w-24 border border-slate-200 px-2 py-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m, i) => (
                  <tr key={i}>
                    <td className="border border-slate-200 px-2 py-1 align-top">{m.name}</td>
                    <td className="border border-slate-200 px-2 py-1 text-center align-top">{m.frequency || '-'}</td>
                    <td className="border border-slate-200 px-2 py-1 text-center align-top">{m.duration || '-'}</td>
                    <td className="border border-slate-200 px-2 py-1 text-center align-top">
                      <input type="number" min={1} value={m.qty}
                        onChange={e=>setItems(arr => arr.map((x, idx) => idx===i ? { ...x, qty: Math.max(1, parseInt(e.target.value)||1) } : x))}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm" />
                    </td>
                  </tr>
                ))}
                {items.length===0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No medicines</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <button disabled={!canProcess} onClick={process} className="btn disabled:opacity-50">Process Prescription</button>
          </div>
        </div>
      </div>
    </div>
  )
}
