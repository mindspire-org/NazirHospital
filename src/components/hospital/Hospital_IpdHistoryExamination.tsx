import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_IpdHistoryExamination({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    mrNumber: string
    patientName: string
    date: string
    time: string
    presentingComplaints: string
    medicationHistory: string
    familyHistory: string
    allergies: string
    vitals: { vitalc: string; bp: string; pulse: string; temp: string; rr: string }
    generalPhysicalExamination: string
    provisionalDiagnosis: string
    investigations: string
    finalDiagnosis: string
    treatmentPlan: string
    generalStatus: string
    weight: string
    height: string
    advisedDiet: string
    doctorName: string
    signature: string
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'history-exam', limit: 200 }) as any
      const items = (res.notes || []).map((n: any) => ({
        id: String(n._id),
        recordedAt: String(n.recordedAt || n.createdAt || ''),
        mrNumber: n.data?.mrNumber || '',
        patientName: n.data?.patientName || '',
        date: n.data?.date || '',
        time: n.data?.time || '',
        presentingComplaints: n.data?.presentingComplaints || '',
        medicationHistory: n.data?.medicationHistory || '',
        familyHistory: n.data?.familyHistory || '',
        allergies: n.data?.allergies || '',
        vitals: n.data?.vitals || { vitalc: '', bp: '', pulse: '', temp: '', rr: '' },
        generalPhysicalExamination: n.data?.generalPhysicalExamination || '',
        provisionalDiagnosis: n.data?.provisionalDiagnosis || '',
        investigations: n.data?.investigations || '',
        finalDiagnosis: n.data?.finalDiagnosis || '',
        treatmentPlan: n.data?.treatmentPlan || '',
        generalStatus: n.data?.generalStatus || '',
        weight: n.data?.weight || '',
        height: n.data?.height || '',
        advisedDiet: n.data?.advisedDiet || '',
        doctorName: n.data?.doctorName || '',
        signature: n.sign || '',
      }))
      setRecords(items)
    }catch{}
  }

  const add = async (d: any) => {
    try{
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'history-exam',
        sign: d.signature || '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save history form') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">History & Examination Form</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Form</button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No history records yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <HistoryFormDisplay data={r} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <HistoryDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function HistoryFormDisplay({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center border-b border-slate-300 pb-3">
        <h2 className="text-xl font-bold text-slate-900">Surgicare Hospital & Maternity Center Karor Lal Eason</h2>
        <p className="text-sm text-slate-600 mt-1">History & Examination Form</p>
      </div>

      {/* Top Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex gap-2">
          <span className="font-semibold">MR/Number:</span>
          <span className="border-b border-slate-400 flex-1">{data.mrNumber || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Date:</span>
          <span className="border-b border-slate-400 flex-1">{data.date || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Patient Name:</span>
          <span className="border-b border-slate-400 flex-1">{data.patientName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Time:</span>
          <span className="border-b border-slate-400 flex-1">{data.time || ''}</span>
        </div>
      </div>

      {/* Presenting Complaints */}
      <div className="text-sm">
        <p className="font-semibold mb-2">Presenting Complaints:</p>
        <div className="border border-slate-300 p-2 min-h-[60px] bg-slate-50">{data.presentingComplaints || ''}</div>
      </div>

      {/* Medication History */}
      <div className="text-sm">
        <p className="font-semibold mb-2">Medication History:</p>
        <div className="border border-slate-300 p-2 min-h-[40px] bg-slate-50">{data.medicationHistory || ''}</div>
      </div>

      {/* Family History */}
      <div className="text-sm">
        <p className="font-semibold mb-2">Family History:</p>
        <div className="border border-slate-300 p-2 min-h-[40px] bg-slate-50">{data.familyHistory || ''}</div>
      </div>

      {/* Allergies */}
      <div className="text-sm">
        <p className="font-semibold mb-2">Allergies:</p>
        <div className="border border-slate-300 p-2 min-h-[40px] bg-slate-50">{data.allergies || ''}</div>
      </div>

      {/* Vitals */}
      <div className="text-sm">
        <p className="font-semibold mb-2">Vitals:</p>
        <table className="w-full border border-slate-300">
          <tbody>
            <tr className="border-b border-slate-300">
              <td className="p-2 border-r border-slate-300 font-semibold w-20">Vitalc</td>
              <td className="p-2 border-r border-slate-300">{data.vitals?.vitalc || ''}</td>
              <td className="p-2 border-r border-slate-300 font-semibold w-20">BP</td>
              <td className="p-2 border-r border-slate-300">{data.vitals?.bp || ''}</td>
              <td className="p-2 border-r border-slate-300 font-semibold w-20">Pulse</td>
              <td className="p-2">{data.vitals?.pulse || ''}</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-slate-300 font-semibold">Temp</td>
              <td className="p-2 border-r border-slate-300">{data.vitals?.temp || ''}</td>
              <td className="p-2 border-r border-slate-300 font-semibold">R/R</td>
              <td className="p-2" colSpan={3}>{data.vitals?.rr || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* General Physical Examination */}
      <div className="text-sm">
        <p className="font-semibold mb-2">General Physical Examination:</p>
        <div className="border border-slate-300 p-2 min-h-[60px] bg-slate-50">{data.generalPhysicalExamination || ''}</div>
      </div>

      {/* Provisional Diagnosis */}
      <div className="text-sm">
        <p className="font-semibold mb-2">Provisional Diagnosis:</p>
        <div className="border border-slate-300 p-2 min-h-[40px] bg-slate-50">{data.provisionalDiagnosis || ''}</div>
      </div>

      {/* Investigations */}
      <div className="text-sm">
        <p className="font-semibold mb-2">Investigations:</p>
        <div className="border border-slate-300 p-2 min-h-[40px] bg-slate-50">{data.investigations || ''}</div>
      </div>

      {/* Final Diagnosis */}
      <div className="text-sm">
        <p className="font-semibold mb-2">Final Diagnosis:</p>
        <div className="border border-slate-300 p-2 min-h-[40px] bg-slate-50">{data.finalDiagnosis || ''}</div>
      </div>

      {/* Treatment Plan */}
      <div className="text-sm">
        <p className="font-semibold mb-2">Treatment Plan:</p>
        <div className="border border-slate-300 p-2 min-h-[40px] bg-slate-50">{data.treatmentPlan || ''}</div>
      </div>

      {/* General Status, Weight, Height */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex gap-2">
          <span className="font-semibold">General Status:</span>
          <span className="border-b border-slate-400 flex-1">{data.generalStatus || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Weight:</span>
          <span className="border-b border-slate-400 flex-1">{data.weight || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Height:</span>
          <span className="border-b border-slate-400 flex-1">{data.height || ''}</span>
        </div>
      </div>

      {/* Advised Diet */}
      <div className="text-sm">
        <p className="font-semibold mb-2">Advised Diet:</p>
        <div className="border border-slate-300 p-2 min-h-[40px] bg-slate-50">{data.advisedDiet || ''}</div>
      </div>

      {/* Doctor & Signature */}
      <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-slate-300">
        <div className="flex gap-2">
          <span className="font-semibold">Doctor Name:</span>
          <span className="border-b border-slate-400 flex-1">{data.doctorName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Signature:</span>
          <span className="border-b border-slate-400 flex-1">{data.signature || ''}</span>
        </div>
      </div>
    </div>
  )
}

function HistoryDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (d: any) => void
}) {
  const [form, setForm] = useState({
    mrNumber: '',
    patientName: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    presentingComplaints: '',
    medicationHistory: '',
    familyHistory: '',
    allergies: '',
    vitals: { vitalc: '', bp: '', pulse: '', temp: '', rr: '' },
    generalPhysicalExamination: '',
    provisionalDiagnosis: '',
    investigations: '',
    finalDiagnosis: '',
    treatmentPlan: '',
    generalStatus: '',
    weight: '',
    height: '',
    advisedDiet: '',
    doctorName: '',
    signature: '',
  })

  if (!open) return null

  const updateVitals = (key: string, value: string) => {
    setForm({ ...form, vitals: { ...form.vitals, [key]: value } })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Add History & Examination Form</h3>

        <div className="space-y-4">
          {/* Top Info Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">MR/Number</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.mrNumber}
                onChange={(e) => setForm({ ...form, mrNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Patient Name</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.patientName}
                onChange={(e) => setForm({ ...form, patientName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
              <input
                type="time"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>

          {/* Presenting Complaints */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Presenting Complaints</label>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
              value={form.presentingComplaints}
              onChange={(e) => setForm({ ...form, presentingComplaints: e.target.value })}
            />
          </div>

          {/* History Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">History</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Medication History</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                  value={form.medicationHistory}
                  onChange={(e) => setForm({ ...form, medicationHistory: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Family History</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                  value={form.familyHistory}
                  onChange={(e) => setForm({ ...form, familyHistory: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Allergies</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                  value={form.allergies}
                  onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Vitals Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Vitals</h4>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Vitalc</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.vitals.vitalc}
                  onChange={(e) => updateVitals('vitalc', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">BP</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.vitals.bp}
                  onChange={(e) => updateVitals('bp', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Pulse</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.vitals.pulse}
                  onChange={(e) => updateVitals('pulse', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Temp</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.vitals.temp}
                  onChange={(e) => updateVitals('temp', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">R/R</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.vitals.rr}
                  onChange={(e) => updateVitals('rr', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Examination Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Examination</h4>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">General Physical Examination</label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                value={form.generalPhysicalExamination}
                onChange={(e) => setForm({ ...form, generalPhysicalExamination: e.target.value })}
              />
            </div>
          </div>

          {/* Diagnosis Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Diagnosis</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Provisional Diagnosis</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                  value={form.provisionalDiagnosis}
                  onChange={(e) => setForm({ ...form, provisionalDiagnosis: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Final Diagnosis</label>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                  value={form.finalDiagnosis}
                  onChange={(e) => setForm({ ...form, finalDiagnosis: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Investigations</label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                value={form.investigations}
                onChange={(e) => setForm({ ...form, investigations: e.target.value })}
              />
            </div>
          </div>

          {/* Treatment Section */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Treatment & Status</h4>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Treatment Plan</label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
                value={form.treatmentPlan}
                onChange={(e) => setForm({ ...form, treatmentPlan: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">General Status</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.generalStatus}
                  onChange={(e) => setForm({ ...form, generalStatus: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Weight</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Height</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Advised Diet</label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[40px]"
                value={form.advisedDiet}
                onChange={(e) => setForm({ ...form, advisedDiet: e.target.value })}
              />
            </div>
          </div>

          {/* Doctor Signature */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Doctor</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Doctor Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.doctorName}
                  onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Signature</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.signature}
                  onChange={(e) => setForm({ ...form, signature: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
