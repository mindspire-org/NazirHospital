import { useEffect, useState } from 'react'
import { hospitalApi, api as coreApi } from '../../utils/api'

export default function Hospital_BirthCertificateForm({ encounterId, docId, patient, showPatientHeader = true, onSaved }: { encounterId?: string; docId?: string; patient?: any; showPatientHeader?: boolean; onSaved?: (doc:any)=>void }){
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [currentId, setCurrentId] = useState<string|undefined>(docId)

  useEffect(()=>{ setCurrentId(docId) }, [docId])

  useEffect(()=>{
    if (!showPatientHeader || !patient) return
    setForm((f: any) => ({
      ...f,
      motherName: f.motherName ?? (patient?.name || ''),
      mrNumber: f.mrNumber ?? (patient?.mrn || ''),
      phone: f.phone ?? (patient?.phone || ''),
      address: f.address ?? (patient?.address || ''),
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPatientHeader, patient?.name, patient?.mrn, patient?.phone, patient?.address])

  useEffect(()=>{ (async()=>{
    if (!encounterId || docId) return
    try {
      setLoading(true)
      const res: any = await hospitalApi.getIpdBirthCertificate(encounterId).catch(()=>null)
      const c = res?.birthCertificate
      if (c){
        setForm((f: any) => ({
          ...f,
          srNo: c.srNo || f.srNo,
          bcSerialNo: c.bcSerialNo || f.bcSerialNo,
          motherName: c.motherName || f.motherName,
          fatherName: c.fatherName || '',
          mrNumber: c.mrNumber || f.mrNumber,
          phone: c.phone || f.phone,
          address: c.address || f.address,
          babyName: c.babyName || '',
          sexOfBaby: c.sexOfBaby || '',
          dateOfBirth: c.dateOfBirth ? fmtDateISO(c.dateOfBirth) : '',
          timeOfBirth: c.timeOfBirth || '',
          deliveryType: c.deliveryType || '',
          deliveryMode: c.deliveryMode || '',
          conditionAtBirth: c.conditionAtBirth || '',
          weightAtBirth: c.weightAtBirth || '',
          bloodGroup: c.bloodGroup || '',
          birthMark: c.birthMark || '',
          congenitalAbnormality: c.congenitalAbnormality || '',
          babyHandedOverTo: c.babyHandedOverTo || '',
          notes: c.notes || '',
          parentSignature: c.parentSignature || '',
          doctorSignature: c.doctorSignature || '',
        }))
      }
    } finally { setLoading(false) }
  })() }, [encounterId, docId])

  useEffect(()=>{ (async()=>{
    if (!docId) return
    try {
      setLoading(true)
      const res: any = await hospitalApi.getBirthCertificateById(docId).catch(()=>null)
      const c = res?.birthCertificate
      if (c){
        setForm((f: any) => ({
          ...f,
          srNo: c.srNo || f.srNo,
          bcSerialNo: c.bcSerialNo || f.bcSerialNo,
          motherName: c.motherName || f.motherName,
          fatherName: c.fatherName || '',
          mrNumber: c.mrNumber || f.mrNumber,
          phone: c.phone || f.phone,
          address: c.address || f.address,
          babyName: c.babyName || '',
          sexOfBaby: c.sexOfBaby || '',
          dateOfBirth: c.dateOfBirth ? fmtDateISO(c.dateOfBirth) : '',
          timeOfBirth: c.timeOfBirth || '',
          deliveryType: c.deliveryType || '',
          deliveryMode: c.deliveryMode || '',
          conditionAtBirth: c.conditionAtBirth || '',
          weightAtBirth: c.weightAtBirth || '',
          bloodGroup: c.bloodGroup || '',
          birthMark: c.birthMark || '',
          congenitalAbnormality: c.congenitalAbnormality || '',
          babyHandedOverTo: c.babyHandedOverTo || '',
          notes: c.notes || '',
          parentSignature: c.parentSignature || '',
          doctorSignature: c.doctorSignature || '',
        }))
      }
    } finally { setLoading(false) }
  })() }, [docId])

  async function save(){
    if (loading) return
    setLoading(true)
    try {
      const payload: any = {
        ...form,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
      }
      let saved: any = null
      const idToUpdate = currentId || docId
      if (idToUpdate){
        saved = await hospitalApi.updateBirthCertificateById(idToUpdate, payload)
        setCurrentId(idToUpdate)
      } else if (encounterId){
        saved = await hospitalApi.upsertIpdBirthCertificate(encounterId, payload)
      } else {
        // If neither provided, create standalone
        const created = await hospitalApi.createBirthCertificate(payload)
        if (created?.birthCertificate?._id){
          const id = created.birthCertificate._id
          setCurrentId(id)
          setForm((f:any)=>({ ...f, srNo: created.birthCertificate.srNo }))
          if (typeof onSaved === 'function') onSaved(created.birthCertificate)
          return created.birthCertificate
        }
      }
      if (saved?.birthCertificate){ if (typeof onSaved === 'function') onSaved(saved.birthCertificate); return saved.birthCertificate }
    } finally { setLoading(false) }
  }

  async function printOnly(){
    const savedDoc = await save()
    let html: any
    const idToUse = savedDoc?._id || currentId
    if (idToUse){
      html = await coreApi(`/hospital/ipd/forms/birth-certificates/${encodeURIComponent(idToUse)}/print`) as any
    } else if (encounterId){
      html = await coreApi(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/birth-certificate/print`) as any
    }
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(String(html)); w.document.close(); w.focus()
  }

  return (
    <div className="space-y-3">
      {showPatientHeader && patient && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Mother Name</label>
              <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.name||''} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">MR Number</label>
              <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.mrn||''} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Phone</label>
              <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.phone||''} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Admission No</label>
              <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.admissionNo||''} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-800 mb-1">Address</label>
              <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={patient?.address||''} />
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Sr No</label>
          <input disabled className="w-full border rounded-md px-2 py-1 text-sm bg-slate-100" value={form.srNo||''} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Mother Name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.motherName||''} onChange={e=>setForm((v:any)=>({ ...v, motherName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Father Name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.fatherName||''} onChange={e=>setForm((v:any)=>({ ...v, fatherName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Phone</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.phone||''} onChange={e=>setForm((v:any)=>({ ...v, phone: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Address</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.address||''} onChange={e=>setForm((v:any)=>({ ...v, address: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">MR Number</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.mrNumber||''} onChange={e=>setForm((v:any)=>({ ...v, mrNumber: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Baby Name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.babyName||''} onChange={e=>setForm((v:any)=>({ ...v, babyName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Sex of Baby</label>
          <select className="w-full border rounded-md px-2 py-1 text-sm" value={form.sexOfBaby||''} onChange={e=>setForm((v:any)=>({ ...v, sexOfBaby: e.target.value }))}>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Date of Birth</label>
          <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.dateOfBirth||''} onChange={e=>setForm((v:any)=>({ ...v, dateOfBirth: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Time of Birth</label>
          <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.timeOfBirth||''} onChange={e=>setForm((v:any)=>({ ...v, timeOfBirth: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Delivery Type</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" placeholder="SVD / Instrumental / C-Section" value={form.deliveryType||''} onChange={e=>setForm((v:any)=>({ ...v, deliveryType: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Delivery Mode</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" placeholder="Elective / Emergency" value={form.deliveryMode||''} onChange={e=>setForm((v:any)=>({ ...v, deliveryMode: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Condition at Birth</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.conditionAtBirth||''} onChange={e=>setForm((v:any)=>({ ...v, conditionAtBirth: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Weight at Birth</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.weightAtBirth||''} onChange={e=>setForm((v:any)=>({ ...v, weightAtBirth: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Blood Group</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.bloodGroup||''} onChange={e=>setForm((v:any)=>({ ...v, bloodGroup: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Birth Mark</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.birthMark||''} onChange={e=>setForm((v:any)=>({ ...v, birthMark: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Congenital Abnormality</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.congenitalAbnormality||''} onChange={e=>setForm((v:any)=>({ ...v, congenitalAbnormality: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Baby Handed Over To</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.babyHandedOverTo||''} onChange={e=>setForm((v:any)=>({ ...v, babyHandedOverTo: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Notes</label>
          <textarea className="w-full border rounded-md px-2 py-1 text-sm h-24" value={form.notes||''} onChange={e=>setForm((v:any)=>({ ...v, notes: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Signature of Parent/Relation</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.parentSignature||''} onChange={e=>setForm((v:any)=>({ ...v, parentSignature: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Sign. & Stamp of Doctor</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.doctorSignature||''} onChange={e=>setForm((v:any)=>({ ...v, doctorSignature: e.target.value }))} />
        </div>
      </div>

      <div className="pt-1 flex flex-wrap gap-2">
        <button disabled={loading} onClick={save} className="btn-outline-navy disabled:opacity-50">Save</button>
        <button disabled={loading} onClick={printOnly} className="btn disabled:opacity-50">Print</button>
      </div>
    </div>
  )
}

function fmtDateISO(d:any){ try { const x = new Date(d); if (!x || isNaN(x.getTime())) return ''; return x.toISOString().slice(0,10) } catch { return '' } }
