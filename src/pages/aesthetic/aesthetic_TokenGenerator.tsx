import { useEffect, useMemo, useRef, useState } from 'react'
import { labApi, aestheticApi } from '../../utils/api'
import Aesthetic_TokenSlip, { type TokenSlipData } from '../../components/aesthetic/aesthetic_TokenSlip'

export default function Aesthetic_TokenGeneratorPage() {
  const [phone, setPhone] = useState('')
  const [patientName, setPatientName] = useState('')
  const [mrNumber, setMrNumber] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [guardianRelation, setGuardianRelation] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [cnic, setCnic] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [apptDate, setApptDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [schedules, setSchedules] = useState<Array<{ _id: string; doctorId: string; dateIso: string; startTime: string; endTime: string; slotMinutes: number; fee?: number; followupFee?: number }>>([])
  const [scheduleId, setScheduleId] = useState('')
  const [selectedSlotNo, setSelectedSlotNo] = useState<number | null>(null)
  const [slotRows, setSlotRows] = useState<Array<{ slotNo: number; start: string; end: string; status: 'free' | 'appt' | 'token'; appt?: any; tokenNo?: string }>>([])
  const [consultationFee, setConsultationFee] = useState('')
  const [discount, setDiscount] = useState('0')
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [confirmPatient, setConfirmPatient] = useState<null | { summary: string; patient: any; key: string }>(null)
  const skipLookupKeyRef = useRef<string | null>(null)
  const lastPromptKeyRef = useRef<string | null>(null)
  const [phonePatients, setPhonePatients] = useState<any[]>([])
  const [showPhonePicker, setShowPhonePicker] = useState(false)
  const [forceCreateNextSubmit, setForceCreateNextSubmit] = useState(false)
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false)
  const [phoneSuggestItems, setPhoneSuggestItems] = useState<any[]>([])
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const phoneSuggestQueryRef = useRef<string>('')

  const clearPatientFieldsKeepPhone = () => {
    const digits = String(phone || '').replace(/\D+/g, '')
    const norm = (s: string)=> String(s||'').trim().toLowerCase().replace(/\s+/g,' ')
    const key = `${digits}|${norm(patientName)}`
    setMrNumber('')
    setPatientName('')
    setAge('')
    setGender('')
    setAddress('')
    setGuardianRelation('')
    setGuardianName('')
    setCnic('')
    setShowPhonePicker(false)
    setPhonePatients([])
    setPhoneSuggestOpen(false)
    setPhoneSuggestItems([])
    skipLookupKeyRef.current = key
    lastPromptKeyRef.current = key
    setForceCreateNextSubmit(true)
    setTimeout(() => { try { nameRef.current?.focus() } catch {} }, 50)
  }
  // Optional: create a procedure session along with token
  const [createSession, setCreateSession] = useState(false)
  const [catalog, setCatalog] = useState<Array<{ _id: string; name: string; basePrice?: number; package?: { sessionsCount?: number; intervalDays?: number } }>>([])
  const [procId, setProcId] = useState('')
  const [procPrice, setProcPrice] = useState('')
  const [procDiscount, setProcDiscount] = useState('0')
  const [procPaid, setProcPaid] = useState('0')
  const [procDoctorId, setProcDoctorId] = useState('')
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; specialty?: string; fee?: number; shares?: number }>>([])
  const [showSlip, setShowSlip] = useState(false)
  const [slipData, setSlipData] = useState<TokenSlipData | null>(null)

  const finalFee = useMemo(() => {
    const fee = parseFloat(consultationFee || '0')
    const off = parseFloat(discount || '0')
    const f = Math.max(fee - off, 0)
    return Number.isFinite(f) ? f : 0
  }, [consultationFee, discount])

  const [toast, setToast] = useState<string | null>(null)
  // Load doctors from Aesthetic backend
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const res: any = await aestheticApi.listDoctors({ limit: 500 })
          const items: any[] = (res?.doctors || res || []) as any[]
          const mapped = items.map(d => ({ id: String(d._id || d.id), name: String(d.name || ''), specialty: d.specialty || '', fee: Number(d.fee || 0), shares: Number(d.shares || 0) }))
          if (!cancelled) setDoctors(mapped)
        } catch { if (!cancelled) setDoctors([]) }
      })()
    return () => { cancelled = true }
  }, [])

  // Optional: prefill consultation fee when doctor is chosen and fee not set
  useEffect(() => {
    if (!doctorId) return
    if (consultationFee && consultationFee.trim() !== '') return
    const d = doctors.find(x => x.id === doctorId)
    if (d && d.fee != null) setConsultationFee(String(d.fee))
  }, [doctorId, doctors])

  // Load doctor schedules for selected date
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          setSelectedSlotNo(null)
          setSlotRows([])
          if (!doctorId) { setSchedules([]); setScheduleId(''); return }
          const res: any = await aestheticApi.listDoctorSchedules({ doctorId, date: apptDate })
          const items = (res?.schedules || []) as any[]
          if (cancelled) return
          setSchedules(items)
          if (items.length === 1) setScheduleId(String(items[0]._id))
          else setScheduleId('')
        } catch {
          if (!cancelled) { setSchedules([]); setScheduleId(''); setSelectedSlotNo(null); setSlotRows([]) }
        }
      })()
    return () => { cancelled = true }
  }, [doctorId, apptDate])

  function toMin(hhmm: string) { const [h, m] = (hhmm || '').split(':').map(x => parseInt(x, 10) || 0); return (h * 60) + m }
  function fromMin(min: number) { const h = Math.floor(min / 60).toString().padStart(2, '0'); const m = (min % 60).toString().padStart(2, '0'); return `${h}:${m}` }

  // Load slots + status for selected schedule
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          setSelectedSlotNo(null)
          setSlotRows([])
          const s = schedules.find(x => String(x._id) === String(scheduleId))
          if (!s) return
          const [ap, tk]: any = await Promise.all([
            aestheticApi.listAppointments({ scheduleId: String(s._id) }),
            aestheticApi.listTokens({ scheduleId: String(s._id) } as any),
          ])
          const appts: any[] = ap?.appointments || []
          const tokens: any[] = tk?.items || tk?.tokens || []
          const tokenBySlot = new Map<number, any>()
          for (const t of tokens) {
            const st = String(t?.status || '')
            if (st === 'returned' || st === 'cancelled') continue
            const n = Number(t.slotNo || 0)
            if (n > 0) tokenBySlot.set(n, t)
          }
          const slotMinutes = Math.max(5, Number(s.slotMinutes || 15))
          const total = Math.max(0, Math.floor((toMin(s.endTime) - toMin(s.startTime)) / slotMinutes))
          const rows: Array<{ slotNo: number; start: string; end: string; status: 'free' | 'appt' | 'token'; appt?: any; tokenNo?: string }> = []
          for (let i = 1; i <= total; i++) {
            const startMin = toMin(s.startTime) + (i - 1) * slotMinutes
            const se = { start: fromMin(startMin), end: fromMin(startMin + slotMinutes) }
            const appt = appts.find(a => Number(a.slotNo || 0) === i && ['booked', 'confirmed', 'checked-in'].includes(String(a.status || '')))
            if (appt) rows.push({ slotNo: i, ...se, status: 'appt', appt })
            else if (tokenBySlot.has(i)) rows.push({ slotNo: i, ...se, status: 'token', tokenNo: String(tokenBySlot.get(i)?.number ?? tokenBySlot.get(i)?.tokenNo ?? '') })
            else rows.push({ slotNo: i, ...se, status: 'free' })
          }
          if (!cancelled) setSlotRows(rows)
        } catch {
          if (!cancelled) { setSlotRows([]); setSelectedSlotNo(null) }
        }
      })()
    return () => { cancelled = true }
  }, [scheduleId, schedules])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!phoneSuggestWrapRef.current) return
      if (!phoneSuggestWrapRef.current.contains(e.target as any)) setPhoneSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Token sequence from backend
  const [nextNumber, setNextNumber] = useState<number>(1)
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const r: any = await aestheticApi.nextTokenNumber()
          if (!cancelled) setNextNumber(Number(r?.next || 1))
        } catch { }
      })()
    return () => { cancelled = true }
  }, [consultationFee, discount, doctorId, patientName])

  // Load procedure catalog for optional session creation
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const res: any = await aestheticApi.listProcedureCatalog({ limit: 200 })
          if (!cancelled) setCatalog(res.items || [])
        } catch { }
      })()
    return () => { cancelled = true }
  }, [])

  function normName(s: string) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ') }

  async function lookupExistingByPhoneAndName() {
    const digits = (phone || '').replace(/\D+/g, '')
    const nameEntered = (patientName || '').trim()
    if (!digits || !nameEntered) return
    try {
      const key = `${digits}|${normName(nameEntered)}`
      if (skipLookupKeyRef.current === key || lastPromptKeyRef.current === key) return
      const r: any = await labApi.searchPatients({ phone: digits, limit: 10 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (!list.length) return
      const p = list.find(x => normName(x.fullName) === normName(nameEntered))
      if (!p) return
      const summary = [
        `Found existing patient. Apply details?`,
        `MRN: ${p.mrn || '-'}`,
        `Name: ${p.fullName || '-'}`,
        `Phone: ${p.phoneNormalized || digits}`,
        `Age: ${p.age ?? (age?.trim() || '-')}`,
        p.gender ? `Gender: ${p.gender}` : null,
        p.address ? `Address: ${p.address}` : null,
        p.fatherName ? `Guardian: ${p.fatherName}` : null,
        `Guardian Relation: ${p.guardianRel || (guardianRelation || '-')}`,
        p.cnicNormalized ? `CNIC: ${p.cnicNormalized}` : null,
      ].filter(Boolean).join('\n')
      setTimeout(() => { lastPromptKeyRef.current = key; setConfirmPatient({ summary, patient: p, key }) }, 0)
    } catch { }
  }

  async function autoFillPatientByPhone(phoneNumber: string) {
    const digits = (phoneNumber || '').replace(/\D+/g, '')
    if (!digits || digits.length < 10) return
    try {
      const r: any = await labApi.searchPatients({ phone: digits, limit: 10 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (list.length >= 1) {
        // Always show picker (even for a single match) so user can choose existing OR create new under same phone.
        setPhonePatients(list)
        setShowPhonePicker(true)
        setToast(list.length > 1 ? `${list.length} patients found - select one` : 'Patient found - select or create new')
        setTimeout(() => setToast(null), 2000)
      } else {
        setToast('New patient - you can create under this phone')
        setTimeout(() => setToast(null), 2000)
      }
    } catch { }
  }

  function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    const digitsOnly = String(v || '').replace(/\D+/g, '').slice(0, 11)
    setPhone(digitsOnly)
    if (forceCreateNextSubmit) setForceCreateNextSubmit(false)
      ; (window as any)._labPhoneDeb && clearTimeout((window as any)._labPhoneDeb)
    const digits = digitsOnly
    // Incremental suggestions after 3+ digits
    if ((window as any)._aestPhoneSuggestDeb) clearTimeout((window as any)._aestPhoneSuggestDeb)
    if (digits.length >= 3) {
      ; (window as any)._aestPhoneSuggestDeb = setTimeout(() => runPhoneSuggestLookup(digits), 250)
    } else {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
    if (digits.length >= 10) {
      ; (window as any)._labPhoneDeb = setTimeout(() => autoFillPatientByPhone(digitsOnly), 500)
    }
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

  async function onPhoneBlur() { if (patientName.trim()) await lookupExistingByPhoneAndName() }
  async function onNameBlur() { if (phone.trim()) await lookupExistingByPhoneAndName() }

  async function generateToken(e: React.FormEvent) {
    e.preventDefault()
    // Basic validation to ensure patient can be created in Lab
    const nameVal = patientName.trim()
    const phoneVal = phone.trim()
    if (!nameVal) { setToast('Enter patient name'); setTimeout(() => setToast(null), 2000); return }
    if (!phoneVal) { setToast('Enter phone'); setTimeout(() => setToast(null), 2000); return }
    // Determine billing amounts: if creating a procedure session and a procedure is selected,
    // use the procedure price/discount; otherwise, use consultation fee/discount.
    const selectedProc = (createSession && procId) ? catalog.find(c => String(c._id) === String(procId)) : undefined
    const isProcedureBilling = !!(createSession && procId)
    const fee = isProcedureBilling
      ? Number(procPrice || selectedProc?.basePrice || 0)
      : (parseFloat(consultationFee || '0') || 0)
    const off = isProcedureBilling
      ? Number(procDiscount || 0)
      : (parseFloat(discount || '0') || 0)
    const payable = Math.max(fee - off, 0)
    let pat: any = null
    try {
      const pRes: any = await labApi.findOrCreatePatient({
        fullName: nameVal,
        guardianName: guardianName.trim() || undefined,
        phone: phoneVal || undefined,
        cnic: cnic.trim() || undefined,
        gender: gender || undefined,
        address: address.trim() || undefined,
        age: age.trim() || undefined,
        guardianRel: guardianRelation || undefined,
        ...(forceCreateNextSubmit ? { forceCreate: true } : {}),
      })
      pat = pRes?.patient || null
      if (forceCreateNextSubmit) setForceCreateNextSubmit(false)
      if (!pat) { setToast('Could not create/find patient. Please verify details.'); setTimeout(() => setToast(null), 2500); return }
      // Ensure phone/cnic are persisted on the Lab patient regardless of matching branch chosen by backend
      try {
        const upd: any = await labApi.updatePatient(String(pat._id), { phone: phoneVal || undefined, cnic: cnic.trim() || undefined })
        if (upd?.patient) pat = upd.patient
      } catch { }
    } catch {
      setToast('Failed to create/find patient. Check connectivity or permissions.');
      setTimeout(() => setToast(null), 2500);
      return
    }
    // If procedure session is selected, create the session first to obtain its id
    let createdSessionId: string | undefined
    let createdSessionDefaults: { price?: number; discount?: number } = {}
    if (createSession && procId && pat) {
      try {
        const selected = catalog.find(c => String(c._id) === String(procId))
        const interval = Number(selected?.package?.intervalDays || 0)
        const nextVisitDate = interval > 0 ? new Date(Date.now() + interval * 864e5).toISOString().slice(0, 10) : undefined
        const sessionResp: any = await aestheticApi.createProcedureSession({
          labPatientId: String(pat._id || ''),
          patientMrn: String(pat.mrn || '') || undefined,
          patientName: String(pat.fullName || '') || undefined,
          phone: String(pat.phoneNormalized || '') || undefined,
          procedureId: procId,
          procedureName: selected?.name,
          date: new Date().toISOString(),
          doctorId: procDoctorId || undefined,
          price: Number(procPrice || selected?.basePrice || 0),
          discount: Number(procDiscount || 0),
          paid: 0,
          status: 'planned',
          nextVisitDate,
        })
        const created = (sessionResp && sessionResp._id) ? sessionResp : (sessionResp?.doc || sessionResp)
        createdSessionId = String(created?._id || '') || undefined
        createdSessionDefaults = { price: Number(created?.price || 0), discount: Number(created?.discount || 0) }
      } catch { }
    }

    const res: any = await aestheticApi.createToken({
      date: new Date().toISOString(),
      patientName: nameVal,
      phone: phoneVal,
      mrNumber: (mrNumber.trim() || (pat?.mrn ? String(pat.mrn) : '')) || undefined,
      age: age.trim() || undefined,
      gender: gender || undefined,
      address: address.trim() || undefined,
      guardianRelation: guardianRelation || undefined,
      guardianName: guardianName.trim() || undefined,
      cnic: cnic.trim() || undefined,
      doctorId: doctorId || undefined,
      apptDate: apptDate || undefined,
      scheduleId: scheduleId || undefined,
      apptStart: (scheduleId && selectedSlotNo)
        ? (() => {
          const s = schedules.find(x => String(x._id) === String(scheduleId))
          if (!s) return undefined
          const slotMinutes = Math.max(5, Number(s.slotMinutes || 15))
          const startMin = toMin(s.startTime) + (selectedSlotNo - 1) * slotMinutes
          return fromMin(startMin)
        })()
        : undefined,
      // For non-procedure: fallback to consultation fee/discount
      fee: createdSessionDefaults.price != null ? createdSessionDefaults.price : fee,
      discount: createdSessionDefaults.discount != null ? createdSessionDefaults.discount : off,
      payable: createdSessionId ? Number(procPaid || 0) : payable,
      // Link to session and record today's deposit if a session was created
      procedureSessionId: createdSessionId,
      depositToday: createdSessionId ? Number(procPaid || 0) : undefined,
      status: 'queued',
    })
    const rec = res?.token
    setToast(`Generated token #${rec?.number ?? ''}${pat?.mrn ? ` • MRN ${pat.mrn}` : ''}`)
    try {
      const t = rec || res
      const docName = doctors.find(d => d.id === doctorId)?.name || ''
      const deptName = 'Aesthetic'
      const slip: TokenSlipData = {
        tokenNo: String(t?.number ?? nextNumber ?? ''),
        departmentName: deptName,
        doctorName: docName || undefined,
        patientName: String(t?.patientName || nameVal),
        phone: String(t?.phone || phoneVal),
        age: String(t?.age || age || ''),
        gender: String(t?.gender || gender || ''),
        mrn: String(t?.mrNumber || mrNumber || ''),
        guardianRel: String(t?.guardianRelation || guardianRelation || ''),
        guardianName: String(t?.guardianName || guardianName || ''),
        cnic: String(t?.cnic || cnic || ''),
        address: String(t?.address || address || ''),
        amount: Number(t?.fee || fee || 0),
        discount: Number(t?.discount || off || 0),
        payable: Number(t?.payable || payable || 0),
        createdAt: String(t?.createdAtIso || new Date().toISOString()),
        procedurePrice: t?.procedurePrice,
        procedureDiscount: t?.procedureDiscount,
        procedurePaidToday: t?.procedurePaidToday,
        procedurePaidToDate: t?.procedurePaidToDate,
        procedureBalanceAfter: t?.procedureBalanceAfter,
        fbr: {
          fbrInvoiceNo: t?.fbrInvoiceNo,
          qrCode: t?.fbrQrCode,
          status: t?.fbrStatus,
          mode: t?.fbrMode,
          error: t?.fbrError,
        },
      }
      setSlipData(slip)
      setShowSlip(true)
    } catch { }
    setTimeout(() => setToast(null), 2000)
    setPhone(''); setPatientName(''); setMrNumber(''); setAge(''); setGender(''); setGuardianRelation(''); setGuardianName(''); setCnic(''); setAddress(''); setDoctorId(''); setConsultationFee(''); setDiscount('0');
    setSchedules([]); setScheduleId(''); setSelectedSlotNo(null); setSlotRows([])
    setCreateSession(false); setProcId(''); setProcDoctorId(''); setProcPrice(''); setProcDiscount('0'); setProcPaid('0')
    // refresh next number
    try { const r: any = await aestheticApi.nextTokenNumber(); setNextNumber(Number(r?.next || 1)) } catch { }
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Token Generator</h2>
      <form onSubmit={generateToken} className="mt-6 space-y-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Patient Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                <div ref={phoneSuggestWrapRef} className="relative">
                  <input
                    ref={phoneRef}
                    onBlur={onPhoneBlur}
                    onFocus={() => { if (phoneSuggestItems.length > 0) setPhoneSuggestOpen(true) }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Type phone to search"
                    value={phone}
                    onChange={onPhoneChange}
                    maxLength={11}
                  />
                  {phoneSuggestOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                      {phoneSuggestItems.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">No results</div>
                      ) : (
                        phoneSuggestItems.map((p: any, idx: number) => (
                          <button
                            type="button"
                            key={p._id || idx}
                            onClick={() => {
                              setMrNumber(p.mrn || '')
                              setPatientName(p.fullName || patientName)
                              setGuardianName(p.fatherName || guardianName)
                              setGuardianRelation(p.guardianRel || guardianRelation)
                              setAddress(p.address || address)
                              setGender(p.gender || gender)
                              setAge(p.age || age)
                              setPhone(p.phoneNormalized || phone)
                              setCnic(p.cnicNormalized || cnic)
                              setPhoneSuggestOpen(false)
                            }}
                            className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <div className="text-sm font-medium text-slate-800">{p.fullName || 'Unnamed'} <span className="text-xs text-slate-500">{p.mrn || '-'}</span></div>
                            <div className="text-xs text-slate-600">{p.phoneNormalized || ''} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                            {p.address && <div className="text-xs text-slate-500 truncate">{p.address}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Patient Name</label>
                <input ref={nameRef} onBlur={onNameBlur} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="Full Name" value={patientName} onChange={e => setPatientName(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Search by MR Number</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="Enter MR# (e.g., MR-15)" value={mrNumber} onChange={e => setMrNumber(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="e.g., 25" value={age} onChange={e => setAge(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">Select gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Guardian</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={guardianRelation} onChange={e => setGuardianRelation(e.target.value)}>
                  <option value="">S/O or D/O</option>
                  <option value="S/O">S/O</option>
                  <option value="D/O">D/O</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Guardian Name</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="Father/Guardian Name" value={guardianName} onChange={e => setGuardianName(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">CNIC</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="13-digit CNIC (no dashes)" maxLength={13} value={cnic} onChange={e => setCnic(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" rows={3} placeholder="Residential Address" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Visit & Billing</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Doctor</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                  <option value="">Select doctor</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` • ${d.specialty}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Appointment Date</label>
                  <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Doctor Schedule</label>
                  <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" value={scheduleId} onChange={e => setScheduleId(e.target.value)}>
                    <option value="">Select schedule</option>
                    {schedules.map(s => (
                      <option key={String(s._id)} value={String(s._id)}>
                        {String(s.startTime)} - {String(s.endTime)} • {Number(s.slotMinutes || 15)} min
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-xs text-slate-500">Select a schedule to pick a slot.</div>
                </div>
              </div>
            </div>

            {scheduleId && slotRows.length > 0 && (
              <div className="mt-4 rounded-md border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Slots</div>
                  <div className="text-xs text-slate-500">Free • Appointment • Token</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {slotRows.map(r => {
                    const isSelected = selectedSlotNo === r.slotNo
                    const isFree = r.status === 'free'
                    const isAppt = r.status === 'appt'
                    const isToken = r.status === 'token'
                    const base = 'rounded-md border px-2 py-1 text-xs'
                    const cls = isSelected
                      ? `${base} border-fuchsia-500 bg-fuchsia-50 text-fuchsia-800`
                      : isFree
                        ? `${base} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`
                        : isAppt
                          ? `${base} border-amber-200 bg-amber-50 text-amber-800 cursor-not-allowed`
                          : `${base} border-rose-200 bg-rose-50 text-rose-800 cursor-not-allowed`
                    const disabled = !isFree
                    const title = isAppt ? 'Appointment' : isToken ? `Token ${r.tokenNo || ''}` : 'Free'
                    return (
                      <button
                        key={r.slotNo}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedSlotNo(r.slotNo)}
                        className={cls}
                        title={title}
                      >
                        {r.start} - {r.end} • #{r.slotNo}{isToken ? ` • Token ${r.tokenNo || ''}` : ''}
                      </button>
                    )
                  })}
                </div>
                {selectedSlotNo && (
                  <div className="mt-2 text-xs text-slate-600">Selected slot: <span className="font-semibold">#{selectedSlotNo}</span></div>
                )}
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Fee Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Consultation Fee</label>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="Fee" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Discount</label>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Final Fee</label>
              <div className="flex h-10 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">Rs. {finalFee.toFixed(2)}</div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <input id="create-session" type="checkbox" checked={createSession} onChange={e => setCreateSession(e.target.checked)} />
            <label htmlFor="create-session" className="text-sm">Create a procedure session for this visit</label>
          </div>
          {createSession && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Procedure</label>
                <select value={procId} onChange={e => { setProcId(e.target.value); const sel = catalog.find(c => String(c._id) === String(e.target.value)); setProcPrice(sel ? String(sel.basePrice || '') : '') }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                  <option value="">Select procedure</option>
                  {catalog.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Procedure Doctor</label>
                <select value={procDoctorId} onChange={e => setProcDoctorId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                  <option value="">Select doctor</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` • ${d.specialty}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Price</label>
                <input value={procPrice} onChange={e => setProcPrice(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Discount</label>
                <input value={procDiscount} onChange={e => setProcDiscount(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Paid</label>
                <input value={procPaid} onChange={e => setProcPaid(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
          )}
        </section>

        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">Next Token: <span className="font-semibold">{nextNumber}</span></div>
          <div className="flex items-center gap-3">
            <button type="reset" onClick={(e) => { e.preventDefault(); setPhone(''); setPatientName(''); setMrNumber(''); setAge(''); setGender(''); setGuardianRelation(''); setGuardianName(''); setCnic(''); setAddress(''); setDoctorId(''); setConsultationFee(''); setDiscount('0') }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">Reset</button>
            <button type="submit" className="rounded-md bg-fuchsia-700 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-800">Generate Token</button>
          </div>
        </div>
      </form>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
      {showSlip && slipData && (
        <Aesthetic_TokenSlip open={showSlip} onClose={() => setShowSlip(false)} data={slipData} autoPrint={true} />
      )}
      {showPhonePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
            <div className="font-medium mb-2">Select Patient (Phone: {phone})</div>
            <div className="max-h-96 overflow-y-auto">
              {phonePatients.map((p, idx) => (
                <button key={p._id || idx} onClick={() => {
                  setMrNumber(p.mrn || '')
                  setPatientName(p.fullName || patientName)
                  setGuardianName(p.fatherName || guardianName)
                  setGuardianRelation(p.guardianRel || guardianRelation)
                  setAddress(p.address || address)
                  setGender(p.gender || gender)
                  setAge(p.age || age)
                  setPhone(p.phoneNormalized || phone)
                  setCnic(p.cnicNormalized || cnic)
                  setShowPhonePicker(false)
                  setForceCreateNextSubmit(false)
                  setToast('Patient selected')
                  setTimeout(() => setToast(null), 2000)
                }} className="mb-2 w-full rounded-md border border-slate-200 p-3 text-left hover:bg-slate-50">
                  <div className="text-sm font-medium">{p.fullName || 'Unnamed'} <span className="text-xs text-slate-500">{p.mrn || '-'}</span></div>
                  <div className="text-xs text-slate-600">{p.phoneNormalized || ''} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button onClick={() => setShowPhonePicker(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={clearPatientFieldsKeepPhone} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Create New Patient</button>
            </div>
          </div>
        </div>
      )}
      {confirmPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
            <div className="font-medium mb-2">Existing Patient Found</div>
            <pre className="whitespace-pre-wrap text-xs bg-slate-50 border border-slate-200 rounded p-2 mb-3">{confirmPatient.summary}</pre>
            <div className="flex items-center justify-end gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                onClick={() => { skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null) }}
              >Ignore</button>
              <button
                className="rounded-md bg-fuchsia-700 px-3 py-1.5 text-sm text-white"
                onClick={() => {
                  const p = confirmPatient.patient
                  setMrNumber(p.mrn || '')
                  setPatientName(p.fullName || patientName)
                  setGuardianName(p.fatherName || guardianName)
                  setGuardianRelation(p.guardianRel || guardianRelation)
                  setAddress(p.address || address)
                  setGender(p.gender || gender)
                  setAge(p.age || age)
                  setPhone(p.phoneNormalized || phone)
                  setCnic(p.cnicNormalized || cnic)
                  setConfirmPatient(null)
                }}
              >Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
