import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { logAudit } from '../../utils/hospital_audit'
import { corporateApi, hospitalApi } from '../../utils/api'
import { fmt12 } from '../../utils/timeFormat'
import Hospital_TokenSlip, { type TokenSlipData } from '../../components/hospital/Hospital_TokenSlip'

type SearchOption = { value: string; label: string }
function SearchSelect({ options, value, onChange, placeholder }: { options: SearchOption[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as any)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const selectedLabel = useMemo(() => (options.find(o => String(o.value) === String(value))?.label || ''), [options, value])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options.filter(o => !q || o.label.toLowerCase().includes(q)).slice(0, 100)
  }, [options, query])
  return (
    <div ref={ref} className="relative">
      <input
        value={open ? query : selectedLabel}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
      />
      <button type="button" onClick={() => setOpen(o => !o)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">▾</button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No results</div>
          ) : filtered.map(opt => (
            <button
              type="button"
              key={String(opt.value)}
              onClick={() => { onChange(String(opt.value)); setOpen(false) }}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
            >
              <div className="text-sm text-slate-800">{opt.label}</div>
              {String(opt.value) === String(value) ? <span className="text-xs text-violet-600">✓</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Hospital_TokenGenerator() {
  const [searchParams] = useSearchParams()
  const tokenId = searchParams.get('tokenId')
  const isEditMode = Boolean(tokenId)
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; fee?: number }>>([])
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; fee?: number }>>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const dRes = await hospitalApi.listDepartments() as any
        const deps = (dRes.departments || dRes || []).map((d: any) => ({ id: String(d._id || d.id), name: d.name, fee: Number(d.opdBaseFee ?? d.baseFee ?? d.fee ?? 0) }))
        const docRes = await hospitalApi.listDoctors() as any
        const docs = (docRes.doctors || docRes || []).map((r: any) => ({ id: String(r._id || r.id), name: r.name, fee: Number(r.opdBaseFee ?? r.baseFee ?? r.fee ?? 0) }))
        // load corporate companies
        let comps: Array<{ id: string; name: string }> = []
        try {
          const cRes = await corporateApi.listCompanies() as any
          comps = (cRes?.companies || []).map((c: any) => ({ id: String(c._id || c.id), name: c.name }))
        } catch { }
        if (!cancelled) { setDepartments(deps); setDoctors(docs); setCompanies(comps) }
      } catch { }
    }

    load()
    return () => { cancelled = true }
  }, [])
  const [form, setForm] = useState({
    phone: '',
    mrNumber: '',
    patientName: '',
    age: '',
    gender: '',
    guardianRel: '',
    guardianName: '',
    cnic: '',
    address: '',
    doctor: '',
    departmentId: '',
    billingType: 'Cash',
    consultationFee: '',
    discount: '0',
    corporateCompanyId: '',
    corporatePreAuthNo: '',
    corporateCoPayPercent: '',
    corporateCoverageCap: '',
  })

  const [loadingToken, setLoadingToken] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadTokenForEdit() {
      if (!tokenId) return
      try {
        setLoadingToken(true)
        const res: any = await hospitalApi.getToken(String(tokenId))
        const t: any = res?.token
        if (!t) throw new Error('Token not found')

        const p: any = t.patientId || {}
        const docId = t.doctorId?._id || t.doctorId
        const depId = t.departmentId?._id || t.departmentId

        setForm(prev => ({
          ...prev,
          phone: String(p.phoneNormalized || prev.phone || ''),
          mrNumber: String(p.mrn || t.mrn || prev.mrNumber || ''),
          patientName: String(p.fullName || t.patientName || prev.patientName || ''),
          age: String(p.age || prev.age || ''),
          gender: String(p.gender || prev.gender || ''),
          guardianRel: String(p.guardianRel || prev.guardianRel || ''),
          guardianName: String(p.fatherName || prev.guardianName || ''),
          cnic: String(p.cnicNormalized || prev.cnic || ''),
          address: String(p.address || prev.address || ''),
          doctor: docId ? String(docId) : '',
          departmentId: depId ? String(depId) : prev.departmentId,
          consultationFee: String(Number(t.fee || 0) + Number(t.discount || 0)),
          discount: String(Number(t.discount || 0)),
        }))
      } catch (e: any) {
        showToast('error', e?.message || 'Failed to load token for edit')
      } finally {
        if (!cancelled) setLoadingToken(false)
      }
    }
    loadTokenForEdit()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId])



  // Scheduling (OPD appointments)
  const [apptDate, setApptDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [schedules, setSchedules] = useState<Array<{ _id: string; doctorId: string; dateIso: string; startTime: string; endTime: string; slotMinutes: number; fee?: number; followupFee?: number }>>([])
  const [scheduleId, setScheduleId] = useState('')
  const [selectedSlotNo, setSelectedSlotNo] = useState<number | null>(null)
  const [slotRows, setSlotRows] = useState<Array<{ slotNo: number; start: string; end: string; status: 'free' | 'appt' | 'token'; appt?: any; tokenNo?: string }>>([])

  const finalFee = useMemo(() => {
    const fee = parseFloat(form.consultationFee || '0')
    const discount = parseFloat(form.discount || '0')
    const f = Math.max(fee - discount, 0)
    return isNaN(f) ? 0 : f
  }, [form.consultationFee, form.discount])

  const update = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const reset = () => {
    setForm({
      phone: '',
      mrNumber: '',
      patientName: '',
      age: '',
      gender: '',
      guardianRel: '',
      guardianName: '',
      cnic: '',
      address: '',
      doctor: '',
      departmentId: '',
      billingType: 'Cash',
      consultationFee: '',
      discount: '0',
      corporateCompanyId: '',
      corporatePreAuthNo: '',
      corporateCoPayPercent: '',
      corporateCoverageCap: '',
    })
  }

  const [showSlip, setShowSlip] = useState(false)
  const [slipData, setSlipData] = useState<TokenSlipData | null>(null)

  // IPD inline admit state
  const isIPD = useMemo(() => {
    const dep = departments.find(d => String(d.id) === String(form.departmentId))
    return (dep?.name || '').trim().toLowerCase() === 'ipd'
  }, [departments, form.departmentId])
  const [ipdBeds, setIpdBeds] = useState<Array<{ _id: string; label: string; charges?: number; floorName?: string; locationType?: 'room'|'ward'; locationName?: string }>>([])
  const [ipdBedId, setIpdBedId] = useState('')
  const [ipdDeposit, setIpdDeposit] = useState('')

  const ipdBedOptions = useMemo(() => {
    const items = (ipdBeds || []).slice()
    const locSort = (b: any) => `${String(b.floorName || '')}__${String(b.locationType || '')}__${String(b.locationName || '')}__${String(b.label || '')}`.toLowerCase()
    items.sort((a: any, b: any) => locSort(a).localeCompare(locSort(b)))
    return items
  }, [ipdBeds])

  useEffect(() => {
    let cancelled = false
    async function loadBeds() {
      if (!isIPD) return
      try {
        const res = await hospitalApi.listBeds({ status: 'available' }) as any
        if (!cancelled) setIpdBeds(res.beds || [])
      } catch { }
    }
    loadBeds()
    return () => { cancelled = true }
  }, [isIPD])

  // When a bed is selected, auto-fill Bed Charges from bed.charges
  useEffect(() => {
    if (!ipdBedId) { setIpdDeposit(''); return }
    const sel = ipdBeds.find(b => String(b._id) === String(ipdBedId))
    if (sel && sel.charges != null) setIpdDeposit(String(sel.charges))
  }, [ipdBedId, ipdBeds])

  // Auto-quote fee when department/doctor/corporate changes
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!form.departmentId) return
      const getBaseFromQuote = async (): Promise<number> => {
        try {
          const res = await hospitalApi.quoteOPDPrice({ departmentId: form.departmentId, doctorId: form.doctor || undefined, visitType: undefined }) as any
          const feeCandidate = [res?.fee, res?.feeResolved, res?.pricing?.feeResolved, res?.amount, res?.price, res?.data?.fee]
            .map((x: any) => Number(x))
            .find(n => Number.isFinite(n) && n >= 0)
          return feeCandidate ?? 0
        } catch { return 0 }
      }

      if (form.billingType === 'Corporate' && form.corporateCompanyId) {
        // Local corporate compute to avoid relying on backend quote behavior
        try {
          const r = await corporateApi.listRateRules({ companyId: form.corporateCompanyId, scope: 'OPD' }) as any
          const rules: any[] = (r?.rules || []).filter((x: any) => x && x.active !== false)
          const today = new Date().toISOString().slice(0, 10)
          const valid = rules.filter((x: any) => (!x.effectiveFrom || String(x.effectiveFrom).slice(0, 10) <= today) && (!x.effectiveTo || today <= String(x.effectiveTo).slice(0, 10)))
          const pri = (x: any) => (x?.priority ?? 100)
          const docMatch = form.doctor ? valid.filter(x => x.ruleType === 'doctor' && String(x.refId) === String(form.doctor)).sort((a: any, b: any) => pri(a) - pri(b))[0] : null
          const depMatch = valid.filter(x => x.ruleType === 'department' && String(x.refId) === String(form.departmentId)).sort((a: any, b: any) => pri(a) - pri(b))[0] || null
          const defMatch = valid.filter(x => x.ruleType === 'default').sort((a: any, b: any) => pri(a) - pri(b))[0] || null
          const candidates = [docMatch, depMatch, defMatch].filter(Boolean) as any[]
          candidates.sort((a: any, b: any) => {
            const d = pri(a) - pri(b)
            if (d !== 0) return d
            const rank = (t: string) => t === 'doctor' ? 0 : t === 'department' ? 1 : 2
            return rank(a.ruleType) - rank(b.ruleType)
          })
          const rule = candidates[0] || null
          const docBase = doctors.find(d => String(d.id) === String(form.doctor))?.fee
          const depBase = departments.find(d => String(d.id) === String(form.departmentId))?.fee
          let base = Number.isFinite(docBase!) && Number(docBase) > 0 ? Number(docBase) : (Number.isFinite(depBase!) && Number(depBase) > 0 ? Number(depBase) : NaN)
          if (!Number.isFinite(base) || base <= 0) base = await getBaseFromQuote()
          let eff = Number(base || 0)
          if (rule) {
            const mode = rule.mode; const val = Number(rule.value || 0)
            if (mode === 'fixedPrice') eff = Math.max(0, val)
            else if (mode === 'percentDiscount') eff = Math.max(0, eff - (eff * (val / 100)))
            else if (mode === 'fixedDiscount') eff = Math.max(0, eff - val)
          }
          if (!cancelled) setForm(prev => ({ ...prev, consultationFee: String(eff) }))
          return
        } catch {
          // fall through to plain quote as last resort
        }
      }

      // No corporate or failed local compute: use backend quote
      // Skip if schedule is selected - schedule fee takes precedence
      if (scheduleId) return
      try {
        const res = await hospitalApi.quoteOPDPrice({ departmentId: form.departmentId, doctorId: form.doctor || undefined, visitType: undefined, corporateId: form.billingType === 'Corporate' ? (form.corporateCompanyId || undefined) : undefined }) as any
        if (!cancelled) {
          const feeCandidate = [res?.fee, res?.feeResolved, res?.pricing?.feeResolved, res?.amount, res?.price, res?.data?.fee]
            .map((x: any) => Number(x))
            .find(n => Number.isFinite(n) && n >= 0)
          if (feeCandidate != null) setForm(prev => ({ ...prev, consultationFee: String(feeCandidate) }))
        }
      } catch { }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.departmentId, form.doctor, form.corporateCompanyId, form.billingType, scheduleId])

  // When schedule changes, update consultationFee to match schedule fee
  useEffect(() => {
    if (!scheduleId) return
    const s = schedules.find(x => String(x._id) === String(scheduleId))
    if (s && s.fee != null) {
      setForm(prev => ({ ...prev, consultationFee: String(s.fee) }))
    }
  }, [scheduleId, schedules])
  useEffect(() => {
    let cancelled = false
    async function loadSchedules() {
      try {
        if (!form.doctor) { setSchedules([]); setScheduleId(''); return }
        const res = await hospitalApi.listDoctorSchedules({ doctorId: form.doctor, date: apptDate }) as any
        const items = (res?.schedules || []) as any[]
        if (cancelled) return
        setSchedules(items)
        
        // Find schedule matching current time
        const now = new Date()
        const nowMin = now.getHours() * 60 + now.getMinutes()
        const matchingSchedule = items.find((s: any) => {
          const startMin = toMin(s.startTime)
          const endMin = toMin(s.endTime)
          return nowMin >= startMin && nowMin < endMin
        })
        
        if (matchingSchedule) {
          setScheduleId(String(matchingSchedule._id))
          // Also update consultationFee to match schedule fee
          if (matchingSchedule.fee != null) {
            setForm(prev => ({ ...prev, consultationFee: String(matchingSchedule.fee) }))
          }
        } else if (items.length === 1) {
          setScheduleId(String(items[0]._id))
          // Also update consultationFee to match schedule fee
          if (items[0].fee != null) {
            setForm(prev => ({ ...prev, consultationFee: String(items[0].fee) }))
          }
        } else {
          setScheduleId('')
        }
      } catch { setSchedules([]); setScheduleId('') }
    }
    if (!isIPD) loadSchedules()
    return () => { cancelled = true }
  }, [form.doctor, apptDate, isIPD])

  function toMin(hhmm: string) { const [h, m] = (hhmm || '').split(':').map(x => parseInt(x, 10) || 0); return (h * 60) + m }
  function fromMin(min: number) { const h = Math.floor(min / 60).toString().padStart(2, '0'); const m = (min % 60).toString().padStart(2, '0'); return `${h}:${m}` }
  const to12Hour = fmt12

  useEffect(() => {
    let cancelled = false
    async function loadSlots() {
      setSelectedSlotNo(null)
      setSlotRows([])
      const s = schedules.find(x => String(x._id) === String(scheduleId))
      if (!s) { return }
      try {
        const [ap, tk]: any = await Promise.all([
          hospitalApi.listAppointments({ scheduleId: String(s._id) }),
          hospitalApi.listTokens({ scheduleId: String(s._id) }),
        ])
        const appts: any[] = ap?.appointments || []
        const tokens: any[] = tk?.tokens || []
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
          else if (tokenBySlot.has(i)) rows.push({ slotNo: i, ...se, status: 'token', tokenNo: tokenBySlot.get(i)?.tokenNo })
          else rows.push({ slotNo: i, ...se, status: 'free' })
        }
        if (!cancelled) { setSlotRows(rows) }
      } catch { if (!cancelled) { setSlotRows([]); setSelectedSlotNo(null) } }
    }
    if (!isIPD && scheduleId) loadSlots()
    return () => { cancelled = true }
  }, [scheduleId, schedules, isIPD])

  const [confirmPatient, setConfirmPatient] = useState<null | { summary: string; patient: any; key: string }>(null)
  const [focusAfterConfirm, setFocusAfterConfirm] = useState<null | 'phone' | 'name'>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const skipLookupKeyRef = useRef<string | null>(null)
  const lastPromptKeyRef = useRef<string | null>(null)
  const [phonePatients, setPhonePatients] = useState<any[]>([])
  const [showPhonePicker, setShowPhonePicker] = useState(false)
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false)
  const [phoneSuggestItems, setPhoneSuggestItems] = useState<any[]>([])
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const phoneSuggestQueryRef = useRef<string>('')
  const [toast, setToast] = useState<null | { type: 'success' | 'error'; message: string }>(null)
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!phoneSuggestWrapRef.current) return
      if (!phoneSuggestWrapRef.current.contains(e.target as any)) setPhoneSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function onMrnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const mr = (form.mrNumber || '').trim()
    if (!mr) return
    try {
      const r: any = await hospitalApi.searchPatients({ mrn: mr, limit: 5 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      // Prefer exact MRN match (case-insensitive), else take first
      const p = list.find(x => String(x.mrn || '').trim().toLowerCase() === mr.toLowerCase()) || list[0]
      if (!p) { showToast('error', 'No patient found for this MR number'); return }
      setForm(prev => ({
        ...prev,
        patientName: p.fullName || prev.patientName,
        guardianName: p.fatherName || prev.guardianName,
        guardianRel: p.guardianRel || prev.guardianRel,
        address: p.address || prev.address,
        gender: p.gender || prev.gender,
        age: p.age || prev.age,
        mrNumber: p.mrn || mr,
        phone: p.phoneNormalized || prev.phone,
        cnic: p.cnicNormalized || p.cnic || prev.cnic,
      }))
      showToast('success', 'Patient found and autofilled')
    } catch {
      showToast('error', 'No patient found for this MR number')
    }
  }



  async function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newPhone = e.target.value
    const digitsOnly = String(newPhone || '').replace(/\D+/g, '').slice(0, 11)
    // Update form with normalized phone number
    update('phone', digitsOnly)

    // Reset previous selections when phone changes
    setPhonePatients([])
    setShowPhonePicker(false)
    skipLookupKeyRef.current = null
    lastPromptKeyRef.current = null

    const digits = digitsOnly

    // Incremental suggestions once 3+ digits are typed
    if (digits.length >= 3) {
      clearTimeout((window as any).phoneSuggestTimeout)
        ; (window as any).phoneSuggestTimeout = setTimeout(() => {
          runPhoneSuggestLookup(digits)
        }, 250)
    } else {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }

    // Auto-fill if phone number is complete (at least 10 digits)
    if (digits.length >= 10) {
      // Debounce the lookup to avoid too many API calls
      clearTimeout((window as any).phoneLookupTimeout)
        ; (window as any).phoneLookupTimeout = setTimeout(() => {
          autoFillPatientByPhone(digitsOnly)
        }, 500)
    }
  }

  async function runPhoneSuggestLookup(digits: string) {
    try {
      phoneSuggestQueryRef.current = digits
      const r: any = await hospitalApi.searchPatients({ phone: digits, limit: 8 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (phoneSuggestQueryRef.current !== digits) return
      setPhoneSuggestItems(list)
      setPhoneSuggestOpen(list.length > 0)
    } catch {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
  }

  function selectPhoneSuggestion(p: any) {
    setForm(prev => ({
      ...prev,
      patientName: p.fullName || prev.patientName,
      guardianName: p.fatherName || prev.guardianName,
      guardianRel: p.guardianRel || prev.guardianRel,
      address: p.address || prev.address,
      gender: p.gender || prev.gender,
      age: p.age || prev.age,
      mrNumber: p.mrn || prev.mrNumber,
      phone: p.phoneNormalized || prev.phone,
      cnic: p.cnicNormalized || prev.cnic,
    }))
    setPhoneSuggestOpen(false)
    showToast('success', 'Patient selected')
  }

  function clearPatientFieldsKeepPhone() {
    setForm(prev => ({
      ...prev,
      patientName: '',
      guardianName: '',
      guardianRel: '',
      address: '',
      gender: '',
      age: '',
      mrNumber: '',
      cnic: '',
      // keep phone as-is
      phone: prev.phone,
    }))
    setShowPhonePicker(false)
    setPhoneSuggestOpen(false)
    showToast('success', 'Cleared patient details — you can enter a new patient with same phone')
  }

  async function autoFillPatientByPhone(phoneNumber: string) {
    const digits = phoneNumber.replace(/\D+/g, '')
    if (!digits || digits.length < 10) return // Need at least 10 digits for phone lookup

    try {
      const r: any = await hospitalApi.searchPatients({ phone: digits, limit: 10 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []

      if (list.length > 1) {
        // Multiple patients under same phone - show picker
        setPhonePatients(list)
        setShowPhonePicker(true)
        showToast('success', `${list.length} patients found - select one`)
      } else if (list.length === 1) {
        // One match: still show picker so user can choose it OR create a new patient under same phone.
        setPhonePatients(list)
        setShowPhonePicker(true)
        showToast('success', 'Patient found - select or create new')
      } else {
        // No patients - allow creating new under this phone
        showToast('success', 'New patient - you can create under this phone')
      }
    } catch {
      showToast('error', 'Failed to lookup patient data')
    }
  }

  async function onPhoneBlurNew() {
    await autoFillPatientByPhone(form.phone || '')
  }



  const generateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    const selDoc = doctors.find(d => String(d.id) === String(form.doctor))
    const selDept = departments.find(d => String(d.id) === String(form.departmentId))
    if (!form.departmentId) {
      showToast('error', 'Please select a department before generating a token')
      return
    }
    try {
      if (isEditMode) {
        if (!tokenId) return
        const feeGross = Math.max(0, Number(form.consultationFee || 0))
        const disc = Math.max(0, Number(form.discount || 0))
        const payload: any = {
          departmentId: form.departmentId,
          doctorId: form.doctor || undefined,
          patientName: form.patientName || undefined,
          phone: form.phone || undefined,
          gender: form.gender || undefined,
          guardianRel: form.guardianRel || undefined,
          guardianName: form.guardianName || undefined,
          cnic: form.cnic || undefined,
          address: form.address || undefined,
          age: form.age || undefined,
          mrn: form.mrNumber || undefined,
          overrideFee: feeGross,
          discount: disc,
        }
        await hospitalApi.updateToken(String(tokenId), payload)
        logAudit('token_edit', `tokenId=${tokenId}, dept=${form.departmentId}, doctor=${selDoc?.name || 'N/A'}, grossFee=${feeGross}, discount=${disc}`)
        showToast('success', 'Token updated')
        return
      }
      // Inline IPD admit flow: if department is IPD, require bed and admit immediately
      if (isIPD) {
        if (!ipdBedId) { showToast('error', 'Please select a bed for IPD admission'); return }
        const payload: any = {
          departmentId: form.departmentId,
          doctorId: form.doctor || undefined,
          discount: Number(form.discount) || 0,
          paymentRef: undefined,
        }
        if (form.billingType === 'Corporate' && form.corporateCompanyId) {
          payload.corporateId = form.corporateCompanyId
          if (form.corporatePreAuthNo) payload.corporatePreAuthNo = form.corporatePreAuthNo
          if (form.corporateCoPayPercent) payload.corporateCoPayPercent = Number(form.corporateCoPayPercent)
          if (form.corporateCoverageCap) payload.corporateCoverageCap = Number(form.corporateCoverageCap)
        }
        // Patient demographics for saving/updating patient
        payload.patientName = form.patientName || undefined
        payload.phone = form.phone || undefined
        payload.gender = form.gender || undefined
        payload.guardianRel = form.guardianRel || undefined
        payload.guardianName = form.guardianName || undefined
        payload.cnic = form.cnic || undefined
        payload.address = form.address || undefined
        payload.age = form.age || undefined
        if (form.mrNumber) payload.mrn = form.mrNumber
        else if (form.patientName) payload.patientName = form.patientName
        const rawDeposit = String(ipdDeposit || '').trim()
        const cleanedDeposit = rawDeposit.replace(/[^0-9.]/g, '')
        const depAmt = cleanedDeposit ? parseFloat(cleanedDeposit) : NaN
        const res = await hospitalApi.createOpdToken({ ...payload, overrideFee: isNaN(depAmt) ? undefined : depAmt }) as any
        const tokenId = String(res?.token?._id || '')
        if (!tokenId) throw new Error('Failed to create token for admission')
        await hospitalApi.admitFromOpdToken({ tokenId, bedId: ipdBedId, deposit: isNaN(depAmt) ? undefined : depAmt })
        logAudit('token_generate', `ipd_admit dept=IPD, bed=${ipdBedId}`)
        // Show print slip with full details
        const slip: TokenSlipData = {
          tokenNo: res?.token?.tokenNo || 'N/A',
          departmentName: (departments.find(d => String(d.id) === String(form.departmentId))?.name) || '-',
          doctorName: (doctors.find(d => String(d.id) === String(form.doctor))?.name) || '-',
          patientName: res?.token?.patientName || form.patientName || '-',
          phone: form.phone || '',
          mrn: (res?.token?.mrn || form.mrNumber || ''),
          age: form.age || '',
          gender: form.gender || '',
          guardianRel: form.guardianRel || '',
          guardianName: form.guardianName || '',
          cnic: form.cnic || '',
          address: form.address || '',
          amount: isNaN(depAmt) ? 0 : depAmt,
          discount: 0,
          payable: isNaN(depAmt) ? 0 : depAmt,
          createdAt: res?.token?.createdAt,
        }
        setSlipData(slip)
        setShowSlip(true)
        reset()
        setIpdBedId(''); setIpdDeposit('')
        return
      }
      const payload: any = {
        departmentId: form.departmentId,
        doctorId: form.doctor || undefined,
        visitType: 'new',
        discount: Number(form.discount) || 0,
        paymentRef: undefined,
      }
      if (form.billingType === 'Corporate' && form.corporateCompanyId) {
        payload.corporateId = form.corporateCompanyId
        if (form.corporatePreAuthNo) payload.corporatePreAuthNo = form.corporatePreAuthNo
        if (form.corporateCoPayPercent) payload.corporateCoPayPercent = Number(form.corporateCoPayPercent)
        if (form.corporateCoverageCap) payload.corporateCoverageCap = Number(form.corporateCoverageCap)
      }
      if (form.billingType === 'Cash') payload.paidMethod = 'Cash'
      else if (form.billingType === 'Card') payload.paidMethod = 'Bank'
      // Patient demographics for saving/updating patient
      payload.patientName = form.patientName || undefined
      payload.phone = form.phone || undefined
      payload.gender = form.gender || undefined
      payload.guardianRel = form.guardianRel || undefined
      payload.guardianName = form.guardianName || undefined
      payload.cnic = form.cnic || undefined
      payload.address = form.address || undefined
      payload.age = form.age || undefined
      // Attach scheduleId and selected slot (if any)
      if (!isIPD && scheduleId) {
        (payload as any).scheduleId = scheduleId
        const s = schedules.find(x => String(x._id) === String(scheduleId))
        // Use schedule fee if available
        if (s && s.fee != null) {
          payload.overrideFee = Number(s.fee)
        }
        if (s && selectedSlotNo) {
          const slotMinutes = Math.max(5, Number(s.slotMinutes || 15))
          const startMin = toMin(s.startTime) + (selectedSlotNo - 1) * slotMinutes
            ; (payload as any).apptStart = fromMin(startMin)
        }
      }
      if (form.mrNumber) payload.mrn = form.mrNumber
      else if (form.patientName) payload.patientName = form.patientName
      // If corporate is selected, ensure backend uses the resolved corporate fee
      if (form.billingType === 'Corporate' && form.corporateCompanyId) {
        const feeNum = Number(form.consultationFee)
        if (Number.isFinite(feeNum)) payload.overrideFee = feeNum
      }
      const res = await hospitalApi.createOpdToken(payload) as any
      const tokenNo = res?.token?.tokenNo || 'N/A'
      // Prepare slip and show (OPD)
      const slip: TokenSlipData = {
        tokenNo,
        departmentName: selDept?.name || '-',
        doctorName: selDoc?.name || '-',
        patientName: form.patientName,
        phone: form.phone || undefined,
        mrn: form.mrNumber || undefined,
        age: form.age || undefined,
        gender: form.gender || undefined,
        guardianRel: form.guardianRel || undefined,
        guardianName: form.guardianName || undefined,
        cnic: form.cnic || undefined,
        address: form.address || undefined,
        amount: Number(res?.pricing?.feeResolved ?? res?.pricing?.finalFee ?? finalFee ?? 0),
        discount: Number((res?.pricing?.discount ?? form.discount) || 0),
        payable: Number((res?.pricing?.finalFee ?? finalFee)),
        createdAt: res?.token?.createdAt,
        fbr: {
          status: res?.token?.fbrStatus || res?.fbrStatus || res?.fbr?.status,
          qrCode: res?.token?.fbrQrCode || res?.fbrQrCode || res?.fbr?.qrCode,
          fbrInvoiceNo: res?.token?.fbrInvoiceNo || res?.fbrInvoiceNo || res?.fbr?.fbrInvoiceNo || res?.fbr?.invoiceNumber,
          mode: res?.token?.fbrMode || res?.fbrMode || res?.fbr?.mode,
          error: res?.token?.fbrError || res?.fbrError || res?.fbr?.error,
        } as any,
      }
      setSlipData(slip)
      setShowSlip(true)
      logAudit('token_generate', `patient=${form.patientName || 'N/A'}, dept=${form.departmentId}, doctor=${selDoc?.name || 'N/A'}, fee=${res?.pricing?.finalFee ?? finalFee}`)
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to generate token')
    }
    reset()
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800">Token Generator</h2>
      {loadingToken && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Loading token...</div>
      )}
      <form onSubmit={generateToken} className="mt-6 space-y-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Patient Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <div ref={phoneSuggestWrapRef} className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                      placeholder="Type phone to search"
                      value={form.phone}
                      maxLength={11}
                      onChange={onPhoneChange}
                      onBlur={onPhoneBlurNew}
                      onFocus={() => { if (phoneSuggestItems.length > 0) setPhoneSuggestOpen(true) }}
                      ref={phoneRef}
                    />
                    <button
                      type="button"
                      onClick={clearPatientFieldsKeepPhone}
                      className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      title="Clear selected patient details but keep phone number"
                    >
                      Clear
                    </button>
                  </div>
                  {phoneSuggestOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                      {phoneSuggestItems.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">No results</div>
                      ) : (
                        phoneSuggestItems.map((p: any, idx: number) => (
                          <button
                            type="button"
                            key={p._id || idx}
                            onClick={() => selectPhoneSuggestion(p)}
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Patient Name</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="Full Name" value={form.patientName} onChange={e => { update('patientName', e.target.value) }} ref={nameRef} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Search by MR Number</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="Enter MR# (e.g., MR-15)" value={form.mrNumber} onChange={e => update('mrNumber', e.target.value)} onKeyDown={onMrnKeyDown} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="e.g., 25" value={form.age} onChange={e => update('age', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" value={form.gender} onChange={e => update('gender', e.target.value)}>
                  <option value="">Select gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Guardian</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" value={form.guardianRel} onChange={e => update('guardianRel', e.target.value)}>
                  <option value="">S/O or D/O</option>
                  <option value="S/O">S/O</option>
                  <option value="D/O">D/O</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Guardian Name</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="Father/Guardian Name" value={form.guardianName} onChange={e => update('guardianName', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">CNIC</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="13-digit CNIC (no dashes)" value={form.cnic} onChange={e => update('cnic', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" rows={3} placeholder="Residential Address" value={form.address} onChange={e => update('address', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Visit & Billing</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Doctor</label>
                <SearchSelect
                  options={doctors.map(d => ({ value: d.id, label: d.name }))}
                  value={form.doctor}
                  onChange={(v) => update('doctor', v)}
                  placeholder="Select doctor"
                />
                <p className="mt-1 text-xs text-slate-500">Doctor selection is optional for IPD.</p>
              </div>
              {!isIPD && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Appointment Date</label>
                    <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Doctor Schedule</label>
                    <select value={scheduleId} onChange={e => setScheduleId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                      <option value="">{schedules.length ? 'Select schedule' : 'No schedules found'}</option>
                      {schedules.map(s => {
                        const now = new Date()
                        const nowMin = now.getHours() * 60 + now.getMinutes()
                        const startMin = toMin(s.startTime)
                        const endMin = toMin(s.endTime)
                        const isCurrent = nowMin >= startMin && nowMin < endMin
                        return (
                          <option key={s._id} value={s._id}>
                            {isCurrent ? '● ' : ''}{to12Hour(s.startTime)} - {to12Hour(s.endTime)} • {s.slotMinutes} min{s.fee != null ? ` • Fee: Rs. ${s.fee}` : ''}{isCurrent ? ' (Current)' : ''}
                          </option>
                        )
                      })}
                    </select>
                    {schedules.length > 0 && !schedules.some(s => {
                      const now = new Date()
                      const nowMin = now.getHours() * 60 + now.getMinutes()
                      return nowMin >= toMin(s.startTime) && nowMin < toMin(s.endTime)
                    }) && (
                      <p className="mt-1 text-xs text-amber-600">⚠ No schedule matches current time. Select a schedule manually.</p>
                    )}
                    {scheduleId && (
                      <div className="mt-3 rounded-md border border-slate-200 p-2">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-xs font-medium text-slate-700">Slots</div>
                          <div className="text-[10px] text-slate-500">Free • Appointment • Token</div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {slotRows.map(r => {
                            const base = r.status === 'free' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : (r.status === 'appt' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-700')
                            const isSel = selectedSlotNo === r.slotNo
                            const selCls = isSel ? 'ring-2 ring-violet-400' : ''
                            const label = r.status === 'token' && r.tokenNo ? `${to12Hour(r.start)} - ${to12Hour(r.end)} • #${r.slotNo} • Token ${r.tokenNo}` : `${to12Hour(r.start)} - ${to12Hour(r.end)} • #${r.slotNo}`
                            const title = r.status === 'token' && r.tokenNo ? `Token ${r.tokenNo}` : (r.status === 'appt' ? 'Appointment' : 'Free')
                            return (
                              <button key={r.slotNo} type="button" title={title} disabled={r.status !== 'free'} onClick={() => setSelectedSlotNo(r.slotNo)} className={`rounded-md border px-2 py-1 text-xs ${base} ${selCls} disabled:opacity-50`}>
                                {label}
                              </button>
                            )
                          })}
                        </div>
                        {selectedSlotNo != null ? (
                          <div className="mt-2 text-xs text-slate-600">Selected slot: #{selectedSlotNo}</div>
                        ) : (
                          <div className="mt-2 text-xs text-slate-500">No slot selected — will auto-assign next free slot</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                <SearchSelect
                  options={departments.map(d => ({ value: d.id, label: d.name }))}
                  value={form.departmentId}
                  onChange={(v) => update('departmentId', v)}
                  placeholder="Select department"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Billing Type</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" value={form.billingType} onChange={e => update('billingType', e.target.value)}>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Insurance</option>
                  <option>Corporate</option>
                </select>
              </div>
              {form.billingType === 'Corporate' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Corporate Company</label>
                    <select value={form.corporateCompanyId} onChange={e => update('corporateCompanyId', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                      <option value="">None</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {form.corporateCompanyId && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Pre-Auth No</label>
                        <input value={form.corporatePreAuthNo} onChange={e => update('corporatePreAuthNo', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="Optional" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Co-Pay %</label>
                        <input value={form.corporateCoPayPercent} onChange={e => update('corporateCoPayPercent', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="0-100" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Coverage Cap</label>
                        <input value={form.corporateCoverageCap} onChange={e => update('corporateCoverageCap', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="e.g., 5000" />
                      </div>
                    </div>
                  )}
                </>
              )}
              {isIPD && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Select Bed</label>
                    <select
                      value={ipdBedId}
                      onChange={(e) => {
                        setIpdBedId(e.target.value)
                        const opt = (e.target as HTMLSelectElement).selectedOptions?.[0] as any
                        const chargesAttr = opt?.getAttribute?.('data-charges')
                        if (chargesAttr !== null && chargesAttr !== undefined) setIpdDeposit(chargesAttr)
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="">Available beds</option>
                      {ipdBedOptions.map(b => (
                        <option key={b._id} value={String(b._id)} data-charges={b.charges ?? ''}>
                          {`${b.floorName ? `${b.floorName} / ` : ''}${b.locationName ? `${b.locationName} / ` : ''}${b.label}`}{b.charges != null ? ` - (Rs. ${b.charges})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Bed Charges</label>
                    <input value={ipdDeposit} onChange={e => setIpdDeposit(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="e.g., Rs. 1000" />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Fee Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Consultation Fee</label>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="Fee" value={form.consultationFee} onChange={e => update('consultationFee', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Discount</label>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="0" value={form.discount} onChange={e => update('discount', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Final Fee</label>
              <div className="flex h-10 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">Rs. {(isIPD ? (Number(ipdDeposit || '0') || 0).toFixed(2) : finalFee.toFixed(2))}</div>
            </div>
          </div>
        </section>



        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={reset} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset Form</button>
          <button type="submit" className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800">{isEditMode ? 'Update Token' : 'Generate Token'}</button>
        </div>
      </form>
      {showSlip && slipData && (
        <Hospital_TokenSlip open={showSlip} onClose={() => setShowSlip(false)} data={slipData} autoPrint={true} />
      )}


      {confirmPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Patient</div>
            <div className="px-5 py-4 text-sm whitespace-pre-wrap text-slate-700">{confirmPatient.summary}</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={() => { if (confirmPatient) skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null); setTimeout(() => { if (focusAfterConfirm === 'phone') phoneRef.current?.focus(); else if (focusAfterConfirm === 'name') nameRef.current?.focus(); setFocusAfterConfirm(null) }, 0) }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={() => {
                const p = confirmPatient.patient
                try {
                  setForm(prev => ({
                    ...prev,
                    patientName: p.fullName || prev.patientName,
                    guardianName: p.fatherName || prev.guardianName,
                    guardianRel: p.guardianRel || prev.guardianRel,
                    address: p.address || prev.address,
                    gender: p.gender || prev.gender,
                    age: p.age || prev.age,
                    mrNumber: p.mrn || prev.mrNumber,
                    phone: p.phoneNormalized || prev.phone,
                    cnic: p.cnicNormalized || prev.cnic,
                  }))
                } finally { if (confirmPatient) skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null) }
              }} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Apply</button>
            </div>
          </div>
        </div>
      )}
      {showPhonePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Select Patient (Phone: {form.phone})</div>
            <div className="max-h-96 overflow-y-auto p-2">
              {phonePatients.map((p, idx) => (
                <button key={p._id || idx} onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    patientName: p.fullName || prev.patientName,
                    guardianName: p.fatherName || prev.guardianName,
                    guardianRel: p.guardianRel || prev.guardianRel,
                    address: p.address || prev.address,
                    gender: p.gender || prev.gender,
                    age: p.age || prev.age,
                    mrNumber: p.mrn || prev.mrNumber,
                    phone: p.phoneNormalized || prev.phone,
                    cnic: p.cnicNormalized || prev.cnic,
                  }))
                  setShowPhonePicker(false)
                  showToast('success', 'Patient selected')
                }} className="mb-2 w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50">
                  <div className="text-sm font-medium text-slate-800">{p.fullName || 'Unnamed'}</div>
                  <div className="text-xs text-slate-500">{p.mrn || '-'} • {p.phoneNormalized || ''}</div>
                  {p.address && <div className="text-[11px] text-slate-400">{p.address}</div>}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={() => { setShowPhonePicker(false); showToast('success', 'You can create a new patient under this phone') }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={() => {
                // Create new patient under this phone number
                clearPatientFieldsKeepPhone()
                setShowPhonePicker(false)
              }} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Create New Patient</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-2 text-sm shadow-lg ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
