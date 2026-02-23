import { useEffect, useState } from 'react'

export type Receiver = {
  name: string
  id: string
  code?: string
  status: 'URGENT' | 'PENDING' | 'DISPENSED' | 'APPROVED'
  units: number
  type: string
  when: string
  phone?: string
  cnic?: string
  mrNumber?: string
  pid?: string
  ward?: string
  gender?: 'Male'|'Female'|'Other'|''
  age?: number
}

type Props = {
  open: boolean
  onClose: () => void
  onCreate?: (r: Receiver) => void
  mode?: 'add' | 'edit'
  initial?: Receiver
  onUpdate?: (r: Receiver) => void
}

const bloodTypes = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function BB_NewReceiverRequest({ open, onClose, onCreate, mode = 'add', initial, onUpdate }: Props){
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'Male'|'Female'|'Other'|''>('')
  const [age, setAge] = useState<number | ''>('' as any)
  const [pid, setPid] = useState('')
  const [ward, setWard] = useState('')
  const [mrNumber, setMrNumber] = useState('')
  const [cnic, setCnic] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState('')
  const [units, setUnits] = useState<number | ''>('')
  const [urgency, setUrgency] = useState<'Normal'|'Urgent'|'Critical'|''>('')
  const [reason, setReason] = useState('')
  const [errName, setErrName] = useState(false)
  const [errGender, setErrGender] = useState(false)
  const [errType, setErrType] = useState(false)
  const [errUnits, setErrUnits] = useState(false)

  useEffect(()=>{
    if (!open) return
    if (mode === 'edit' && initial) {
      setName(initial.name || '')
      setGender(initial.gender || '')
      setAge((initial.age ?? '') as any)
      setPid(initial.pid || '')
      setWard(initial.ward || '')
      setMrNumber(initial.mrNumber || '')
      setCnic(initial.cnic || '')
      setPhone(initial.phone || '')
      setType(initial.type || '')
      setUnits((initial.units as any) || '')
      setUrgency('')
      setReason('')
      setErrName(false)
      setErrGender(false)
      setErrType(false)
      setErrUnits(false)
    } else {
      setName('')
      setGender('')
      setAge('' as any)
      setPid('')
      setWard('')
      setMrNumber('')
      setCnic('')
      setPhone('')
      setType('')
      setUnits('')
      setUrgency('')
      setReason('')
      setErrName(false)
      setErrGender(false)
      setErrType(false)
      setErrUnits(false)
    }
  }, [open, mode, initial])

  if (!open) return null

  const save = () => {
    const missingName = !name.trim()
    const missingGender = !gender
    const missingType = !type
    const missingUnits = units === '' || Number(units) < 1
    setErrName(missingName)
    setErrGender(missingGender)
    setErrType(missingType)
    setErrUnits(missingUnits)
    if (missingName || missingGender || missingType || missingUnits) return
    const ts = Date.now().toString().slice(-4)
    const id = mode==='edit' && initial ? initial.id : `#RCV-${ts}`
    const rec: Receiver = {
      id,
      name: name || 'Unnamed',
      status: urgency==='Urgent'?'PENDING':'PENDING',
      units: Number(units||1),
      type,
      when: 'Today',
      phone,
      cnic,
      mrNumber,
      pid,
      ward,
      gender,
      age: age === '' ? undefined : Number(age),
    }
    if (mode==='edit') {
      onUpdate?.(rec)
    } else {
      onCreate?.(rec)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">{mode==='edit' ? 'Edit Receiver Request' : 'New Receiver Request'}</div>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="grid grid-cols-12 gap-3 text-sm">
              <div className="col-span-12">
                <label className="mb-1 block text-xs text-slate-600">Full Name</label>
                <input value={name} onChange={e=>{ setName(e.target.value); if (errName) setErrName(false) }} className={`w-full rounded-md border px-3 py-2 ${errName?'border-rose-300 focus:border-rose-400':'border-slate-300'}`} />
                {errName && <div className="mt-1 text-xs text-rose-600">Name is required.</div>}
              </div>
              <div className="col-span-3">
                <label className="mb-1 block text-xs text-slate-600">Gender</label>
                <select value={gender} onChange={e=>{ setGender(e.target.value as any); if (errGender) setErrGender(false) }} className={`w-full rounded-md border px-3 py-2 ${errGender?'border-rose-300 focus:border-rose-400':'border-slate-300'}`}>
                  <option value="">Select</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
                {errGender && <div className="mt-1 text-xs text-rose-600">Gender is required.</div>}
              </div>
              <div className="col-span-3">
                <label className="mb-1 block text-xs text-slate-600">Age</label>
                <input type="number" value={age as any} onChange={e=>setAge(e.target.value===''?'':Number(e.target.value))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
              </div>
              <div className="col-span-6">
                <label className="mb-1 block text-xs text-slate-600">Patient Hospital ID</label>
                <input value={pid} onChange={e=>setPid(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="PID-992-334" />
              </div>
              <div className="col-span-6">
                <label className="mb-1 block text-xs text-slate-600">Ward / Room No.</label>
                <input value={ward} onChange={e=>setWard(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="ICU - Bed 4" />
              </div>
              <div className="col-span-6">
                <label className="mb-1 block text-xs text-slate-600">MR Number</label>
                <input value={mrNumber} onChange={e=>setMrNumber(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g. MR-12345" />
              </div>
              <div className="col-span-6">
                <label className="mb-1 block text-xs text-slate-600">CNIC</label>
                <input value={cnic} onChange={e=>setCnic(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="xxxxx-xxxxxxx-x" />
              </div>
              <div className="col-span-12">
                <label className="mb-1 block text-xs text-slate-600">Phone Number</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="+92 3xx xxxxxxx" />
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold">Medical Requirement</div>
            <div className="mb-2">
              <div className="mb-1 text-xs text-slate-600">Blood Type Required</div>
              <div className={`flex flex-wrap gap-2 ${errType?'rounded-md ring-1 ring-rose-300 p-1':''}`}>
                {bloodTypes.map(t => (
                  <button key={t} onClick={()=>{ setType(t); if (errType) setErrType(false) }} className={`rounded-md border px-3 py-1.5 text-sm ${t===type?'border-sky-600 bg-sky-50 text-sky-700':''}`}>{t}</button>
                ))}
              </div>
              {errType && <div className="mt-1 text-xs text-rose-600">Blood type is required.</div>}
            </div>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4">
                <label className="mb-1 block text-xs text-slate-600">Quantity (Units)</label>
                <input type="number" value={units as any} onChange={e=>{ const v = e.target.value===''?'':Number(e.target.value); setUnits(v as any); if (errUnits && (v!=='' && Number(v)>=1)) setErrUnits(false) }} className={`w-full rounded-md border px-3 py-2 ${errUnits?'border-rose-300 focus:border-rose-400':'border-slate-300'}`} />
                {errUnits && <div className="mt-1 text-xs text-rose-600">Units must be at least 1.</div>}
              </div>
              <div className="col-span-8">
                <label className="mb-1 block text-xs text-slate-600">Urgency Level</label>
                <div className="flex items-center gap-2">
                  {(['Normal','Urgent','Critical'] as const).map(l => (
                    <button key={l} onClick={()=>setUrgency(l)} className={`rounded-md border px-3 py-1.5 text-sm ${l===urgency ? (l==='Urgent'?'border-amber-600 bg-amber-50 text-amber-700': l==='Critical'?'border-rose-600 bg-rose-50 text-rose-700':'border-emerald-600 bg-emerald-50 text-emerald-700') : ''}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="col-span-12">
                <label className="mb-1 block text-xs text-slate-600">Diagnosis / Reason</label>
                <textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Enter diagnosis or reason"/>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">{mode==='edit' ? 'Save Changes' : 'Create Request'}</button>
        </div>
      </div>
    </div>
  )
}
