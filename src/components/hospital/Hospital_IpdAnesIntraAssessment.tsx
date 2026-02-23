import React, { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type IntraRow = { time: string; pulse?: string; bp?: string; rr?: string; spo2?: string; drugs?: string; ivFluidsBlood?: string }

type SaveMode = 'append-latest' | 'new-session'

export default function Hospital_IpdAnesIntraAssessment({ encounterId }: { encounterId: string }){
  const [sessions, setSessions] = useState<Array<{ id: string; when: string; rows: IntraRow[]; totals?: { intakeFluidsBlood?: string; bloodLoss?: string; urineOutput?: string; others?: string }; doctorName?: string; sign?: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'anes-intra', limit: 50 }) as any
      const items = (res.notes || []).map((n: any)=>({
        id: String(n._id),
        when: String(n.recordedAt || n.createdAt || ''),
        doctorName: n.doctorName || '',
        sign: n.sign || '',
        rows: ((n.data||{}).rows || []) as IntraRow[],
        totals: (n.data||{}).totals || {},
      }))
      setSessions(items)
    }catch{}
  }

  const latest = useMemo(()=> sessions[0], [sessions])

  const add = async (d: { mode: SaveMode; row: IntraRow; totals?: { intakeFluidsBlood?: string; bloodLoss?: string; urineOutput?: string; others?: string }; doctorName?: string; sign?: string; when?: string }) => {
    try{
      if (d.mode === 'append-latest' && latest){
        const newRows = [...(latest.rows||[]), d.row]
        await hospitalApi.updateIpdClinicalNote(latest.id, { data: { rows: newRows, totals: d.totals ?? latest.totals } })
      } else {
        await hospitalApi.createIpdClinicalNote(encounterId, { type: 'anes-intra', recordedAt: d.when || new Date().toISOString(), doctorName: d.doctorName, sign: d.sign, data: { rows: [d.row], totals: d.totals } })
      }
      setOpen(false); await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save intra-anesthesia assessment') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">During / Intra-Anesthesia Assessment</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Row</button>
      </div>
      {sessions.length === 0 ? (
        <div className="text-slate-500">No intra-anesthesia rows yet.</div>
      ) : (
        <div className="space-y-4">
          {sessions.map(sess => (
            <div key={sess.id} className="overflow-x-auto rounded-md border border-slate-200">
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <div>{new Date(sess.when).toLocaleString()}</div>
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
                  {sess.rows.map((r, idx) => (
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
                <div>Total Intake Fluid/Blood: <span className="font-medium">{sess.totals?.intakeFluidsBlood || '-'}</span></div>
                <div>Blood Loss: <span className="font-medium">{sess.totals?.bloodLoss || '-'}</span></div>
                <div>Urine Output: <span className="font-medium">{sess.totals?.urineOutput || '-'}</span></div>
                <div>Others: <span className="font-medium">{sess.totals?.others || '-'}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <IntraDialog open={open} onClose={()=>setOpen(false)} onSave={add} hasExisting={!!latest} />
    </div>
  )
}

function IntraDialog({ open, onClose, onSave, hasExisting }: { open: boolean; onClose: ()=>void; onSave: (d: { mode: SaveMode; row: IntraRow; totals?: { intakeFluidsBlood?: string; bloodLoss?: string; urineOutput?: string; others?: string }; doctorName?: string; sign?: string; when?: string })=>void; hasExisting: boolean }){
  if (!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const get = (k: string) => String(fd.get(k) || '')
    const row: IntraRow = { time: get('time'), pulse: get('pulse'), bp: get('bp'), rr: get('rr'), spo2: get('spo2'), drugs: get('drugs'), ivFluidsBlood: get('ivFluidsBlood') }
    const totals = { intakeFluidsBlood: get('intakeFluidsBlood'), bloodLoss: get('bloodLoss'), urineOutput: get('urineOutput'), others: get('others') }
    const mode = (get('mode') as SaveMode) || 'append-latest'
    onSave({ mode, row, totals, doctorName: get('doctorName'), sign: get('sign'), when: get('when') })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-black/5 max-h-[90vh]">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Intra-Anesthesia Row</div>
        <div className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-slate-600" htmlFor="mode">Save Mode</label>
            <select id="mode" name="mode" className="w-full rounded-md border border-slate-300 px-3 py-2">
              {hasExisting && (<option value="append-latest">Append to Latest Session</option>)}
              <option value="new-session">Create New Session</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="when">Date/Time (for new session)</label>
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

          <div className="sm:col-span-3 font-semibold text-slate-800">Row</div>
          {['time','pulse','bp','rr','spo2','drugs','ivFluidsBlood'].map(name => (
            <div key={name}>
              <label className="block text-xs font-medium text-slate-600" htmlFor={name}>{name.toUpperCase()}</label>
              <input id={name} name={name} className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
          ))}

          <div className="sm:col-span-3 font-semibold text-slate-800">Totals</div>
          {[
            ['intakeFluidsBlood','Total Intake Fluid/Blood'], ['bloodLoss','Blood Loss'], ['urineOutput','Urine Output'], ['others','Others'],
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
