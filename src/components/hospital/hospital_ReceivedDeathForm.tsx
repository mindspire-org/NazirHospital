import { useEffect, useState } from 'react'
import { hospitalApi, api as coreApi } from '../../utils/api'

export type ReceivedDeathFormProps = {
  encounterId?: string
  patient?: any
}

type RDForm = {
  srNo?: string
  patientCnic?: string
  relative?: string
  ageSex?: string
  emergencyReportedDate?: string
  emergencyReportedTime?: string
  receiving?: {
    pulse?: string
    bloodPressure?: string
    respiratoryRate?: string
    pupils?: string
    cornealReflex?: string
    ecg?: string
  }
  diagnosis?: string
  attendantName?: string
  attendantRelative?: string
  attendantRelation?: string
  attendantAddress?: string
  attendantCnic?: string
  deathDeclaredBy?: string
  chargeNurseName?: string
  doctorName?: string
}

export default function Hospital_ReceivedDeathForm({ encounterId, patient }: ReceivedDeathFormProps){
  const [form, setForm] = useState<RDForm>({ receiving: {} })
  const [loading, setLoading] = useState(false)

  // Prefill derived fields from patient context once
  useEffect(()=>{
    setForm(f=>({
      ...f,
      ageSex: f.ageSex ?? deriveAgeSex(patient?.age, patient?.gender),
      attendantAddress: f.attendantAddress ?? (patient?.address || ''),
      patientCnic: f.patientCnic ?? (patient?.cnic || ''),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.age, patient?.gender, patient?.address, patient?.cnic])

  useEffect(()=>{ (async()=>{
    if (!encounterId) return
    try {
      setLoading(true)
      const res: any = await hospitalApi.getIpdReceivedDeath(encounterId)
      const d = res?.receivedDeath
      if (d) {
        setForm({
          srNo: d.srNo || '',
          patientCnic: d.patientCnic || '',
          relative: d.relative || '',
          ageSex: d.ageSex || form.ageSex || '',
          emergencyReportedDate: d.emergencyReportedDate ? fmtDateISO(d.emergencyReportedDate) : '',
          emergencyReportedTime: d.emergencyReportedTime || '',
          receiving: {
            pulse: d.receiving?.pulse || '',
            bloodPressure: d.receiving?.bloodPressure || '',
            respiratoryRate: d.receiving?.respiratoryRate || '',
            pupils: d.receiving?.pupils || '',
            cornealReflex: d.receiving?.cornealReflex || '',
            ecg: d.receiving?.ecg || '',
          },
          diagnosis: d.diagnosis || '',
          attendantName: d.attendantName || '',
          attendantRelative: d.attendantRelative || '',
          attendantRelation: d.attendantRelation || '',
          attendantAddress: d.attendantAddress || form.attendantAddress || '',
          attendantCnic: d.attendantCnic || '',
          deathDeclaredBy: d.deathDeclaredBy || '',
          chargeNurseName: d.chargeNurseName || '',
          doctorName: d.doctorName || '',
        })
      }
      // Also fetch patient CNIC from encounter if not already present
      try {
        if (!form.patientCnic) {
          const e: any = await hospitalApi.getIPDAdmissionById(encounterId).catch(()=>null)
          const cnic = e?.encounter?.patientId?.cnicNormalized
          if (cnic) setForm(v=> ({ ...v, patientCnic: v.patientCnic || cnic }))
        }
      } catch {}
    } finally { setLoading(false) }
  })() }, [encounterId])

  const save = async () => {
    if (!encounterId) return
    const payload: any = {
      ...form,
      emergencyReportedDate: form.emergencyReportedDate ? new Date(form.emergencyReportedDate).toISOString() : undefined,
    }
    await hospitalApi.upsertIpdReceivedDeath(encounterId, payload)
  }

  const printPreview = async () => {
    await save()
    if (!encounterId) return
    const path = `/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death/print`
    const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:'
    const isElectronUA = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')
    const apiBase = (import.meta as any).env?.VITE_API_URL || ((isFile || isElectronUA) ? 'http://127.0.0.1:4000/api' : 'http://localhost:4000/api')
    const absoluteUrl = `${apiBase}${path}`
    let html = ''
    try { html = await coreApi(path) as any } catch { html = '' }
    if (!html || !/<(html|!doctype)/i.test(html)){
      window.open(absoluteUrl, '_blank')
      return
    }
    const w = window.open('', '_blank')
    if (!w) return
    try {
      w.document.open()
      w.document.write(html)
      w.document.close()
      w.focus()
    } catch {
      window.open(absoluteUrl, '_blank')
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Patient Name</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.name||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">MR Number</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.mrn||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Age / Sex</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={deriveAgeSex(patient?.age, patient?.gender)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Phone</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.phone||''} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-800 mb-1">Address</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.address||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Admission No</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.admissionNo||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Doctor</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.doctor||''} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Patient CNIC (if available)</label>
            <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.patientCnic||''} onChange={e=>setForm(v=>({ ...v, patientCnic: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Sr. No</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.srNo||''} onChange={e=>setForm(v=>({ ...v, srNo: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Relation</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.relative||''} onChange={e=>setForm(v=>({ ...v, relative: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Reported Date (Emergency)</label>
            <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.emergencyReportedDate||''} onChange={e=>setForm(v=>({ ...v, emergencyReportedDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Time</label>
            <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.emergencyReportedTime||''} onChange={e=>setForm(v=>({ ...v, emergencyReportedTime: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {recvInput('Pulse','pulse')}
        {recvInput('Blood Pressure','bloodPressure')}
        {recvInput('Respiratory Rate','respiratoryRate')}
        {recvInput('Pupils','pupils')}
        {recvInput('Corneal Reflex','cornealReflex')}
        {recvInput('ECG','ecg')}
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">Diagnosis</label>
        <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.diagnosis||''} onChange={e=>setForm(v=>({ ...v, diagnosis: e.target.value }))} />
      </div>

      <div className="grid md:grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Attendant Name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.attendantName||''} onChange={e=>setForm(v=>({ ...v, attendantName: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Relation with the patient</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.attendantRelation||''} onChange={e=>setForm(v=>({ ...v, attendantRelation: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Attendant CNIC</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.attendantCnic||''} onChange={e=>setForm(v=>({ ...v, attendantCnic: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Death Declared By / Doctors</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.deathDeclaredBy||''} onChange={e=>setForm(v=>({ ...v, deathDeclaredBy: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Charge Nurse Name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.chargeNurseName||''} onChange={e=>setForm(v=>({ ...v, chargeNurseName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Doctor Name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.doctorName||''} onChange={e=>setForm(v=>({ ...v, doctorName: e.target.value }))} />
        </div>
      </div>

      <div className="pt-1 flex flex-wrap gap-2">
        <button disabled={loading || !encounterId} onClick={save} className="btn-outline-navy disabled:opacity-50">Save</button>
        <button disabled={loading || !encounterId} onClick={printPreview} className="btn disabled:opacity-50">Print</button>
        <button disabled={loading || !encounterId} onClick={() => {
          if (!encounterId) return
          const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:'
          const isElectronUA = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')
          const apiBase = (import.meta as any).env?.VITE_API_URL || ((isFile || isElectronUA) ? 'http://127.0.0.1:4000/api' : 'http://localhost:4000/api')
          const url = `${apiBase}/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death/print-pdf`
          window.open(url, '_blank')
        }} className="btn-outline-navy disabled:opacity-50">Download PDF</button>
      </div>
    </div>
  )

  function recvInput(label: string, key: keyof NonNullable<RDForm['receiving']>){
    return (
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">{label}</label>
        <input className="w-full border rounded-md px-2 py-1 text-sm" value={(form.receiving?.[key]||'') as string} onChange={e=> setForm(v=> ({ ...v, receiving: { ...(v.receiving||{}), [key]: e.target.value } }))} />
      </div>
    )
  }
}

function deriveAgeSex(age?: any, gender?: any){
  const a = (age==null || age==='') ? '' : String(age)
  const g = String(gender||'').trim().toUpperCase()
  const sx = g ? g[0] : ''
  if (!a && !sx) return ''
  if (a && sx) return `${a}/${sx}`
  return a || sx
}

function fmtDateISO(d:any){ try { const x = new Date(d); if (!x || isNaN(x.getTime())) return ''; return x.toISOString().slice(0,10) } catch { return '' } }
