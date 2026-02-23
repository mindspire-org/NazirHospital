import { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react'
import { hospitalApi, labApi } from '../../utils/api'

type Props = {
  mrn?: string
  doctor?: { id?: string; name?: string }
  onSaved?: (id?: string) => void
}

export default forwardRef(function Doctor_IpdReferralForm({ mrn, doctor, onSaved }: Props, ref: any){
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [patient, setPatient] = useState<any | null>(null)
  const [deps, setDeps] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])

  const [form, setForm] = useState({
    referralDate: new Date().toISOString().slice(0,10),
    referralTime: new Date().toTimeString().slice(0,5),
    reasonOfReferral: '',
    provisionalDiagnosis: '',
    vitals: { bp: '', pulse: '', temperature: '', rr: '' },
    referredTo: { departmentId: '', doctorId: '' },
    stability: 'Stable' as 'Stable'|'Unstable',
    consciousness: 'Conscious' as 'Conscious'|'Unconscious',
    remarks: '',
    signStamp: '',
  })

  useEffect(()=>{ if (mrn) loadPatient(mrn) }, [mrn])
  useEffect(()=>{ (async()=>{ try{ const [a,b] = await Promise.all([hospitalApi.listDepartments() as any, hospitalApi.listDoctors() as any]); setDeps((a?.departments||a)||[]); setDocs((b?.doctors||b)||[])}catch{} })() }, [])

  async function loadPatient(m: string){
    setLoading(true)
    try{
      const res = await hospitalApi.searchPatients({ mrn: m, limit: 1 }) as any
      let p = (res?.patients || [])[0] || null
      try {
        if (m) {
          const resp: any = await labApi.getPatientByMrn(m)
          const lp = resp?.patient
          if (lp) {
            const merged: any = { ...p }
            if (!merged?.cnic && (lp.cnic || lp.cnicNormalized)) merged.cnic = lp.cnic || lp.cnicNormalized
            if (!merged?.address && lp.address) merged.address = lp.address
            if (!merged?.phone && (lp.phone || lp.phoneNormalized)) merged.phone = lp.phone || lp.phoneNormalized
            if (!merged?.fatherName && lp.fatherName) merged.fatherName = lp.fatherName
            if (!merged?.fullName && lp.fullName) merged.fullName = lp.fullName
            p = merged
          }
        }
      } catch {}
      setPatient(p)
    }catch{ setPatient(null) }
    setLoading(false)
  }

  const canSave = useMemo(()=> !!patient?._id && !!form.reasonOfReferral.trim(), [patient?._id, form.reasonOfReferral])

  const patientAge = useMemo(()=>{
    const p = patient
    if (!p) return ''
    if (p.age) return String(p.age)
    if (p.dob){ try{ const d = new Date(p.dob); if(!isNaN(d as any)){ const y = Math.floor((Date.now()-d.getTime())/31557600000); return String(Math.max(0,y)) } }catch{} }
    return ''
  }, [patient])

  // Expose a method for print preview to collect normalized data
  useImperativeHandle(ref, () => ({
    getPreviewData: () => {
      const depRow = deps.find(d=> String(d._id||d.id)===form.referredTo.departmentId)
      const docRow = docs.find(d=> String(d._id||d.id)===form.referredTo.doctorId)
      const p = patient
      const patientObj = {
        name: p?.fullName || (p as any)?.name || '-',
        mrn: p?.mrn || (p as any)?.mrNumber || mrn || '-',
        gender: p?.gender || '-',
        fatherName: p?.fatherName || (p as any)?.fatherHusbandName || '',
        age: patientAge || '',
        phone: p?.phone || p?.phoneNormalized || '',
        address: p?.address || '',
        cnic: (p as any)?.cnic || (p as any)?.cnicNormalized || '',
      }
      const referralObj = {
        date: form.referralDate,
        time: form.referralTime,
        reason: form.reasonOfReferral,
        provisionalDiagnosis: form.provisionalDiagnosis,
        vitals: { ...form.vitals },
        referredTo: { department: depRow?.name || '', doctor: docRow?.name || '' },
        condition: { stability: form.stability, consciousness: form.consciousness },
        remarks: form.remarks,
        signStamp: form.signStamp,
        referredBy: doctor?.name || '',
      }
      return { patient: patientObj, referral: referralObj }
    }
  }), [deps, docs, form, patient, patientAge, doctor?.name, mrn])

  async function save(){
    if (!patient?._id) { alert('Patient not found'); return }
    setSaving(true)
    try{
      const isHex24 = (s?: string) => !!s && /^[a-f\d]{24}$/i.test(s)
      const depId = isHex24(form.referredTo.departmentId) ? form.referredTo.departmentId : undefined
      const docId = isHex24(form.referredTo.doctorId) ? form.referredTo.doctorId : undefined
      const payload = {
        patientId: String(patient._id),
        referredByDoctorId: doctor?.id || undefined,
        referralDate: form.referralDate || undefined,
        referralTime: form.referralTime || undefined,
        reasonOfReferral: form.reasonOfReferral || undefined,
        provisionalDiagnosis: form.provisionalDiagnosis || undefined,
        vitals: {
          bp: form.vitals.bp || undefined,
          pulse: form.vitals.pulse ? Number(form.vitals.pulse) : undefined,
          temperature: form.vitals.temperature ? Number(form.vitals.temperature) : undefined,
          rr: form.vitals.rr ? Number(form.vitals.rr) : undefined,
        },
        referredTo: { departmentId: depId, doctorId: docId },
        condition: { stability: form.stability, consciousness: form.consciousness },
        remarks: form.remarks || undefined,
        signStamp: form.signStamp || undefined,
      }
      const res = await hospitalApi.createIpdReferral(payload) as any
      const id = res?.referral?._id || res?.id
      if (!res || res.error){ throw new Error(res?.error || 'Failed') }
      onSaved?.(id)
      alert('Referral saved')
    }catch(e:any){
      try{
        const key = 'hospital.ipd.referrals'
        const raw = localStorage.getItem(key) || '[]'
        const arr = JSON.parse(raw) as any[]
        const id = crypto.randomUUID()
        const depRow = deps.find(d=> String(d._id||d.id)===form.referredTo.departmentId)
        const docRow = docs.find(d=> String(d._id||d.id)===form.referredTo.doctorId)
        const item = {
          _id: id,
          serial: 'LOCAL-'+String(arr.length+1).padStart(4,'0'),
          patientId: patient._id,
          patientSnapshot: {
            mrn: patient.mrn || patient.mrNumber || mrn || '-',
            fullName: patient.fullName || patient.name || '-',
            fatherHusbandName: patient.fatherName || '',
            cnic: patient.cnic || '',
            phone: patient.phone || patient.phoneNormalized || '',
            dob: patient.dob || '',
            age: patientAge,
            gender: patient.gender || '',
            maritalStatus: patient.maritalStatus || '',
            address: patient.address || '',
          },
          referredBy: { doctorId: doctor?.id || '', doctorName: doctor?.name || '' },
          referredTo: { departmentId: form.referredTo.departmentId || '', departmentName: depRow?.name, doctorId: form.referredTo.doctorId || '', doctorName: docRow?.name },
          referralDate: form.referralDate, referralTime: form.referralTime,
          reasonOfReferral: form.reasonOfReferral, provisionalDiagnosis: form.provisionalDiagnosis,
          vitals: { ...form.vitals },
          condition: { stability: form.stability, consciousness: form.consciousness },
          remarks: form.remarks,
          status: 'New',
          createdAt: new Date().toISOString(),
        }
        localStorage.setItem(key, JSON.stringify([item, ...arr]))
        onSaved?.(id)
        alert(`Failed to save on server: ${e?.message || 'Unknown error'}. Referral saved locally.`)
      }catch(e:any){ alert(e?.message || 'Failed to save') }
    }finally{ setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Refer to IPD</div>
        <button disabled={!canSave || saving} onClick={save} className="btn disabled:opacity-50">{saving? 'Saving...' : 'Save Referral'}</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-slate-200 p-3 bg-slate-50">
          <div className="text-sm font-medium text-slate-700 mb-2">Patient</div>
          <div className="grid gap-2 text-sm">
            <div><span className="text-slate-500">Name:</span> <span className="capitalize">{patient?.fullName || patient?.name || '-'}</span></div>
            <div><span className="text-slate-500">MRN:</span> <span>{patient?.mrn || patient?.mrNumber || mrn || '-'}</span></div>
            <div><span className="text-slate-500">Age:</span> <span>{patientAge || '-'}</span> <span className="ml-3 text-slate-500">Gender:</span> <span className="capitalize">{patient?.gender || '-'}</span></div>
            <div><span className="text-slate-500">Father/Husband:</span> <span className="capitalize">{patient?.fatherName || '-'}</span></div>
            <div><span className="text-slate-500">CNIC:</span> <span>{patient?.cnic || (patient as any)?.cnicNormalized || '-'}</span></div>
            <div><span className="text-slate-500">Phone:</span> <span>{patient?.phone || patient?.phoneNormalized || '-'}</span></div>
            <div><span className="text-slate-500">Address:</span> <span>{patient?.address || '-'}</span></div>
          </div>
        </div>
        <div className="grid gap-3">
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Date of Referral</span><input type="date" value={form.referralDate} onChange={e=>setForm(f=>({ ...f, referralDate: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Time of Referral</span><input type="time" value={form.referralTime} onChange={e=>setForm(f=>({ ...f, referralTime: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Reason of Referral</span><input value={form.reasonOfReferral} onChange={e=>setForm(f=>({ ...f, reasonOfReferral: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Provisional Diagnosis</span><input value={form.provisionalDiagnosis} onChange={e=>setForm(f=>({ ...f, provisionalDiagnosis: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 mt-3">
        <label className="block text-sm"><span className="text-slate-600 block mb-1">BP</span><input value={form.vitals.bp} onChange={e=>setForm(f=>({ ...f, vitals: { ...f.vitals, bp: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="120/80" /></label>
        <label className="block text-sm"><span className="text-slate-600 block mb-1">Pulse</span><input value={form.vitals.pulse} onChange={e=>setForm(f=>({ ...f, vitals: { ...f.vitals, pulse: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm"><span className="text-slate-600 block mb-1">Temperature</span><input value={form.vitals.temperature} onChange={e=>setForm(f=>({ ...f, vitals: { ...f.vitals, temperature: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm"><span className="text-slate-600 block mb-1">RR</span><input value={form.vitals.rr} onChange={e=>setForm(f=>({ ...f, vitals: { ...f.vitals, rr: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 mt-3">
        <div className="grid gap-3">
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Referred To - Department</span>
            <select value={form.referredTo.departmentId} onChange={e=>setForm(f=>({ ...f, referredTo: { ...f.referredTo, departmentId: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select department (optional)</option>
              {deps.map((d:any)=> (<option key={String(d._id||d.id)} value={String(d._id||d.id)}>{d.name}</option>))}
            </select>
          </label>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Doctor (optional)</span>
            <select value={form.referredTo.doctorId} onChange={e=>setForm(f=>({ ...f, referredTo: { ...f.referredTo, doctorId: e.target.value } }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select doctor</option>
              {docs.map((d:any)=> (<option key={String(d._id||d.id)} value={String(d._id||d.id)}>{d.name}</option>))}
            </select>
          </label>
        </div>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm"><span className="text-slate-600 block mb-1">Condition</span>
              <select value={form.stability} onChange={e=>setForm(f=>({ ...f, stability: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="Stable">Stable</option>
                <option value="Unstable">Unstable</option>
              </select>
            </label>
            <label className="block text-sm"><span className="text-slate-600 block mb-1">Consciousness</span>
              <select value={form.consciousness} onChange={e=>setForm(f=>({ ...f, consciousness: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="Conscious">Conscious</option>
                <option value="Unconscious">Unconscious</option>
              </select>
            </label>
          </div>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Any other Remarks</span><textarea rows={3} value={form.remarks} onChange={e=>setForm(f=>({ ...f, remarks: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="block text-sm"><span className="text-slate-600 block mb-1">Sign & Stamp of Doctor</span><input value={form.signStamp} onChange={e=>setForm(f=>({ ...f, signStamp: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        </div>
      </div>

      {loading && <div className="mt-2 text-sm text-slate-500">Loading patient…</div>}
      {!patient && !loading && mrn && <div className="mt-2 text-sm text-rose-600">No patient found for MRN: {mrn}</div>}
    </div>
  )
})
