import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type RecordItem = { id: string; createdAt?: string; parsed?: any }

export default function Hospital_IpdSurgicalSafetyTimeOut({ encounterId }: { encounterId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<RecordItem[]>([])
  const [open, setOpen] = useState(false)

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })
  }, [items])

  useEffect(() => {
    if (encounterId) void reload()
  }, [encounterId])

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const res = (await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'surgical-timeout', limit: 200 })) as any
      const rows = (res?.notes || []) as any[]

      const filtered: RecordItem[] = rows.map((n: any) => ({
        id: String(n?._id || n?.id || Math.random()),
        createdAt: n?.recordedAt || n?.createdAt,
        parsed: n?.data || null,
      }))
      setItems(filtered)
    } catch (e: any) {
      setError(e?.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  async function save(form: any) {
    setLoading(true)
    setError(null)
    try {
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'surgical-timeout',
        sign: form?.signedBy || '',
        data: form,
      })
      setOpen(false)
      await reload()
    } catch (e: any) {
      setError(e?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Surgical Safety Checklist - Time Out</div>
            <div className="mt-1 text-sm text-slate-600">Before skin incision</div>
          </div>
          <button onClick={() => setOpen(true)} className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">Add Form</button>
        </div>

        {error && <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="mt-4 space-y-3">
          {loading && <div className="text-sm text-slate-600">Loading...</div>}
          {!loading && sorted.length === 0 && <div className="text-sm text-slate-600">No records yet.</div>}

          {sorted.map((it) => (
            <div key={it.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Record</div>
                <div className="text-xs text-slate-500">{it.createdAt ? new Date(it.createdAt).toLocaleString() : '-'}</div>
              </div>

              {it.parsed ? (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Field label="Team members introduced" value={it.parsed?.teamIntroduced ? 'Yes' : 'No'} />
                  <Field label="Verbal confirmation: patient" value={it.parsed?.confirmPatient ? 'Yes' : 'No'} />
                  <Field label="Verbal confirmation: site" value={it.parsed?.confirmSite ? 'Yes' : 'No'} />
                  <Field label="Verbal confirmation: procedure" value={it.parsed?.confirmProcedure ? 'Yes' : 'No'} />
                  <Field label="Anticipated critical events (surgeon)" value={it.parsed?.criticalEventsSurgeon || '-'} />
                  <Field label="Anticipated critical events (anaesthesia)" value={it.parsed?.criticalEventsAnaesthesia || '-'} />
                  <Field label="Anticipated critical events (nursing)" value={it.parsed?.criticalEventsNursing || '-'} />
                  <Field label="Antibiotic prophylaxis within 60 min" value={it.parsed?.antibioticProphylaxis || '-'} />
                  <Field label="Essential imaging displayed" value={it.parsed?.imagingDisplayed || '-'} />
                  <Field label="Doctor Name" value={it.parsed?.doctorName} />
                  <Field label="Signature" value={it.parsed?.signature} />
                  <Field label="Date" value={it.parsed?.date} />
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-600">Invalid record data.</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <TimeOutDialog open={open} onClose={() => setOpen(false)} onSave={save} />
    </div>
  )
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value || '-'}</div>
    </div>
  )
}

function TimeOutDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    teamIntroduced: false,
    confirmPatient: false,
    confirmSite: false,
    confirmProcedure: false,
    criticalEventsSurgeon: '',
    criticalEventsAnaesthesia: '',
    criticalEventsNursing: '',
    antibioticProphylaxis: 'NO' as 'YES' | 'NO' | 'NOT_APPLICABLE',
    imagingDisplayed: 'NO' as 'YES' | 'NO' | 'NOT_APPLICABLE',
    doctorName: '',
    signature: '',
    date: new Date().toISOString().slice(0, 10),
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Time Out</h3>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800">Before skin incision</div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <Checkbox label="Confirm all team members have introduced themselves by name and role" checked={form.teamIntroduced} onChange={(v) => setForm({ ...form, teamIntroduced: v })} />
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-800">Surgeon, anaesthesia professional and nurse verbally confirm</div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
              <Checkbox label="Patient" checked={form.confirmPatient} onChange={(v) => setForm({ ...form, confirmPatient: v })} />
              <Checkbox label="Site" checked={form.confirmSite} onChange={(v) => setForm({ ...form, confirmSite: v })} />
              <Checkbox label="Procedure" checked={form.confirmProcedure} onChange={(v) => setForm({ ...form, confirmProcedure: v })} />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-800">Anticipated critical events</div>
            <div className="mt-2 grid grid-cols-1 gap-3">
              <Textarea label="Surgeon review" value={form.criticalEventsSurgeon} onChange={(v) => setForm({ ...form, criticalEventsSurgeon: v })} />
              <Textarea label="Anaesthesia team review" value={form.criticalEventsAnaesthesia} onChange={(v) => setForm({ ...form, criticalEventsAnaesthesia: v })} />
              <Textarea label="Nursing team review" value={form.criticalEventsNursing} onChange={(v) => setForm({ ...form, criticalEventsNursing: v })} />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-800">Has antibiotic prophylaxis been given within the last 60 minutes?</div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <Radio label="Yes" checked={form.antibioticProphylaxis === 'YES'} onChange={() => setForm({ ...form, antibioticProphylaxis: 'YES' })} />
              <Radio label="No" checked={form.antibioticProphylaxis === 'NO'} onChange={() => setForm({ ...form, antibioticProphylaxis: 'NO' })} />
              <Radio
                label="Not applicable"
                checked={form.antibioticProphylaxis === 'NOT_APPLICABLE'}
                onChange={() => setForm({ ...form, antibioticProphylaxis: 'NOT_APPLICABLE' })}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-800">Is essential imaging displayed?</div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <Radio label="Yes" checked={form.imagingDisplayed === 'YES'} onChange={() => setForm({ ...form, imagingDisplayed: 'YES' })} />
              <Radio label="No" checked={form.imagingDisplayed === 'NO'} onChange={() => setForm({ ...form, imagingDisplayed: 'NO' })} />
              <Radio
                label="Not applicable"
                checked={form.imagingDisplayed === 'NOT_APPLICABLE'}
                onChange={() => setForm({ ...form, imagingDisplayed: 'NOT_APPLICABLE' })}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <Input label="Doctor Name" value={form.doctorName} onChange={(v) => setForm({ ...form, doctorName: v })} />
            <Input label="Signature" value={form.signature} onChange={(v) => setForm({ ...form, signature: v })} />
            <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(form)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">Save</button>
        </div>
      </div>
    </div>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-800">
      <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function Radio({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-800">
      <input type="radio" className="h-4 w-4" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type || 'text'}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
