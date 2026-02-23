import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_IpdAnesPreAssessment({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; existingProblems?: any; physicalExam?: any; plan?: any; checklist?: any; preInduction?: any; planChange?: any; doctorName?: string; sign?: string }>>([])
  const [open, setOpen] = useState(false)
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-pre', limit: 200 }) as any
      const items = (res.notes || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.recordedAt || n.createdAt || ''),
        doctorName: n.doctorName || '',
        sign: n.sign || '',
        existingProblems: (n.data||{}).existingProblems || {},
        physicalExam: (n.data||{}).physicalExam || {},
        plan: (n.data||{}).plan || {},
        checklist: (n.data||{}).checklist || {},
        preInduction: (n.data||{}).preInduction || {},
        planChange: (n.data||{}).planChange || {},
      }))
      setRows(items)
      setPage(1)
    }catch{}
  }

  const add = async (d: any) => {
    try{
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'anes-pre',
        recordedAt: d.when || new Date().toISOString(),
        doctorName: d.doctorName || undefined,
        sign: d.sign || undefined,
        data: {
          existingProblems: {
            cvs: d.cvs, renal: d.renal, respiration: d.respiration, hepatic: d.hepatic, diabetic: d.diabetic, git: d.git,
            neurology: d.neurology, anesthesiaHistory: d.anesthesiaHistory, eventful: d.eventful,
          },
          physicalExam: { bp: d.bp, pulse: d.pulse, temp: d.temp, rr: d.rr, cvs: d.examCvs, chest: d.chest, teeth: d.teeth, mallampatiClass: d.mallampatiClass, asaClass: d.asaClass },
          plan: { general: d.planGeneral, spinal: d.planSpinal, local: d.planLocal, monitoringCare: d.monitoringCare, npo: d.npo, fluidsBlood: d.fluidsBlood, preAnesthesiaMedication: d.preAnesMed },
          checklist: { patientIdentified: !!d.chkPatient, consentRevised: !!d.chkConsent, siteChecked: !!d.chkSite },
          preInduction: { orientation: d.orientation, bp: d.preBp, pulse: d.prePulse, temp: d.preTemp, spo2: d.preSpo2 },
          planChange: { changed: d.planChanged==='yes', general: d.planChangeGeneral, spinal: d.planChangeSpinal, local: d.planChangeLocal },
        },
      })
      setOpen(false); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save pre-assessment') }
  }

  const sorted = [...rows].sort((a,b)=>{
    const ta = new Date(a.when||'').getTime() || 0
    const tb = new Date(b.when||'').getTime() || 0
    return sortDir==='asc' ? ta - tb : tb - ta
  })
  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const pagedRows = sorted.slice(start, start + pageSize)

  const doPrint = () => {
    try{
      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewCurrent === 'function') {
        api.printPreviewCurrent({});
        return
      }
    }catch{}
    try{ window.print() }catch{}
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Pre-Anesthesia Assessment</div>
        <div className="flex gap-2 print:hidden">
          <button onClick={()=>setSortDir(sortDir==='asc'?'desc':'asc')} className="btn-outline-navy">Sort: {sortDir==='asc' ? 'Oldest' : 'Newest'}</button>
          <button onClick={doPrint} className="btn-outline-navy">Print Table</button>
          <button onClick={()=>setOpen(true)} className="btn">Add Pre-Assessment</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No pre-anesthesia assessments recorded.</div>
      ) : (
        <div className="space-y-4 text-sm">
          {pagedRows.map(r => (
            <div key={r.id} className="overflow-hidden rounded-md border border-slate-200">
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <div>{new Date(r.when).toLocaleString()}</div>
                <div>{r.doctorName ? `Dr: ${r.doctorName}` : ''}{r.doctorName && r.sign ? ' • ' : ''}{r.sign ? ` Sign: ${r.sign}` : ''}</div>
              </div>
              <div className="grid gap-3 p-3 grid-cols-1">
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Existing / Present Problem</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
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
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.cvs || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.renal || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.respiration || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.hepatic || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.diabetic || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.git || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.neurology || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.anesthesiaHistory || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.existingProblems?.eventful || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Physical Examination</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
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
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.bp || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.pulse || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.rr || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.temp || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.cvs || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.chest || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.teeth || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.mallampatiClass || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.physicalExam?.asaClass || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Anesthesia Plan</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
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
                        <td className="px-3 py-1.5 break-words">{r.plan?.general || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.spinal || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.local || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.monitoringCare || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.npo || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.fluidsBlood || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.plan?.preAnesthesiaMedication || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Checklist</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
                        <th className="px-3 py-1.5 text-left font-semibold">Patient Identified</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Consent & Chart Revised</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Site/Procedure Checked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="text-slate-700">
                        <td className="px-3 py-1.5 break-words">{r.checklist?.patientIdentified ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-1.5 break-words">{r.checklist?.consentRevised ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-1.5 break-words">{r.checklist?.siteChecked ? 'Yes' : 'No'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Pre-Induction Re-evaluation</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
                        <th className="px-3 py-1.5 text-left font-semibold">Orientation</th>
                        <th className="px-3 py-1.5 text-left font-semibold">BP</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Pulse</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Temp</th>
                        <th className="px-3 py-1.5 text-left font-semibold">SpO2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="text-slate-700">
                        <td className="px-3 py-1.5 break-words">{r.preInduction?.orientation || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.preInduction?.bp || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.preInduction?.pulse || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.preInduction?.temp || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.preInduction?.spo2 || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="pb-1 text-base font-semibold text-slate-900">Change in Anesthesia Plan (Yes/No)</div>
                  <table className="w-full table-fixed text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr className="text-slate-700">
                        <th className="px-3 py-1.5 text-left font-semibold">Changed</th>
                        <th className="px-3 py-1.5 text-left font-semibold">General</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Spinal</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Local</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="text-slate-700">
                        <td className="px-3 py-1.5 break-words">{r.planChange?.changed ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-1.5 break-words">{r.planChange?.general || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.planChange?.spinal || '-'}</td>
                        <td className="px-3 py-1.5 break-words">{r.planChange?.local || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {total === 0 ? 0 : start + 1}-{Math.min(start + pageSize, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <label className="hidden sm:block">Rows per page</label>
              <select value={pageSize} onChange={(e)=>{ const n = Number(e.target.value)||10; setPageSize(n); setPage(1); }} className="rounded-md border border-slate-300 px-2 py-1">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button className="btn-outline-navy" onClick={()=>setPage(p=>Math.max(1, p-1))} disabled={currentPage<=1}>Prev</button>
              <div>Page {currentPage} / {totalPages}</div>
              <button className="btn-outline-navy" onClick={()=>setPage(p=>Math.min(totalPages, p+1))} disabled={currentPage>=totalPages}>Next</button>
            </div>
          </div>
        </div>
      )}
      <PreDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function PreDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: any)=>void }){
  if (!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => String(fd.get(k) || '')
    onSave({
      when: get('when'), doctorName: get('doctorName'), sign: get('sign'),
      cvs: get('cvs'), renal: get('renal'), respiration: get('respiration'), hepatic: get('hepatic'), diabetic: get('diabetic'), git: get('git'), neurology: get('neurology'), anesthesiaHistory: get('anesthesiaHistory'), eventful: get('eventful'),
      bp: get('bp'), pulse: get('pulse'), temp: get('temp'), rr: get('rr'), examCvs: get('examCvs'), chest: get('chest'), teeth: get('teeth'), mallampatiClass: get('mallampatiClass'), asaClass: get('asaClass'),
      planGeneral: get('planGeneral'), planSpinal: get('planSpinal'), planLocal: get('planLocal'), monitoringCare: get('monitoringCare'), npo: get('npo'), fluidsBlood: get('fluidsBlood'), preAnesMed: get('preAnesMed'),
      chkPatient: fd.get('chkPatient') ? '1' : '', chkConsent: fd.get('chkConsent') ? '1' : '', chkSite: fd.get('chkSite') ? '1' : '',
      orientation: get('orientation'), preBp: get('preBp'), prePulse: get('prePulse'), preTemp: get('preTemp'), preSpo2: get('preSpo2'),
      planChanged: get('planChanged'), planChangeGeneral: get('planChangeGeneral'), planChangeSpinal: get('planChangeSpinal'), planChangeLocal: get('planChangeLocal'),
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-black/5 max-h-[90vh]">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Pre-Anesthesia Assessment</div>
        <div className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="when">Date/Time</label>
            <input id="when" name="when" type="datetime-local" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="doctorName">Doctor Name</label>
            <input id="doctorName" name="doctorName" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="sign">Sign</label>
            <input id="sign" name="sign" className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>

          <div className="sm:col-span-2 font-semibold text-slate-800">Existing / Present Problem</div>
          {['cvs','renal','respiration','hepatic','diabetic','git','neurology','anesthesiaHistory','eventful'].map(key => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={key}>{key.toUpperCase()}</label>
              <input id={key} name={key} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}

          <div className="sm:col-span-2 font-semibold text-slate-800">Physical Examination</div>
          {[
            ['bp','BP'], ['pulse','Pulse'], ['temp','Temp'], ['rr','RR'], ['examCvs','CVS'], ['chest','Chest'], ['teeth','Teeth'], ['mallampatiClass','Mallampati Class'], ['asaClass','ASA Class'],
          ].map(([name,label]) => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={name}>{label}</label>
              <input id={name} name={name} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}

          <div className="sm:col-span-2 font-semibold text-slate-800">Anesthesia Plan</div>
          {[
            ['planGeneral','General'], ['planSpinal','Spinal'], ['planLocal','Local'], ['monitoringCare','Anesthesia Monitoring Care'], ['npo','NPO'], ['fluidsBlood','Fluid/ Blood'], ['preAnesMed','Pre-Anesthesia Medication'],
          ].map(([name,label]) => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={name}>{label}</label>
              <input id={name} name={name} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}

          <div className="sm:col-span-2 font-semibold text-slate-800">Checklist</div>
          <div className="flex items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="chkPatient" /> Patient Identified</label>
            <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="chkConsent" /> Consent & Chart Revised</label>
            <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="chkSite" /> Site/Procedure Checked</label>
          </div>

          <div className="sm:col-span-2 font-semibold text-slate-800">Pre-Induction Re-evaluation</div>
          {[
            ['orientation','Patient Orientation'], ['preBp','BP'], ['prePulse','Pulse'], ['preTemp','Temp'], ['preSpo2','SpO2'],
          ].map(([name,label]) => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={name}>{label}</label>
              <input id={name} name={name} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}

          <div className="sm:col-span-2 font-semibold text-slate-800">Change in Anesthesia Plan (Yes/No)</div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="planChanged">Changed?</label>
            <select id="planChanged" name="planChanged" className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          {[
            ['planChangeGeneral','General'], ['planChangeSpinal','Spinal'], ['planChangeLocal','Local'],
          ].map(([name,label]) => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={name}>{label}</label>
              <input id={name} name={name} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
