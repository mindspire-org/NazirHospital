import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type RecordItem = { id: string; createdAt?: string; parsed?: any }

export default function Hospital_IpdSurgicalSafetySignOut({ encounterId }: { encounterId: string }) {
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
      const res = (await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'surgical-signout', limit: 200 })) as any
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
        type: 'surgical-signout',
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
            <div className="text-base font-semibold text-slate-900">Surgical Safety Checklist - Sign Out</div>
            <div className="mt-1 text-sm text-slate-600">Before patient leaves operating room</div>
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
                  <Field label="Procedure recorded" value={it.parsed?.procedureRecorded ? 'Yes' : 'No'} />
                  <Field label="Instrument/needle/sponge counts complete" value={it.parsed?.countsComplete ? 'Yes' : 'No'} />
                  <Field label="Specimen labelled" value={it.parsed?.specimenLabelled ? 'Yes' : 'No'} />
                  <Field label="Any equipment problems" value={it.parsed?.equipmentProblems || '-'} />
                  <Field label="Key concerns for recovery/management" value={it.parsed?.keyConcerns || '-'} />
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

      <SignOutDialog open={open} onClose={() => setOpen(false)} onSave={save} />
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

function SignOutDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    procedureRecorded: false,
    countsComplete: false,
    specimenLabelled: false,
    equipmentProblems: '',
    keyConcerns: '',
    doctorName: '',
    signature: '',
    date: new Date().toISOString().slice(0, 10),
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Sign Out</h3>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800">Before patient leaves operating room</div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <Checkbox label="Nurse verbally confirms: name of procedure recorded" checked={form.procedureRecorded} onChange={(v) => setForm({ ...form, procedureRecorded: v })} />
            <Checkbox label="Instrument, sponge and needle counts complete" checked={form.countsComplete} onChange={(v) => setForm({ ...form, countsComplete: v })} />
            <Checkbox label="Specimen is labelled (including patient name)" checked={form.specimenLabelled} onChange={(v) => setForm({ ...form, specimenLabelled: v })} />
          </div>

          <div className="mt-4">
            <Textarea label="Any equipment problems to be addressed?" value={form.equipmentProblems} onChange={(v) => setForm({ ...form, equipmentProblems: v })} />
          </div>

          <div className="mt-4">
            <Textarea label="Surgeon, anesthesia professional and nurse review: key concerns for recovery and management" value={form.keyConcerns} onChange={(v) => setForm({ ...form, keyConcerns: v })} />
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
