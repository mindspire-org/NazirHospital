import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type RecordItem = { id: string; createdAt?: string; parsed?: any }

export default function Hospital_IpdSurgicalSafetySignIn({ encounterId }: { encounterId: string }) {
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
      const res = (await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'surgical-signin', limit: 200 })) as any
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
        type: 'surgical-signin',
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
            <div className="text-base font-semibold text-slate-900">Surgical Safety Checklist - Sign In</div>
            <div className="mt-1 text-sm text-slate-600">Before induction of anesthesia</div>
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
                  <Field label="Patient has confirmed" value={(it.parsed?.confirmIdentity && it.parsed?.confirmSite && it.parsed?.confirmProcedure && it.parsed?.confirmConsent) ? 'Yes' : 'No'} />
                  <Field label="Site marked" value={it.parsed?.siteMarked || '-'} />
                  <Field label="Anaesthesia safety check completed" value={it.parsed?.anaesthesiaSafetyCheckCompleted ? 'Yes' : 'No'} />
                  <Field label="Pulse oximeter on patient and functioning" value={it.parsed?.pulseOximeterOnAndFunctioning ? 'Yes' : 'No'} />
                  <Field label="Known allergy" value={it.parsed?.knownAllergy || '-'} />
                  <Field label="Difficult airway/aspiration risk" value={it.parsed?.difficultAirwayAspirationRisk || '-'} />
                  <Field label="Risk of >500ml blood loss (7ml/kg in children)" value={it.parsed?.riskBloodLoss || '-'} />
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

      <SignInDialog open={open} onClose={() => setOpen(false)} onSave={save} />
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

function SignInDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    confirmIdentity: false,
    confirmSite: false,
    confirmProcedure: false,
    confirmConsent: false,
    siteMarked: 'YES' as 'YES' | 'NO' | 'NOT_APPLICABLE',
    anaesthesiaSafetyCheckCompleted: false,
    pulseOximeterOnAndFunctioning: false,
    knownAllergy: 'NO' as 'YES' | 'NO',
    difficultAirwayAspirationRisk: 'NO' as 'YES' | 'NO',
    difficultAirwayEquipmentAssistanceAvailable: false,
    riskBloodLoss: 'NO' as 'YES' | 'NO',
    riskBloodLossIvAccessAndFluidsPlanned: false,
    doctorName: '',
    signature: '',
    date: new Date().toISOString().slice(0, 10),
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Sign In</h3>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800">Before induction of anesthesia</div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-slate-800">Patient has confirmed</div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
              <Checkbox label="Identity" checked={form.confirmIdentity} onChange={(v) => setForm({ ...form, confirmIdentity: v })} />
              <Checkbox label="Site" checked={form.confirmSite} onChange={(v) => setForm({ ...form, confirmSite: v })} />
              <Checkbox label="Procedure" checked={form.confirmProcedure} onChange={(v) => setForm({ ...form, confirmProcedure: v })} />
              <Checkbox label="Consent" checked={form.confirmConsent} onChange={(v) => setForm({ ...form, confirmConsent: v })} />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-800">Site marked/not applicable</div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <Radio label="Yes" checked={form.siteMarked === 'YES'} onChange={() => setForm({ ...form, siteMarked: 'YES' })} />
              <Radio label="No" checked={form.siteMarked === 'NO'} onChange={() => setForm({ ...form, siteMarked: 'NO' })} />
              <Radio label="Not applicable" checked={form.siteMarked === 'NOT_APPLICABLE'} onChange={() => setForm({ ...form, siteMarked: 'NOT_APPLICABLE' })} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
            <Checkbox
              label="Anaesthesia safety check completed"
              checked={form.anaesthesiaSafetyCheckCompleted}
              onChange={(v) => setForm({ ...form, anaesthesiaSafetyCheckCompleted: v })}
            />
            <Checkbox
              label="Pulse oximeter on patient and functioning"
              checked={form.pulseOximeterOnAndFunctioning}
              onChange={(v) => setForm({ ...form, pulseOximeterOnAndFunctioning: v })}
            />
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-slate-800">Does patient have a:</div>

            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-800">Known allergy?</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <Radio label="Yes" checked={form.knownAllergy === 'YES'} onChange={() => setForm({ ...form, knownAllergy: 'YES' })} />
                <Radio label="No" checked={form.knownAllergy === 'NO'} onChange={() => setForm({ ...form, knownAllergy: 'NO' })} />
              </div>
            </div>

            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-800">Difficult airway/aspiration risk?</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <Radio
                  label="Yes"
                  checked={form.difficultAirwayAspirationRisk === 'YES'}
                  onChange={() => setForm({ ...form, difficultAirwayAspirationRisk: 'YES' })}
                />
                <Radio
                  label="No"
                  checked={form.difficultAirwayAspirationRisk === 'NO'}
                  onChange={() => setForm({ ...form, difficultAirwayAspirationRisk: 'NO' })}
                />
              </div>
              <div className="mt-2">
                <Checkbox
                  label="Yes, and equipment/assistance available"
                  checked={form.difficultAirwayEquipmentAssistanceAvailable}
                  onChange={(v) => setForm({ ...form, difficultAirwayEquipmentAssistanceAvailable: v })}
                />
              </div>
            </div>

            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-800">Risk of &gt;500ml blood loss (7ml/kg in children)?</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <Radio label="Yes" checked={form.riskBloodLoss === 'YES'} onChange={() => setForm({ ...form, riskBloodLoss: 'YES' })} />
                <Radio label="No" checked={form.riskBloodLoss === 'NO'} onChange={() => setForm({ ...form, riskBloodLoss: 'NO' })} />
              </div>
              <div className="mt-2">
                <Checkbox
                  label="Yes, and adequate intravenous access and fluids planned"
                  checked={form.riskBloodLossIvAccessAndFluidsPlanned}
                  onChange={(v) => setForm({ ...form, riskBloodLossIvAccessAndFluidsPlanned: v })}
                />
              </div>
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
