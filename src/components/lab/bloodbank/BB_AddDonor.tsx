import { useEffect, useState } from 'react'

export type Donor = {
  id: string
  code?: string
  name: string
  gender: 'Male' | 'Female' | 'Other' | ''
  type: string
  age?: number
  cnic?: string
  phone?: string
  address?: string
  weight?: number
  height?: number
  lastDonationDate?: string
  donated3Months?: 'Yes'|'No'|''
  tattoo6Months?: 'Yes'|'No'|''
  antibiotics?: 'Yes'|'No'|''
  traveled6Months?: 'Yes'|'No'|''
  consent?: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  onCreate?: (d: Donor) => void
  initial?: Donor
  mode?: 'add' | 'edit'
  onUpdate?: (d: Donor) => void
}

const bloodTypes = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function BB_AddDonor({ open, onClose, onCreate, initial, mode = 'add', onUpdate }: Props){
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Donor['gender']>('')
  const [type, setType] = useState('')
  const [age, setAge] = useState<number | ''>('' as any)
  const [cnic, setCnic] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [weight, setWeight] = useState<number | ''>('' as any)
  const [height, setHeight] = useState<number | ''>('' as any)
  const [lastDonationDate, setLastDonationDate] = useState('')
  const [q1, setQ1] = useState<''|'Yes'|'No'>('')
  const [q2, setQ2] = useState<''|'Yes'|'No'>('')
  const [q3, setQ3] = useState<''|'Yes'|'No'>('')
  const [q4, setQ4] = useState<''|'Yes'|'No'>('')
  const [consent, setConsent] = useState(false)
  const [errName, setErrName] = useState(false)
  const [errGender, setErrGender] = useState(false)
  const [errType, setErrType] = useState(false)

  useEffect(()=>{
    if (!open) return
    if (initial) {
      setName(initial.name || '')
      setGender(initial.gender || '')
      setType(initial.type || '')
      setAge((initial.age ?? '') as any)
      setCnic(initial.cnic || '')
      setPhone(initial.phone || '')
      setAddress(initial.address || '')
      setWeight((initial.weight ?? '') as any)
      setHeight((initial.height ?? '') as any)
      setLastDonationDate(initial.lastDonationDate || '')
      setQ1((initial.donated3Months ?? '') as any)
      setQ2((initial.tattoo6Months ?? '') as any)
      setQ3((initial.antibiotics ?? '') as any)
      setQ4((initial.traveled6Months ?? '') as any)
      setConsent(Boolean(initial.consent))
      setErrName(false)
      setErrGender(false)
      setErrType(false)
    } else {
      setName('')
      setGender('')
      setType('')
      setAge('' as any)
      setCnic('')
      setPhone('')
      setAddress('')
      setWeight('' as any)
      setHeight('' as any)
      setLastDonationDate('')
      setQ1('')
      setQ2('')
      setQ3('')
      setQ4('')
      setConsent(false)
      setErrName(false)
      setErrGender(false)
      setErrType(false)
    }
  }, [open, initial])

  if (!open) return null

  const save = () => {
    const missingName = !name.trim()
    const missingGender = !gender
    const missingType = !type
    setErrName(missingName)
    setErrGender(missingGender)
    setErrType(missingType)
    if (missingName || missingGender || missingType) return
    const id = mode==='edit' && initial?.id ? initial.id : `#DNR-${Date.now().toString().slice(-4)}`
    const d: Donor = {
      id,
      name: name || 'Unnamed',
      gender,
      type,
      age: age === '' ? undefined : Number(age),
      cnic,
      phone,
      address,
      weight: weight === '' ? undefined : Number(weight),
      height: height === '' ? undefined : Number(height),
      lastDonationDate: lastDonationDate || undefined,
      donated3Months: q1,
      tattoo6Months: q2,
      antibiotics: q3,
      traveled6Months: q4,
      consent,
    }
    if (mode === 'edit') onUpdate?.(d)
    else onCreate?.(d)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">{mode==='edit' ? 'Edit Donor' : 'Add Donor'}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
        <div className="p-4 text-sm">
          <div className="mb-2 text-sm font-semibold text-slate-700">Personal Identification</div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 sm:col-span-6">
              <label className="mb-1 block text-xs text-slate-600">Full Name</label>
              <input value={name} onChange={e=>{ setName(e.target.value); if (errName) setErrName(false) }} className={`w-full rounded-md border px-3 py-2 ${errName? 'border-rose-300 focus:border-rose-400' : 'border-slate-300'}`} />
              {errName && <div className="mt-1 text-xs text-rose-600">Name is required.</div>}
            </div>
            <div className="col-span-6 sm:col-span-3">
              <label className="mb-1 block text-xs text-slate-600">Gender</label>
              <select value={gender} onChange={e=>{ setGender(e.target.value as any); if (errGender) setErrGender(false) }} className={`w-full rounded-md border px-3 py-2 ${errGender? 'border-rose-300 focus:border-rose-400' : 'border-slate-300'}`}>
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              {errGender && <div className="mt-1 text-xs text-rose-600">Gender is required.</div>}
            </div>
            <div className="col-span-6 sm:col-span-3">
              <label className="mb-1 block text-xs text-slate-600">Blood Type</label>
              <select value={type} onChange={e=>{ setType(e.target.value); if (errType) setErrType(false) }} className={`w-full rounded-md border px-3 py-2 ${errType? 'border-rose-300 focus:border-rose-400' : 'border-slate-300'}`}>
                <option value="">Select Type</option>
                {bloodTypes.map(t=> <option key={t}>{t}</option>)}
              </select>
              {errType && <div className="mt-1 text-xs text-rose-600">Blood type is required.</div>}
            </div>
            <div className="col-span-6 sm:col-span-3">
              <label className="mb-1 block text-xs text-slate-600">Age</label>
              <input type="number" value={age as any} onChange={e=>setAge(e.target.value===''?'':Number(e.target.value))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="col-span-6 sm:col-span-3">
              <label className="mb-1 block text-xs text-slate-600">CNIC</label>
              <input value={cnic} onChange={e=>setCnic(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="xxxxx-xxxxxxx-x" />
            </div>
          </div>

          <div className="mt-4 mb-2 text-sm font-semibold text-slate-700">Contact Information</div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 sm:col-span-6">
              <label className="mb-1 block text-xs text-slate-600">Phone Number</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="col-span-12">
              <label className="mb-1 block text-xs text-slate-600">Residential Address</label>
              <input value={address} onChange={e=>setAddress(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          </div>

          <div className="mt-4 mb-2 text-sm font-semibold text-slate-700">Medical Screening</div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4">
              <label className="mb-1 block text-xs text-slate-600">Weight (kg)</label>
              <input type="number" value={weight as any} onChange={e=>setWeight(e.target.value===''?'':Number(e.target.value))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="col-span-4">
              <label className="mb-1 block text-xs text-slate-600">Height (cm)</label>
              <input type="number" value={height as any} onChange={e=>setHeight(e.target.value===''?'':Number(e.target.value))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="col-span-4">
              <label className="mb-1 block text-xs text-slate-600">Last Donation Date</label>
              <input type="date" value={lastDonationDate} onChange={e=>setLastDonationDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-slate-200">
            <div className="border-b px-3 py-2 text-xs font-semibold uppercase text-slate-500">Eligibility Questions</div>
            <div className="divide-y">
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <div>Have you donated blood in the last 3 months?</div>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1"><input type="radio" name="q1" className="accent-sky-600" checked={q1==='Yes'} onChange={()=>setQ1('Yes')} /> <span>Yes</span></label>
                  <label className="inline-flex items-center gap-1"><input type="radio" name="q1" className="accent-sky-600" checked={q1==='No'} onChange={()=>setQ1('No')} /> <span>No</span></label>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <div>Have you had a tattoo or piercing in the last 6 months?</div>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1"><input type="radio" name="q2" className="accent-sky-600" checked={q2==='Yes'} onChange={()=>setQ2('Yes')} /> <span>Yes</span></label>
                  <label className="inline-flex items-center gap-1"><input type="radio" name="q2" className="accent-sky-600" checked={q2==='No'} onChange={()=>setQ2('No')} /> <span>No</span></label>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <div>Are you currently taking any antibiotics or medication?</div>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1"><input type="radio" name="q3" className="accent-sky-600" checked={q3==='Yes'} onChange={()=>setQ3('Yes')} /> <span>Yes</span></label>
                  <label className="inline-flex items-center gap-1"><input type="radio" name="q3" className="accent-sky-600" checked={q3==='No'} onChange={()=>setQ3('No')} /> <span>No</span></label>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <div>Have you traveled outside the country in the last 6 months?</div>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1"><input type="radio" name="q4" className="accent-sky-600" checked={q4==='Yes'} onChange={()=>setQ4('Yes')} /> <span>Yes</span></label>
                  <label className="inline-flex items-center gap-1"><input type="radio" name="q4" className="accent-sky-600" checked={q4==='No'} onChange={()=>setQ4('No')} /> <span>No</span></label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" className="accent-sky-600" checked={consent} onChange={e=>setConsent(e.target.checked)} /> <span>I confirm that the information provided is accurate and I consent to the storage of my medical data for blood bank management purposes in accordance with privacy regulations.</span></label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">{mode==='edit' ? 'Save Changes' : 'Save Donor'}</button>
        </div>
      </div>
    </div>
  )
}
