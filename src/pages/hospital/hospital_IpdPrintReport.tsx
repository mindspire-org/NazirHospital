import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

export default function Hospital_IpdPrintReport(){
  const { id } = useParams()
  const encounterId = String(id || '')
  const navigate = useNavigate()

  const [encounter, setEncounter] = useState<any | null>(null)
  const [anesPre, setAnesPre] = useState<any[]>([])
  const [anesIntra, setAnesIntra] = useState<any[]>([])
  const [anesRecovery, setAnesRecovery] = useState<any[]>([])
  const [anesPostRecovery, setAnesPostRecovery] = useState<any[]>([])
  const [anesAdverse, setAnesAdverse] = useState<any[]>([])

  const [preop, setPreop] = useState<any[]>([])
  const [operation, setOperation] = useState<any[]>([])
  const [postop, setPostop] = useState<any[]>([])
  const [consultant, setConsultant] = useState<any[]>([])

  const [vitals, setVitals] = useState<any[]>([])
  const [progress, setProgress] = useState<any[]>([])
  const [medOrders, setMedOrders] = useState<any[]>([])

  useEffect(()=>{ if(encounterId){ loadAll() } }, [encounterId])

  async function loadAll(){
    try{
      const promises: Promise<any>[] = [
        hospitalApi.getIPDAdmissionById(encounterId),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-pre', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-intra', limit: 200 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-recovery', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-post-recovery', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-adverse', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'preop', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'operation', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'postop', limit: 500 }),
        hospitalApi.listIpdClinicalNotes(encounterId, { type: 'consultant', limit: 500 }),
        hospitalApi.listIpdVitals(encounterId, { limit: 500 }),
        hospitalApi.listIpdDoctorVisits(encounterId, { limit: 500 }),
        hospitalApi.listIpdMedOrders(encounterId, { limit: 500 }),
      ]
      const [encRes, pre, intra, rec, postRec, adv, preopRes, opRes, postopRes, consRes, vitalsRes, visitsRes, medsRes] = await Promise.all(promises)
      setEncounter(encRes?.encounter || null)
      setAnesPre(pre?.notes || [])
      setAnesIntra(intra?.notes || [])
      setAnesRecovery(rec?.notes || [])
      setAnesPostRecovery(postRec?.notes || [])
      setAnesAdverse(adv?.notes || [])
      setPreop(preopRes?.notes || [])
      setOperation(opRes?.notes || [])
      setPostop(postopRes?.notes || [])
      setConsultant(consRes?.notes || [])
      setVitals(vitalsRes?.vitals || [])
      // Filter daily progress from doctor visits (has any SOAP field)
      const visits = (visitsRes?.visits || []).map((v: any)=>({
        _id: String(v._id), when: String(v.when || v.createdAt || new Date().toISOString()),
        doctorName: v?.doctorId?.name, subjective: v.subjective, objective: v.objective, assessment: v.assessment, plan: v.plan,
      }))
      const prog = visits.filter((r: any)=>{
        const s = (r.subjective||'').trim(); const o = (r.objective||'').trim(); const a = (r.assessment||'').trim(); const p = (r.plan||'').trim();
        return !!(s || o || a || p)
      }).sort((a: any,b: any)=> new Date(b.when).getTime() - new Date(a.when).getTime())
      setProgress(prog)
      setMedOrders(medsRes?.orders || [])
    }catch{}
  }

  const patient = useMemo(()=> (encounter as any)?.patientId || {}, [encounter])
  const doctorName = useMemo(()=> (encounter as any)?.doctorId?.name || '', [encounter])

  const printNow = () => {
    try{
      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewCurrent === 'function') { api.printPreviewCurrent({}); return }
    }catch{}
    try { window.print() } catch {}
  }

  return (
    <div className="space-y-4">
      <style>{`@media print { .no-print{display:none!important} .page{page-break-after:always} }`}</style>
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">IPD Encounter Report</div>
        <div className="no-print flex gap-2">
          <button className="btn" onClick={printNow}>Print</button>
          <button className="btn-outline-navy" onClick={()=>navigate(-1)}>Back</button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-lg font-semibold">Patient Information</div>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div><span className="font-medium">Name:</span> <span className="capitalize">{patient?.fullName || '-'}</span></div>
          <div><span className="font-medium">MRN:</span> <span>{patient?.mrn || '-'}</span></div>
          <div><span className="font-medium">Gender:</span> <span>{patient?.gender || '-'}</span></div>
          <div><span className="font-medium">Age:</span> <span>{patient?.age || '-'}</span></div>
          <div><span className="font-medium">Bed:</span> <span>{(encounter as any)?.bedLabel || (encounter as any)?.bedId || '-'}</span></div>
          <div><span className="font-medium">Doctor:</span> <span>{doctorName || '-'}</span></div>
          <div><span className="font-medium">Admitted:</span> <span>{(encounter as any)?.startAt ? new Date(String((encounter as any)?.startAt)).toLocaleString() : '-'}</span></div>
          <div><span className="font-medium">Status:</span> <span className="capitalize">{(encounter as any)?.status || '-'}</span></div>
        </div>
      </section>

      <AnesthesiaSection pre={anesPre} intra={anesIntra} rec={anesRecovery} postRec={anesPostRecovery} adv={anesAdverse} />

      <SurgerySection preop={preop} operation={operation} postop={postop} consultant={consultant} />

      <DailyMonitoringSection vitals={vitals} />

      <DailyProgressSection rows={progress} />

      <MedicationSection orders={medOrders} />
    </div>
  )
}

