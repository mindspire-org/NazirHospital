import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, Search, ChevronDown } from 'lucide-react'
import { labApi, hospitalApi, corporateApi } from '../../utils/api'
import { printLabTokenSlip } from '../../utils/printLabToken'

type LabTest = { id: string; name: string; price: number }

// local-only types for UI

function formatPKR(n: number) {
  try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` }
}

 

export default function Lab_Orders() {
  const navigate = useNavigate()
  const location = useLocation() as any
  const [tests, setTests] = useState<LabTest[]>([])
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const res = await labApi.listTests({ limit: 1000 })
        if (!mounted) return
        setTests((res.items||[]).map((x:any)=>({ id: x._id, name: x.name, price: Number(x.price||0) })))
      } catch(e){ console.error(e); setTests([]) }
    })()
    return ()=>{ mounted = false }
  }, [])

  

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [guardianRelation, setGuardianRelation] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [cnic, setCnic] = useState('')
  const [mrNumber, setMrNumber] = useState('')
  const [referring, setReferring] = useState('')

  const [patientPickOpen, setPatientPickOpen] = useState(false)
  const [patientPickMatches, setPatientPickMatches] = useState<any[]>([])
  const [patientPickContinue, setPatientPickContinue] = useState<null | ((selectId?: string) => Promise<any>)>(null)
  const [patientPickSkipKey, setPatientPickSkipKey] = useState<string>('')
  const [forceCreateNextSubmit, setForceCreateNextSubmit] = useState(false)

  const [query, setQuery] = useState('')
  const [openList, setOpenList] = useState(false)
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([])
 

  

  

  const [discount, setDiscount] = useState('0')
  // Corporate billing fields
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [corpCompanyId, setCorpCompanyId] = useState('')
  const [corpPreAuthNo, setCorpPreAuthNo] = useState('')
  const [corpCoPayPercent, setCorpCoPayPercent] = useState('')
  const [corpCoverageCap, setCorpCoverageCap] = useState('')
  // Corporate rules and computed prices for tests
  const [corpTestPriceMap, setCorpTestPriceMap] = useState<Record<string, number>>({})
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

  const closePatientPick = () => {
    setPatientPickOpen(false)
    setPatientPickMatches([])
    setPatientPickContinue(null)
  }

  const cancelPatientPick = () => {
    closePatientPick()
    // If user cancels, do not keep prompting for the same phone+name combo.
    // They can change phone/name and then it will prompt again.
    setPatientPickSkipKey(`${phone.trim()}|${fullName.trim()}`)
  }

  useEffect(() => {
    // If user changes identifying inputs, allow prompting again.
    setPatientPickSkipKey('')
  }, [phone, fullName])

  const pickExistingPatient = async (p: any) => {
    if (!patientPickContinue) return
    try {
      const resolved = await patientPickContinue(String(p?._id || ''))
      closePatientPick()
      await submitWithResolvedPatient(resolved)
    } catch (e: any) {
      alert(e?.message || 'Failed to select patient')
    }
  }

  const pickCreateNewPatient = async () => {
    if (!patientPickContinue) return
    try {
      const resolved = await patientPickContinue(undefined)
      closePatientPick()
      await submitWithResolvedPatient(resolved)
    } catch (e: any) {
      alert(e?.message || 'Failed to create patient')
    }
  }

  const clearPatientFieldsKeepPhone = () => {
    const digits = String(phone || '').replace(/\D+/g, '')
    const norm = (s: string)=> String(s||'').trim().toLowerCase().replace(/\s+/g,' ')
    const key = `${digits}|${norm(fullName)}`
    setMrNumber('')
    setFullName('')
    setAge('')
    setGender('')
    setAddress('')
    setGuardianName('')
    setGuardianRelation('')
    setCnic('')
    setShowPhonePicker(false)
    setPhonePatients([])
    setPhoneSuggestOpen(false)
    setPhoneSuggestItems([])
    skipLookupKeyRef.current = key
    lastPromptKeyRef.current = key
    setPatientPickSkipKey('')
    setForceCreateNextSubmit(true)
    setTimeout(() => { try { nameRef.current?.focus() } catch {} }, 50)
  }

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!phoneSuggestWrapRef.current) return
      if (!phoneSuggestWrapRef.current.contains(e.target as any)) setPhoneSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Re-compute effective prices when corporate changes or tests change
  useEffect(()=>{
    let cancelled = false
    async function loadRules(){
      if (!corpCompanyId){ setCorpTestPriceMap({}); return }
      try {
        const r = await corporateApi.listRateRules({ companyId: corpCompanyId, scope: 'LAB' }) as any
        const rules: any[] = (r?.rules || [])
          .filter((x:any)=> x && x.active !== false)
        const today = new Date().toISOString().slice(0,10)
        const valid = rules.filter((x:any)=> (!x.effectiveFrom || String(x.effectiveFrom).slice(0,10) <= today) && (!x.effectiveTo || today <= String(x.effectiveTo).slice(0,10)))
        // Build a map of effective price per test using priority (lower first)
        const def = valid.filter(x=>x.ruleType==='default').sort((a:any,b:any)=> (a.priority??100) - (b.priority??100))[0] || null
        const map: Record<string, number> = {}
        const apply = (base: number, rule: any)=>{
          const mode = rule?.mode
          const val = Number(rule?.value||0)
          if (mode === 'fixedPrice') return Math.max(0, val)
          if (mode === 'percentDiscount') return Math.max(0, base - (base * (val/100)))
          if (mode === 'fixedDiscount') return Math.max(0, base - val)
          return base
        }
        for (const t of tests){
          const base = Number(t.price||0)
          const specific = valid.filter(x=> x.ruleType==='test' && String(x.refId)===String(t.id)).sort((a:any,b:any)=> (a.priority??100) - (b.priority??100))[0] || null
          const rule = specific || def
          map[t.id] = rule ? apply(base, rule) : base
        }
        if (!cancelled){ setCorpTestPriceMap(map) }
      } catch { if (!cancelled){ setCorpTestPriceMap({}) } }
    }
    loadRules()
    return ()=>{ cancelled = true }
  }, [corpCompanyId, tests])

  // Debounced phone-based autofill similar to Hospital/Diagnostic token pages
  async function autoFillByPhone(phoneNumber: string){
    const digits = (phoneNumber||'').replace(/\D+/g,'')
    if (!digits || digits.length < 10) return
    try{
      const r: any = await labApi.searchPatients({ phone: digits, limit: 10 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (list.length > 1){
        setPhonePatients(list)
        setShowPhonePicker(true)
      } else if (list.length === 1){
        const p = list[0]
        if (p.fullName) setFullName(String(p.fullName))
        if (p.mrn) setMrNumber(String(p.mrn))
        if (p.phoneNormalized) setPhone(String(p.phoneNormalized))
        if (p.age) setAge(String(p.age))
        if (p.gender) setGender(String(p.gender))
        if (p.address) setAddress(String(p.address))
        if (p.fatherName) setGuardianName(String(p.fatherName))
        if (p.guardianRel) {
          const rel = String(p.guardianRel)
          setGuardianRelation(rel==='S/O' ? 'Father' : (rel==='D/O' ? 'Mother' : rel))
        }
        if (p.cnicNormalized) setCnic(String(p.cnicNormalized))
      }
    } catch {}
  }

  function onPhoneChange(e: any){
    const prevDigits = String(phone || '').replace(/\D+/g,'')
    const v = String(e?.target?.value ?? '')
    const nextDigits = v.replace(/\D+/g,'').slice(0, 11)
    setPhone(nextDigits)
    if (mrNumber && prevDigits !== nextDigits) {
      setMrNumber('')
    }
    skipLookupKeyRef.current = null; lastPromptKeyRef.current = null
    ;(window as any)._labPhoneDeb && clearTimeout((window as any)._labPhoneDeb)
    const digits = nextDigits
    // Incremental dropdown suggestions when 3+ digits
    if ((window as any)._labPhoneSuggestDeb) clearTimeout((window as any)._labPhoneSuggestDeb)
    if (digits.length >= 3){
      ;(window as any)._labPhoneSuggestDeb = setTimeout(()=> runPhoneSuggestLookup(digits), 250)
    } else {
      setPhoneSuggestItems([])
      setPhoneSuggestOpen(false)
    }
    if (digits.length >= 10){
      ;(window as any)._labPhoneDeb = setTimeout(()=> autoFillByPhone(v), 500)
    }
  }

  async function runPhoneSuggestLookup(digits: string){
    try{
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

  function selectPhoneSuggestion(p: any){
    try{
      if (p.fullName) setFullName(String(p.fullName))
      if (p.mrn) setMrNumber(String(p.mrn))
      if (p.phoneNormalized) setPhone(String(p.phoneNormalized))
      if (p.age) setAge(String(p.age))
      if (p.gender) setGender(String(p.gender))
      if (p.address) setAddress(String(p.address))
      if (p.fatherName) setGuardianName(String(p.fatherName))
      if (p.guardianRel) {
        const rel = String(p.guardianRel)
        setGuardianRelation(rel==='S/O' ? 'Father' : (rel==='D/O' ? 'Mother' : rel))
      }
      if (p.cnicNormalized) setCnic(String(p.cnicNormalized))
    } finally {
      setPhoneSuggestOpen(false)
    }
  }

  const getEffectivePrice = (id: string): number => {
    const base = (tests.find(t=>t.id===id)?.price) || 0
    if (!corpCompanyId) return base
    const v = corpTestPriceMap[id]
    return v != null ? v : base
  }

  const filteredTests = useMemo(() => {
    const term = query.trim().toLowerCase()
    return tests
      .filter(t => !selectedTestIds.includes(t.id))
      .filter(t => !term || t.name.toLowerCase().includes(term))
      .slice(0, 20)
  }, [tests, query, selectedTestIds, corpCompanyId, corpTestPriceMap])

  const selectedTests = useMemo(() => selectedTestIds.map(id => tests.find(t => t.id === id)).filter(Boolean) as LabTest[], [selectedTestIds, tests])

  const subtotal = useMemo(() => selectedTests.reduce((s, t) => s + getEffectivePrice(t.id), 0), [selectedTests, corpCompanyId, corpTestPriceMap])
  const discountNum = Number(discount) || 0
  const net = Math.max(0, subtotal - discountNum)

  // Load corporate companies once
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const res = await corporateApi.listCompanies() as any
        if (!mounted) return
        const arr = (res?.companies||[]).map((c:any)=>({ id: String(c._id||c.id), name: c.name }))
        setCompanies(arr)
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  const addTest = (id: string) => {
    setSelectedTestIds(prev => [...prev, id])
    setQuery('')
  }
  const removeTest = (id: string) => setSelectedTestIds(prev => prev.filter(x => x !== id))

  

  useEffect(()=>{
    const st = (location?.state || {}) as any
    if (!st) return
    const p = st.patient || {}
    try {
      if (p.mrn) setMrNumber(String(p.mrn))
      if (p.fullName) setFullName(String(p.fullName))
      if (p.phone) setPhone(String(p.phone))
      if (p.gender) setGender(String(p.gender))
      if (p.address) setAddress(String(p.address))
      if (p.fatherName) setGuardianName(String(p.fatherName))
      if (p.cnic) setCnic(String(p.cnic))
    } catch {}
    // Fetch complete patient details from backend if MRN is provided
    if (p.mrn) {
      (async () => {
        try {
          const r = await labApi.getPatientByMrn(String(p.mrn))
          const pr = r?.patient
          if (pr) {
            if (pr.fullName) setFullName(String(pr.fullName))
            if (pr.phoneNormalized) setPhone(String(pr.phoneNormalized))
            if (pr.age) setAge(String(pr.age))
            if (pr.gender) setGender(String(pr.gender))
            if (pr.address) setAddress(String(pr.address))
            if (pr.fatherName) setGuardianName(String(pr.fatherName))
            if (pr.guardianRel) setGuardianRelation(String(pr.guardianRel)==='S/O'?'Father':(String(pr.guardianRel)==='D/O'?'Mother':String(pr.guardianRel)))
            if (pr.cnicNormalized) setCnic(String(pr.cnicNormalized))
          }
        } catch {}
      })()
    }
    if (st.referringConsultant) setReferring(String(st.referringConsultant))
    // Do not auto-select tests (user will select manually)
  }, [location])

  const onSubmit = async () => {
    if (!fullName.trim() || !phone.trim() || selectedTestIds.length === 0) return
    // 1) Find or create patient (phone-driven)
    let patient: any | null = null
    try {
      const basePayload: any = {
        fullName: fullName.trim(),
        guardianName: guardianName.trim() || undefined,
        phone: phone.trim() || undefined,
        cnic: cnic.trim() || undefined,
        gender: gender || undefined,
        address: address.trim() || undefined,
        age: age.trim() || undefined,
        guardianRel: guardianRelation || undefined,
      }
      if (forceCreateNextSubmit) basePayload.forceCreate = true

      const skipKey = `${phone.trim()}|${fullName.trim()}`
      if (patientPickSkipKey && patientPickSkipKey === skipKey) {
        alert('Please select an existing patient from the list, or change phone/name to create a new patient.')
        return
      }

      let resp = await labApi.findOrCreatePatient(basePayload)
      if (forceCreateNextSubmit) setForceCreateNextSubmit(false)
      if (resp?.needSelection && Array.isArray(resp.matches) && resp.matches.length) {
        setPatientPickMatches(resp.matches)
        setPatientPickOpen(true)
        setPatientPickContinue(() => async (selectId?: string) => {
          const r2 = await labApi.findOrCreatePatient({ ...basePayload, selectId })
          const resolved = r2?.patient || null
          if (!resolved) throw new Error('Patient not resolved')
          return resolved
        })
        return
      }
      patient = resp?.patient || null
    } catch (e: any) {
      alert(e?.message || 'Failed to find/create patient')
      return
    }
    await submitWithResolvedPatient(patient)
  }

  async function submitWithResolvedPatient(patient: any) {
    if (!patient){ alert('Patient not resolved'); return }
    // update MR number display
    try { setMrNumber(String(patient.mrn||'')) } catch {}
    // populate gender from patient record if available
    try { if (patient.gender) setGender(String(patient.gender)) } catch {}

    // 2) Create per-test orders with shared token
    try {
      const patientSnap = {
        mrn: String(patient.mrn||''),
        fullName: fullName.trim(),
        phone: phone.trim(),
        age: age.trim() || undefined,
        gender: gender || undefined,
        address: address.trim() || undefined,
        guardianRelation: guardianRelation || undefined,
        guardianName: guardianName.trim() || undefined,
        cnic: cnic.trim() || undefined,
      }
      const getPrice = (id: string) => Number(getEffectivePrice(id))
      let sharedToken = ''
      let createdAtIso = new Date().toISOString()
      // First order (includes consumables and full discount)
      const firstId = selectedTestIds[0]
      const firstPayload: any = {
        patientId: String(patient._id),
        patient: patientSnap,
        tests: [firstId],
        subtotal: getPrice(firstId),
        discount: discountNum,
        net: Math.max(0, getPrice(firstId) - discountNum),
        referringConsultant: referring.trim() || undefined,
      }
      if (corpCompanyId){
        firstPayload.corporateId = corpCompanyId
        if (corpPreAuthNo) firstPayload.corporatePreAuthNo = corpPreAuthNo
        if (corpCoPayPercent) firstPayload.corporateCoPayPercent = Number(corpCoPayPercent)
        if (corpCoverageCap) firstPayload.corporateCoverageCap = Number(corpCoverageCap)
      }
      const createdFirst = await labApi.createOrder(firstPayload)
      sharedToken = String(createdFirst?.tokenNo || '')
      createdAtIso = String(createdFirst?.createdAt || createdAtIso)
      const sharedFbr = {
        status: createdFirst?.fbrStatus || createdFirst?.order?.fbrStatus || createdFirst?.fbr?.status,
        qrCode: createdFirst?.fbrQrCode || createdFirst?.order?.fbrQrCode || createdFirst?.fbr?.qrCode,
        fbrInvoiceNo: createdFirst?.fbrInvoiceNo || createdFirst?.order?.fbrInvoiceNo || createdFirst?.fbr?.fbrInvoiceNo || createdFirst?.fbr?.invoiceNumber,
        mode: createdFirst?.fbrMode || createdFirst?.order?.fbrMode || createdFirst?.fbr?.mode,
        error: createdFirst?.fbrError || createdFirst?.order?.fbrError || createdFirst?.fbr?.error,
      }
      // Link back to IPD encounter if provided — update existing 'referred' link if present, else create one
      try {
        const encId = (location?.state as any)?.encounterId
        if (encId) {
          const orderId = String(createdFirst?._id || createdFirst?.id || '')
          const lr = await hospitalApi.listIpdLabLinks(String(encId), { limit: 200 }) as any
          const links = (lr?.links || []) as any[]
          const testName = (tests.find(t=>t.id===firstId)?.name || '').toLowerCase()
          let existing = links.find(l => !l.externalLabOrderId && Array.isArray(l.testIds) && (l.testIds.includes(firstId) || l.testIds.some((x:any)=> String(x).toLowerCase() === testName)))
          if (!existing){
            const noOrderLinks = links.filter(l => !l.externalLabOrderId)
            if (noOrderLinks.length === 1) existing = noOrderLinks[0]
          }
          if (existing) {
            await hospitalApi.updateIpdLabLink(String(existing._id), { externalLabOrderId: orderId, status: 'ordered' })
          } else {
            await hospitalApi.createIpdLabLink(String(encId), { externalLabOrderId: orderId, testIds: [firstId], status: 'ordered' })
          }
          // Dedupe any accidental duplicates for this order
          try {
            const lr2 = await hospitalApi.listIpdLabLinks(String(encId), { limit: 200 }) as any
            const links2 = (lr2?.links || []) as any[]
            const dupes = links2.filter(l => String(l.externalLabOrderId||'') === orderId)
            if (dupes.length > 1){
              dupes.sort((a,b)=> new Date(a.createdAt||0).getTime() - new Date(b.createdAt||0).getTime())
              for (const d of dupes.slice(1)){
                try { await hospitalApi.deleteIpdLabLink(String(d._id)) } catch {}
              }
            }
          } catch {}
        }
      } catch {}

      // Remaining tests — reuse token, no discount
      const remain = selectedTestIds.slice(1)
      for (const tid of remain){
        const payload: any = {
          patientId: String(patient._id),
          patient: patientSnap,
          tests: [tid],
          subtotal: getPrice(tid),
          discount: 0,
          net: getPrice(tid),
          referringConsultant: referring.trim() || undefined,
          tokenNo: sharedToken,
        }
        if (corpCompanyId){
          payload.corporateId = corpCompanyId
          if (corpPreAuthNo) payload.corporatePreAuthNo = corpPreAuthNo
          if (corpCoPayPercent) payload.corporateCoPayPercent = Number(corpCoPayPercent)
          if (corpCoverageCap) payload.corporateCoverageCap = Number(corpCoverageCap)
        }
        const created = await labApi.createOrder(payload)
        // Link back to IPD encounter if provided — update existing 'referred' link if present, else create one
        try {
          const encId = (location?.state as any)?.encounterId
          if (encId) {
            const orderId = String(created?._id || created?.id || '')
            const lr = await hospitalApi.listIpdLabLinks(String(encId), { limit: 200 }) as any
            const links = (lr?.links || []) as any[]
            const testName = (tests.find(t=>t.id===tid)?.name || '').toLowerCase()
            let existing = links.find(l => !l.externalLabOrderId && Array.isArray(l.testIds) && (l.testIds.includes(tid) || l.testIds.some((x:any)=> String(x).toLowerCase() === testName)))
            if (!existing){
              const noOrderLinks = links.filter(l => !l.externalLabOrderId)
              if (noOrderLinks.length === 1) existing = noOrderLinks[0]
            }
            if (existing) {
              await hospitalApi.updateIpdLabLink(String(existing._id), { externalLabOrderId: orderId, status: 'ordered' })
            } else {
              await hospitalApi.createIpdLabLink(String(encId), { externalLabOrderId: orderId, testIds: [tid], status: 'ordered' })
            }
            // Dedupe any accidental duplicates for this order
            try {
              const lr2 = await hospitalApi.listIpdLabLinks(String(encId), { limit: 200 }) as any
              const links2 = (lr2?.links || []) as any[]
              const dupes = links2.filter(l => String(l.externalLabOrderId||'') === orderId)
              if (dupes.length > 1){
                dupes.sort((a,b)=> new Date(a.createdAt||0).getTime() - new Date(b.createdAt||0).getTime())
                for (const d of dupes.slice(1)){
                  try { await hospitalApi.deleteIpdLabLink(String(d._id)) } catch {}
                }
              }
            } catch {}
          }
        } catch {}
      }

      // Note: Do not auto-change referral status. It will remain visible until user manually marks completed or deletes.

      // Print a single slip with all tests and totals using the shared token
      const rows = selectedTests.map(t=> ({ name: t.name, price: Number(t.price||0) }))
      // Resolve printedBy from sessions (Lab -> Diagnostic -> Hospital)
      let printedBy = 'admin'
      try {
        const ls = localStorage.getItem('lab.session'); if (ls){ const s = JSON.parse(ls||'{}'); printedBy = s?.username || printedBy }
        if (printedBy === 'admin'){
          const du = localStorage.getItem('diagnostic.user'); if (du){ const u = JSON.parse(du||'{}'); printedBy = u?.username || u?.name || printedBy }
        }
        if (printedBy === 'admin'){
          const hs = localStorage.getItem('hospital.session'); if (hs){ const h = JSON.parse(hs||'{}'); printedBy = h?.username || printedBy }
        }
      } catch {}
      await printLabTokenSlip({
        tokenNo: sharedToken,
        createdAt: createdAtIso,
        patient: { fullName: fullName.trim(), mrn: String(patient?.mrn || '').trim() || undefined, phone: phone.trim(), age: age.trim() || undefined, gender: gender || undefined },
        tests: rows,
        subtotal,
        discount: discountNum,
        net,
        printedBy,
        fbr: sharedFbr as any,
      })
      setFullName('')
      setPhone('')
      setAge('')
      setGender('')
      setAddress('')
      setGuardianRelation('')
      setGuardianName('')
      setCnic('')
      setMrNumber('')
      setReferring('')
      setQuery('')
      setOpenList(false)
      setSelectedTestIds([])
      setDiscount('0')
      setCorpCompanyId('')
      setCorpPreAuthNo('')
      setCorpCoPayPercent('')
      setCorpCoverageCap('')
      setCorpTestPriceMap({})
      setConfirmPatient(null)
      setFocusAfterConfirm(null)
      setPhonePatients([])
      setShowPhonePicker(false)
      setPhoneSuggestOpen(false)
      setPhoneSuggestItems([])
      phoneSuggestQueryRef.current = ''
      skipLookupKeyRef.current = null
      lastPromptKeyRef.current = null
      navigate('/lab/orders')
    } catch (e){ console.error(e); alert('Failed to create order(s)') }
  }

  // Lookup existing patient only when both phone and name are present
  async function lookupExistingByPhoneAndName(source: 'phone'|'name' = 'phone'){
    const digits = (phone||'').replace(/\D+/g,'')
    const nameEntered = (fullName||'').trim()
    if (!digits || !nameEntered) return
    try{
      const norm = (s: string)=> String(s||'').trim().toLowerCase().replace(/\s+/g,' ')
      const key = `${digits}|${norm(nameEntered)}`
      if (skipLookupKeyRef.current === key || lastPromptKeyRef.current === key) return
      const r: any = await labApi.searchPatients({ phone: digits, limit: 10 })
      const list: any[] = Array.isArray(r?.patients) ? r.patients : []
      if (!list.length) return
      const p = list.find(x => norm(x.fullName) === norm(nameEntered))
      if (!p) return // no exact name match; don't prompt
      const summary = [
        `Found existing patient. Apply details?`,
        `MRN: ${p.mrn||'-'}`,
        `Name: ${p.fullName||'-'}`,
        `Phone: ${p.phoneNormalized||digits}`,
        `Age: ${p.age || (age?.trim()||'-')}`,
        p.gender? `Gender: ${p.gender}` : null,
        p.address? `Address: ${p.address}` : null,
        p.fatherName? `Guardian: ${p.fatherName}` : null,
        `Guardian Relation: ${p.guardianRel || (guardianRelation||'-')}`,
        p.cnicNormalized? `CNIC: ${p.cnicNormalized}` : null,
      ].filter(Boolean).join('\n')
      // Open non-blocking modal to avoid Electron focus freeze on native confirm
      setTimeout(()=> { setFocusAfterConfirm(source); lastPromptKeyRef.current = key; setConfirmPatient({ summary, patient: p, key }) }, 0)
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">Patient Details</div>
        <div className="text-xs text-slate-500">Enter patient demographics</div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone *</label>
            <div ref={phoneSuggestWrapRef} className="relative">
              <input
                value={phone}
                onChange={onPhoneChange}
                ref={phoneRef}
                maxLength={11}
                onBlur={()=>lookupExistingByPhoneAndName('phone')}
                onFocus={()=>{ if (phoneSuggestItems.length>0) setPhoneSuggestOpen(true) }}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Type phone to search"
              />
              {phoneSuggestOpen && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {phoneSuggestItems.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No results</div>
                  ) : (
                    phoneSuggestItems.map((p:any, idx:number) => (
                      <button
                        type="button"
                        key={p._id || idx}
                        onClick={()=> selectPhoneSuggestion(p)}
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

      {confirmPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Patient</div>
            <div className="px-5 py-4 text-sm whitespace-pre-wrap text-slate-700">{confirmPatient.summary}</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={()=> { if (confirmPatient) skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null); setTimeout(()=>{ if (focusAfterConfirm==='phone') phoneRef.current?.focus(); else if (focusAfterConfirm==='name') nameRef.current?.focus(); setFocusAfterConfirm(null) }, 0) }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={()=>{
                const p = confirmPatient.patient
                try{
                  if (p.fullName) setFullName(String(p.fullName))
                  if (p.mrn) setMrNumber(String(p.mrn))
                  if (p.phoneNormalized) setPhone(String(p.phoneNormalized))
                  if (p.age) setAge(String(p.age))
                  if (p.gender) setGender(String(p.gender))
                  if (p.address) setAddress(String(p.address))
                  if (p.fatherName) setGuardianName(String(p.fatherName))
                  if (p.guardianRel) {
                    const rel = String(p.guardianRel)
                    setGuardianRelation(rel==='S/O' ? 'Father' : (rel==='D/O' ? 'Mother' : rel))
                  }
                  if (p.cnicNormalized) setCnic(String(p.cnicNormalized))
                } finally { if (confirmPatient) skipLookupKeyRef.current = confirmPatient.key; setConfirmPatient(null) }
              }} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800">Apply</button>
            </div>
          </div>
        </div>
      )}
      {showPhonePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Select Patient (Phone: {phone})</div>
            <div className="max-h-96 overflow-y-auto p-2">
              {phonePatients.map((p, idx) => (
                <button
                  key={p._id || idx}
                  onClick={()=>{
                    try{
                      if (p.fullName) setFullName(String(p.fullName))
                      if (p.mrn) setMrNumber(String(p.mrn))
                      if (p.phoneNormalized) setPhone(String(p.phoneNormalized))
                      if (p.age) setAge(String(p.age))
                      if (p.gender) setGender(String(p.gender))
                      if (p.address) setAddress(String(p.address))
                      if (p.fatherName) setGuardianName(String(p.fatherName))
                      if (p.guardianRel) {
                        const rel = String(p.guardianRel)
                        setGuardianRelation(rel==='S/O' ? 'Father' : (rel==='D/O' ? 'Mother' : rel))
                      }
                      if (p.cnicNormalized) setCnic(String(p.cnicNormalized))
                    } finally { setShowPhonePicker(false) }
                  }}
                  className="mb-2 w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"
                >
                  <div className="text-sm font-medium text-slate-800">{p.fullName || 'Unnamed'}</div>
                  <div className="text-xs text-slate-600">MRN: {p.mrn || '-'} • Age: {p.age || '-'} • {p.gender || '-'}</div>
                  {p.address && <div className="text-xs text-slate-500 truncate">{p.address}</div>}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={()=> setShowPhonePicker(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={clearPatientFieldsKeepPhone} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Create New Patient</button>
            </div>
          </div>
        </div>
      )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Full Name *</label>
            <input value={fullName} onChange={e=>{ setFullName(e.target.value); skipLookupKeyRef.current = null; lastPromptKeyRef.current = null }} ref={nameRef} onBlur={()=>lookupExistingByPhoneAndName('name')} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g. Muhammad Zain" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Age</label>
            <input value={age} onChange={e=>setAge(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g. 22" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">MR Number</label>
            <input value={mrNumber} onChange={e=>setMrNumber(e.target.value)} onBlur={async()=>{
              const mr = mrNumber.trim(); if (!mr) return; try { const r = await labApi.getPatientByMrn(mr); const p = r.patient; setFullName(p.fullName||''); setPhone(p.phoneNormalized||''); setAge(p.age? String(p.age):''); setGender(p.gender||''); setAddress(p.address||''); { const rel = String(p.guardianRel||''); setGuardianRelation(rel==='S/O'?'Father':(rel==='D/O'?'Mother':rel||'')); } setGuardianName(p.fatherName||''); setCnic(p.cnicNormalized||''); } catch {}
            }} onKeyDown={async (e)=>{ if (e.key !== 'Enter') return; e.preventDefault(); const mr = mrNumber.trim(); if (!mr) return; try { const r = await labApi.getPatientByMrn(mr); const p = r.patient; setFullName(p.fullName||''); setPhone(p.phoneNormalized||''); setAge(p.age? String(p.age):''); setGender(p.gender||''); setAddress(p.address||''); { const rel = String(p.guardianRel||''); setGuardianRelation(rel==='S/O'?'Father':(rel==='D/O'?'Mother':rel||'')); } setGuardianName(p.fatherName||''); setCnic(p.cnicNormalized||''); } catch {} }} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="MR-2401-000001" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Referring Consultant</label>
            <input value={referring} onChange={e=>setReferring(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Gender</label>
            <select value={gender} onChange={e=>setGender(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
            <input value={address} onChange={e=>setAddress(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Street, City" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Guardian Relation</label>
            <select value={guardianRelation} onChange={e=>setGuardianRelation(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">Select</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Husband">Husband</option>
              <option value="Wife">Wife</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Guardian Name</label>
            <input value={guardianName} onChange={e=>setGuardianName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g. Arif" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">CNIC</label>
            <input value={cnic} onChange={e=>setCnic(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="#####-#######-#" />
          </div>
        </div>
        {/* Corporate Billing */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Corporate Company</label>
            <select value={corpCompanyId} onChange={e=>setCorpCompanyId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">None</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {corpCompanyId && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Pre-Auth No</label>
                <input value={corpPreAuthNo} onChange={e=>setCorpPreAuthNo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Co-Pay %</label>
                <input value={corpCoPayPercent} onChange={e=>setCorpCoPayPercent(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Coverage Cap</label>
                <input value={corpCoverageCap} onChange={e=>setCorpCoverageCap(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 5000" />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">Select Tests</div>
        <div className="text-xs text-slate-500">Type to search and pick multiple tests</div>
        <div className="mt-3">
          <div className="flex items-center gap-2 rounded-md border border-slate-300 px-2 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <div className="flex flex-wrap items-center gap-2">
              {selectedTests.map(t => (
                <span key={t.id} className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2 py-1 text-sm">
                  {t.name}
                  <button onClick={()=>removeTest(t.id)} className="text-slate-500 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
              <input value={query} onChange={e=>{ setQuery(e.target.value); setOpenList(true) }} onFocus={()=>setOpenList(true)} placeholder="Search test..." className="min-w-[160px] flex-1 outline-none" />
            </div>
            <button onClick={()=>setOpenList(o=>!o)} className="ml-auto text-slate-500"><ChevronDown className="h-4 w-4" /></button>
          </div>
          {openList && filteredTests.length > 0 && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
              {filteredTests.map(t => (
                <button key={t.id} onClick={()=>addTest(t.id)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{t.name}</div>
                    <div className="text-xs text-slate-500">Price: {formatPKR(getEffectivePrice(t.id))}</div>
                  </div>
                  <div className="text-xs text-slate-600">{formatPKR(getEffectivePrice(t.id))}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">Selected Tests ({selectedTests.length})</div>
        <div className="mt-3 divide-y divide-slate-200 text-sm">
          {selectedTests.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2">
              <div>{t.name}</div>
              <div>{formatPKR(getEffectivePrice(t.id))}</div>
            </div>
          ))}
          <div className="flex items-center justify-between py-2">
            <div className="text-slate-600">Subtotal</div>
            <div>{formatPKR(subtotal)}</div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="text-slate-600">Discount</div>
            <input value={discount} onChange={e=>setDiscount(e.target.value)} className="w-40 rounded-md border border-slate-300 px-3 py-1.5 text-right" placeholder="0" />
          </div>
          <div className="flex items-center justify-between py-2 font-semibold">
            <div>Net Amount</div>
            <div>{formatPKR(net)}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={()=>navigate(-1)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Back</button>
          <button disabled={!fullName || !phone || selectedTests.length===0} onClick={onSubmit} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">Submit ({formatPKR(net)})</button>
        </div>
      </div>
      {patientPickOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="text-base font-semibold text-slate-800">Select Patient (Phone: {phone})</div>
              <button onClick={closePatientPick} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100">×</button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {patientPickMatches.map((p, idx) => (
                <button
                  key={p._id || idx}
                  onClick={() => pickExistingPatient(p)}
                  className="mb-2 w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"
                  type="button"
                >
                  <div className="text-sm font-medium text-slate-800">{p.fullName || 'Unnamed'}</div>
                  <div className="text-xs text-slate-500">{p.mrn || '-'}{p.fatherName ? ` • ${p.fatherName}` : ''}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={cancelPatientPick} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={pickCreateNewPatient} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">Create New Patient</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
