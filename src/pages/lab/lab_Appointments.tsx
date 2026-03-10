import { useEffect, useMemo, useRef, useState } from 'react'
import { labApi } from '../../utils/api'

function todayIso() { return new Date().toISOString().slice(0, 10) }

type TestLite = { id: string; name: string; price?: number }

type AppointmentRow = {
  id: string
  dateIso: string
  time?: string
  tests: string[]
  status: 'booked' | 'confirmed' | 'cancelled' | 'converted'
  patientId?: string
  mrn?: string
  patientName?: string
  phoneNormalized?: string
  gender?: string
  age?: string
  notes?: string
  orderId?: string
}

function normDigits(s?: string) { return String(s || '').replace(/\D+/g, '').slice(0, 11) }

export default function Lab_Appointments() {
  const [dateIso, setDateIso] = useState(todayIso())
  const [status, setStatus] = useState<'all' | AppointmentRow['status']>('all')
  const [query, setQuery] = useState('')

  const [tests, setTests] = useState<TestLite[]>([])
  const testsMap = useMemo(() => Object.fromEntries(tests.map(t => [t.id, t.name])), [tests])

  const [rows, setRows] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(false)

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<AppointmentRow | null>(null)
  const [editForm, setEditForm] = useState({
    dateIso: '',
    time: '',
    patientName: '',
    phone: '',
    gender: '',
    age: '',
    notes: '',
    testIds: [] as string[],
    testSearch: '',
  })
  const editUpdate = (k: keyof typeof editForm, v: any) => setEditForm(prev => ({ ...prev, [k]: v }))

  // Create form
  const [form, setForm] = useState({
    phone: '',
    patientName: '',
    gender: '',
    age: '',
    time: '',
    notes: '',
    testIds: [] as string[],
    testSearch: '',
  })
  const update = (k: keyof typeof form, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  // patient suggestions
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false)
  const [phoneSuggestItems, setPhoneSuggestItems] = useState<any[]>([])
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const phoneSuggestQueryRef = useRef<string>('')

  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)

  // test suggestions
  const [testSuggestOpen, setTestSuggestOpen] = useState(false)
  const testSuggestWrapRef = useRef<HTMLDivElement>(null)

  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const showNotice = (kind: 'success' | 'error', text: string) => {
    setNotice({ kind, text })
    try { setTimeout(() => setNotice(null), 2500) } catch {}
  }

  function openEdit(r: AppointmentRow) {
    setEditRow(r)
    setEditForm({
      dateIso: r.dateIso || todayIso(),
      time: r.time || '',
      patientName: r.patientName || '',
      phone: normDigits(r.phoneNormalized || ''),
      gender: r.gender || '',
      age: r.age || '',
      notes: r.notes || '',
      testIds: Array.isArray(r.tests) ? r.tests.slice() : [],
      testSearch: '',
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editRow) return
    if (!editForm.dateIso) { showNotice('error', 'Select date'); return }
    if (!editForm.patientName.trim()) { showNotice('error', 'Enter patient name'); return }
    if (!editForm.testIds.length) { showNotice('error', 'Select at least 1 test'); return }

    try {
      const payload: any = {
        dateIso: editForm.dateIso,
        time: editForm.time || undefined,
        tests: editForm.testIds,
        notes: editForm.notes || undefined,
      }

      // If appointment is NOT linked to an existing patient, allow editing patient snapshot fields
      if (!editRow.patientId) {
        payload.patientName = editForm.patientName.trim()
        payload.phone = editForm.phone ? normDigits(editForm.phone) : undefined
        payload.gender = editForm.gender || undefined
        payload.age = editForm.age || undefined
      }

      await labApi.updateAppointment(editRow.id, payload)
      showNotice('success', 'Appointment updated')
      setEditOpen(false)
      setEditRow(null)
      await load()
    } catch (e: any) {
      showNotice('error', e?.message || 'Failed to update appointment')
    }
  }

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (phoneSuggestWrapRef.current && !phoneSuggestWrapRef.current.contains(e.target as any)) setPhoneSuggestOpen(false)
      if (testSuggestWrapRef.current && !testSuggestWrapRef.current.contains(e.target as any)) setTestSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    ; (async () => {
      try {
        const tst: any = await labApi.listTests({ limit: 1000 })
        const list = (tst?.items || []).map((t: any) => ({ id: String(t._id), name: t.name, price: Number(t.price || 0) }))
        setTests(list)
      } catch {
        setTests([])
      }
    })()
  }, [])

  useEffect(() => { load() }, [dateIso, status])

  async function load() {
    setLoading(true)
    try {
      const params: any = { date: dateIso }
      if (status !== 'all') params.status = status
      const res: any = await labApi.listAppointments(params)
      const arr: any[] = (res?.appointments || [])
      const mapped: AppointmentRow[] = arr.map(a => ({
        id: String(a._id),
        dateIso: String(a.dateIso || '').slice(0, 10),
        time: a.time || undefined,
        tests: Array.isArray(a.tests) ? a.tests.map((x: any) => String(x)) : [],
        status: (String(a.status || 'booked') as any),
        patientId: a.patientId ? String(a.patientId) : undefined,
        mrn: a.mrn || undefined,
        patientName: a.patientName || undefined,
        phoneNormalized: a.phoneNormalized || undefined,
        gender: a.gender || undefined,
        age: a.age || undefined,
        notes: a.notes || undefined,
        orderId: a.orderId ? String(a.orderId) : undefined,
      }))
      setRows(mapped)
    } catch {
      setRows([])
    }
    setLoading(false)
  }

  async function runPhoneSuggestLookup(digits: string) {
    try {
      phoneSuggestQueryRef.current = digits
      const r: any = await labApi.searchPatients({ phone: digits, limit: 8 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (phoneSuggestQueryRef.current !== digits) return
      setPhoneSuggestItems(list)
      setPhoneSuggestOpen(list.length > 0)
    } catch {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
  }

  function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = normDigits(e.target.value)
    update('phone', digitsOnly)
    setSelectedPatient(null)
    if ((window as any)._labApptPhoneSuggestDeb) clearTimeout((window as any)._labApptPhoneSuggestDeb)
    if (digitsOnly.length >= 3) {
      ; (window as any)._labApptPhoneSuggestDeb = setTimeout(() => runPhoneSuggestLookup(digitsOnly), 250)
    } else {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
  }

  function selectPhoneSuggestion(p: any) {
    setSelectedPatient(p)
    update('patientName', p.fullName || '')
    update('phone', p.phoneNormalized || normDigits(form.phone))
    update('gender', p.gender || '')
    update('age', (p.age != null && p.age !== '') ? String(p.age) : '')
    setPhoneSuggestOpen(false)
  }

  async function createAppointment() {
    if (!dateIso) { showNotice('error', 'Select date'); return }
    if (!form.patientName.trim()) { showNotice('error', 'Enter patient name'); return }
    if (!form.phone.trim()) { showNotice('error', 'Enter phone'); return }
    if (!form.testIds.length) { showNotice('error', 'Select at least 1 test'); return }

    try {
      const payload: any = {
        dateIso,
        time: form.time || undefined,
        tests: form.testIds,
        notes: form.notes || undefined,
      }
      if (selectedPatient?._id) payload.patientId = String(selectedPatient._id)
      else {
        payload.patientName = form.patientName.trim()
        payload.phone = form.phone.trim()
        payload.gender = form.gender || undefined
        payload.age = form.age || undefined
      }

      await labApi.createAppointment(payload)
      showNotice('success', 'Appointment created')
      setForm({ phone: '', patientName: '', gender: '', age: '', time: '', notes: '', testIds: [], testSearch: '' })
      setSelectedPatient(null)
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
      await load()
    } catch (e: any) {
      showNotice('error', e?.message || 'Failed to create appointment')
    }
  }

  async function setRowStatus(id: string, st: 'booked' | 'confirmed' | 'cancelled') {
    try {
      await labApi.updateAppointmentStatus(id, st)
      await load()
    } catch (e: any) {
      showNotice('error', e?.message || 'Failed to update status')
    }
  }

  async function convertToToken(id: string) {
    try {
      const res: any = await labApi.convertAppointmentToToken(id)
      const token = res?.order?.tokenNo || ''
      showNotice('success', token ? `Converted to Token ${token}` : 'Converted to Token')
      await load()
    } catch (e: any) {
      showNotice('error', e?.message || 'Failed to convert')
    }
  }

  async function removeAppointment(r: AppointmentRow){
    if (!r) return
    if (r.status === 'converted' || r.orderId) { showNotice('error', 'Converted appointment cannot be deleted'); return }
    const ok = window.confirm('Delete this appointment?')
    if (!ok) return
    try {
      await labApi.deleteAppointment(r.id)
      showNotice('success', 'Appointment deleted')
      await load()
    } catch (e: any) {
      showNotice('error', e?.message || 'Failed to delete appointment')
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => {
      const testNames = (r.tests || []).map(tid => testsMap[tid] || tid).join(' | ')
      return [r.patientName, r.phoneNormalized, r.mrn, r.time, r.status, testNames]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    })
  }, [rows, query, testsMap])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-2xl font-bold text-slate-900">Lab Appointments</div>
            <div className="text-xs text-slate-500">Book, confirm, cancel, and convert appointments to lab tokens</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input type="date" value={dateIso} onChange={e => setDateIso(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1" />
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="rounded-md border border-slate-300 px-2 py-1">
              <option value="all">All</option>
              <option value="booked">Booked</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by patient, MR#, phone, time, status, tests..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
        </div>
        {notice && (
          <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">New Appointment</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone *</label>
            <div ref={phoneSuggestWrapRef} className="relative">
              <input value={form.phone} onChange={onPhoneChange} maxLength={11} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Type phone to search" />
              {phoneSuggestOpen && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {phoneSuggestItems.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No results</div>
                  ) : (
                    phoneSuggestItems.map((p: any, idx: number) => (
                      <button key={p._id || idx} type="button" onClick={() => selectPhoneSuggestion(p)} className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50">
                        <div className="text-sm font-medium text-slate-800">{p.fullName || 'Unnamed'} <span className="text-xs text-slate-500">{p.mrn || '-'}</span></div>
                        <div className="text-xs text-slate-600">{p.phoneNormalized || ''} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedPatient && (
              <div className="mt-1 text-xs text-emerald-700">Existing patient selected: {selectedPatient.fullName || '-'} — MRN {selectedPatient.mrn || '-'}</div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Patient Name *</label>
            <input value={form.patientName} onChange={e => update('patientName', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Full Name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Time</label>
            <input type="time" value={form.time} onChange={e => update('time', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Age</label>
            <input value={form.age} onChange={e => update('age', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 25" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Gender</label>
            <select value={form.gender} onChange={e => update('gender', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">Tests *</label>
            <div ref={testSuggestWrapRef} className="relative">
              <input 
                value={form.testSearch} 
                onChange={e => {
                  update('testSearch', e.target.value)
                  setTestSuggestOpen(e.target.value.trim().length > 0)
                }} 
                onFocus={() => { if (form.testSearch.trim().length > 0) setTestSuggestOpen(true) }}
                className="w-full rounded-md border border-slate-300 px-3 py-2" 
                placeholder="Type to search tests..." 
              />
              {testSuggestOpen && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {tests.filter(t => !form.testIds.includes(t.id) && t.name.toLowerCase().includes(form.testSearch.toLowerCase())).length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No matching tests</div>
                  ) : (
                    tests.filter(t => !form.testIds.includes(t.id) && t.name.toLowerCase().includes(form.testSearch.toLowerCase())).slice(0, 20).map((t: any) => (
                      <button 
                        key={t.id} 
                        type="button" 
                        onClick={() => {
                          update('testIds', [...form.testIds, t.id])
                          update('testSearch', '')
                          setTestSuggestOpen(false)
                        }} 
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <span className="text-sm text-slate-800">{t.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {form.testIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.testIds.map(id => {
                  const t = tests.find(x => x.id === id)
                  return (
                    <span key={id} className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-sm text-sky-700">
                      {t?.name || id}
                      <button 
                        onClick={() => update('testIds', form.testIds.filter(x => x !== id))}
                        className="ml-1 text-sky-600 hover:text-sky-800"
                      >×</button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
            <input value={form.notes} onChange={e => update('notes', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional notes" />
          </div>
          <div className="md:col-span-3 flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setForm({ phone: '', patientName: '', gender: '', age: '', time: '', notes: '', testIds: [], testSearch: '' }); setSelectedPatient(null) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">Clear</button>
            <button type="button" onClick={createAppointment} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">Save Appointment</button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
          <div className="font-medium text-slate-800">Appointments</div>
          <div className="text-slate-600">{loading ? 'Loading...' : `${filtered.length} item(s)`}</div>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">MR #</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Tests</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/70">
                <td className="px-4 py-2 whitespace-nowrap">{r.time || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{r.patientName || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{r.mrn || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{r.phoneNormalized || '-'}</td>
                <td className="px-4 py-2">{(r.tests || []).map(tid => testsMap[tid] || tid).join(', ')}</td>
                <td className="px-4 py-2 whitespace-nowrap">{r.status}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {r.status !== 'converted' && (
                      <button type="button" onClick={() => openEdit(r)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">Edit</button>
                    )}
                    {r.status !== 'confirmed' && r.status !== 'cancelled' && r.status !== 'converted' && (
                      <button type="button" onClick={() => setRowStatus(r.id, 'confirmed')} className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Confirm</button>
                    )}
                    {r.status !== 'cancelled' && r.status !== 'converted' && (
                      <button type="button" onClick={() => setRowStatus(r.id, 'cancelled')} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700">Cancel</button>
                    )}
                    {!r.orderId && r.status !== 'cancelled' && (
                      <button type="button" onClick={() => convertToToken(r.id)} className="rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-xs text-violet-700">Convert to Token</button>
                    )}
                    {r.status !== 'converted' && !r.orderId && (
                      <button type="button" onClick={() => removeAppointment(r)} className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs text-rose-700">Delete</button>
                    )}
                    {r.orderId && (
                      <span className="text-xs text-slate-500">Converted</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No appointments</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editOpen && editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-base font-semibold text-slate-800">Edit Appointment</div>
                <div className="text-xs text-slate-500">{editRow.patientId ? 'Linked patient: patient fields locked' : 'Patient fields editable (snapshot)'}</div>
              </div>
              <button type="button" onClick={() => { setEditOpen(false); setEditRow(null) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">Close</button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Date *</label>
                  <input type="date" value={editForm.dateIso} onChange={e => editUpdate('dateIso', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Time</label>
                  <input type="time" value={editForm.time} onChange={e => editUpdate('time', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                  <input value={editRow.status} disabled className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Patient Name *</label>
                  <input value={editForm.patientName} disabled={!!editRow.patientId} onChange={e => editUpdate('patientName', e.target.value)} className={`w-full rounded-md border px-3 py-2 ${editRow.patientId ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
                  <input value={editForm.phone} maxLength={11} disabled={!!editRow.patientId} onChange={e => editUpdate('phone', normDigits(e.target.value))} className={`w-full rounded-md border px-3 py-2 ${editRow.patientId ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Age</label>
                  <input value={editForm.age} disabled={!!editRow.patientId} onChange={e => editUpdate('age', e.target.value)} className={`w-full rounded-md border px-3 py-2 ${editRow.patientId ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-300'}`} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Gender</label>
                  <select value={editForm.gender} disabled={!!editRow.patientId} onChange={e => editUpdate('gender', e.target.value)} className={`w-full rounded-md border px-3 py-2 ${editRow.patientId ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-300'}`}>
                    <option value="">Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Tests *</label>
                  <div className="relative">
                    <input 
                      value={editForm.testSearch} 
                      onChange={e => {
                        editUpdate('testSearch', e.target.value)
                        setTestSuggestOpen(e.target.value.trim().length > 0)
                      }} 
                      onFocus={() => { if (editForm.testSearch.trim().length > 0) setTestSuggestOpen(true) }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2" 
                      placeholder="Type to search tests..." 
                    />
                    {testSuggestOpen && (
                      <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                        {tests.filter(t => !editForm.testIds.includes(t.id) && t.name.toLowerCase().includes(editForm.testSearch.toLowerCase())).length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">No matching tests</div>
                        ) : (
                          tests.filter(t => !editForm.testIds.includes(t.id) && t.name.toLowerCase().includes(editForm.testSearch.toLowerCase())).slice(0, 20).map((t: any) => (
                            <button 
                              key={t.id} 
                              type="button" 
                              onClick={() => {
                                editUpdate('testIds', [...editForm.testIds, t.id])
                                editUpdate('testSearch', '')
                                setTestSuggestOpen(false)
                              }} 
                              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
                            >
                              <span className="text-sm text-slate-800">{t.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {editForm.testIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {editForm.testIds.map(id => {
                        const t = tests.find(x => x.id === id)
                        return (
                          <span key={id} className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-sm text-sky-700">
                            {t?.name || id}
                            <button 
                              onClick={() => editUpdate('testIds', editForm.testIds.filter(x => x !== id))}
                              className="ml-1 text-sky-600 hover:text-sky-800"
                            >×</button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
                  <input value={editForm.notes} onChange={e => editUpdate('notes', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setEditOpen(false); setEditRow(null) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">Cancel</button>
                <button type="button" onClick={saveEdit} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
