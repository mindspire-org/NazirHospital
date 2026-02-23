import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'

export type EntryType = 'OPD' | 'IPD' | 'Procedure' | 'Payout' | 'Adjustment'

export type HospitalDoctorFinanceEntry = {
  id: string
  datetime: string
  doctorId?: string
  doctorName: string
  type: EntryType
  patient?: string
  mrNumber?: string
  tokenId?: string
  description?: string
  gross?: number
  discount?: number
  sharePercent?: number
  doctorAmount: number
  ref?: string
}

type Doctor = {
  id: string
  name: string
  fee?: number
  shares?: number
}

type Props = {
  doctors: Doctor[]
  onClose: () => void
  onSave: (e: HospitalDoctorFinanceEntry) => void
}

export default function Hospital_DoctorFinanceEntryDialog({ doctors, onClose, onSave }: Props) {
  type Form = {
    date: string
    doctorId: string
    type: EntryType
    phone: string
    patient: string
    mrNumber: string
    description: string
    amount: string
  }

  const [form, setForm] = useState<Form>({
    date: new Date().toISOString().slice(0,10),
    doctorId: doctors[0]?.id || '',
    type: 'OPD',
    phone: '',
    patient: '',
    mrNumber: '',
    description: '',
    amount: '',
  })

  useEffect(() => {
    const d = doctors.find(x => x.id === form.doctorId)
    if (!d) return
    if (form.type === 'OPD' && !form.amount) {
      setForm(f => ({ ...f, amount: String(d.fee || '') }))
    }
  }, [form.doctorId, form.type, doctors])

  // Default to first doctor once doctors list arrives
  useEffect(() => {
    if (!form.doctorId && doctors.length) {
      setForm(f => ({ ...f, doctorId: doctors[0].id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors])

  const doc = doctors.find(x => x.id === form.doctorId)
  const amountNum = parseFloat(form.amount || '0') || 0
  const typeLower = String(form.type || '').toLowerCase()
  let doctorAmount = 0
  if (typeLower === 'payout') doctorAmount = -Math.abs(amountNum)
  else doctorAmount = Math.abs(amountNum)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const dname = doc?.name || 'Unknown Doctor'
    const entry: HospitalDoctorFinanceEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      datetime: `${form.date}T00:00:00`,
      doctorId: doc?.id,
      doctorName: dname,
      type: form.type,
      patient: form.patient.trim() || undefined,
      mrNumber: form.mrNumber.trim() || undefined,
      description: form.description.trim() || undefined,
      gross: undefined,
      discount: undefined,
      sharePercent: undefined,
      doctorAmount,
    }
    onSave(entry)
  }

  async function lookupByPhone(phone: string){
    const p = phone.trim()
    if (!p) return
    try {
      const res: any = await labApi.searchPatients({ phone: p, limit: 5 })
      const arr: any[] = (res?.patients || res || []) as any[]
      if (arr.length){
        const pt = arr[0]
        const mrn = String(pt.mrn || '')
        const name = String(pt.fullName || pt.name || '')
        setForm(f=>({ ...f, patient: name, mrNumber: mrn }))
        // No token auto-fill now as Token ID field is removed
      }
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Add Entry</h3>
          <button onClick={onClose} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Close</button>
        </div>
        <form onSubmit={save} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Date</label>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({ ...f, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Doctor</label>
            <select value={form.doctorId} onChange={e=>setForm(f=>({ ...f, doctorId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {doctors.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Type</label>
            <input value={form.type} onChange={e=>setForm(f=>({ ...f, type: e.target.value as EntryType }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., OPD, IPD, Procedure, Payout, Adjustment" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Phone</label>
            <div className="flex gap-2">
              <input value={form.phone} onChange={e=>setForm(f=>({ ...f, phone: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., 0300-1234567" />
              <button type="button" onClick={()=>lookupByPhone(form.phone)} className="rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-50">Lookup</button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Patient</label>
            <input value={form.patient} onChange={e=>setForm(f=>({ ...f, patient: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">MR Number</label>
            <input value={form.mrNumber} onChange={e=>setForm(f=>({ ...f, mrNumber: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., MR-15" />
          </div>
          {/* Token ID field removed per request */}

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Amount</label>
            <input type="number" step="0.01" value={form.amount} onChange={e=>setForm(f=>({ ...f, amount: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="0.00" required />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Description</label>
            <input value={form.description} onChange={e=>setForm(f=>({ ...f, description: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., OPD visit, IPD round, Procedure name" />
          </div>

          {/* Reference field removed per request */}

          <div className="md:col-span-2 flex items-center justify-between">
            <div className="text-sm text-slate-600">Doctor Amount: <span className={`${doctorAmount<0?'text-rose-600':'text-emerald-700'} font-semibold`}>Rs {doctorAmount.toFixed(2)}</span></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Save</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