function SectionTitle({ children }: { children: any }){ return (<div className="mb-2 text-lg font-semibold text-slate-900">{children}</div>) }

function AnesthesiaSection({ pre, intra, rec, postRec, adv }: { pre: any[]; intra: any[]; rec: any[]; postRec: any[]; adv: any[] }){
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <SectionTitle>ANESTHESIA</SectionTitle>
      <SubTitle>Pre-Assessment</SubTitle>
      {pre.length === 0 ? <Empty /> : (
        <ul className="mb-4 space-y-3 text-sm">{pre.map((n: any)=>(
          <li key={n._id} className="rounded-md border border-slate-200 p-3">
            <HeaderLine when={n.recordedAt||n.createdAt} doctor={n.doctorName} sign={n.sign} />
            <div className="mt-2 grid gap-3 grid-cols-1">
              <div>
                <div className="pb-1 text-base font-semibold text-slate-900">Existing / Present Problem</div>
                <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">CVS</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Renal</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Respiration</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Hepatic</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Diabetic</th>
                      <th className="px-3 py-1.5 text-left font-semibold">GIT</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Neurology</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Anesthesia Hx</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Eventful</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="text-slate-700">
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).existingProblems?.cvs || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).existingProblems?.renal || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).existingProblems?.respiration || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).existingProblems?.hepatic || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).existingProblems?.diabetic || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).existingProblems?.git || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).existingProblems?.neurology || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).existingProblems?.anesthesiaHistory || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).existingProblems?.eventful || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <div className="pb-1 text-base font-semibold text-slate-900">Physical Examination</div>
                <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">BP</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Pulse</th>
                      <th className="px-3 py-1.5 text-left font-semibold">RR</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Temp</th>
                      <th className="px-3 py-1.5 text-left font-semibold">CVS</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Chest</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Teeth</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Mallampati</th>
                      <th className="px-3 py-1.5 text-left font-semibold">ASA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="text-slate-700">
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).physicalExam?.bp || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).physicalExam?.pulse || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).physicalExam?.rr || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).physicalExam?.temp || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).physicalExam?.cvs || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).physicalExam?.chest || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).physicalExam?.teeth || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).physicalExam?.mallampatiClass || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).physicalExam?.asaClass || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <div className="pb-1 text-base font-semibold text-slate-900">Anesthesia Plan</div>
                <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">General</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Spinal</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Local</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Monitoring Care</th>
                      <th className="px-3 py-1.5 text-left font-semibold">NPO</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Fluid/Blood</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Pre‑Anes Med</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="text-slate-700">
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).plan?.general || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).plan?.spinal || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).plan?.local || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).plan?.monitoringCare || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).plan?.npo || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).plan?.fluidsBlood || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).plan?.preAnesthesiaMedication || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <div className="pb-1 text-base font-semibold text-slate-900">Checklist</div>
                <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">Patient Identified</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Consent & Chart Revised</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Site/Procedure Checked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="text-slate-700">
                      <td className="px-3 py-1.5 break-words">{((n.data||{}).checklist?.patientIdentified ? 'Yes' : 'No')}</td>
                      <td className="px-3 py-1.5 break-words">{((n.data||{}).checklist?.consentRevised ? 'Yes' : 'No')}</td>
                      <td className="px-3 py-1.5 break-words">{((n.data||{}).checklist?.siteChecked ? 'Yes' : 'No')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <div className="pb-1 text-base font-semibold text-slate-900">Pre-Induction Re-evaluation</div>
                <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">Orientation</th>
                      <th className="px-3 py-1.5 text-left font-semibold">BP</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Pulse</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Temp</th>
                      <th className="px-3 py-1.5 text-left font-semibold">SpO2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="text-slate-700">
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).preInduction?.orientation || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).preInduction?.bp || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).preInduction?.pulse || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).preInduction?.temp || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).preInduction?.spo2 || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <div className="pb-1 text-base font-semibold text-slate-900">Change in Anesthesia Plan (Yes/No)</div>
                <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">Changed</th>
                      <th className="px-3 py-1.5 text-left font-semibold">General</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Spinal</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Local</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="text-slate-700">
                      <td className="px-3 py-1.5 break-words">{((n.data||{}).planChange?.changed ? 'Yes' : 'No')}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).planChange?.general || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).planChange?.spinal || '-'}</td>
                      <td className="px-3 py-1.5 break-words">{(n.data||{}).planChange?.local || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </li>))}
        </ul>
      )}

      <SubTitle>Intra</SubTitle>
      {intra.length === 0 ? <Empty /> : (
        <div className="mb-4 space-y-4">{intra.map((sess: any)=>(
          <div key={sess._id} className="overflow-x-auto rounded-md border border-slate-200">
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div>{new Date(String(sess.recordedAt||sess.createdAt)).toLocaleString()}</div>
              <div>{sess.doctorName ? `Dr: ${sess.doctorName}` : ''} {sess.sign ? ` Sign: ${sess.sign}` : ''}</div>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Pulse</th>
                  <th className="px-3 py-2">BP</th>
                  <th className="px-3 py-2">RR</th>
                  <th className="px-3 py-2">SpO2</th>
                  <th className="px-3 py-2">Drugs</th>
                  <th className="px-3 py-2">IV Fluid / Blood</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(((sess.data||{}).rows||[]) as any[]).map((r: any, idx: number)=> (
                  <tr key={idx}>
                    <td className="px-3 py-2">{r.time || '-'}</td>
                    <td className="px-3 py-2">{r.pulse || '-'}</td>
                    <td className="px-3 py-2">{r.bp || '-'}</td>
                    <td className="px-3 py-2">{r.rr || '-'}</td>
                    <td className="px-3 py-2">{r.spo2 || '-'}</td>
                    <td className="px-3 py-2">{r.drugs || '-'}</td>
                    <td className="px-3 py-2">{r.ivFluidsBlood || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid gap-2 border-t border-slate-200 p-3 text-sm sm:grid-cols-4">
              <div>Total Intake Fluid/Blood: <span className="font-medium">{(sess.data||{}).totals?.intakeFluidsBlood || '-'}</span></div>
              <div>Blood Loss: <span className="font-medium">{(sess.data||{}).totals?.bloodLoss || '-'}</span></div>
              <div>Urine Output: <span className="font-medium">{(sess.data||{}).totals?.urineOutput || '-'}</span></div>
              <div>Others: <span className="font-medium">{(sess.data||{}).totals?.others || '-'}</span></div>
            </div>
          </div>
        ))}</div>
      )}

      <SubTitle>Recovery</SubTitle>
      {rec.length === 0 ? <Empty /> : (
        <table className="mb-4 min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Date/Time</th>
              <th className="px-3 py-2">LOC</th>
              <th className="px-3 py-2">BP</th>
              <th className="px-3 py-2">Pulse</th>
              <th className="px-3 py-2">RR</th>
              <th className="px-3 py-2">SpO2</th>
              <th className="px-3 py-2">Pain Stimulus</th>
              <th className="px-3 py-2">Doctor/Sign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">{rec.map((r: any)=> (
            <tr key={r._id}>
              <td className="px-3 py-2 text-xs text-slate-600">{new Date(String(r.recordedAt||r.createdAt)).toLocaleString()}</td>
              <td className="px-3 py-2">{(r.data||{}).loc || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).bp || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).pulse || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).rr || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).spo2 || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).painStimulus || '-'}</td>
              <td className="px-3 py-2 text-xs text-slate-600">{r.doctorName || ''}{r.sign ? ` / ${r.sign}` : ''}</td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <SubTitle>Post Recovery</SubTitle>
      {postRec.length === 0 ? <Empty /> : (
        <table className="mb-4 min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Date/Time</th>
              <th className="px-3 py-2">BP</th>
              <th className="px-3 py-2">Pulse</th>
              <th className="px-3 py-2">RR</th>
              <th className="px-3 py-2">SpO2</th>
              <th className="px-3 py-2">Pain</th>
              <th className="px-3 py-2">Temp</th>
              <th className="px-3 py-2">Aldrete</th>
              <th className="px-3 py-2">Vomiting</th>
              <th className="px-3 py-2">Shivering</th>
              <th className="px-3 py-2">Site Bleeding/Hematoma</th>
              <th className="px-3 py-2">Doctor/Sign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">{postRec.map((r: any)=> (
            <tr key={r._id}>
              <td className="px-3 py-2 text-xs text-slate-600">{new Date(String(r.recordedAt||r.createdAt)).toLocaleString()}</td>
              <td className="px-3 py-2">{(r.data||{}).bp || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).pulse || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).rr || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).spo2 || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).pain || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).temp || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).aldreteScore || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).vomiting || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).shivering || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).siteBleedingHematoma || '-'}</td>
              <td className="px-3 py-2 text-xs text-slate-600">{r.doctorName || ''}{r.sign ? ` / ${r.sign}` : ''}</td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <SubTitle>Adverse Events</SubTitle>
      {adv.length === 0 ? <Empty /> : (
        <ul className="space-y-2 text-sm">{adv.map((n: any)=> (
          <li key={n._id} className="rounded-md border border-slate-200 p-3">
            <HeaderLine when={n.recordedAt||n.createdAt} doctor={n.doctorName} sign={n.sign} />
            <div>Occurred: {((n.data||{}).occurred ? 'Yes' : 'No')}</div>
            <div>Details: {(n.data||{}).details || '-'}</div>
          </li>
        ))}</ul>
      )}
    </section>
  )
}

