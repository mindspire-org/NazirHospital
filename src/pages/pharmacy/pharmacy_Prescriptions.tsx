import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Pharmacy_Prescriptions(){
  const [id, setId] = useState('')
  const navigate = useNavigate()

  const open = (e?: React.FormEvent) => {
    e?.preventDefault()
    const v = id.trim()
    if (!v) return
    navigate(`/pharmacy/prescriptions/${encodeURIComponent(v)}`)
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold text-slate-800">Prescription Intake</div>
      <form onSubmit={open} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-600 mb-2">Paste Prescription ID shared by the doctor to import medicines into POS.</div>
        <div className="flex items-center gap-2">
          <input value={id} onChange={e=>setId(e.target.value)} placeholder="Prescription ID" className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="btn">Open</button>
        </div>
      </form>
    </div>
  )
}
