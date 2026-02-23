import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { aestheticApi, labApi } from '../../utils/api'
import SignaturePad from '../../components/common/SignaturePad'
import { ArrowLeft, CalendarClock, CheckCircle2, CircleDollarSign, Clock, FileText, Image, Plus, Receipt, ShieldCheck } from 'lucide-react'

export default function Aesthetic_PatientProfile(){
  const { mrn = '' } = useParams()
  const [historyTab, setHistoryTab] = useState<'ongoing'|'past'>('ongoing')
  const [patient, setPatient] = useState<any|null>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [consents, setConsents] = useState<any[]>([])

  const normStatus = (st: any) => String(st || 'planned').trim().toLowerCase()
  const isClosedStatus = (st: any) => {
    const v = normStatus(st)
    return v === 'done' || v === 'completed' || v === 'cancelled'
  }

  const [addSessionOpen, setAddSessionOpen] = useState(false)
  const [catalog, setCatalog] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])

  const [sessionForm, setSessionForm] = useState({ procedureId: '', date: new Date().toISOString().slice(0,16), price: '', discount: '0', paid: '0', notes: '' })
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentForm, setConsentForm] = useState<{ templateId: string; signature?: string }>({ templateId: '' })

  const patientId = useMemo(()=> String(patient?._id||''), [patient])

  const [payOpen, setPayOpen] = useState(false)
  const [paySession, setPaySession] = useState<any|null>(null)
  const [payForm, setPayForm] = useState({ amount: '', method: 'Cash', note: '' })

  const [nextOpen, setNextOpen] = useState(false)
  const [nextSession, setNextSession] = useState<any|null>(null)
  const [nextDate, setNextDate] = useState<string>(new Date().toISOString().slice(0,16))

  const [completeProcedureId, setCompleteProcedureId] = useState('')
  const [completeBusy, setCompleteBusy] = useState(false)

  useEffect(()=>{
    let cancelled = false
    async function load(){
      try {
        const p = await labApi.getPatientByMrn(String(mrn)) as any
        if (cancelled) return
        setPatient(p?.patient || p || null)
      } catch {
        setPatient(null)
      } finally { setLoading(false) }
    }
    load()
    return ()=>{ cancelled = true }
  }, [mrn])

  const refreshSessions = async ()=>{
    if (!mrn) return
    try {
      const r: any = await aestheticApi.listProcedureSessions({ patientMrn: String(mrn), page: 1, limit: 50 })
      const items = r.items || []
      setSessions(items)
      return items as any[]
    } catch { setSessions([]) }
  }
  const refreshConsents = async ()=>{
    if (!mrn) return
    try {
      const r: any = await aestheticApi.listConsents({ patientMrn: String(mrn), page: 1, limit: 50 })
      setConsents(r.items || [])
    } catch { setConsents([]) }
  }

  useEffect(()=>{ refreshSessions(); refreshConsents() }, [mrn])
  useEffect(()=>{
    if (completeProcedureId) return
    const first = sessions.find(s => s?.procedureId)
    if (first?.procedureId) setCompleteProcedureId(String(first.procedureId))
  }, [sessions, completeProcedureId])
  useEffect(()=>{
    let cancelled=false
    ;(async()=>{
      try { const r: any = await aestheticApi.listProcedureCatalog({ limit: 200 }); if (!cancelled) setCatalog(r.items || []) } catch {}
      try { const r: any = await aestheticApi.listConsentTemplates({ limit: 200 }); if (!cancelled) setTemplates(r.items || []) } catch {}
    })()
    return ()=>{ cancelled=true }
  }, [])

  const stats = useMemo(()=>{
    const totalPaid = sessions.reduce((s, x)=> s + Number(x.paid||0), 0)
    const totalBalance = sessions.reduce((s, x)=> s + Number(x.balance||0), 0)
    const lastTs = sessions.reduce((m,x)=> Math.max(m, new Date(x.date).getTime()), 0)
    const lastVisit = lastTs ? new Date(lastTs) : null
    const today = new Date(); today.setHours(0,0,0,0)
    const upcoming = sessions.map(s=> s.nextVisitDate ? new Date(s.nextVisitDate) : null)
      .filter((d): d is Date => !!d && !isNaN(d.getTime()) && d >= today)
      .sort((a,b)=> a.getTime() - b.getTime())
    const nextVisit = upcoming[0] || null
    return { totalPaid, totalBalance, lastVisit, nextVisit }
  }, [sessions])

  const dueSessions = useMemo(()=> sessions.filter(s=> Number(s.balance||0) > 0).sort((a,b)=> Number(b.balance||0) - Number(a.balance||0)), [sessions])

  const outstandingByProcedureId = useMemo(()=>{
    const map = new Map<string, number>()
    for (const s of sessions){
      const pid = String(s.procedureId || '')
      if (!pid) continue
      const bal = Number(s.balance || 0)
      if (!bal) continue
      map.set(pid, (map.get(pid) || 0) + bal)
    }
    return map
  }, [sessions])

  const firstSessionIdByProcedureId = useMemo(()=>{
    const map = new Map<string, string>()
    for (const s of sessions){
      const pid = String(s.procedureId || '')
      const sid = String(s._id || '')
      if (!pid || !sid) continue
      if (!map.has(pid)) map.set(pid, sid)
    }
    return map
  }, [sessions])

  const procedureCompletedById = useMemo(()=>{
    const map = new Map<string, boolean>()
    for (const s of sessions){
      const pid = String(s.procedureId || '')
      if (!pid) continue
      if (s.procedureCompleted === true) map.set(pid, true)
    }
    return map
  }, [sessions])

  const procedureOptions = useMemo(()=>{
    const byId = new Map<string, string>()
    for (const s of sessions){
      const pid = String(s.procedureId || '')
      if (!pid) continue
      const name = String(s.procedureName || pid)
      if (!byId.has(pid)) byId.set(pid, name)
    }
    return Array.from(byId.entries()).map(([id, name])=>({ id, name }))
  }, [sessions])

  const sessionNumberById = useMemo(()=>{
    const map = new Map<string, { n: number; total: number }>()
    const groups = new Map<string, any[]>()
    for (const s of sessions){
      const pid = String(s.procedureId || '')
      if (!pid) continue
      if (!groups.has(pid)) groups.set(pid, [])
      groups.get(pid)!.push(s)
    }
    for (const arr of groups.values()){
      const sorted = [...arr].sort((a,b)=>{
        const aNo = a?.sessionNo != null ? Number(a.sessionNo) : NaN
        const bNo = b?.sessionNo != null ? Number(b.sessionNo) : NaN
        if (!isNaN(aNo) && !isNaN(bNo)) return aNo - bNo
        const ad = new Date(a?.date || 0).getTime() || 0
        const bd = new Date(b?.date || 0).getTime() || 0
        return ad - bd
      })
      const total = sorted.length
      for (let i=0;i<sorted.length;i++){
        const sid = String(sorted[i]?._id || '')
        if (!sid) continue
        map.set(sid, { n: i+1, total })
      }
    }
    return map
  }, [sessions])

  const completeProcedure = async (procedureId: string)=>{
    const pid = String(procedureId || '')
    if (!pid) {
      window.alert('Select a procedure first.')
      return
    }
    if (completeBusy) return
    if (procedureCompletedById.get(pid) === true){
      window.alert('Procedure already completed.')
      return
    }
    const procName = procedureOptions.find(x=>String(x.id)===pid)?.name || pid
    const ok = window.confirm(`Complete procedure: ${procName}?`)
    if (!ok) return

    try {
      setCompleteBusy(true)
      const outstanding = outstandingByProcedureId.get(pid) || 0
      if (outstanding > 0){
        window.alert(`Cannot complete procedure. Outstanding balance: Rs ${Math.round(outstanding).toLocaleString()}`)
        return
      }
      await aestheticApi.completeProcedure({ patientMrn: String(mrn), procedureId: pid })
      await refreshSessions()
      setHistoryTab('past')
      window.alert('Procedure completed.')
    } catch {
      window.alert('Unable to complete procedure. Please try again.')
    } finally {
      setCompleteBusy(false)
    }
  }

  const addSession = async ()=>{
    if (!patient) return
    const proc = catalog.find((x:any)=> String(x._id)===String(sessionForm.procedureId))

    const procedureId = String(sessionForm.procedureId)
    const outstanding = outstandingByProcedureId.get(procedureId) || 0
    if (outstanding > 0){
      const toClose = sessions.filter(s => String(s.procedureId)===procedureId && Number(s.balance||0) > 0)
      if (toClose.length){
        await Promise.all(toClose.map(s => {
          const paid = Number(s.paid || 0)
          return aestheticApi.updateProcedureSession(String(s._id), { price: paid, discount: 0 })
        }))
      }
    }

    const created: any = await aestheticApi.createProcedureSession({
      labPatientId: patientId,
      patientMrn: String(patient.mrn||'') || undefined,
      patientName: String(patient.fullName||'') || undefined,
      phone: String(patient.phoneNormalized||'') || undefined,
      procedureId,
      procedureName: proc?.name,
      date: new Date(sessionForm.date).toISOString(),
      price: Number(sessionForm.price||0),
      discount: Number(sessionForm.discount||0),
      paid: 0,
      notes: sessionForm.notes||'',
      status: 'planned',
    })
    if (Number(sessionForm.paid||0) > 0){
      try { await aestheticApi.addProcedureSessionPayment(String(created?._id||created?.id||''), { amount: Number(sessionForm.paid||0), note: 'Initial payment' }) } catch {}
    }
    setAddSessionOpen(false)
    setSessionForm({ procedureId: '', date: new Date().toISOString().slice(0,16), price: '', discount: '0', paid: '0', notes: '' })
    await refreshSessions()
  }

  const updateSession = async (id: string, patch: any, _procedureId?: string)=>{
    await aestheticApi.updateProcedureSession(id, patch)
    await refreshSessions()
  }

  const uploadImage = (file: File): Promise<string>=> new Promise((resolve, reject)=>{
    const reader = new FileReader()
    reader.onload = ()=> resolve(String(reader.result||''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const addImages = async (s: any, kind: 'before'|'after', files: FileList|null)=>{
    if (!files || !files.length) return
    const arr = await Promise.all(Array.from(files).map(f=> uploadImage(f)))
    const patch = kind==='before' ? { beforeImages: [ ...(s.beforeImages||[]), ...arr ] } : { afterImages: [ ...(s.afterImages||[]), ...arr ] }
    await updateSession(s._id, patch)
  }

  const openConsent = ()=>{ setConsentOpen(true); setConsentForm({ templateId: templates[0]?._id || '' }) }
  const saveConsent = async ()=>{
    const t = templates.find(x=> String(x._id)===String(consentForm.templateId))
    await aestheticApi.createConsent({
      templateId: String(consentForm.templateId),
      templateName: t?.name,
      templateVersion: t?.version,
      patientMrn: String(patient?.mrn||'') || undefined,
      labPatientId: patientId || undefined,
      patientName: String(patient?.fullName||'') || undefined,
      signedAt: new Date().toISOString(),
      signatureDataUrl: consentForm.signature || undefined,
    })
    setConsentOpen(false)
    setConsentForm({ templateId: '' })
    await refreshConsents()
  }

  if (loading) return <div className="p-4">Loading...</div>
  if (!patient) return <div className="p-4 text-slate-600">No patient found for MRN: {mrn}</div>

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link to="/aesthetic/patients" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <span className="text-slate-400">/</span>
            <span className="truncate">Patient Details</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold text-slate-900 truncate">{patient.fullName}</h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">MRN: {patient.mrn}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{patient.phoneNormalized || '-'}</span>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {patient.gender || '-'} • Age: {patient.age || '-'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn"
            onClick={()=>{
              const s = dueSessions[0] || sessions[0] || null
              if (!s) return
              setPaySession(s)
              setPayForm({ amount: '', method: 'Cash', note: '' })
              setPayOpen(true)
            }}
            disabled={sessions.length===0}
            title="Pay Bill"
          >
            <CircleDollarSign className="h-4 w-4" />
            Pay Bill
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={()=>{
              const s = sessions[0] || null
              if (!s) return
              setNextSession(s)
              const existing = String(s.nextVisitDate || '')
              setNextDate(existing ? existing.slice(0,16) : new Date().toISOString().slice(0,16))
              setNextOpen(true)
            }}
            disabled={sessions.length===0}
            title="Assign Next Appointment"
          >
            <CalendarClock className="h-4 w-4" />
            Assign Appointment
          </button>
          <button className="btn" onClick={()=>setAddSessionOpen(true)}>
            <span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" />Add Session</span>
          </button>
          <button className="btn-outline-navy" onClick={openConsent}>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" />New Consent</span>
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Total Paid" value={`Rs ${Math.round(stats.totalPaid).toLocaleString()}`} icon={<Receipt className="h-4 w-4" />} />
        <Stat title="Outstanding" value={`Rs ${Math.round(stats.totalBalance).toLocaleString()}`} tone={stats.totalBalance>0?'danger':'neutral'} icon={<CircleDollarSign className="h-4 w-4" />} />
        <Stat title="Last Visit" value={stats.lastVisit ? stats.lastVisit.toLocaleDateString() : '-'} icon={<Clock className="h-4 w-4" />} />
        <Stat title="Next Appointment" value={stats.nextVisit ? stats.nextVisit.toLocaleDateString() : '-'} icon={<CalendarClock className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Medical / Aesthetic History</div>
            <div className="divide-y divide-slate-200">
              {(() => {
                const byProcedure = new Map<string, any[]>()
                for (const s of sessions){
                  const pid = String(s?.procedureId || '')
                  if (!pid) continue
                  const arr = byProcedure.get(pid) || []
                  arr.push(s)
                  byProcedure.set(pid, arr)
                }

                const allProcedureIds = Array.from(byProcedure.keys())
                const procedureSortTs = (pid: string)=> {
                  const arr = byProcedure.get(pid) || []
                  return arr.reduce((m:number, s:any)=> Math.max(m, new Date(s?.date || 0).getTime() || 0), 0)
                }
                allProcedureIds.sort((a,b)=> procedureSortTs(b) - procedureSortTs(a))

                const ongoingPids: string[] = []
                const unpaidPids: string[] = []
                const completedPids: string[] = []

                for (const pid of allProcedureIds){
                  const completed = procedureCompletedById.get(pid) === true
                  const outstanding = Number(outstandingByProcedureId.get(pid) || 0)
                  const ongoing = !completed
                  if (ongoing) ongoingPids.push(pid)
                  else if (outstanding > 0) unpaidPids.push(pid)
                  else completedPids.push(pid)
                }

                const pastPids = [ ...unpaidPids, ...completedPids ]

                const renderSession = (s: any)=> {
                  const st = normStatus(s.status)
                  const isDone = st === 'done' || st === 'completed'
                  return (
                  <div key={s._id} className="p-4">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <div className="min-w-0 text-base font-semibold text-slate-900 truncate">{s.procedureName || s.procedureId}</div>
                          {sessionNumberById.get(String(s._id||'')) && (
                            <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                              Session {sessionNumberById.get(String(s._id||''))!.n}
                            </span>
                          )}
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : st==='cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                            {isDone ? 'Completed' : st}
                          </span>
                          <div className="shrink-0 text-sm text-slate-600">{new Date(s.date).toLocaleString()}</div>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">Total</div>
                            <div className="mt-0.5 font-semibold text-slate-900">Rs {Math.round(Number(s.price||0) - Number(s.discount||0)).toLocaleString()}</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">Paid</div>
                            <div className="mt-0.5 font-semibold text-slate-900">Rs {Math.round(Number(s.paid||0)).toLocaleString()}</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">Balance</div>
                            <div className={`mt-0.5 font-semibold ${Number(s.balance||0)>0?'text-rose-700':'text-slate-900'}`}>Rs {Math.round(Number(s.balance||0)).toLocaleString()}</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">Next</div>
                            <div className="mt-0.5 font-semibold text-slate-900">{s.nextVisitDate ? new Date(s.nextVisitDate).toLocaleString() : '-'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                        <button
                          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium ${isDone ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'}`}
                          onClick={()=>updateSession(String(s._id), { status: 'done' }, String(s.procedureId||''))}
                          disabled={isDone}
                          title={isDone ? 'Completed' : 'Complete this session'}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {isDone ? 'Completed' : 'Complete Session'}
                        </button>
                        <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50" onClick={()=>{ setNextSession(s); const existing = String(s.nextVisitDate || ''); setNextDate(existing ? existing.slice(0,16) : new Date().toISOString().slice(0,16)); setNextOpen(true) }}>
                          <CalendarClock className="h-4 w-4" />
                          Assign
                        </button>
                        <button className="btn" onClick={()=>{ setPaySession(s); setPayForm({ amount: '', method: 'Cash', note: '' }); setPayOpen(true) }}>
                          <CircleDollarSign className="h-4 w-4" />
                          Pay
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <details className="group rounded-lg border border-slate-200 bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                          <span className="inline-flex items-center gap-2"><Receipt className="h-4 w-4" />Payments</span>
                          <span className="text-xs text-slate-500">{(s.payments?.length || 0)} record(s)</span>
                        </summary>
                        <div className="px-3 pb-3">
                          {(s.payments && s.payments.length>0) ? (
                            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                              <div className="grid grid-cols-3 gap-0 bg-slate-50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                <div>Date/Time</div>
                                <div className="text-center">Amount</div>
                                <div className="text-right">Method / Note</div>
                              </div>
                              <div className="divide-y divide-slate-200">
                              {s.payments.map((p:any, idx:number)=> (
                                <div key={idx} className="grid grid-cols-3 gap-2 px-3 py-2 text-sm">
                                  <div className="text-slate-700">{new Date(p.dateIso||s.date).toLocaleString()}</div>
                                  <div className="text-center font-semibold text-slate-900">Rs {Number(p.amount||0).toLocaleString()}</div>
                                  <div className="text-right text-xs text-slate-500">{p.method || 'Cash'}{p.note?` • ${p.note}`:''}</div>
                                </div>
                              ))}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1 text-sm text-slate-500">No payments yet</div>
                          )}
                        </div>
                      </details>

                      <details className="group rounded-lg border border-slate-200 bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                          <span className="inline-flex items-center gap-2"><Image className="h-4 w-4" />Photos (Before / After)</span>
                          <span className="text-xs text-slate-500">{(s.beforeImages?.length || 0) + (s.afterImages?.length || 0)} image(s)</span>
                        </summary>
                        <div className="px-3 pb-3">
                          <div className="mt-2 grid gap-3 md:grid-cols-2">
                            <div>
                              <div className="text-sm font-medium text-slate-800">Before</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(s.beforeImages||[]).map((src:string, idx:number)=> <img key={idx} src={src} className="h-16 w-16 object-cover rounded border" />)}
                              </div>
                              <input type="file" multiple accept="image/*" onChange={e=>addImages(s, 'before', e.target.files)} className="mt-2 w-full text-xs" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-800">After</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(s.afterImages||[]).map((src:string, idx:number)=> <img key={idx} src={src} className="h-16 w-16 object-cover rounded border" />)}
                              </div>
                              <input type="file" multiple accept="image/*" onChange={e=>addImages(s, 'after', e.target.files)} className="mt-2 w-full text-xs" />
                            </div>
                          </div>
                        </div>
                      </details>

                      {firstSessionIdByProcedureId.get(String(s.procedureId||'')) === String(s._id||'') && (
                        <div className="pt-1">
                          <button
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                            onClick={()=>completeProcedure(String(s.procedureId))}
                            disabled={procedureCompletedById.get(String(s.procedureId||'')) === true}
                            title={procedureCompletedById.get(String(s.procedureId||'')) === true ? 'Procedure already completed' : 'Complete this procedure'}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Complete Procedure
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                const renderSection = (title: string, pids: string[], tone: 'slate'|'amber'|'emerald') => {
                  if (pids.length === 0) return null
                  const toneCls = tone==='amber' ? 'bg-amber-50 border-amber-200 text-amber-900' : tone==='emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-800'
                  const titleCls = tone==='amber' ? 'text-amber-900' : tone==='emerald' ? 'text-emerald-900' : 'text-slate-800'
                  return (
                    <div className="divide-y divide-slate-200">
                      <div className={`px-4 py-2 text-sm font-semibold border-y ${toneCls}`}> <span className={titleCls}>{title}</span></div>
                      {pids.flatMap(pid => {
                        const arr = byProcedure.get(pid) || []
                        return arr
                      }).map(renderSession)}
                    </div>
                  )
                }

                return (
                  <>
                    <div className="px-4 pt-4">
                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={()=>setHistoryTab('ongoing')}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium ${historyTab==='ongoing' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          Ongoing
                        </button>
                        <button
                          type="button"
                          onClick={()=>setHistoryTab('past')}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium ${historyTab==='past' ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          Past
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Past includes completed procedures with both zero and non-zero remaining balance.
                      </div>
                    </div>

                    {historyTab==='ongoing' && renderSection('Ongoing Procedures', ongoingPids, 'emerald')}
                    {historyTab==='past' && renderSection('Past Procedures', pastPids, 'slate')}
                    {sessions.length===0 && <div className="p-6 text-center text-slate-500">No sessions</div>}
                  </>
                )
              })()}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Consents</div>
            <div className="divide-y divide-slate-200">
              {consents.map(c => (
                <div key={c._id} className="p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900"><FileText className="h-4 w-4" />{c.templateName || 'Consent'}</div>
                  <div className="mt-1 text-sm text-slate-600">Signed: {new Date(c.signedAt).toLocaleString()}</div>
                  {c.signatureDataUrl && <img src={c.signatureDataUrl} alt="signature" className="mt-2 h-16 object-contain" />}
                  {c.attachments?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.attachments.map((a:string, idx:number)=> <img key={idx} src={a} className="h-16 w-16 object-cover rounded border" />)}
                    </div>
                  ) : null}
                </div>
              ))}
              {consents.length===0 && <div className="p-6 text-center text-slate-500">No consents</div>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Patient Details</div>
            <div className="p-4 grid gap-3 text-sm">
              <DetailRow label="Full Name" value={patient.fullName || '-'} />
              <DetailRow label="MRN" value={patient.mrn || '-'} />
              <DetailRow label="Phone" value={patient.phoneNormalized || '-'} />
              <DetailRow label="Gender" value={patient.gender || '-'} />
              <DetailRow label="Age" value={patient.age || '-'} />
              <DetailRow label="CNIC" value={patient.cnic || '-'} />
              <DetailRow label="Address" value={patient.address || '-'} />
              <DetailRow label="Guardian" value={(patient.guardianName || patient.guardianRelation) ? `${patient.guardianName || '-'}${patient.guardianRelation ? ` (${patient.guardianRelation})` : ''}` : '-'} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Appointments</div>
            <div className="p-4">
              {sessions
                .map(s=> ({
                  id: String(s._id),
                  procedureName: String(s.procedureName || s.procedureId || 'Session'),
                  when: s.nextVisitDate ? new Date(s.nextVisitDate) : null,
                }))
                .filter(x => x.when && !isNaN(x.when.getTime()))
                .sort((a,b)=> (a.when as Date).getTime() - (b.when as Date).getTime())
                .slice(0,8)
                .map(x => (
                  <div key={x.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{x.procedureName}</div>
                      <div className="text-xs text-slate-500">Next visit</div>
                    </div>
                    <div className="shrink-0 text-right text-slate-700">{(x.when as Date).toLocaleString()}</div>
                  </div>
                ))}
              {sessions.filter(s=> s.nextVisitDate).length===0 && <div className="text-sm text-slate-500">No upcoming appointments</div>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Billing</div>
            <div className="p-4 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Outstanding Balance</div>
                <div className={`mt-1 text-xl font-semibold ${stats.totalBalance>0?'text-rose-700':'text-slate-900'}`}>Rs {Math.round(stats.totalBalance).toLocaleString()}</div>
                <div className="mt-2 text-sm text-slate-600">Unpaid sessions: {dueSessions.length}</div>
              </div>

              <button
                className="btn w-full justify-center disabled:opacity-60"
                onClick={()=>{
                  const s = dueSessions[0] || sessions[0] || null
                  if (!s) return
                  setPaySession(s)
                  setPayForm({ amount: '', method: 'Cash', note: '' })
                  setPayOpen(true)
                }}
                disabled={sessions.length===0}
              >
                <CircleDollarSign className="h-4 w-4" />
                Pay Bill
              </button>

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-sm font-medium text-slate-800">Complete Procedure</div>
                <div className="mt-2 grid gap-2">
                  <select
                    value={completeProcedureId}
                    onChange={e=>setCompleteProcedureId(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    disabled={procedureOptions.length===0}
                  >
                    <option value="">Select procedure...</option>
                    {procedureOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                    onClick={()=>completeProcedure(String(completeProcedureId))}
                    disabled={completeBusy || !completeProcedureId}
                    title={procedureCompletedById.get(String(completeProcedureId)) === true ? 'Procedure already completed' : 'Complete this procedure'}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {completeBusy ? 'Completing...' : 'Complete'}
                  </button>
                </div>
              </div>

              {dueSessions.length>0 && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-medium text-slate-800">Top Due</div>
                  <div className="mt-2 space-y-2">
                    {dueSessions.slice(0,3).map((s:any)=> (
                      <button
                        key={String(s._id)}
                        className="w-full text-left rounded-md border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                        onClick={()=>{ setPaySession(s); setPayForm({ amount: '', method: 'Cash', note: '' }); setPayOpen(true) }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{s.procedureName || 'Session'}</div>
                            <div className="text-xs text-slate-500 truncate">{new Date(s.date).toLocaleString()}</div>
                          </div>
                          <div className="font-semibold text-rose-700">Rs {Math.round(Number(s.balance||0)).toLocaleString()}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Next Appointment</div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-slate-600">Assign next appointment date & time to a session.</div>
              <button
                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                onClick={()=>{
                  const s = sessions[0] || null
                  if (!s) return
                  setNextSession(s)
                  const existing = String(s.nextVisitDate || '')
                  setNextDate(existing ? existing.slice(0,16) : new Date().toISOString().slice(0,16))
                  setNextOpen(true)
                }}
                disabled={sessions.length===0}
              >
                <CalendarClock className="h-4 w-4" />
                Assign Next Appointment
              </button>
            </div>
          </div>
        </div>
      </div>

      {addSessionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-4">
            <div className="text-base font-semibold mb-3">Add Session</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm">Procedure</label>
                <select
                  value={sessionForm.procedureId}
                  onChange={e=>{
                    const procedureId = e.target.value
                    const proc: any = catalog.find((x:any)=> String(x._id) === String(procedureId))
                    const nextPrice = proc?.basePrice ?? proc?.price
                    setSessionForm(s=>{
                      const outstanding = outstandingByProcedureId.get(String(procedureId)) || 0
                      const alreadyHasSameProcedure = !!sessions.find(x => String(x.procedureId) === String(procedureId))
                      const computedAutoPrice = outstanding > 0 ? outstanding : (alreadyHasSameProcedure ? 0 : nextPrice)
                      const prevAuto = (s as any)._autoPrice
                      const shouldOverwrite = !String(s.price || '').trim() || (prevAuto != null && String(s.price) === String(prevAuto))
                      return {
                        ...s,
                        procedureId,
                        price: shouldOverwrite && computedAutoPrice != null ? String(computedAutoPrice) : s.price,
                        _autoPrice: computedAutoPrice != null ? String(computedAutoPrice) : undefined,
                      } as any
                    })
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {catalog.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Date & Time</label>
                <input type="datetime-local" value={sessionForm.date} onChange={e=>setSessionForm(s=>({ ...s, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Price</label>
                <input value={sessionForm.price} onChange={e=>setSessionForm(s=>({ ...s, price: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Discount</label>
                <input value={sessionForm.discount} onChange={e=>setSessionForm(s=>({ ...s, discount: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Paid</label>
                <input value={sessionForm.paid} onChange={e=>setSessionForm(s=>({ ...s, paid: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm">Notes</label>
                <textarea value={sessionForm.notes} onChange={e=>setSessionForm(s=>({ ...s, notes: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="rounded-md border px-3 py-1.5 text-sm" onClick={()=>setAddSessionOpen(false)}>Cancel</button>
              <button className="btn" onClick={addSession} disabled={!sessionForm.procedureId}>Save</button>
            </div>
          </div>
        </div>
      )}

      {consentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-4">
            <div className="text-base font-semibold mb-3">New Consent</div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">Template</label>
                <select value={consentForm.templateId} onChange={e=>setConsentForm(s=>({ ...s, templateId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  {templates.map(t=> <option key={t._id} value={t._id}>{t.name} {t.version?`v${t.version}`:''}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Signature</label>
                <SignaturePad onChange={(d)=> setConsentForm(s=>({ ...s, signature: d || undefined }))} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="rounded-md border px-3 py-1.5 text-sm" onClick={()=>setConsentOpen(false)}>Cancel</button>
              <button className="btn" onClick={saveConsent} disabled={!consentForm.templateId}>Save</button>
            </div>
          </div>
        </div>
      )}

      {payOpen && paySession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4">
            <div className="text-base font-semibold mb-3">Add Payment</div>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm">Session</label>
                <select value={String(paySession?._id||'')} onChange={e=>{ const s = sessions.find(x=>String(x._id)===String(e.target.value)); if (s) setPaySession(s) }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  {sessions.map(s=> (
                    <option key={String(s._id)} value={String(s._id)}>
                      {String(s.procedureName || 'Session')} • {new Date(s.date).toLocaleDateString()} • Bal Rs {Math.round(Number(s.balance||0)).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Amount</label>
                <input value={payForm.amount} onChange={e=>setPayForm(s=>({ ...s, amount: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Method</label>
                <select value={payForm.method} onChange={e=>setPayForm(s=>({ ...s, method: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Bank</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Note</label>
                <input value={payForm.note} onChange={e=>setPayForm(s=>({ ...s, note: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="rounded-md border px-3 py-1.5 text-sm" onClick={()=>{ setPayOpen(false); setPaySession(null) }}>Cancel</button>
              <button
                className="btn"
                onClick={async()=>{
                  const amount = Number(payForm.amount||0)
                  const payable = Number(paySession?.balance || 0)
                  if (amount <= 0){
                    window.alert('Enter a valid amount.')
                    return
                  }
                  if (payable > 0 && amount > payable){
                    window.alert(`Payable is Rs ${Math.round(payable).toLocaleString()}. You cannot pay more than payable.`)
                    return
                  }
                  try {
                    await aestheticApi.addProcedureSessionPayment(String(paySession._id), { amount, method: payForm.method, note: payForm.note })
                  } catch {
                    window.alert('Payment failed. Please try again.')
                    return
                  }
                  setPayOpen(false)
                  setPaySession(null)
                  await refreshSessions()
                }}
                disabled={!payForm.amount}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {nextOpen && nextSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4">
            <div className="text-base font-semibold mb-3">Schedule Next Visit</div>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm">Session</label>
                <select value={String(nextSession?._id||'')} onChange={e=>{ const s = sessions.find(x=>String(x._id)===String(e.target.value)); if (s) setNextSession(s) }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  {sessions.map(s=> (
                    <option key={String(s._id)} value={String(s._id)}>
                      {String(s.procedureName || 'Session')} • {new Date(s.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Date & Time</label>
                <input type="datetime-local" value={nextDate} onChange={e=>setNextDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="rounded-md border px-3 py-1.5 text-sm" onClick={()=>{ setNextOpen(false); setNextSession(null) }}>Cancel</button>
              <button className="btn" onClick={async()=>{ try { await aestheticApi.setProcedureSessionNextVisit(String(nextSession._id), new Date(nextDate).toISOString()) } catch {}; setNextOpen(false); setNextSession(null); await refreshSessions() }} disabled={!nextDate}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ title, value, icon, tone }: { title: string; value: React.ReactNode; icon: React.ReactNode; tone?: 'neutral'|'danger' }){
  const t = tone || 'neutral'
  const wrap = t==='danger' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'
  const iconWrap = t==='danger' ? 'bg-white text-rose-700' : 'bg-slate-50 text-slate-700'
  return (
    <div className={`rounded-xl border p-4 ${wrap}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">{title}</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
        </div>
        <div className={`rounded-md p-2 ${iconWrap}`}>{icon}</div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }){
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-slate-500">{label}</div>
      <div className="text-slate-900 font-medium text-right break-words">{value}</div>
    </div>
  )
}