function SurgerySection({ preop, operation, postop, consultant }: { preop: any[]; operation: any[]; postop: any[]; consultant: any[] }){
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <SectionTitle>SURGERY</SectionTitle>

      <SubTitle>Pre-Operative</SubTitle>
      {preop.length === 0 ? <Empty /> : (
        <table className="mb-4 min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Date/Time</th>
              <th className="px-3 py-2">NPO From</th>
              <th className="px-3 py-2">Maintain I/V</th>
              <th className="px-3 py-2">Shave & Prepare</th>
              <th className="px-3 py-2">Special Consent</th>
              <th className="px-3 py-2">Medication</th>
              <th className="px-3 py-2">Special Instructions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">{preop.map((r: any)=> (
            <tr key={r._id}>
              <td className="px-3 py-2 text-xs text-slate-600">{new Date(String(r.recordedAt||r.createdAt)).toLocaleString()}</td>
              <td className="px-3 py-2">{(r.data||{}).npoFrom || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).maintainIV || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).shavePrepare || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).specialConsent || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).medication || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).specialInstructions || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <SubTitle>Operation Notes</SubTitle>
      {operation.length === 0 ? <Empty /> : (
        <table className="mb-4 min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Date/Time</th>
              <th className="px-3 py-2">Incision</th>
              <th className="px-3 py-2">Procedure</th>
              <th className="px-3 py-2">Findings</th>
              <th className="px-3 py-2">Drain</th>
              <th className="px-3 py-2">Specimen</th>
              <th className="px-3 py-2">Histopathology</th>
              <th className="px-3 py-2">Condition at End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">{operation.map((r: any)=> (
            <tr key={r._id}>
              <td className="px-3 py-2 text-xs text-slate-600">{new Date(String(r.recordedAt||r.createdAt)).toLocaleString()}</td>
              <td className="px-3 py-2">{(r.data||{}).incision || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).procedure || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).findings || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).drain || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).specimenRemoved || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).histopathology || '-'}</td>
              <td className="px-3 py-2">{(r.data||{}).conditionAtEnd || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <SubTitle>Post-Operative</SubTitle>
      {postop.length === 0 ? <Empty /> : (
        <ul className="mb-4 space-y-2 text-sm">{postop.map((r: any)=> (
          <li key={r._id} className="rounded-md border border-slate-200 p-3">
            <HeaderLine when={r.recordedAt||r.createdAt} doctor={r.doctorName} sign={r.sign} />
            <div className="whitespace-pre-wrap">{(r.data||{}).text || '-'}</div>
          </li>
        ))}</ul>
      )}

      <SubTitle>Consultation Notes</SubTitle>
      {consultant.length === 0 ? <Empty /> : (
        <ul className="space-y-2 text-sm">{consultant.map((r: any)=> (
          <li key={r._id} className="rounded-md border border-slate-200 p-3">
            <HeaderLine when={r.recordedAt||r.createdAt} doctor={r.doctorName} sign={r.sign} />
            <div className="whitespace-pre-wrap">{(r.data||{}).text || '-'}</div>
          </li>
        ))}</ul>
      )}
    </section>
  )
}

