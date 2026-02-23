import React, { useEffect, useMemo, useState } from 'react'
import { hospitalApi, diagnosticApi } from '../../utils/api'
import { printEchocardiographyReport } from '../diagnostic/diagnostic_Echocardiography'
import { printUltrasoundReport } from '../diagnostic/diagnostic_UltrasoundGeneric'
import { printCTScanReport } from '../diagnostic/diagnostic_CTScan'
import { printColonoscopyReport } from '../diagnostic/diagnostic_Colonoscopy'
import { printUpperGIEndoscopyReport } from '../diagnostic/diagnostic_UpperGIEndoscopy'

function resolveKey(name: string){
  const n = (name||'').toLowerCase()
  if (n.includes('ultrasound')) return 'Ultrasound'
  if (n.replace(/\s+/g,'') === 'ctscan') return 'CTScan'
  if (n.includes('echocardio')) return 'Echocardiography'
  if (n.includes('colonoscopy')) return 'Colonoscopy'
  if (n.includes('uppergi')) return 'UpperGiEndoscopy'
  return name
}

export default function DiagnosticTests({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; test: string; date: string; status?: string; doctor?: string; encounterId?: string }>>([])
  const [open, setOpen] = useState(false)
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([])
  const [encDoctorId, setEncDoctorId] = useState<string>('')
  const [encPatient, setEncPatient] = useState<any | null>(null)
  const [testsList, setTestsList] = useState<string[]>([])

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])
  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.getIPDAdmissionById(encounterId) as any; const enc = res?.encounter; setEncDoctorId(String(enc?.doctorId?._id || enc?.doctorId || '')); setEncPatient(enc?.patientId || null) } catch {} })() }, [encounterId])
  useEffect(()=>{ (async()=>{ try { const res = await hospitalApi.listDoctors() as any; const items = (res?.doctors || res || []) as Array<{ _id: string; name: string }>; setDoctors(items) } catch { setDoctors([]) } })() }, [])
  useEffect(()=>{ (async()=>{ try { const t = await diagnosticApi.listTests({ limit: 1000 }) as any; const names: string[] = (t.items||[]).map((it:any)=> String(it.name||'-')) ; setTestsList(names) } catch { setTestsList([]) } })() }, [])

  async function reload(){
    try{
      const res: any = await hospitalApi.listReferrals({ type: 'diagnostic', limit: 500 })
      const list = Array.isArray(res?.referrals) ? res.referrals : []
      const eid = String(encounterId)
      const items = list
        .filter((r:any)=>{
          const rid = r?.encounterId?._id || r?.encounterId
          return String(rid||'') === eid
        })
        .map((r:any)=>({
          id: String(r._id),
          test: Array.isArray(r.tests) && r.tests.length ? String(r.tests[0]) : '-',
          date: String(r.createdAt || ''),
          status: String(r.status || 'pending'),
          doctor: r?.encounterId?.doctorId?.name || r?.doctorId?.name || '',
          encounterId: String(r?.encounterId?._id || r?.encounterId || ''),
        }))
      setRows(items)
    }catch{ setRows([]) }
  }

  async function save(d: { doctorId: string; test: string; date: string }){
    try{
      await hospitalApi.createReferral({ type: 'diagnostic', encounterId, doctorId: d.doctorId, tests: d.test ? [d.test] : undefined })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to refer to Diagnostic') }
  }

  async function removeReferral(id: string){
    if (!confirm('Delete this diagnostic referral?')) return
    try{ await hospitalApi.deleteReferral(String(id)); await reload() }catch(e: any){ alert(e?.message || 'Failed to delete') }
  }

  const testOptions = useMemo(()=> Array.from(new Set(testsList)).sort(), [testsList])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Diagnostic Tests</div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setOpen(true)} className="btn">Refer to Diagnostic</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No diagnostic referrals.</div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Test</th>
                <th className="px-3 py-2 text-left">Ref (Doctor)</th>
                <th className="px-3 py-2 text-left">Date / Time</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{r.test}</td>
                  <td className="px-3 py-2">{r.doctor || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.date ? new Date(r.date).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 capitalize">{r.status || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {String(r.status||'').toLowerCase()==='completed' ? (
                        <button
                          onClick={()=>previewReferral(r.test, encPatient)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >Preview</button>
                      ) : (
                        <button disabled className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-400">Preview</button>
                      )}
                      <button onClick={()=>removeReferral(r.id)} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <OrderDialog open={open} onClose={()=>setOpen(false)} onSave={save} doctors={doctors} defaultDoctorId={encDoctorId} testOptions={testOptions} />
    </div>
  )
}

function OrderDialog({ open, onClose, onSave, doctors, defaultDoctorId, testOptions }: { open: boolean; onClose: ()=>void; onSave: (d: { doctorId: string; test: string; date: string })=>void; doctors: Array<{ _id: string; name: string }>; defaultDoctorId?: string; testOptions: string[] }){
  if(!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({ doctorId: String(fd.get('doctorId')||''), test: String(fd.get('test')||''), date: String(fd.get('date')||'') })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Refer to Diagnostic</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <label htmlFor="diag-doctor" className="block text-xs font-medium text-slate-600">Doctor</label>
          <select id="diag-doctor" name="doctorId" defaultValue={defaultDoctorId||''} required className="w-full rounded-md border border-slate-300 px-3 py-2">
            <option value="">Select doctor</option>
            {doctors.map(d => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          <label htmlFor="diag-test" className="block text-xs font-medium text-slate-600">Diagnostic Test</label>
          <input id="diag-test" name="test" list="diag-tests-list" placeholder="e.g. Ultrasound Abdomen" required className="w-full rounded-md border border-slate-300 px-3 py-2" />
          <datalist id="diag-tests-list">
            {testOptions.map(n => (<option key={n} value={n} />))}
          </datalist>
          <label htmlFor="diag-date" className="block text-xs font-medium text-slate-600">Date</label>
          <input id="diag-date" name="date" type="date" className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}

async function previewReferral(testName: string, patient?: any){
  const key = resolveKey(testName)
  try{
    const resA = await diagnosticApi.listResults({ q: testName, limit: 100 }) as any
    let arr: any[] = Array.isArray(resA?.items) ? resA.items : []
    // Narrow by patient if available
    const mrn = String(patient?.mrn || '').trim()
    const pname = String(patient?.fullName || '').trim().toLowerCase()
    if (mrn){ arr = arr.filter(x => String(x?.patient?.mrn||'').trim() === mrn) }
    else if (pname){ arr = arr.filter(x => String(x?.patient?.fullName||'').trim().toLowerCase() === pname) }
    const pick = arr
      .filter((x:any)=> resolveKey(String(x.testName||'')) === key)
      .sort((a:any,b:any)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime())[0] || null
    if (!pick){ alert('No report found for this test yet.'); return }
    const payload = { tokenNo: pick.tokenNo, createdAt: pick.createdAt, reportedAt: pick.reportedAt || pick.createdAt, patient: pick.patient, value: String(pick.formData||''), referringConsultant: (pick as any)?.patient?.referringConsultant }
    if (key === 'Echocardiography') { await printEchocardiographyReport(payload as any); return }
    if (key === 'Ultrasound') { await printUltrasoundReport(payload as any); return }
    if (key === 'CTScan') { await printCTScanReport(payload as any); return }
    if (key === 'Colonoscopy') { await printColonoscopyReport(payload as any); return }
    if (key === 'UpperGiEndoscopy') { await printUpperGIEndoscopyReport(payload as any); return }
    alert('Preview not available for this test.')
  }catch{
    alert('Failed to open report preview.')
  }
}
