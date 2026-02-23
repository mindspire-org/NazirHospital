import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Hospital_PrintHeader from './hospital_PrintHeader';
import { hospitalApi } from '../../utils/api';

type Props = { encounterId?: string; patient?: any };

export default function Discharged(props: Props){
  const { id } = useParams();
  const [encounterId, setEncounterId] = useState<string>(props.encounterId || '');
  const [patient, setPatient] = useState<any>(props.patient || {});
  const [brand, setBrand] = useState<any>({});
  // Extended UI fields (mapped into backend payload)
  const [dor, setDor] = useState<string>('')
  const [lama, setLama] = useState<boolean>(false)
  const [ddrConsent, setDdrConsent] = useState<boolean>(false)
  const [advisedByDoctor, setAdvisedByDoctor] = useState<boolean>(false)
  const [presentingComplaints, setPresentingComplaints] = useState<string>('')
  const [reasonOfAdmission, setReasonOfAdmission] = useState<string>('')
  const [finalDiagnosis, setFinalDiagnosis] = useState<string>('')
  const [proceduresOutcome, setProceduresOutcome] = useState<string>('')
  const [treatmentInHospital, setTreatmentInHospital] = useState<string>('')
  const [invest, setInvest] = useState<any>({ HB:'', UREA:'', HCV:'', NA:'', PLATELETS:'', CREATININE:'', HBSAG:'', K:'', TLC:'', ALT:'', HIV:'', CA:'' })
  const [meds, setMeds] = useState<Array<{ name:string; dose:string; route:string; freq:string; timing:string; duration:string }>>(
    Array.from({ length: 3 }, ()=>({ name:'', dose:'', route:'', freq:'', timing:'', duration:'' }))
  )
  const [condAtDischarge, setCondAtDischarge] = useState<'satisfactory'|'fair'|'poor'|''>('')
  const [respOfTreatment, setRespOfTreatment] = useState<'excellent'|'good'|'average'|'poor'|''>('')
  const [followUpInstructions, setFollowUpInstructions] = useState<string>('')
  const [doctorName, setDoctorName] = useState<string>('')
  const [signDate, setSignDate] = useState<string>('')
  const [doctorSignText, setDoctorSignText] = useState<string>('')

  useEffect(() => { (async () => {
    try {
      const s: any = await hospitalApi.getSettings();
      setBrand({
        hospitalName: s?.name || '',
        hospitalLogo: s?.logoDataUrl || '',
        hospitalAddress: s?.address || '',
        hospitalPhone: s?.phone || '',
        hospitalEmail: s?.email || '',
      });
    } catch {}
    // If props provided, use them; else resolve via :id
    try {
      if (props.encounterId) {
        setEncounterId(String(props.encounterId));
      } else {
        const rid = String(id || '');
        if (rid) {
          const e: any = await hospitalApi.getIPDAdmissionById(rid);
          const enc = e?.encounter;
          if (enc && enc._id) {
            setEncounterId(String(enc._id));
            if (!props.patient) {
              setPatient({
                id: String(enc.patientId?._id || ''),
                name: String(enc.patientId?.fullName || ''),
                mrn: enc.patientId?.mrn || '',
                phone: enc.patientId?.phoneNormalized || '',
                address: enc.patientId?.address || '',
                bed: enc.bedLabel || '',
                doctor: enc.doctorId?.name || '',
              });
            }
          }
        }
      }
      const encId = String(props.encounterId || encounterId || '');
      if (encId) {
        try {
          const ds: any = await hospitalApi.getIpdDischargeSummary(encId);
          const sdoc = ds?.summary || ds;
          if (sdoc) {
            // Diagnosis, advice, sign date
            setFinalDiagnosis(sdoc.diagnosis || '')
            setFollowUpInstructions(sdoc.advice || '')
            setSignDate(sdoc.followUpDate ? new Date(sdoc.followUpDate).toISOString().slice(0,10) : '')

            // Parse courseInHospital to separate fields
            const course = String(sdoc.courseInHospital||'')
            const lines = course.split(/\n+/).map(t=>t.trim()).filter(Boolean)
            const findPref = (p:string)=> lines.find(l=> l.toLowerCase().startsWith(p.toLowerCase()))?.split(':').slice(1).join(':').trim() || ''
            setPresentingComplaints(findPref('Presenting Complaints'))
            setReasonOfAdmission(findPref('Reason of Admission'))
            setTreatmentInHospital(findPref('Treatment'))
            setAdvisedByDoctor(!!lines.find(l=> /Discharge advised by Doctor/i.test(l)))
            setLama(!!lines.find(l=> /^LAMA$/i.test(l)))
            setDdrConsent(!!lines.find(l=> /DDR Consent/i.test(l)))

            // Procedures
            setProceduresOutcome(Array.isArray(sdoc.procedures)? sdoc.procedures.join('\n') : (sdoc.procedures || ''))

            // Condition at discharge
            setCondAtDischarge((sdoc.conditionAtDischarge || '') as any)

            // Medications: split each entry by ' | ' and allow dynamic row count
            const medsArr: string[] = Array.isArray(sdoc.medications) ? sdoc.medications : String(sdoc.medications||'').split('\n').filter(Boolean)
            const parsed = medsArr.map(raw => {
              const parts = String(raw||'').split('|').map(x=>x.trim())
              return {
                name: parts[0]||'',
                dose: parts[1]||'',
                route: parts[2]||'',
                freq: parts[3]||'',
                timing: parts[4]||'',
                duration: parts[5]||'',
              }
            })
            if (parsed.length > 0) {
              setMeds(parsed)
            }

            // Notes: Investigations, response, doctor, DOR
            const notes = String(sdoc.notes||'')
            const nlines = notes.split(/\n+/).map(t=>t.trim()).filter(Boolean)
            const investigationsLine = (nlines.find(l=> l.toLowerCase().startsWith('investigations'))||'')
            const kvs = investigationsLine.replace(/^investigations:?\s*/i,'').split(',').map(s=>s.trim()).filter(Boolean)
            const invPatch:any = { ...invest }
            kvs.forEach(kv => {
              const [k,...rest] = kv.split(':')
              const key = String(k||'').toUpperCase().replace(/\s+/g,'')
              const val = rest.join(':').trim()
              if (key in invPatch) invPatch[key] = val
            })
            setInvest(invPatch)
            // Response of Treatment
            const rot = (nlines.find(l=> l.toLowerCase().startsWith('response of treatment'))||'').split(':').slice(1).join(':').trim().toLowerCase()
            if (['excellent','good','average','poor'].includes(rot)) setRespOfTreatment(rot as any)
            // Doctor and sign
            const docNm = (nlines.find(l=> l.toLowerCase().startsWith('doctor:'))||'').split(':').slice(1).join(':').trim()
            if (docNm) setDoctorName(docNm)
            const docSign = (nlines.find(l=> l.toLowerCase().startsWith('doctor sign'))||'').split(':').slice(1).join(':').trim()
            if (docSign) setDoctorSignText(docSign)
            // DOR
            const dorLine = (nlines.find(l=> l.toLowerCase().startsWith('dor:'))||'').split(':').slice(1).join(':').trim()
            if (dorLine) setDor(dorLine)
          }
        } catch {}
      }
    } catch {}
  })() }, [id, props.encounterId]);

  const apiBase = useMemo(() => {
    const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:';
    const isElectronUA = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '');
    const envBase = (import.meta as any).env?.VITE_API_URL;
    return envBase || ((isFile || isElectronUA) ? 'http://127.0.0.1:4000/api' : 'http://localhost:4000/api');
  }, []);

  const previewHtml = async (url: string) => {
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

  const save = async (doPrint?: boolean) => {
    if (!encounterId) return;
    const medsList = meds
      .map(m => [m.name, m.dose, m.route, m.freq, m.timing, m.duration].filter(Boolean).join(' | '))
      .filter(Boolean)
    const proceduresList = String(proceduresOutcome||'').split('\n').map(s=>s.trim()).filter(Boolean)
    const course = [
      presentingComplaints && `Presenting Complaints: ${presentingComplaints}`,
      reasonOfAdmission && `Reason of Admission: ${reasonOfAdmission}`,
      treatmentInHospital && `Treatment: ${treatmentInHospital}`,
      advisedByDoctor ? 'Discharge advised by Doctor: Yes' : '',
      lama ? 'LAMA' : '',
      ddrConsent ? 'DDR Consent: Yes' : '',
    ].filter(Boolean).join('\n')
    const notesBlob = [
      `Investigations: ${Object.entries(invest).map(([k,v])=> v? `${k}: ${v}`: '').filter(Boolean).join(', ')}`,
      respOfTreatment ? `Response of Treatment: ${respOfTreatment}` : '',
      doctorName ? `Doctor: ${doctorName}` : '',
      doctorSignText ? `Doctor Sign: ${doctorSignText}` : '',
      dor ? `DOR: ${dor}` : '',
    ].filter(Boolean).join('\n')
    const payload = {
      diagnosis: finalDiagnosis || undefined,
      courseInHospital: course || undefined,
      procedures: proceduresList,
      conditionAtDischarge: condAtDischarge || undefined,
      medications: medsList,
      advice: followUpInstructions || undefined,
      followUpDate: signDate ? new Date(signDate).toISOString() : undefined,
      notes: notesBlob || undefined,
    }
    await hospitalApi.upsertIpdDischargeSummary(encounterId, payload as any)
    if (doPrint) await previewHtml(apiBase + '/hospital/ipd/admissions/' + encodeURIComponent(encounterId) + '/discharge-summary/print')
  };

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <Hospital_PrintHeader brand={brand} />
        <div className="mt-2 text-sm text-slate-600 font-semibold">
          Patient: <span className="capitalize">{patient?.name || '-'}</span>
          {' '}· MRN: <span className="font-mono">{patient?.mrn || '-'}</span>
          {' '}· Phone: {patient?.phone || '-'} · Bed: {patient?.bed || '-'} · Doctor: {patient?.doctor || '-'}
        </div>
        <div className="mt-1 text-xs text-slate-600 font-semibold">Address: {patient?.address || '-'}</div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-lg font-semibold text-slate-800">Discharge Form</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <label className="block mb-1 font-semibold">Date of Release (DOR)</label>
            <input type="date" value={dor} onChange={e=>setDor(e.target.value)} className="w-full border rounded-md px-2 py-1" />
          </div>
          <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={lama} onChange={e=>setLama(e.target.checked)} /> LAMA</label>
          <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={ddrConsent} onChange={e=>setDdrConsent(e.target.checked)} /> DDR Consent</label>
        </div>

        <div className="mt-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={advisedByDoctor} onChange={e=>setAdvisedByDoctor(e.target.checked)} /> Discharged advised by Doctor</label></div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block mb-1 font-semibold">Presenting Complaints</label>
            <textarea value={presentingComplaints} onChange={e=>setPresentingComplaints(e.target.value)} className="w-full border rounded-md px-2 py-1 h-20" />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Reason of Admission / Brief History / Examination</label>
            <textarea value={reasonOfAdmission} onChange={e=>setReasonOfAdmission(e.target.value)} className="w-full border rounded-md px-2 py-1 h-20" />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Final Diagnosis</label>
            <textarea value={finalDiagnosis} onChange={e=>setFinalDiagnosis(e.target.value)} className="w-full border rounded-md px-2 py-1 h-20" />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Any Procedure During Stay & Outcome</label>
            <textarea value={proceduresOutcome} onChange={e=>setProceduresOutcome(e.target.value)} className="w-full border rounded-md px-2 py-1 h-20" />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold">Treatment in Hospital</label>
            <textarea value={treatmentInHospital} onChange={e=>setTreatmentInHospital(e.target.value)} className="w-full border rounded-md px-2 py-1 h-20" />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 text-sm font-semibold">Investigations Significant Results</div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
            {(['HB','UREA','HCV','NA','PLATELETS','CREATININE','HBSAG','K','TLC','ALT','HIV','CA'] as const).map(k=> (
              <div key={k}>
                <label className="block mb-1 text-xs font-medium">{k}</label>
                <input value={invest[k]} onChange={e=>setInvest((s:any)=>({ ...s, [k]: e.target.value }))} className="w-full border rounded-md px-2 py-1" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 text-sm font-semibold flex items-center justify-between">
            <span>Medicines given on Discharge</span>
            <button onClick={()=> setMeds(arr=> [...arr, { name:'', dose:'', route:'', freq:'', timing:'', duration:'' }])} className="btn-outline-navy">Add Row</button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left">Sr</th>
                  <th className="px-2 py-1 text-left">Medicine</th>
                  <th className="px-2 py-1 text-left">Strength/Dose</th>
                  <th className="px-2 py-1 text-left">Route</th>
                  <th className="px-2 py-1 text-left">Frequency</th>
                  <th className="px-2 py-1 text-left">Timing</th>
                  <th className="px-2 py-1 text-left">Duration</th>
                  <th className="px-2 py-1 text-left">Del</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((m, i)=> (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">{i+1}</td>
                    <td className="px-2 py-1"><input value={m.name} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, name:e.target.value}:x))} className="w-full border rounded-md px-2 py-1" /></td>
                    <td className="px-2 py-1"><input value={m.dose} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, dose:e.target.value}:x))} className="w-full border rounded-md px-2 py-1" /></td>
                    <td className="px-2 py-1"><input value={m.route} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, route:e.target.value}:x))} className="w-full border rounded-md px-2 py-1" /></td>
                    <td className="px-2 py-1"><input value={m.freq} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, freq:e.target.value}:x))} className="w-full border rounded-md px-2 py-1" /></td>
                    <td className="px-2 py-1"><input value={m.timing} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, timing:e.target.value}:x))} className="w-full border rounded-md px-2 py-1" /></td>
                    <td className="px-2 py-1"><input value={m.duration} onChange={e=>setMeds(arr=> arr.map((x,idx)=> idx===i?{...x, duration:e.target.value}:x))} className="w-full border rounded-md px-2 py-1" /></td>
                    <td className="px-2 py-1"><button onClick={()=> setMeds(arr=> arr.filter((_, idx)=> idx !== i))} className="text-red-600 hover:underline">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="mb-1 font-semibold">Condition at Discharge</div>
            <div className="flex flex-wrap gap-4">
              {(['satisfactory','fair','poor'] as const).map(v=> (
                <label key={v} className="flex items-center gap-1"><input type="radio" name="cad" checked={condAtDischarge===v} onChange={()=>setCondAtDischarge(v)} /> {v}</label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 font-semibold">Response of Treatment</div>
            <div className="flex flex-wrap gap-4">
              {(['excellent','good','average','poor'] as const).map(v=> (
                <label key={v} className="flex items-center gap-1"><input type="radio" name="rot" checked={respOfTreatment===v} onChange={()=>setRespOfTreatment(v)} /> {v}</label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="md:col-span-3">
            <label className="block mb-1 font-semibold">Follow-up Instructions</label>
            <textarea value={followUpInstructions} onChange={e=>setFollowUpInstructions(e.target.value)} className="w-full border rounded-md px-2 py-1 h-20" />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Doctor Name</label>
            <input value={doctorName} onChange={e=>setDoctorName(e.target.value)} className="w-full border rounded-md px-2 py-1" />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Sign Date</label>
            <input type="date" value={signDate} onChange={e=>setSignDate(e.target.value)} className="w-full border rounded-md px-2 py-1" />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Doctor Sign (text)</label>
            <input value={doctorSignText} onChange={e=>setDoctorSignText(e.target.value)} className="w-full border rounded-md px-2 py-1" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button onClick={() => { if (!encounterId) return; previewHtml(apiBase + '/hospital/ipd/admissions/' + encodeURIComponent(encounterId) + '/discharge-summary/print'); }} className="btn-outline-navy">Print</button>
          <button onClick={() => save(false)} className="btn-outline-navy">Save</button>
        </div>
      </div>
    </div>
  );
}
