import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export type DeathCertificateFormProps = {
  encounterId?: string
  patient?: any
}

type DeathForm = {
  dcNo?: string
  mrNumber?: string
  relative?: string
  ageSex?: string
  address?: string
  dateOfDeath?: string
  timeOfDeath?: string
  presentingComplaints?: string
  diagnosis?: string
  primaryCause?: string
  secondaryCause?: string
  receiverName?: string
  receiverRelation?: string
  receiverIdCard?: string
  receiverDate?: string
  receiverTime?: string
  staffName?: string
  staffSignDate?: string
  staffSignTime?: string
  doctorName?: string
  doctorSignDate?: string
  doctorSignTime?: string
  notes?: string
}

export default function Hospital_DeathCertificateForm({ encounterId, patient }: DeathCertificateFormProps){
  const [form, setForm] = useState<DeathForm>({})
  const [loading, setLoading] = useState(false)

  // Prefill derived fields from patient context once
  useEffect(()=>{
    setForm(f=>({
      ...f,
      mrNumber: f.mrNumber ?? (patient?.mrn || ''),
      ageSex: f.ageSex ?? deriveAgeSex(patient?.age, patient?.gender),
      address: f.address ?? (patient?.address || ''),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.mrn, patient?.age, patient?.gender, patient?.address])

  useEffect(()=>{ (async()=>{
    if (!encounterId) return
    try {
      setLoading(true)
      const res: any = await hospitalApi.getIpdDeathCertificate(encounterId)
      const c = res?.certificate
      if (c) {
        setForm(f=>({
          ...f,
          dcNo: c.dcNo || f.dcNo,
          mrNumber: c.mrNumber || f.mrNumber,
          relative: c.relative || '',
          ageSex: c.ageSex || f.ageSex,
          address: c.address || f.address,
          dateOfDeath: c.dateOfDeath ? fmtDateISO(c.dateOfDeath) : '',
          timeOfDeath: c.timeOfDeath || '',
          presentingComplaints: c.presentingComplaints || '',
          diagnosis: c.diagnosis || '',
          primaryCause: c.primaryCause || '',
          secondaryCause: c.secondaryCause || '',
          receiverName: c.receiverName || '',
          receiverRelation: c.receiverRelation || '',
          receiverIdCard: c.receiverIdCard || '',
          receiverDate: c.receiverDate ? fmtDateISO(c.receiverDate) : '',
          receiverTime: c.receiverTime || '',
          staffName: c.staffName || '',
          staffSignDate: c.staffSignDate ? fmtDateISO(c.staffSignDate) : '',
          staffSignTime: c.staffSignTime || '',
          doctorName: c.doctorName || '',
          doctorSignDate: c.doctorSignDate ? fmtDateISO(c.doctorSignDate) : '',
          doctorSignTime: c.doctorSignTime || '',
          notes: c.notes || '',
        }))
      }
    } finally { setLoading(false) }
  })() }, [encounterId])

  async function previewHtml(url: string){
    const api: any = (window as any).electronAPI
    try {
      if (api && typeof api.printPreviewHtml === 'function'){
        const token = ((): string => { try { return localStorage.getItem('hospital.token') || localStorage.getItem('token') || '' } catch { return '' } })()
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } as any : undefined })
        const html = await res.text()
        await api.printPreviewHtml(html, {})
        return
      }
    } catch {}
    try { window.open(url, '_blank') } catch {}
  }

  async function previewPdf(url: string){
    const api: any = (window as any).electronAPI
    try {
      if (api && typeof api.printPreviewPdf === 'function'){
        const token = ((): string => { try { return localStorage.getItem('hospital.token') || localStorage.getItem('token') || '' } catch { return '' } })()
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } as any : undefined })
        const blob = await res.blob()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          try { const r = new FileReader(); r.onload = () => resolve(String(r.result||'')); r.onerror = () => reject(new Error('read-failed')); r.readAsDataURL(blob) } catch (e) { reject(e as any) }
        })
        await api.printPreviewPdf(dataUrl)
        return
      }
    } catch {}
    try { window.open(url, '_blank') } catch {}
  }

  const save = async () => {
    if (!encounterId) return
    const payload: any = {
      ...form,
      // Convert dates to ISO
      dateOfDeath: form.dateOfDeath ? new Date(form.dateOfDeath).toISOString() : undefined,
      receiverDate: form.receiverDate ? new Date(form.receiverDate).toISOString() : undefined,
      staffSignDate: form.staffSignDate ? new Date(form.staffSignDate).toISOString() : undefined,
      doctorSignDate: form.doctorSignDate ? new Date(form.doctorSignDate).toISOString() : undefined,
    }
    await hospitalApi.upsertIpdDeathCertificate(encounterId, payload)
  }

  const saveAndPrint = async () => {
    await save()
    if (!encounterId) return
    const apiBase = (import.meta as any).env?.VITE_API_URL || ''
    const url = `${apiBase}/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate/print`
    await previewHtml(url.startsWith('http') ? url : `/api${url}`)
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
            <label className="block text-sm font-bold text-slate-800 mb-1">Bed</label>
            <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.bed||''} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">DC No</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.dcNo||''} onChange={e=>setForm(v=>({ ...v, dcNo: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">MR Number</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.mrNumber||''} onChange={e=>setForm(v=>({ ...v, mrNumber: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Patient Name</label>
          <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-50" value={patient?.name||''} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">S/o, D/o, W/o</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.relative||''} onChange={e=>setForm(v=>({ ...v, relative: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Age / Sex</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.ageSex||''} onChange={e=>setForm(v=>({ ...v, ageSex: e.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-800 mb-1">Address</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.address||''} onChange={e=>setForm(v=>({ ...v, address: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Date of Death</label>
          <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.dateOfDeath||''} onChange={e=>setForm(v=>({ ...v, dateOfDeath: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Time of Death</label>
          <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.timeOfDeath||''} onChange={e=>setForm(v=>({ ...v, timeOfDeath: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">Presenting Complaints</label>
        <textarea className="w-full border rounded-md px-2 py-1 text-sm h-24" value={form.presentingComplaints||''} onChange={e=>setForm(v=>({ ...v, presentingComplaints: e.target.value }))} />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">Diagnosis</label>
        <textarea className="w-full border rounded-md px-2 py-1 text-sm h-24" value={form.diagnosis||''} onChange={e=>setForm(v=>({ ...v, diagnosis: e.target.value }))} />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">Primary Cause of Death</label>
        <textarea className="w-full border rounded-md px-2 py-1 text-sm h-24" value={form.primaryCause||''} onChange={e=>setForm(v=>({ ...v, primaryCause: e.target.value }))} />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">Secondary Cause of Death</label>
        <textarea className="w-full border rounded-md px-2 py-1 text-sm h-24" value={form.secondaryCause||''} onChange={e=>setForm(v=>({ ...v, secondaryCause: e.target.value }))} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Dead Body Received By Name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.receiverName||''} onChange={e=>setForm(v=>({ ...v, receiverName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Relation</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.receiverRelation||''} onChange={e=>setForm(v=>({ ...v, receiverRelation: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">ID Card No</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.receiverIdCard||''} onChange={e=>setForm(v=>({ ...v, receiverIdCard: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Date</label>
          <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.receiverDate||''} onChange={e=>setForm(v=>({ ...v, receiverDate: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Time</label>
          <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.receiverTime||''} onChange={e=>setForm(v=>({ ...v, receiverTime: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Staff Name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.staffName||''} onChange={e=>setForm(v=>({ ...v, staffName: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Sign Date</label>
            <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.staffSignDate||''} onChange={e=>setForm(v=>({ ...v, staffSignDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Sign Time</label>
            <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.staffSignTime||''} onChange={e=>setForm(v=>({ ...v, staffSignTime: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Doctor Name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.doctorName||''} onChange={e=>setForm(v=>({ ...v, doctorName: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Sign Date</label>
            <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.doctorSignDate||''} onChange={e=>setForm(v=>({ ...v, doctorSignDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Sign Time</label>
            <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.doctorSignTime||''} onChange={e=>setForm(v=>({ ...v, doctorSignTime: e.target.value }))} />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">Notes</label>
        <textarea className="w-full border rounded-md px-2 py-1 text-sm h-24" value={form.notes||''} onChange={e=>setForm(v=>({ ...v, notes: e.target.value }))} />
      </div>

      <div className="pt-1 flex flex-wrap gap-2">
        <button disabled={loading || !encounterId} onClick={save} className="btn-outline-navy disabled:opacity-50">Save</button>
        <button disabled={loading || !encounterId} onClick={saveAndPrint} className="btn disabled:opacity-50">Save & Print</button>
        <button disabled={loading || !encounterId} onClick={async () => {
          if (!encounterId) return
          const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:'
          const isElectronUA = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')
          const apiBase = (import.meta as any).env?.VITE_API_URL || ((isFile || isElectronUA) ? 'http://127.0.0.1:4000/api' : 'http://localhost:4000/api')
          const url = `${apiBase}/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate/print-pdf`
          await previewPdf(url)
        }} className="btn-outline-navy disabled:opacity-50">Download PDF</button>
      </div>
    </div>
  )
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
