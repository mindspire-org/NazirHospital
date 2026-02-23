import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import DailyMonitoring from '../../components/hospital/Hospital_IpdDailyMonitoring'
import DailyProgress from '../../components/hospital/Hospital_IpdDailyProgress'
import Medication from '../../components/hospital/Hospital_IpdMedication.tsx'
import LabTests from '../../components/hospital/Hospital_IpdLabTests'
import DiagnosticTests from '../../components/hospital/Hospital_IpdDiagnosticTests'
import DoctorVisits from '../../components/hospital/Hospital_IpdDoctorVisits'
import Billing from '../../components/hospital/Hospital_IpdBilling'
import ConsultantNotes from '../../components/hospital/Hospital_IpdConsultantNotes'
import Anesthesia from '../../components/hospital/Hospital_IpdAnesthesia'
import Surgery from '../../components/hospital/Hospital_IpdSurgery'

 

function formatDateTime(s: string) {
  const d = new Date(s)
  return `${d.toLocaleDateString()}, ${d.toLocaleTimeString()}`
}

export default function Hospital_PatientProfile() {
  const { id } = useParams()
  const encounterId = String(id || '')
  const navigate = useNavigate()
  const location = useLocation()
  const fromSearch = !!(location as any)?.state?.fromSearch
  const backSnapshot = (location as any)?.state?.searchSnapshot
  const [encounter, setEncounter] = useState<any | null>(null)

  const [tab, setTab] = useState<'vitals'|'progress'|'surgery'|'consult'|'anesthesia'|'meds'|'lab'|'diagnostic'|'visits'|'billing'>('vitals')

  // child components handle their own state

  // moved to Billing component

  const discharge = () => {
    navigate(`/hospital/discharge/${encounterId}`)
  }

  // Loaders
  useEffect(()=>{ if (encounterId){ loadEncounter() } }, [encounterId])

  async function loadEncounter(){
    try { const res = await hospitalApi.getIPDAdmissionById(encounterId) as any; setEncounter(res.encounter || null) } catch {}
  }
  // loaders moved into child components

  // Save handlers
  // actions now live in child components

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900 capitalize">{(encounter as any)?.patientId?.fullName || '-'}</div>
            <div className="mt-1 text-sm text-slate-600">Bed: {(encounter as any)?.bedLabel || (encounter as any)?.bedId || '-'}  Doctor: {(encounter as any)?.doctorId?.name || '-'}  Admitted: {(encounter as any)?.startAt ? formatDateTime(String((encounter as any)?.startAt)) : '-'}</div>
          </div>
          <div className="flex gap-2">
            {fromSearch && (
              <button onClick={()=>navigate('/hospital/search-patients', { state: { searchSnapshot: backSnapshot } })} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to Search</button>
            )}
            <button onClick={()=>navigate(`/hospital/patient/${encounterId}/print`)} className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">Print</button>
            <button onClick={discharge} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700">Discharge</button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1">
          <Tab label="Daily Monitoring" active={tab==='vitals'} onClick={()=>setTab('vitals')} />
          <Tab label="Daily Progress" active={tab==='progress'} onClick={()=>setTab('progress')} />
          <Tab label="Surgery" active={tab==='surgery'} onClick={()=>setTab('surgery')} />
          <Tab label="Consultant Notes" active={tab==='consult'} onClick={()=>setTab('consult')} />
          <Tab label="Anesthesia" active={tab==='anesthesia'} onClick={()=>setTab('anesthesia')} />
          <Tab label="Medication" active={tab==='meds'} onClick={()=>setTab('meds')} />
          <Tab label="Lab Tests" active={tab==='lab'} onClick={()=>setTab('lab')} />
          <Tab label="Diagnostic Tests" active={tab==='diagnostic'} onClick={()=>setTab('diagnostic')} />
          <Tab label="Doctor Visits" active={tab==='visits'} onClick={()=>setTab('visits')} />
          <Tab label="Billing" active={tab==='billing'} onClick={()=>setTab('billing')} />
        </div>
      </div>

      {/* Content */}
      {tab==='vitals' && (<DailyMonitoring encounterId={encounterId} />)}
      {tab==='progress' && (<DailyProgress encounterId={encounterId} />)}
      {tab==='surgery' && (<Surgery encounterId={encounterId} />)}
      {tab==='consult' && (<ConsultantNotes encounterId={encounterId} />)}
      {tab==='anesthesia' && (<Anesthesia encounterId={encounterId} />)}
      {tab==='meds' && (<Medication encounterId={encounterId} />)}
      {tab==='lab' && (<LabTests encounterId={encounterId} />)}
      {tab==='diagnostic' && (<DiagnosticTests encounterId={encounterId} />)}
      {tab==='visits' && (<DoctorVisits encounterId={encounterId} />)}
      {tab==='billing' && (<Billing encounterId={encounterId} />)}

      {/* Modals moved to child components */}
    </div>
  )
}

function Tab({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>
  )
}

// Dialogs removed; handled inside child components
