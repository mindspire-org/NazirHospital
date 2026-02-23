import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function OperationNotes({ encounterId }: { encounterId: string }){
  const [rows, setRows] = useState<Array<{ id: string; when: string; incision?: string; procedure?: string; findings?: string; drain?: string; specimenRemoved?: string; histopathology?: string; conditionAtEnd?: string }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'operation', limit: 200 }) as any
      const items = (res.notes || []).map((n: any)=>{
        const d = n.data || {}
        return {
          id: String(n._id),
          when: String(n.recordedAt || n.createdAt || ''),
          incision: d.incision || '',
          procedure: d.procedure || '',
          findings: d.findings || '',
          drain: d.drain || '',
          specimenRemoved: d.specimenRemoved || '',
          histopathology: d.histopathology || '',
          conditionAtEnd: d.conditionAtEnd || '',
        }
      })
      setRows(items)
    }catch{}
  }

  const add = async (d: { when?: string; incision?: string; procedure?: string; findings?: string; drain?: string; specimenRemoved?: string; histopathology?: string; conditionAtEnd?: string }) => {
    try{
      const when = d.when || new Date().toISOString()
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'operation',
        recordedAt: when,
        data: {
          incision: d.incision,
          procedure: d.procedure,
          findings: d.findings,
          drain: d.drain,
          specimenRemoved: d.specimenRemoved,
          histopathology: d.histopathology,
          conditionAtEnd: d.conditionAtEnd,
        },
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add operation note') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Operation Notes</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Operation Note</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-slate-500">No operation notes yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Date/Time</th>
                <th className="px-3 py-2 font-medium">Incision</th>
                <th className="px-3 py-2 font-medium">Procedure</th>
                <th className="px-3 py-2 font-medium">Findings</th>
                <th className="px-3 py-2 font-medium">Drain</th>
                <th className="px-3 py-2 font-medium">Specimen (if Removed)</th>
                <th className="px-3 py-2 font-medium">Histopathology</th>
                <th className="px-3 py-2 font-medium">Condition at end</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-xs text-slate-600">{new Date(r.when).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.incision || '-'}</td>
                  <td className="px-3 py-2">{r.procedure || '-'}</td>
                  <td className="px-3 py-2">{r.findings || '-'}</td>
                  <td className="px-3 py-2">{r.drain || '-'}</td>
                  <td className="px-3 py-2">{r.specimenRemoved || '-'}</td>
                  <td className="px-3 py-2">{r.histopathology || '-'}</td>
                  <td className="px-3 py-2">{r.conditionAtEnd || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <OperationDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function OperationDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { when?: string; incision?: string; procedure?: string; findings?: string; drain?: string; specimenRemoved?: string; histopathology?: string; conditionAtEnd?: string })=>void }){
  if(!open) return null
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({
      when: String(fd.get('when')||''),
      incision: String(fd.get('incision')||''),
      procedure: String(fd.get('procedure')||''),
      findings: String(fd.get('findings')||''),
      drain: String(fd.get('drain')||''),
      specimenRemoved: String(fd.get('specimenRemoved')||''),
      histopathology: String(fd.get('histopathology')||''),
      conditionAtEnd: String(fd.get('conditionAtEnd')||''),
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Operation Note</div>
        <div className="px-5 py-4 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="op-when" className="block text-xs font-medium text-slate-600">Date/Time</label>
              <input id="op-when" name="when" type="datetime-local" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="op-incision" className="block text-xs font-medium text-slate-600">Incision</label>
              <textarea id="op-incision" name="incision" className="h-16 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="op-procedure" className="block text-xs font-medium text-slate-600">Procedure</label>
              <textarea id="op-procedure" name="procedure" className="h-16 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="op-findings" className="block text-xs font-medium text-slate-600">Findings</label>
              <textarea id="op-findings" name="findings" className="h-16 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
            </div>
            <div>
              <label htmlFor="op-drain" className="block text-xs font-medium text-slate-600">Drain</label>
              <input id="op-drain" name="drain" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="op-specimen" className="block text-xs font-medium text-slate-600">Specimen (if Removed)</label>
              <input id="op-specimen" name="specimenRemoved" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="op-hp" className="block text-xs font-medium text-slate-600">Histopathology</label>
              <input id="op-hp" name="histopathology" className="w-full rounded-md border border-slate-300 px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="op-condition" className="block text-xs font-medium text-slate-600">Condition at the end of surgery</label>
              <textarea id="op-condition" name="conditionAtEnd" className="h-16 w-full rounded-md border border-slate-300 px-3 py-2"></textarea>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