function DailyMonitoringSection({ vitals }: { vitals: any[] }){
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <SectionTitle>DAILY MONITORING</SectionTitle>
      {vitals.length === 0 ? <Empty /> : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Date/Time</th>
              <th className="px-3 py-2">BP</th>
              <th className="px-3 py-2">HR</th>
              <th className="px-3 py-2">RR</th>
              <th className="px-3 py-2">Temp</th>
              <th className="px-3 py-2">SpO2</th>
              <th className="px-3 py-2">Shift</th>
              <th className="px-3 py-2">BSR</th>
              <th className="px-3 py-2">Intake I/V</th>
              <th className="px-3 py-2">Urine</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">{vitals.map((v: any)=> (
            <tr key={v._id}>
              <td className="px-3 py-2 text-xs text-slate-600">{new Date(String(v.recordedAt||v.createdAt)).toLocaleString()}</td>
              <td className="px-3 py-2">{v.bp || '-'}</td>
              <td className="px-3 py-2">{v.hr ?? '-'}</td>
              <td className="px-3 py-2">{v.rr ?? '-'}</td>
              <td className="px-3 py-2">{v.temp ?? '-'}</td>
              <td className="px-3 py-2">{v.spo2 ?? '-'}</td>
              <td className="px-3 py-2 capitalize">{v.shift || '-'}</td>
              <td className="px-3 py-2">{v.bsr ?? '-'}</td>
              <td className="px-3 py-2">{v.intakeIV || '-'}</td>
              <td className="px-3 py-2">{v.urine || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </section>
  )
}

function DailyProgressSection({ rows }: { rows: any[] }){
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <SectionTitle>DAILY PROGRESS</SectionTitle>
      {rows.length === 0 ? <Empty /> : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Subjective</th>
              <th className="px-3 py-2">Objective</th>
              <th className="px-3 py-2">Assessment</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Doctor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">{rows.map((r: any)=>{
            const d = new Date(r.when); const date = d.toISOString().slice(0,10); const time = d.toTimeString().slice(0,5)
            return (
              <tr key={r._id}>
                <td className="px-3 py-2 text-xs text-slate-600">{date}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{time}</td>
                <td className="px-3 py-2 whitespace-pre-wrap">{r.subjective || '-'}</td>
                <td className="px-3 py-2 whitespace-pre-wrap">{r.objective || '-'}</td>
                <td className="px-3 py-2 whitespace-pre-wrap">{r.assessment || '-'}</td>
                <td className="px-3 py-2 whitespace-pre-wrap">{r.plan || '-'}</td>
                <td className="px-3 py-2">{r.doctorName || '-'}</td>
              </tr>
            )
          })}</tbody>
        </table>
      )}
    </section>
  )
}

