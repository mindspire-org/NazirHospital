type Props = {
  printId?: string
  doctor: { name?: string; specialization?: string; qualification?: string; departmentName?: string; phone?: string }
  settings: { name: string; address: string; phone: string; logoDataUrl?: string }
  patient: { name?: string; mrn?: string; gender?: string; fatherName?: string; age?: string; phone?: string; address?: string }
  items: Array<{ name: string; frequency?: string; duration?: string; dose?: string; instruction?: string; route?: string }>
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  treatmentHistory?: string
  allergyHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  createdAt?: string | Date
}

export default function PrescriptionPrint({ printId = 'prescription-print', doctor, settings, patient, items, labTests, labNotes, diagnosticTests, diagnosticNotes, primaryComplaint, primaryComplaintHistory, familyHistory, treatmentHistory, allergyHistory, history, examFindings, diagnosis, advice, createdAt }: Props){
  const dt = createdAt ? new Date(createdAt) : new Date()
  const rows = (items||[]).map((m, i) => {
    const parts = String(m.frequency||'').split('/').map(s=>s.trim()).filter(Boolean)
    let en = '-', ur = ''
    const cnt = parts.length
    if (cnt === 1) { en = 'Once a day'; ur = 'دن میں ایک بار' }
    else if (cnt === 2) { en = 'Twice a day'; ur = 'دن میں دو بار' }
    else if (cnt === 3) { en = 'Thrice a day'; ur = 'دن میں تین بار' }
    else if (cnt >= 4) { en = 'Four times a day'; ur = 'دن میں چار بار' }
    else if ((m.frequency||'').trim()) { en = String(m.frequency).trim() }
    const freq = ur ? `${en}\n${ur}` : en
    const d = String(m.duration||'').trim()
    const dm = d.match(/\d+/)
    const duration = dm ? `${d}\nدن ${dm[0]}` : (d || '-')
    const dose = (m as any).dose || (m as any).qty || '-'
    return { sr: i+1, name: m.name||'-', freq, dose, duration, instruction: (m as any).instruction || '-', route: (m as any).route || '-' }
  })
  return (
    <div id={printId} className="hidden print:block">
      <div className="mx-auto max-w-3xl">
        <div className="mb-1 grid grid-cols-12 items-start gap-4">
          <div className="col-span-5 self-start">
            {doctor?.specialization && (
              <div className="text-xs font-semibold text-slate-700">Consultant {doctor.specialization}</div>
            )}
            <div className="text-lg font-extrabold leading-tight">Dr. {doctor?.name || '-'}</div>
            {doctor?.qualification && (
              <div className="text-xs text-slate-700">Qualification: {doctor.qualification}</div>
            )}
            {doctor?.departmentName && (
              <div className="text-xs text-slate-700">Department: {doctor.departmentName}</div>
            )}
            {doctor?.phone && (
              <div className="text-xs text-slate-600">Phone: {doctor.phone}</div>
            )}
          </div>
          <div className="col-span-2 text-center self-start">
            {settings?.logoDataUrl && <img src={settings.logoDataUrl} alt="logo" className="mx-auto h-14 w-14 object-contain" />}
          </div>
          <div className="col-span-5 text-right self-start">
            <div className="text-xl font-extrabold leading-tight">{settings?.name || ''}</div>
            <div className="text-xs text-slate-600">{settings?.address || ''}</div>
            {settings?.phone && <div className="text-xs text-slate-600">Mobile #: {settings.phone}</div>}
          </div>
        </div>
        <hr className="my-3" />

        <div className="mb-3 grid grid-cols-3 gap-x-1 gap-y-0.5 text-xs leading-tight">
          <div><span className="font-semibold">Patient:</span> {patient?.name || '-'}</div>
          <div><span className="font-semibold">MR:</span> {patient?.mrn || '-'}</div>
          <div className="text-right"><span className="font-semibold">Gender:</span> {patient?.gender || '-'}</div>
          <div><span className="font-semibold">Father Name:</span> {patient?.fatherName || '-'}</div>
          <div className="text-center"><span className="font-semibold">Age:</span> {patient?.age || '-'}</div>
          <div className="text-right"><span className="font-semibold">Phone:</span> {patient?.phone || '-'}</div>
          <div className="col-span-3"><span className="font-semibold">Address:</span> {patient?.address || '-'}</div>
          <div className="col-span-3 text-xs text-slate-600"><span className="font-semibold">Date:</span> {dt.toLocaleDateString()} {dt.toLocaleTimeString()}</div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-5 space-y-3">
            <div className="text-sm font-semibold">Prescription</div>
            {primaryComplaint && primaryComplaint.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Complaint</div>
                <div className="min-h-[40px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{primaryComplaint}</div>
              </div>
            )}
            {(primaryComplaintHistory || treatmentHistory) && (primaryComplaintHistory || treatmentHistory)?.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Clinical Notes</div>
                <div className="min-h-[40px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{primaryComplaintHistory || treatmentHistory}</div>
              </div>
            )}
            {familyHistory && familyHistory.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Family History</div>
                <div className="min-h-[56px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{familyHistory}</div>
              </div>
            )}
            {allergyHistory && allergyHistory.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Allergy History</div>
                <div className="min-h-[56px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{allergyHistory}</div>
              </div>
            )}
            {treatmentHistory && treatmentHistory.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Treatment History</div>
                <div className="min-h-[56px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{treatmentHistory}</div>
              </div>
            )}
            {history && history.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Medical History</div>
                <div className="min-h-[56px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{history}</div>
              </div>
            )}
            {examFindings && examFindings.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Examination</div>
                <div className="min-h-[40px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{examFindings}</div>
              </div>
            )}
            {diagnosis && diagnosis.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Diagnosis / Disease</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{diagnosis}</div>
              </div>
            )}
            {advice && advice.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Advice</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{advice}</div>
              </div>
            )}
            {Array.isArray(labTests) && labTests.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Lab Tests</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{labTests.join(', ')}</div>
              </div>
            )}
            {labNotes && labNotes.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Lab Notes</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{labNotes}</div>
              </div>
            )}
            {Array.isArray(diagnosticTests) && diagnosticTests.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Diagnostic Tests</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{diagnosticTests.join(', ')}</div>
              </div>
            )}
            {diagnosticNotes && diagnosticNotes.trim() && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Diagnostic Notes</div>
                <div className="min-h-[32px] whitespace-pre-wrap rounded-md border border-slate-300 p-2 text-sm">{diagnosticNotes}</div>
              </div>
            )}
          </div>

          <div className="col-span-7">
            <div className="mb-2 text-sm font-semibold">Medication</div>
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-10 border border-slate-300 px-2 py-1 text-left">Sr.</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Drug</th>
                  <th className="w-28 border border-slate-300 px-2 py-1">Frequency</th>
                  <th className="w-20 border border-slate-300 px-2 py-1">Dosage</th>
                  <th className="w-24 border border-slate-300 px-2 py-1">Duration</th>
                  <th className="w-28 border border-slate-300 px-2 py-1">Instruction</th>
                  <th className="w-20 border border-slate-300 px-2 py-1">Route</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 px-2 py-1 align-top">{r.sr}</td>
                    <td className="border border-slate-300 px-2 py-1 align-top"><span className="font-medium">{r.name}</span></td>
                    <td className="border border-slate-300 px-2 py-1 whitespace-pre-line text-center align-top">{r.freq}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center align-top">{r.dose}</td>
                    <td className="border border-slate-300 px-2 py-1 whitespace-pre-line text-center align-top">{r.duration}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center align-top">{r.instruction}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center align-top">{r.route}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="border border-slate-300 px-2 py-3 text-center text-slate-500">No medicines</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          header, nav, aside, footer, .no-print, .app-header, .sidebar { display: none !important; }
          #${printId} { display: block !important; position: static !important; width: 100% !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #ffffff !important; }
        }
      `}</style>
    </div>
  )
}
