import { useMemo, useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Diagnostic_TokenSlip from '../../components/diagnostic/Diagnostic_TokenSlip'
import type { DiagnosticTokenSlipData } from '../../components/diagnostic/Diagnostic_TokenSlip'
import { labApi, diagnosticApi, corporateApi, hospitalApi } from '../../utils/api'
import Toast from '../../components/ui/Toast'

export default function Diagnostic_TokenGenerator() {
  const location = useLocation() as any
  const navState = (location && (location.state || null)) || null
  // Patient details
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [mrn, setMrn] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [guardianRel, setGuardianRel] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [cnic, setCnic] = useState('')
  const [address, setAddress] = useState('')
  // Referral context (optional)
  const [fromReferralId, setFromReferralId] = useState<string>('')
  const [requestedTests, setRequestedTests] = useState<string[]>([])
  const [referringConsultant, setReferringConsultant] = useState('')

  // Tests (from backend)
  type Test = { id: string; name: string; price: number }
  const [tests, setTests] = useState<Test[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const res = await diagnosticApi.listTests({ limit: 1000 }) as any
          const arr = (res?.items || res || []).map((t: any) => ({ id: String(t._id || t.id), name: t.name, price: Number(t.price || 0) }))
          if (mounted) setTests(arr)
        } catch { if (mounted) setTests([]) }
      })()
    return () => { mounted = false }
  }, [])
  // Apply navState patient autofill and requested tests
  useEffect(() => {
    try {
      const st = navState || {}
      if (st?.patient) {
        const p = st.patient
        if (p.fullName) setFullName(String(p.fullName))
        if (p.phone) setPhone(String(p.phone))
        if (p.mrn) setMrn(String(p.mrn))
        if (p.gender) setGender(String(p.gender))
        if (p.address) setAddress(String(p.address))
        if (p.fatherName) setGuardianName(String(p.fatherName))
        if (p.guardianRelation) setGuardianRel(String(p.guardianRelation))
        if (p.cnic) setCnic(String(p.cnic))
      }
      if (Array.isArray(st?.requestedTests)) setRequestedTests(st.requestedTests.map((x: any) => String(x)))
      if (st?.fromReferralId) setFromReferralId(String(st.fromReferralId))
      if (st?.referringConsultant) setReferringConsultant(String(st.referringConsultant))
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.key])

  // Phone-based autofill (moved out of effect for global scope)
  async function autoFillByPhone(phoneNumber: string) {
    const digits = (phoneNumber || '').replace(/\D+/g, '')
    if (!digits || digits.length < 10) return
    try {
      const r: any = await labApi.searchPatients({ phone: digits, limit: 10 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (list.length > 1) {
        setPhonePatients(list)
        setShowPhonePicker(true)
      } else if (list.length === 1) {
        const p = list[0]
        setSelectedPatient(p)
        setFullName(p.fullName || '')
        setPhone(p.phoneNormalized || '')
        setMrn(p.mrn || mrn)
        setAge((p.age != null && p.age !== '') ? String(p.age) : '')
        if (p.gender) setGender(String(p.gender))
        setGuardianName(p.fatherName || '')
        if (p.guardianRel) setGuardianRel(String(p.guardianRel))
        setAddress(p.address || '')
        setCnic(p.cnicNormalized || p.cnic || '')
      }
    } catch { }
  }

  function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setPhone(v)
    skipLookupKeyRef.current = null; lastPromptKeyRef.current = null
      ; (window as any)._diagPhoneDeb && clearTimeout((window as any)._diagPhoneDeb)
    const digits = (v || '').replace(/\D+/g, '')
    // Incremental suggestions after 3+ digits
    if ((window as any)._diagPhoneSuggestDeb) clearTimeout((window as any)._diagPhoneSuggestDeb)
    if (digits.length >= 3) {
      ; (window as any)._diagPhoneSuggestDeb = setTimeout(() => runPhoneSuggestLookup(digits), 250)
    } else {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
    if (digits.length >= 10) {
      ; (window as any)._diagPhoneDeb = setTimeout(() => autoFillByPhone(v), 500)
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

  function selectPhoneSuggestion(p: any) {
    setSelectedPatient(p)
    setFullName(p.fullName || '')
    setPhone(p.phoneNormalized || '')
    setMrn(p.mrn || mrn)
    setAge((p.age != null && p.age !== '') ? String(p.age) : '')
    if (p.gender) setGender(String(p.gender))
    setGuardianName(p.fatherName || '')
    if (p.guardianRel) setGuardianRel(String(p.guardianRel))
    setAddress(p.address || '')
    setCnic(p.cnicNormalized || p.cnic || '')
    setPhoneSuggestOpen(false)
  }
  // When tests list is loaded or requestedTests changes, preselect those tests
  useEffect(() => {
    if (!requestedTests.length || !tests.length) return
    const set = new Set(requestedTests.map(s => String(s).trim().toLowerCase()))
    const ids = tests.filter(t => set.has(String(t.name).trim().toLowerCase())).map(t => t.id)
    if (ids.length) {
      // don't duplicate existing selections
      setSelected(prev => Array.from(new Set([...prev, ...ids])))
    }
  }, [requestedTests, tests])
  // Corporate billing (declare early so it's available to pricing helpers)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [corpCompanyId, setCorpCompanyId] = useState('')
  const [corpPreAuthNo, setCorpPreAuthNo] = useState('')
  const [corpCoPayPercent, setCorpCoPayPercent] = useState('')
  const [corpCoverageCap, setCorpCoverageCap] = useState('')
  // Corporate effective pricing map for DIAG tests
  const [corpTestPriceMap, setCorpTestPriceMap] = useState<Record<string, number>>({})


  const getEffectivePrice = (id: string): number => {
    const base = Number((tests.find(t => t.id === id)?.price) || 0)
    if (!corpCompanyId) return base
    const v = corpTestPriceMap[id]
    return v != null ? v : base
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tests.filter(t => !selected.includes(t.id)).filter(t => !q || t.name.toLowerCase().includes(q)).slice(0, 30)
  }, [tests, query, selected])
  const selectedTests = useMemo(() => selected.map(id => tests.find(t => t.id === id)).filter(Boolean) as Test[], [selected, tests])
  const subtotal = useMemo(() => selectedTests.reduce((s, t) => s + getEffectivePrice(t.id), 0), [selectedTests, corpCompanyId, corpTestPriceMap])
  const [discount, setDiscount] = useState('0')
  const net = Math.max(0, subtotal - (Number(discount) || 0))
  const [receivedAmount, setReceivedAmount] = useState('0')
  const receivedNum = Math.max(0, Math.min(net, Number(receivedAmount) || 0))
  const receivableNum = Math.max(0, net - receivedNum)

  // Corporate billing (load companies)
  // Recompute corporate pricing after corpCompanyId is declared
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!corpCompanyId) { setCorpTestPriceMap({}); return }
      try {
        const r = await corporateApi.listRateRules({ companyId: corpCompanyId, scope: 'DIAG' }) as any
        const rules: any[] = (r?.rules || []).filter((x: any) => x && x.active !== false)
        const today = new Date().toISOString().slice(0, 10)
        const valid = rules.filter((x: any) => (!x.effectiveFrom || String(x.effectiveFrom).slice(0, 10) <= today) && (!x.effectiveTo || today <= String(x.effectiveTo).slice(0, 10)))
        const def = valid.filter(x => x.ruleType === 'default').sort((a: any, b: any) => (a.priority ?? 100) - (b.priority ?? 100))[0] || null
        const apply = (base: number, rule: any) => {
          const mode = rule?.mode; const val = Number(rule?.value || 0)
          if (mode === 'fixedPrice') return Math.max(0, val)
          if (mode === 'percentDiscount') return Math.max(0, base - (base * (val / 100)))
          if (mode === 'fixedDiscount') return Math.max(0, base - val)
          return base
        }
        const map: Record<string, number> = {}
        for (const t of tests) {
          const base = Number(t.price || 0)
          const specific = valid.filter(x => x.ruleType === 'test' && String(x.refId) === String(t.id)).sort((a: any, b: any) => (a.priority ?? 100) - (b.priority ?? 100))[0] || null
          const rule = specific || def
          map[t.id] = rule ? apply(base, rule) : base
        }
        if (!cancelled) setCorpTestPriceMap(map)
      } catch { if (!cancelled) setCorpTestPriceMap({}) }
    }
    load()
    return () => { cancelled = true }
  }, [corpCompanyId, tests])
  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const res = await corporateApi.listCompanies() as any
          if (!mounted) return
          const arr = (res?.companies || []).map((c: any) => ({ id: String(c._id || c.id), name: c.name }))
          setCompanies(arr)
        } catch { }
      })()
    return () => { mounted = false }
  }, [])

  // Selected existing patient (from Lab_Patient collection)
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
  const [confirmPatient, setConfirmPatient] = useState<null | { summary: string; patient: any; key: string }>(null)
  const [focusAfterConfirm, setFocusAfterConfirm] = useState<null | 'phone' | 'name'>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const skipLookupKeyRef = useRef<string | null>(null)
  const lastPromptKeyRef = useRef<string | null>(null)
  const autoMrnAppliedRef = useRef<boolean>(false)
  const [phonePatients, setPhonePatients] = useState<any[]>([])
  const [showPhonePicker, setShowPhonePicker] = useState(false)
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false)
  const [phoneSuggestItems, setPhoneSuggestItems] = useState<any[]>([])
  const phoneSuggestWrapRef = useRef<HTMLDivElement>(null)
  const phoneSuggestQueryRef = useRef<string>('')

  // Track if user explicitly chose to create new patient (to force creation even if phone exists)
  const [forceCreatePatient, setForceCreatePatient] = useState(false)

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!phoneSuggestWrapRef.current) return
      if (!phoneSuggestWrapRef.current.contains(e.target as any)) setPhoneSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // If coming from a referral and MRN is present, fetch full patient by MRN to prefill all fields
  useEffect(() => {
    if (autoMrnAppliedRef.current) return
    if (!fromReferralId || !mrn || selectedPatient) return
    let cancelled = false
      ; (async () => {
        try {
          const r: any = await labApi.getPatientByMrn(mrn)
          if (cancelled) return
          const p = r?.patient || r
          if (!p) return
          setSelectedPatient(p)
          setFullName(p.fullName || '')
          setPhone(p.phoneNormalized || '')
          setMrn(p.mrn || mrn)
          setAge((p.age != null && p.age !== '') ? String(p.age) : '')
          if (p.gender) setGender(String(p.gender))
          setGuardianName(p.fatherName || '')
          if (p.guardianRel) {
            const g = String(p.guardianRel).toUpperCase()
            const mapped = (g === 'FATHER' || g === 'S/O' || g === 'SON') ? 'S/O' : ((g === 'MOTHER' || g === 'D/O' || g === 'DAUGHTER') ? 'D/O' : g)
            setGuardianRel(mapped)
          }
          setAddress(p.address || '')
          setCnic(p.cnicNormalized || p.cnic || '')
          autoMrnAppliedRef.current = true
        } catch { }
      })()
    return () => { cancelled = true }
  }, [fromReferralId, mrn, selectedPatient])

  // Slip modal
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipData, setSlipData] = useState<DiagnosticTokenSlipData | null>(null)

  async function lookupExistingByPhoneAndName(source: 'phone' | 'name' = 'phone') {
    const digits = (phone || '').replace(/\D+/g, '')
    const nameEntered = (fullName || '').trim()
    if (!digits || !nameEntered) return
    try {
      const norm = (s: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
      const key = `${digits}|${norm(nameEntered)}`
      if (skipLookupKeyRef.current === key || lastPromptKeyRef.current === key) return
      const r: any = await labApi.searchPatients({ phone: digits, limit: 10 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (!list.length) return
      const p = list.find(x => norm(x.fullName) === norm(nameEntered))
      if (!p) return // no exact name match; don't prompt
      const summary = [
        `Found existing patient. Apply details?`,
        `MRN: ${p.mrn || '-'}`,
        `Name: ${p.fullName || '-'}`,
        `Phone: ${p.phoneNormalized || digits}`,
        `Age: ${p.age ?? (age?.trim() || '-')}`,
        p.gender ? `Gender: ${p.gender}` : null,
        p.address ? `Address: ${p.address}` : null,
        p.fatherName ? `Guardian: ${p.fatherName}` : null,
        `Guardian Relation: ${p.guardianRel || (guardianRel || '-')}`,
        p.cnicNormalized ? `CNIC: ${p.cnicNormalized}` : null,
      ].filter(Boolean).join('\n')
      setTimeout(() => { setFocusAfterConfirm(source); lastPromptKeyRef.current = key; setConfirmPatient({ summary, patient: p, key }) }, 0)
    } catch { }
  }

  async function onMrnKeyDown(e: any) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const code = (mrn || '').trim()
    if (!code) return
    try {
      const r: any = await labApi.getPatientByMrn(code)
      const p = r?.patient || r
      if (!p) { alert('No patient found for this MR number'); return }
      setSelectedPatient(p)
      setFullName(p.fullName || '')
      setPhone(p.phoneNormalized || '')
      setMrn(p.mrn || code)
      setAge((p.age != null && p.age !== '') ? String(p.age) : '')
      if (p.gender) setGender(String(p.gender))
      setGuardianName(p.fatherName || '')
      if (p.guardianRel) {
        const g = String(p.guardianRel).toUpperCase()
        const mapped = (g === 'FATHER' || g === 'S/O' || g === 'SON') ? 'S/O' : ((g === 'MOTHER' || g === 'D/O' || g === 'DAUGHTER') ? 'D/O' : g)
        setGuardianRel(mapped)
      }
      setAddress(p.address || '')
      setCnic(p.cnicNormalized || p.cnic || '')
    } catch {
      setToast({ type: 'error', message: 'No patient found for this MR number' })
    }
  }

  const clearPatientFieldsKeepPhone = () => {
    setSelectedPatient(null)
    setFullName('')
    setMrn('')
    setAge('')
    setGender('')
    setGuardianRel('')
    setGuardianName('')
    setCnic('')
    setAddress('')
    setShowPhonePicker(false)
    setForceCreatePatient(true) // Mark that we want to force create a new patient
    setTimeout(() => { try { nameRef.current?.focus() } catch {} }, 50)
  }

  const generateToken = async () => {
    if (!fullName.trim() || !phone.trim() || selectedTests.length === 0) return
    try {
      // Resolve patient in Lab_Patient collection
      let patient = selectedPatient
      if (patient) {
        const patch: any = {}
        if ((fullName || '') !== (patient.fullName || '')) patch.fullName = fullName
        if ((guardianName || '') !== (patient.fatherName || '')) patch.fatherName = guardianName
        if ((gender || '') !== (patient.gender || '')) patch.gender = gender
        if ((address || '') !== (patient.address || '')) patch.address = address
        if ((phone || '') !== (patient.phoneNormalized || '')) patch.phone = phone
        if ((cnic || '') !== (patient.cnicNormalized || '')) patch.cnic = cnic
        if (Object.keys(patch).length) {
          const upd = await labApi.updatePatient(String(patient._id), patch) as any
          patient = upd?.patient || patient
        }
      } else {
        const fr = await labApi.findOrCreatePatient({ fullName: fullName.trim(), guardianName: guardianName || undefined, phone: phone || undefined, cnic: cnic || undefined, gender: gender || undefined, address: address || undefined, age: age || undefined, guardianRel: guardianRel || undefined, forceCreate: forceCreatePatient }) as any
        patient = fr?.patient
        setForceCreatePatient(false) // Reset after using
      }
      if (!patient?._id) throw new Error('Failed to resolve patient')

      // Create diagnostic order
      const testIds = selected
      const slipRows = selectedTests.map(t => ({ name: t.name, price: getEffectivePrice(t.id) }))
      const created = await diagnosticApi.createOrder({
        patientId: String(patient._id),
        patient: {
          mrn: patient.mrn || undefined,
          fullName: fullName.trim(),
          phone: phone || undefined,
          age: age || undefined,
          gender: gender || undefined,
          address: address || undefined,
          guardianRelation: guardianRel || undefined,
          guardianName: guardianName || undefined,
          cnic: cnic || undefined,
        },
        tests: testIds,
        subtotal,
        discount: Number(discount) || 0,
        net,
        receivedAmount: receivedNum,
        referringConsultant: referringConsultant || undefined,
        ...(corpCompanyId ? { corporateId: corpCompanyId } : {}),
        ...(corpPreAuthNo ? { corporatePreAuthNo: corpPreAuthNo } : {}),
        ...(corpCoPayPercent ? { corporateCoPayPercent: Number(corpCoPayPercent) } : {}),
        ...(corpCoverageCap ? { corporateCoverageCap: Number(corpCoverageCap) } : {}),
      }) as any

      // If we are processing a referral, mark it completed
      if (fromReferralId) {
        try { await hospitalApi.updateReferralStatus(fromReferralId, 'completed') } catch { }
      }

      const tokenNo = created?.tokenNo || created?.order?.tokenNo || 'N/A'
      const createdAt = created?.createdAt || created?.order?.createdAt || new Date().toISOString()
      const data: DiagnosticTokenSlipData = {
        tokenNo,
        patientName: fullName.trim(),
        phone: phone.trim(),
        age: age || undefined,
        gender: gender || undefined,
        mrn: patient.mrn || mrn || undefined,
        guardianRel: guardianRel || undefined,
        guardianName: guardianName || undefined,
        cnic: cnic || undefined,
        address: address || undefined,
        tests: slipRows,
        subtotal,
        discount: Number(discount) || 0,
        payable: net,
        createdAt,
      }
      setSlipData(data)
      setSlipOpen(true)
      setToast({ type: 'success', message: `Token ${data.tokenNo} generated successfully` })
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to create order' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Patient Details */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">Patient Details</div>
        <div className="text-xs text-slate-500">Fill all required details to generate a token</div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone *</label>
            <div ref={phoneSuggestWrapRef} className="relative">
              <input
                value={phone}
                onChange={onPhoneChange}
                ref={phoneRef}
                onBlur={() => lookupExistingByPhoneAndName('phone')}
                onFocus={() => { if (phoneSuggestItems.length > 0) setPhoneSuggestOpen(true) }}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Type phone to search"
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
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Patient Name *</label>
            <input value={fullName} onChange={e => { setFullName(e.target.value); skipLookupKeyRef.current = null; lastPromptKeyRef.current = null }} ref={nameRef} onBlur={() => lookupExistingByPhoneAndName('name')} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g. Muhammad Zain" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">MR Number</label>
            <input value={mrn} onChange={e => setMrn(e.target.value)} onKeyDown={onMrnKeyDown} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="MR-2401-000001" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Age</label>
            <input value={age} onChange={e => setAge(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g. 22" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Guardian S/O or D/O</label>
            <select value={guardianRel} onChange={e => setGuardianRel(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select</option>
              <option value="S/O">S/O</option>
              <option value="D/O">D/O</option>
              <option value="O">O</option>
            </select>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Guardian Name</label>
            <input value={guardianName} onChange={e => setGuardianName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g. Arif" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">CNIC</label>
            <input value={cnic} onChange={e => setCnic(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="#####-#######-#" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Street, City" />
          </div>
        </div>
      </div>

      {/* Select Tests */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">Select Tests</div>
        <div className="text-xs text-slate-500">Tests are loaded from the Diagnostics → Tests page</div>
        <div className="mt-3 space-y-2">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search test by name/code..." className="w-full rounded-md border border-slate-300 px-3 py-2" />
          {filtered.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
              {filtered.map(t => (
                <button key={t.id} onClick={() => setSelected(prev => [...prev, t.id])} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{t.name}</div>
                  </div>
                  <div className="text-xs text-slate-600">PKR {getEffectivePrice(t.id).toLocaleString()}</div>
                </button>
              ))}
            </div>
          )}

          {selectedTests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTests.map(t => (
                <span key={t.id} className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2 py-1 text-sm">
                  {t.name}
                  <button onClick={() => setSelected(prev => prev.filter(x => x !== t.id))} className="text-slate-500 hover:text-slate-700">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary and submit */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">Billing Summary</div>
        <div className="mt-3 divide-y divide-slate-200 text-sm">
          {selectedTests.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2">
              <div>{t.name}</div>
              <div>PKR {getEffectivePrice(t.id).toLocaleString()}</div>
            </div>
          ))}
          <div className="flex items-center justify-between py-2">
            <div className="text-slate-600">Subtotal</div>
            <div>PKR {subtotal.toLocaleString()}</div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="text-slate-600">Discount</div>
            <input value={discount} onChange={e => setDiscount(e.target.value)} className="w-40 rounded-md border border-slate-300 px-3 py-1.5 text-right" placeholder="0" />
          </div>
          <div className="flex items-center justify-between py-2 font-semibold">
            <div>Net Amount</div>
            <div>PKR {net.toLocaleString()}</div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="text-slate-600">Received</div>
            <input value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} className="w-40 rounded-md border border-slate-300 px-3 py-1.5 text-right" placeholder="0" />
          </div>
          <div className="flex items-center justify-between py-2 font-semibold">
            <div>Pending</div>
            <div>PKR {receivableNum.toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={generateToken} disabled={!fullName || !phone || selectedTests.length === 0} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">Generate Token</button>
        </div>
      </div>

      {/* Corporate Billing */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">Corporate Billing</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Corporate Company</label>
            <select value={corpCompanyId} onChange={e => setCorpCompanyId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">None</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {corpCompanyId && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Pre-Auth No</label>
                <input value={corpPreAuthNo} onChange={e => setCorpPreAuthNo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Co-Pay %</label>
                <input value={corpCoPayPercent} onChange={e => setCorpCoPayPercent(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Coverage Cap</label>
                <input value={corpCoverageCap} onChange={e => setCorpCoverageCap(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 5000" />
              </div>
            </>
          )}
        </div>
      </div>



      {/* Slip modal */}
      {slipOpen && slipData && (
        <Diagnostic_TokenSlip open={slipOpen} onClose={() => setSlipOpen(false)} data={slipData} />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
      {showPhonePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Select Patient (Phone: {phone})</div>
            <div className="max-h-96 overflow-y-auto p-2">
              {phonePatients.map((p, idx) => (
                <button key={p._id || idx} onClick={() => {
                  setSelectedPatient(p)
                  setFullName(p.fullName || '')
                  setPhone(p.phoneNormalized || '')
                  setMrn(p.mrn || '')
                  setAge((p.age != null && p.age !== '') ? String(p.age) : '')
                  if (p.gender) setGender(String(p.gender))
                  setGuardianName(p.fatherName || '')
                  if (p.guardianRel) setGuardianRel(String(p.guardianRel))
                  setAddress(p.address || '')
                  setCnic(p.cnicNormalized || p.cnic || '')
                  setShowPhonePicker(false)
                }} className="mb-2 w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50">
                  <div className="text-sm font-medium text-slate-800">{p.fullName || 'Unnamed'}</div>
                  <div className="text-xs text-slate-600">MRN: {p.mrn || '-'} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                  {p.address && <div className="text-xs text-slate-500 truncate">{p.address}</div>}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={() => setShowPhonePicker(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={clearPatientFieldsKeepPhone} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Create New Patient</button>
            </div>
          </div>
        </div>
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
                  setSelectedPatient(p)
                  setFullName(p.fullName || '')
                  setPhone(p.phoneNormalized || '')
                  setMrn(p.mrn || '')
                  setAge((p.age != null && p.age !== '') ? String(p.age) : '')
                  if (p.gender) setGender(String(p.gender))
                  setGuardianName(p.fatherName || '')
                  if (p.guardianRel) setGuardianRel(String(p.guardianRel))
                  setAddress(p.address || '')
                  setCnic(p.cnicNormalized || p.cnic || '')
                } finally { if (confirmPatient) skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null) }
              }} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