function MedicationSection({ orders }: { orders: any[] }){
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <SectionTitle>MEDICATION</SectionTitle>
      {orders.length === 0 ? <Empty /> : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Date/Time</th>
              <th className="px-3 py-2">Drug</th>
              <th className="px-3 py-2">Dose</th>
              <th className="px-3 py-2">Route</th>
              <th className="px-3 py-2">Frequency</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Prescribed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">{orders.map((o: any)=> (
            <tr key={o._id}>
              <td className="px-3 py-2 text-xs text-slate-600">{new Date(String(o.createdAt||o.startAt)).toLocaleString()}</td>
              <td className="px-3 py-2">{o.drugName || '-'}</td>
              <td className="px-3 py-2">{o.dose || '-'}</td>
              <td className="px-3 py-2">{o.route || '-'}</td>
              <td className="px-3 py-2">{o.frequency || '-'}</td>
              <td className="px-3 py-2">{o.duration || '-'}</td>
              <td className="px-3 py-2 capitalize">{o.status || '-'}</td>
              <td className="px-3 py-2">{o.prescribedBy || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </section>
  )
}

function SubTitle({ children }: { children: any }){ return (<div className="mt-2 text-base font-semibold text-slate-800">{children}</div>) }
function HeaderLine({ when, doctor, sign }: { when?: string; doctor?: string; sign?: string }){
  return (
    <div className="flex items-center justify-between text-xs text-slate-600">
      <div>{when ? new Date(String(when)).toLocaleString() : '-'}</div>
      <div>{doctor ? `Dr: ${doctor}` : ''} {sign ? ` Sign: ${sign}` : ''}</div>
    </div>
  )
}
function Empty(){ return (<div className="text-slate-500">No records.</div>) }
