import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { hospitalApi, labApi, diagnosticApi, aestheticApi, api as coreApi } from '../../utils/api'
import { getSavedPrescriptionPdfTemplate, previewPrescriptionPdf } from '../../utils/prescriptionPdf'
import { printUltrasoundReport } from '../../components/diagnostic/diagnostic_UltrasoundGeneric'
import { printCTScanReport } from '../../components/diagnostic/diagnostic_CTScan'
import { printEchocardiographyReport } from '../../components/diagnostic/diagnostic_Echocardiography'
import { printColonoscopyReport } from '../../components/diagnostic/diagnostic_Colonoscopy'
import { printUpperGIEndoscopyReport } from '../../components/diagnostic/diagnostic_UpperGIEndoscopy'
import { previewLabReportPdf } from '../../utils/printLabReport'

export default function Hospital_SearchPatients() {
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    mrNo: '',
    name: '',
    fatherName: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [details, setDetails] = useState<Record<string, { pres?: any[]; lab?: any[]; diag?: any[]; ipd?: any[]; aesthetic?: any[]; loading?: boolean }>>({})
  const [busy, setBusy] = useState<{ pres?: string; lab?: string; diag?: string }>({})

  const update = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setPatients([])
    setExpanded({})
    setDetails({})
    try {
      const res: any = await hospitalApi.searchPatients({ mrn: form.mrNo || undefined, name: form.name || undefined, fatherName: form.fatherName || undefined, phone: form.phone || undefined, limit: 10 })
      const rows: any[] = Array.isArray(res?.patients) ? res.patients : []
      setPatients(rows)
    } catch {
      setPatients([])
    } finally {
      setLoading(false)
    }

  }

  // If we were navigated back with a snapshot in location.state, restore from it and clear the transient state
  useEffect(()=>{
    try{
      const st: any = (location as any)?.state
      if (st?.searchSnapshot){
        const snap = st.searchSnapshot
        if (snap?.form) setForm(snap.form)
        if (Array.isArray(snap?.patients)) setPatients(snap.patients)
        if (snap?.expanded) setExpanded(snap.expanded)
        if (snap?.details) setDetails(snap.details)
        try{ sessionStorage.setItem('hospital.searchPatients.v1', JSON.stringify(snap)) } catch {}
        navigate('.', { replace: true, state: null })
      }
    } catch {}
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  

  // Persist and restore search state so going back from IPD Profile keeps results
  useEffect(()=>{
    try{
      const raw = sessionStorage.getItem('hospital.searchPatients.v1')
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved?.form) setForm(saved.form)
      if (Array.isArray(saved?.patients)) setPatients(saved.patients)
      if (saved?.expanded) setExpanded(saved.expanded)
      if (saved?.details) setDetails(saved.details)
    } catch {}
  }, [])
  useEffect(()=>{
    try{
      // Sanitize patients so JSON.stringify never fails on circular/complex objects
      const patientsLite = Array.isArray(patients)
        ? patients.map((p:any) => ({
            _id: p?._id || p?.id,
            id: p?.id,
            fullName: p?.fullName,
            mrn: p?.mrn,
            fatherName: p?.fatherName,
            phoneNormalized: p?.phoneNormalized,
          }))
        : []
      const payload = { form, patients: patientsLite, expanded, details }
      sessionStorage.setItem('hospital.searchPatients.v1', JSON.stringify(payload))
    } catch {}
  }, [form, patients, expanded, details])
  
  async function onPrescriptionPdf(presId: string, mrn: string){
    try {
      setBusy(prev => ({ ...prev, pres: presId }))
      const [detail, settings, labPat] = await Promise.all([
        hospitalApi.getPrescription(presId) as any,
        hospitalApi.getSettings() as any,
        labApi.getPatientByMrn(mrn) as any,
      ])
      const pres = detail?.prescription
      const p = labPat?.patient
      const doctor = { name: pres?.encounterId?.doctorId?.name || '-' }
      const patient = { name: p?.fullName || '-', mrn: p?.mrn || mrn, gender: p?.gender || '-', fatherName: p?.fatherName || '-', phone: p?.phoneNormalized || '-', address: p?.address || '-' }
      let tpl = 'default' as any
      try {
        const raw = localStorage.getItem('doctor.session')
        const sess = raw ? JSON.parse(raw) : null
        tpl = getSavedPrescriptionPdfTemplate(sess?.id)
      } catch {}
      await previewPrescriptionPdf({
        doctor,
        settings,
        patient,
        items: pres?.items || [],
        primaryComplaint: pres?.primaryComplaint || pres?.complaints,
        primaryComplaintHistory: pres?.primaryComplaintHistory,
        familyHistory: pres?.familyHistory,
        treatmentHistory: pres?.treatmentHistory,
        history: pres?.history,
        examFindings: pres?.examFindings,
        diagnosis: pres?.diagnosis,
        advice: pres?.advice,
        labTests: pres?.labTests || [],
        labNotes: pres?.labNotes || '',
        createdAt: pres?.createdAt,
      }, tpl)
    } catch (e) {
      alert('Failed to generate prescription PDF')
    } finally {
      setBusy(prev => ({ ...prev, pres: undefined }))
    }
  }

  function resolveDiagKey(name: string){
    const n = (name||'').toLowerCase()
    if (n.includes('ultrasound')) return 'Ultrasound'
    if (n.replace(/\s+/g,'') === 'ctscan') return 'CTScan'
    if (n.includes('echocardio')) return 'Echocardiography'
    if (n.includes('colonoscopy')) return 'Colonoscopy'
    if (n.includes('uppergi')) return 'UpperGiEndoscopy'
    return name
  }

  async function onDiagnosticPrint(orderId: string, mrn: string){
    try{
      setBusy(prev => ({ ...prev, diag: orderId }))
      const [ordersRes, resultsRes] = await Promise.all([
        diagnosticApi.listOrders({ q: mrn, limit: 500 }) as any,
        diagnosticApi.listResults({ orderId, status: 'final', limit: 1 }) as any,
      ])
      const ord: any = (ordersRes?.items || []).find((x: any) => String(x._id || x.id) === String(orderId))
      if (!ord) throw new Error('Order not found')
      const res = Array.isArray(resultsRes?.items) && resultsRes.items.length ? resultsRes.items[0] : null
      if (!res) throw new Error('No finalized report')
      const testName = String(res.testName || '')
      const key = resolveDiagKey(testName)
      const payload = { tokenNo: ord.tokenNo, createdAt: ord.createdAt, reportedAt: res.reportedAt || new Date().toISOString(), patient: ord.patient||{}, value: typeof res.formData==='string'? res.formData : JSON.stringify(res.formData||''), referringConsultant: ord.referringConsultant }
      if (key === 'Echocardiography'){ await printEchocardiographyReport(payload as any); return }
      if (key === 'Ultrasound'){ await printUltrasoundReport(payload as any); return }
      if (key === 'CTScan'){ await printCTScanReport(payload as any); return }
      if (key === 'Colonoscopy'){ await printColonoscopyReport(payload as any); return }
      if (key === 'UpperGiEndoscopy'){ await printUpperGIEndoscopyReport(payload as any); return }
      alert('Unknown diagnostic template for this test')
    } catch(e: any){
      alert(e?.message || 'Failed to open diagnostic report')
    } finally {
      setBusy(prev => ({ ...prev, diag: undefined }))
    }
  }

  async function onLabPdf(orderId: string, mrn: string){
    try {
      setBusy(prev => ({ ...prev, lab: orderId }))
      // Find the order to get patient/times
      const list: any = await labApi.listOrders({ q: mrn, limit: 500 })
      const ord: any = (list?.items || []).find((x: any) => String(x._id || x.id) === String(orderId))
      if (!ord) throw new Error('Order not found')
      const res: any = await labApi.listResults({ orderId, limit: 1 })
      const rec = Array.isArray(res?.items) && res.items.length ? res.items[0] : null
      if (!rec) throw new Error('No report available')
      previewLabReportPdf({
        tokenNo: ord.tokenNo,
        createdAt: ord.createdAt,
        sampleTime: ord.sampleTime,
        reportingTime: ord.reportingTime,
        patient: { fullName: ord.patient?.fullName, phone: ord.patient?.phone, mrn: ord.patient?.mrn, age: ord.patient?.age, gender: ord.patient?.gender, address: ord.patient?.address },
        rows: rec.rows || [],
        interpretation: rec.interpretation || '',
        referringConsultant: ord.referringConsultant,
      })
    } catch (e: any) {
      alert(e?.message || 'Failed to open lab report PDF')
    } finally {
      setBusy(prev => ({ ...prev, lab: undefined }))
    }
  }
  const onClear = () => {
    setForm({ mrNo: '', name: '', fatherName: '', phone: '' })
    setPatients([])
    setExpanded({})
    setDetails({})
    try{ sessionStorage.removeItem('hospital.searchPatients.v1') } catch {}
  }

  async function loadDetails(mrn: string, patientId?: string){
    setDetails(prev => ({ ...prev, [mrn]: { ...(prev[mrn]||{}), loading: true } }))
    try {
      const [presRes, ordersRes, diagOrdersRes, ipdRes, aestRes] = await Promise.all([
        hospitalApi.listPrescriptions({ patientMrn: mrn, page: 1, limit: 50 }) as any,
        labApi.listOrders({ q: mrn, limit: 50 }) as any,
        diagnosticApi.listOrders({ q: mrn, limit: 50 }) as any,
        hospitalApi.listIPDAdmissions(patientId ? { patientId, page: 1, limit: 50 } : { q: mrn, page: 1, limit: 50 }) as any,
        aestheticApi.listProcedureSessions({ patientMrn: mrn, page: 1, limit: 100 }) as any,
      ])
      const pres: any[] = (presRes?.prescriptions || []).map((p: any) => ({ id: p._id || p.id, createdAt: p.createdAt, diagnosis: p.diagnosis, doctor: p.encounterId?.doctorId?.name || '-', items: p.items || [] }))
      const orders: any[] = (ordersRes?.items || [])
      const lab: any[] = []
      for (const o of orders){
        let hasResult = false
        try {
          const r = await labApi.listResults({ orderId: String(o._id || o.id), limit: 1 }) as any
          hasResult = Array.isArray(r?.items) && r.items.length > 0
        } catch {}
        lab.push({ id: String(o._id || o.id), tokenNo: o.tokenNo, createdAt: o.createdAt, status: o.status, tests: o.tests || [], hasResult })
      }
      const dorders: any[] = (diagOrdersRes?.items || [])
      const diag: any[] = []
      for (const o of dorders){
        let hasResult = false
        try {
          const r = await diagnosticApi.listResults({ orderId: String(o._id || o.id), status: 'final', limit: 1 }) as any
          hasResult = Array.isArray(r?.items) && r.items.length > 0
        } catch {}
        diag.push({ id: String(o._id || o.id), tokenNo: o.tokenNo, createdAt: o.createdAt, status: o.status, tests: o.tests || [], hasResult })
      }
      const ipd: any[] = Array.isArray(ipdRes?.admissions) ? await Promise.all((ipdRes.admissions as any[]).map(async (a: any)=> {
        const encId = String(a._id||a.id)
        try{
          const [ds, rd, dc, bc, ss] = await Promise.all([
            hospitalApi.getIpdDischargeSummary(encId).catch(()=>null) as any,
            hospitalApi.getIpdReceivedDeath(encId).catch(()=>null) as any,
            hospitalApi.getIpdDeathCertificate(encId).catch(()=>null) as any,
            hospitalApi.getIpdBirthCertificate(encId).catch(()=>null) as any,
            hospitalApi.getIpdShortStay(encId).catch(()=>null) as any,
          ])
          return {
            id: encId,
            admissionNo: a.admissionNo,
            startAt: a.startAt,
            endAt: a.endAt,
            status: a.status,
            forms: {
              dischargeSummary: !!(ds && (ds.summary || ds._id)),
              receivedDeath: !!(rd && (rd.receivedDeath || rd._id)),
              deathCertificate: !!(dc && (dc.certificate || dc._id)),
              birthCertificate: !!(bc && (bc.birthCertificate || bc._id)),
              shortStay: !!(ss && (ss.shortStay || ss._id)),
            }
          }
        } catch {
          return { id: encId, admissionNo: a.admissionNo, startAt: a.startAt, endAt: a.endAt, status: a.status, forms: {} }
        }
      })) : []

      const aestheticItemsRaw: any[] = Array.isArray(aestRes?.items) ? aestRes.items : []
      const aestheticItems = [...aestheticItemsRaw]
        .filter(x => String(x?.patientMrn || '') === String(mrn))
        .sort((a,b)=> new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime())

      setDetails(prev => ({ ...prev, [mrn]: { pres, lab, diag, ipd, aesthetic: aestheticItems, loading: false } }))
    } catch {
      setDetails(prev => ({ ...prev, [mrn]: { pres: [], lab: [], diag: [], ipd: [], aesthetic: [], loading: false } }))
    }
  }

  async function previewHtml(path: string){
    try{
      const html = await coreApi(path) as any
      const w = window.open('', '_blank'); if (!w) return
      w.document.open(); w.document.write(String(html)); w.document.close(); w.focus()
    } catch {
      // Fallback to absolute URL
      const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:'
      const isElectronUA = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '')
      const apiBase = (import.meta as any).env?.VITE_API_URL || ((isFile || isElectronUA) ? 'http://127.0.0.1:4000/api' : 'http://localhost:4000/api')
      const url = `${apiBase}${path}`
      window.open(url, '_blank')
    }
  }

  const onPreviewDischarge = (encounterId: string)=> previewHtml(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/discharge-summary/print`)
  const onPreviewReceivedDeath = (encounterId: string)=> previewHtml(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death/print`)
  const onPreviewDeathCertificate = (encounterId: string)=> previewHtml(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate/print`)
  const onPreviewBirthCertificate = (encounterId: string)=> previewHtml(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/birth-certificate/print`)
  const onPreviewFinalInvoice = (encounterId: string)=> previewHtml(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/final-invoice/print`)
  async function onPreviewShortStay(encounterId: string){
    try{
      const [encRes, ssRes, settings] = await Promise.all([
        hospitalApi.getIPDAdmissionById(encounterId) as any,
        hospitalApi.getIpdShortStay(encounterId) as any,
        hospitalApi.getSettings() as any,
      ])
      const enc = encRes?.encounter || {}
      const p = enc?.patientId || {}
      const data = ssRes?.shortStay?.data || {}
      const s = settings || {}
      const esc = (x:any)=> String(x==null?'':x).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c])
      const fmt = (d?:string,t?:string)=>{ try{ const dt = (d||'') + (t? ('T'+t):''); const x = new Date(dt||enc.startAt); if(!x||isNaN(x.getTime())) return ''; return x.toLocaleDateString()+', '+x.toLocaleTimeString() }catch{return ''} }
      const logo = s?.logoDataUrl ? `<img src="${esc(s.logoDataUrl)}" style="height:60px;object-fit:contain"/>` : ''
      const html = `<!doctype html><html><head><meta charset=\"utf-8\"/><style>@page{size:A4;margin:12mm}body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;color:#111}.wrap{padding:0 4mm}.hdr{display:grid;grid-template-columns:96px 1fr 96px;align-items:center}.title{font-size:22px;font-weight:800;text-align:center}.muted{color:#475569;font-size:12px;text-align:center}.hr{border-bottom:2px solid #0f172a;margin:6px 0}.box{border:1px solid #e2e8f0;border-radius:10px;padding:6px;margin:8px 0}.kv{display:grid;grid-template-columns: 130px minmax(0,1fr) 130px minmax(0,1fr) 130px minmax(0,1fr);gap:4px 10px;font-size:12px;align-items:start}.kv>div:nth-child(2n){word-break:break-word}.sec{margin-top:6px}.sec .lbl{font-weight:700;margin-bottom:2px}</style></head><body><div class=wrap>
      <div class=hdr><div>${logo}</div><div><div class=title>${esc(s.name||'Hospital')}</div><div class=muted>${esc(s.address||'-')}</div><div class=muted>Ph: ${esc(s.phone||'')} ${s.email? ' • '+esc(s.email):''}</div></div><div></div></div>
      <div class=hr></div>
      <div class=box><div class=kv>
        <div>Medical Record No :</div><div>${esc(p.mrn||'-')}</div>
        <div>Admission No :</div><div>${esc(enc.admissionNo||'-')}</div>
        <div>Patient Name :</div><div>${esc(p.fullName||'-')}</div>
        <div>Age / Gender :</div><div>${esc(p.age||'')} / ${esc(p.gender||'')}</div>
        <div>Reg. & Sample Time :</div><div>${fmt(p.admitted||data.dateIn,data.timeIn)}</div>
        <div>Discharge Time :</div><div>${fmt(data.dateOut,data.timeOut)}</div>
        <div>Address :</div><div>${esc(p.address||'-')}</div>
      </div></div>
      <div class=sec><div class=lbl>Final Diagnosis</div><div>${esc(data.finalDiagnosis||'')}</div></div>
      <div class=sec><div class=lbl>Presenting Complaints</div><div>${esc(data.presentingComplaints||'')}</div></div>
      <div class=sec><div class=lbl>Brief History</div><div>${esc(data.briefHistory||'')}</div></div>
      <div class=sec><div class=lbl>Treatment Given at Hospital</div><div>${esc(data.treatmentGiven||'')}</div></div>
      <div class=sec><div class=lbl>Treatment at Discharge</div><div>${esc(data.treatmentAtDischarge||'')}</div></div>
      <div class=sec><div class=lbl>Follow up Instructions</div><div>${esc(data.followUpInstructions||'')}</div></div>
      <script>window.print && setTimeout(()=>window.print(),200)</script>
      </div></body></html>`
      const w = window.open('', '_blank'); if(!w) return; w.document.open(); w.document.write(html); w.document.close(); w.focus()
    } catch { alert('Failed to open short-stay preview') }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800">Advanced Patient Search</h2>

      <form onSubmit={onSearch} className="mt-5 space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">MR Number</label>
            <input value={form.mrNo} onChange={e=>update('mrNo', e.target.value)} placeholder="MR123456" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Patient Name</label>
            <input value={form.name} onChange={e=>update('name', e.target.value)} placeholder="Full or partial name" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Father Name</label>
            <input value={form.fatherName} onChange={e=>update('fatherName', e.target.value)} placeholder="Guardian's name" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number</label>
            <input value={form.phone} onChange={e=>update('phone', e.target.value)} placeholder="03001234567" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50" disabled={loading}>{loading?'Searching...':'Search Patients'}</button>
          <button type="button" onClick={onClear} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Clear Filters</button>
        </div>
      </form>

      {patients.length>0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
            <div className="font-medium text-slate-800">Results</div>
            <div className="text-slate-600">{patients.length} patient{patients.length!==1?'s':''}</div>
          </div>
          <div className="divide-y divide-slate-200">
            {patients.map((p, idx) => (
              <div key={String(p._id||idx)} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.fullName || '-'} <span className="text-xs text-slate-500">{p.mrn || '-'}</span></div>
                  <div className="text-xs text-slate-600">{p.phoneNormalized || ''}</div>
                </div>
                <div className="mt-0.5 text-xs text-slate-600">Father Name: {p.fatherName || '-'}</div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    onClick={()=>{
                      const mrn = String(p.mrn||'')
                      setExpanded(prev => ({ ...prev, [mrn]: !prev[mrn] }))
                      if (!details[mrn]) loadDetails(mrn, String(p._id||''))
                    }}
                  >{expanded[String(p.mrn||'')] ? 'Hide Data' : 'View Data'}</button>
                </div>
                {expanded[String(p.mrn||'')] && (
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200">
                      <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium">Prescriptions</div>
                      <div className="divide-y divide-slate-100">
                        {(details[String(p.mrn||'')]?.loading) && <div className="p-3 text-xs text-slate-500">Loading...</div>}
                        {(!details[String(p.mrn||'')]?.loading) && (details[String(p.mrn||'')]?.pres||[]).map((pr: any) => (
                          <div key={String(pr.id)} className="px-3 py-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{new Date(pr.createdAt).toLocaleString()}</div>
                              <div className="text-slate-600">{pr.doctor || '-'}</div>
                            </div>
                            <div className="text-slate-700">{pr.diagnosis || '-'}</div>
                            <div className="mt-1">
                              <button
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                                onClick={()=>onPrescriptionPdf(String(pr.id), String(p.mrn||''))}
                                disabled={busy.pres===String(pr.id)}
                              >{busy.pres===String(pr.id)?'Generating...':'Prescription PDF'}</button>
                            </div>
                          </div>
                        ))}
                        {(!details[String(p.mrn||'')]?.loading) && (details[String(p.mrn||'')]?.pres||[]).length===0 && (
                          <div className="p-3 text-xs text-slate-500">No prescriptions found</div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200">
                      <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium">Lab Reports</div>
                      <div className="divide-y divide-slate-100">
                        {(details[String(p.mrn||'')]?.loading) && <div className="p-3 text-xs text-slate-500">Loading...</div>}
                        {(!details[String(p.mrn||'')]?.loading) && (details[String(p.mrn||'')]?.lab||[]).map((lr: any) => (
                          <div key={String(lr.id)} className="px-3 py-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{new Date(lr.createdAt).toLocaleString()}</div>
                              <div className="text-slate-600">{lr.tokenNo || '-'}</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-slate-700">Status: {lr.status || '-'}</div>
                              <div className="flex items-center gap-2">
                                {lr.hasResult && <>
                                  <Link to={`/lab/results?orderId=${encodeURIComponent(lr.id)}&token=${encodeURIComponent(lr.tokenNo||'')}`} className="text-sky-700 hover:underline">Open Report</Link>
                                  <button className="rounded-md border border-slate-300 px-2 py-1 text-xs" onClick={()=>onLabPdf(String(lr.id), String(p.mrn||''))} disabled={busy.lab===String(lr.id)}>{busy.lab===String(lr.id)?'Opening...':'Lab Report PDF'}</button>
                                </>}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!details[String(p.mrn||'')]?.loading) && (details[String(p.mrn||'')]?.lab||[]).length===0 && (
                          <div className="p-3 text-xs text-slate-500">No lab records found</div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200">
                      <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium">Diagnostic Reports</div>
                      <div className="divide-y divide-slate-100">
                        {(details[String(p.mrn||'')]?.loading) && <div className="p-3 text-xs text-slate-500">Loading...</div>}
                        {(!details[String(p.mrn||'')]?.loading) && (details[String(p.mrn||'')]?.diag||[]).map((dr: any) => (
                          <div key={String(dr.id)} className="px-3 py-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{new Date(dr.createdAt).toLocaleString()}</div>
                              <div className="text-slate-600">{dr.tokenNo || '-'}</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-slate-700">Status: {dr.status || '-'}</div>
                              <div className="flex items-center gap-2">
                                {dr.hasResult && <button onClick={()=>onDiagnosticPrint(String(dr.id), String(p.mrn||''))} className="rounded-md border border-slate-300 px-2 py-1 text-xs" disabled={busy.diag===String(dr.id)}>{busy.diag===String(dr.id)?'Opening...':'Open Report'}</button>}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!details[String(p.mrn||'')]?.loading) && (details[String(p.mrn||'')]?.diag||[]).length===0 && (
                          <div className="p-3 text-xs text-slate-500">No diagnostic records found</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 md:col-span-3">
                      <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium">Aesthetic History</div>
                      <div className="divide-y divide-slate-100">
                        {(details[String(p.mrn||'')]?.loading) && <div className="p-3 text-xs text-slate-500">Loading...</div>}
                        {(!details[String(p.mrn||'')]?.loading) && (details[String(p.mrn||'')]?.aesthetic||[]).map((s: any, i: number) => (
                          <div key={String(s._id||s.id||i)} className="px-3 py-2 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-medium text-slate-800">{String(s.procedureName || s.procedureId || 'Procedure')}</div>
                              <div className="text-slate-600">{s.date ? new Date(s.date).toLocaleString() : ''}</div>
                            </div>
                            <div className="mt-1 grid gap-2 sm:grid-cols-4">
                              <div className="text-slate-600">Paid: <span className="font-medium text-slate-800">Rs {Math.round(Number(s.paid||0)).toLocaleString()}</span></div>
                              <div className="text-slate-600">Balance: <span className={`font-medium ${Number(s.balance||0)>0?'text-rose-700':'text-slate-800'}`}>Rs {Math.round(Number(s.balance||0)).toLocaleString()}</span></div>
                              <div className="text-slate-600">Status: <span className="font-medium text-slate-800">{String(s.status||'planned')}</span></div>
                              <div className="text-slate-600">Next: <span className="font-medium text-slate-800">{s.nextVisitDate ? new Date(s.nextVisitDate).toLocaleString() : '-'}</span></div>
                            </div>
                          </div>
                        ))}
                        {(!details[String(p.mrn||'')]?.loading) && (details[String(p.mrn||'')]?.aesthetic||[]).length===0 && (
                          <div className="p-3 text-xs text-slate-500">No aesthetic history found</div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 md:col-span-3">
                      <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium">IPD Admissions & Forms</div>
                      <div className="divide-y divide-slate-100">
                        {(details[String(p.mrn||'')]?.loading) && <div className="p-3 text-xs text-slate-500">Loading...</div>}
                        {(!details[String(p.mrn||'')]?.loading) && (details[String(p.mrn||'')]?.ipd||[]).map((ad: any) => (
                          <div key={String(ad.id)} className="px-3 py-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{ad.admissionNo || ad.id}</div>
                              <div className="text-slate-600">{new Date(ad.startAt).toLocaleString()} {ad.endAt?`- ${new Date(ad.endAt).toLocaleString()}`:''}</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-slate-700">Status: {ad.status || '-'}</div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  to={`/hospital/patient/${encodeURIComponent(ad.id)}`}
                                  state={{
                                    fromSearch: true,
                                    searchSnapshot: {
                                      form,
                                      patients: (Array.isArray(patients) ? patients.map((pp:any)=>({ _id: pp?._id||pp?.id, id: pp?.id, fullName: pp?.fullName, mrn: pp?.mrn, fatherName: pp?.fatherName, phoneNormalized: pp?.phoneNormalized })) : []),
                                      expanded,
                                      details,
                                    }
                                  }}
                                  className="text-slate-700 hover:underline"
                                >Open IPD Profile</Link>
                                {ad.forms?.dischargeSummary && <button onClick={()=>onPreviewDischarge(String(ad.id))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-violet-700">Discharge Summary</button>}
                                {ad.forms?.shortStay && <button onClick={()=>onPreviewShortStay(String(ad.id))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-violet-700">Short Stay</button>}
                                {ad.forms?.receivedDeath && <button onClick={()=>onPreviewReceivedDeath(String(ad.id))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-violet-700">Received Death</button>}
                                {ad.forms?.deathCertificate && <button onClick={()=>onPreviewDeathCertificate(String(ad.id))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-violet-700">Death Certificate</button>}
                                {ad.forms?.birthCertificate && <button onClick={()=>onPreviewBirthCertificate(String(ad.id))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-violet-700">Birth Certificate</button>}
                                <button onClick={()=>onPreviewFinalInvoice(String(ad.id))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-rose-700">Final Invoice</button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!details[String(p.mrn||'')]?.loading) && (details[String(p.mrn||'')]?.ipd||[]).length===0 && (
                          <div className="p-3 text-xs text-slate-500">No IPD admissions found</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
