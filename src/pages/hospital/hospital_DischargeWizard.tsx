import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Hospital_BloodDonationConsent from '../../components/hospital/hospital_BloodDonationConsent'
import Hospital_TestTubeConsent from '../../components/hospital/hospital_TestTubeConsent'
import IpdDischargeForm from '../../components/hospital/hospital_IpdDischargeForm'
import IpdInvoiceSlip from '../../components/hospital/hospital_IpdInvoiceslip'
import ReceivedDeathForm from '../../components/hospital/hospital_ReceivedDeathForm'
import Hospital_ShortStayForm from '../../components/hospital/hospital_ShortStayForm'
import DeathCertificateForm from '../../components/hospital/hospital_DeathCertificateForm'
import Hospital_BirthCertificateForm from '../../components/hospital/hospital_BirthCertificateForm'
import { hospitalApi } from '../../utils/api'

const formDefs = [
  { key: 'DischargeSummary', label: 'Discharge Summary', render: () => null },
  { key: 'Invoice', label: 'Final Invoice', render: (p: any) => <IpdInvoiceSlip patientId={p?.id} embedded /> },
  { key: 'ShortStay', label: 'Short Stay', render: (p: any) => <Hospital_ShortStayForm encounterId={p?.encounterId} patient={p} /> },
  { key: 'DeathCertificate', label: 'Death Certificate', render: (p: any) => <DeathCertificateForm encounterId={p?.encounterId} patient={p} /> },
  { key: 'BirthCertificate', label: 'Birth Certificate', render: (p: any) => <Hospital_BirthCertificateForm encounterId={p?.encounterId} patient={p} /> },
  { key: 'ReceivedDeath', label: 'Received Death', render: (p: any) => <ReceivedDeathForm encounterId={p?.encounterId} patient={p} /> },
  { key: 'BloodDonationConsent', label: 'Blood Donation Consent', render: (p: any) => <Hospital_BloodDonationConsent patient={{ name: p?.name, phone: p?.phone, address: p?.address }} /> },
  { key: 'TestTubeConsent', label: 'Test Tube Consent', render: (p: any) => <Hospital_TestTubeConsent patient={{ name: p?.name, phone: p?.phone, address: p?.address }} /> },
]

export default function Hospital_DischargeWizard(){
  const { id } = useParams()
  const [encounterId, setEncounterId] = useState<string>('')

  const [patient, setPatient] = useState<any>({ id: '', name: '', bed: '', doctor: '', admitted: '', mrn: '', admissionNo: '' })

  // Resolve encounter (treat :id as encounterId if possible; else fallback by patientId)
  useEffect(()=>{ (async()=>{
    const routeId = String(id||'')
    if (!routeId) return
    try {
      const e = await hospitalApi.getIPDAdmissionById(routeId) as any
      const enc = e?.encounter
      if (enc && enc._id){
        setEncounterId(String(enc._id))
        setPatient({
          id: String(enc.patientId?._id||''),
          name: String(enc.patientId?.fullName||''),
          bed: enc.bedLabel||'',
          doctor: enc.doctorId?.name||'',
          admitted: enc.startAt,
          mrn: enc.patientId?.mrn||'',
          address: enc.patientId?.address||'',
          phone: enc.patientId?.phoneNormalized||'',
          age: enc.patientId?.age||'',
          gender: enc.patientId?.gender||'',
          admissionNo: enc.admissionNo || '',
        })
        return
      }
    } catch {}
    // Fallback: assume :id is patientId -> get most recent admitted/discharged
    try {
      const res = await hospitalApi.listIPDAdmissions({ patientId: routeId, limit: 1 }) as any
      const enc = (res?.admissions||[])[0]
      if (enc){
        setEncounterId(String(enc._id))
        setPatient({
          id: routeId,
          name: String(enc.patientId?.fullName||''),
          bed: enc.bedLabel||'',
          doctor: enc.doctorId?.name||'',
          admitted: enc.startAt,
          mrn: enc.patientId?.mrn||'',
          address: enc.patientId?.address||'',
          phone: enc.patientId?.phoneNormalized||'',
          age: enc.patientId?.age||'',
          gender: enc.patientId?.gender||'',
          admissionNo: enc.admissionNo || '',
        })
      }
    } catch {}
  })() }, [id])

  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string[]>(['DischargeSummary','Invoice'])
  

  return (
    <div className="space-y-4">
      {/* Top header removed to avoid duplication with form header */}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {['Select Forms','Fill Forms'].map((t, i)=> (
            <button key={i} onClick={()=>setStep(i)} className={`rounded-md px-3 py-1 text-sm ${step===i?'bg-navy text-white':'bg-slate-100 text-slate-700'}`}>{i+1}. {t}</button>
          ))}
        </div>
      </div>
      {step===0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-lg font-semibold text-slate-800">Select Forms</div>
          <div className="grid md:grid-cols-2 gap-2">
            {formDefs.map(fd => (
              <label key={fd.key} className="flex items-center gap-2 text-sm border border-slate-200 rounded-md px-3 py-2">
                <input type="checkbox" checked={selected.includes(fd.key)} onChange={(e)=> setSelected(s=> e.target.checked ? [...s, fd.key] : s.filter(x=>x!==fd.key))} />
                {fd.label}
              </label>
            ))}
          </div>
          <div className="pt-2 flex items-center gap-2">
            <button disabled={selected.length===0} onClick={()=>setStep(1)} className="btn disabled:opacity-50">Continue</button>
          </div>
        </div>
      )}

      {step===1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-lg font-semibold text-slate-800">Fill Forms</div>
          <div className="space-y-10">
            {selected.map(k=> {
              const fd = formDefs.find(x=>x.key===k)
              if (!fd) return null
              return (
                <div key={k} className="border border-slate-200 rounded-md p-3">
                  <div className="mb-2 text-sm font-medium text-slate-700">{fd.label}</div>
                  {/* Minimal structured fields for backend persistence */}
                  {k==='DischargeSummary' && (
                    <IpdDischargeForm encounterId={encounterId} patient={patient} />
                  )}
                  <div className="overflow-auto">
                    {k!=='DischargeSummary' && fd.render({ ...patient, encounterId })}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="pt-2 flex items-center gap-2">
            <button onClick={()=>setStep(0)} className="btn-outline-navy">Back</button>
          </div>
        </div>
      )}

    </div>
  )
}

