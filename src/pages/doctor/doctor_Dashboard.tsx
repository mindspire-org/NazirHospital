import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

type DoctorSession = { id: string; name: string; username: string }

type Token = { _id: string; createdAt: string; mrn?: string; patientName?: string; encounterId?: any; doctorId?: any; status?: string }
type PresRow = { id: string; patientName: string; mrNo?: string; diagnosis?: string; createdAt: string }

type Notification = { id: string; doctorId: string; message: string; createdAt: string; read?: boolean }

const apiBaseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'

export default function Doctor_Dashboard() {
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  useEffect(() => {
    try { const raw = localStorage.getItem('doctor.session'); setDoc(raw ? JSON.parse(raw) : null) } catch { setDoc(null) }
  }, [])
  useEffect(() => {
    try {
      const sess = doc
      if (!sess) return
      const hex24 = /^[a-f\d]{24}$/i
      if (hex24.test(String(sess.id||''))) return
      ;(async () => {
        try {
          const res = await hospitalApi.listDoctors() as any
          const docs: any[] = res?.doctors || []
          const match = docs.find(d => String(d.username||'').toLowerCase() === String(sess.username||'').toLowerCase()) ||
                        docs.find(d => String(d.name||'').toLowerCase() === String(sess.name||'').toLowerCase())
          if (match) {
            const fixed = { ...sess, id: String(match._id || match.id) }
            try { localStorage.setItem('doctor.session', JSON.stringify(fixed)) } catch {}
            setDoc(fixed)
          }
        } catch {}
      })()
    } catch {}
  }, [doc])

  const [queuedCount, setQueuedCount] = useState(0)
  const [prescCount, setPrescCount] = useState(0)
  const [labRefCount, setLabRefCount] = useState(0)
  const [phRefCount, setPhRefCount] = useState(0)
  const [diagRefCount, setDiagRefCount] = useState(0)
  const [queue, setQueue] = useState<Token[]>([])
  const [recentPres, setRecentPres] = useState<PresRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const esRef = useRef<EventSource | null>(null)
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  useEffect(() => { load() }, [doc?.id, from, to])
  useEffect(() => {
    if (!doc?.id) return
    let stopped = false
    ;(async () => {
      try {
        const res = await hospitalApi.listNotifications(doc.id) as any
        const arr: Notification[] = (res?.notifications || []).map((n: any) => ({ id: String(n._id), doctorId: String(n.doctorId), message: n.message, createdAt: n.createdAt, read: !!n.read }))
        setUnreadCount(arr.filter(n => !n.read).length)
      } catch { setUnreadCount(0) }
    })()
    const url = `${apiBaseURL}/hospital/notifications/stream?doctorId=${encodeURIComponent(doc.id)}`
    const es = new EventSource(url)
    esRef.current = es
    // Connection events handled silently
    es.addEventListener('doctor-notification', () => {
      setUnreadCount(c => c + 1)
    })
    return () => { if (stopped) return; es.close(); esRef.current = null; stopped = true }
  }, [doc?.id])
  useEffect(() => {
    const onUpdated = async () => {
      if (!doc?.id) return
      try {
        const res = await hospitalApi.listNotifications(doc.id) as any
        const arr: Notification[] = (res?.notifications || []).map((n: any) => ({ id: String(n._id), doctorId: String(n.doctorId), message: n.message, createdAt: n.createdAt, read: !!n.read }))
        setUnreadCount(arr.filter(n => !n.read).length)
      } catch { setUnreadCount(0) }
    }
    window.addEventListener('doctor:notifications-updated', onUpdated as any)
    return () => window.removeEventListener('doctor:notifications-updated', onUpdated as any)
  }, [doc?.id])
  useEffect(() => {
    const h = () => load()
    window.addEventListener('doctor:pres-saved', h as any)
    return () => window.removeEventListener('doctor:pres-saved', h as any)
  }, [doc?.id])
  async function load(){
    if (!doc?.id) { setQueuedCount(0); setPrescCount(0); setLabRefCount(0); setPhRefCount(0); setDiagRefCount(0); setQueue([]); setRecentPres([]); return }
    try {
      const tokParams: any = { doctorId: doc.id }
      const presParams: any = { doctorId: doc.id }
      const labParams: any = { type: 'lab', doctorId: doc.id, page: 1, limit: 200 }
      const phParams: any = { type: 'pharmacy', doctorId: doc.id, page: 1, limit: 200 }
      const diagParams: any = { type: 'diagnostic', doctorId: doc.id, page: 1, limit: 200 }
      if (from) { tokParams.from = from; presParams.from = from; labParams.from = from; phParams.from = from }
      if (to) { tokParams.to = to; presParams.to = to; labParams.to = to; phParams.to = to }
      if (from) diagParams.from = from; if (to) diagParams.to = to
      const [tokResRange, presRes, labRefs, phRefs, diagRefs] = await Promise.all([
        hospitalApi.listTokens(tokParams) as any,
        hospitalApi.listPrescriptions(presParams) as any,
        hospitalApi.listReferrals(labParams) as any,
        hospitalApi.listReferrals(phParams) as any,
        hospitalApi.listReferrals(diagParams) as any,
      ])
      const tokRows: Token[] = tokResRange?.tokens || []
      const presIds: string[] = (presRes?.prescriptions || []).map((r: any) => String(r.encounterId?._id || r.encounterId || ''))
      const presSet = new Set(presIds.filter(Boolean))
      const myRange = tokRows // backend already filtered by doctorId when provided
      const myQueuedFiltered = myRange.filter(t => {
        // queue should show only queued patients
        if (String((t as any).status || '').toLowerCase() !== 'queued') return false
        const encId = String((t as any).encounterId?._id || (t as any).encounterId || '')
        return !encId || !presSet.has(encId)
      })
      setQueuedCount(myQueuedFiltered.length)
      setQueue(myQueuedFiltered.sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()).slice(0,8))
      const presRows: PresRow[] = (presRes?.prescriptions || []).map((r: any) => ({
        id: String(r._id || r.id),
        patientName: r.encounterId?.patientId?.fullName || '-',
        mrNo: r.encounterId?.patientId?.mrn || '-',
        diagnosis: r.diagnosis,
        createdAt: r.createdAt,
      }))
      setPrescCount(presRows.length)
      setRecentPres(presRows.sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,8))
      setLabRefCount((labRefs?.referrals || []).length)
      setPhRefCount((phRefs?.referrals || []).length)
      setDiagRefCount((diagRefs?.referrals || []).length)
    } catch {
      setQueuedCount(0); setPrescCount(0); setLabRefCount(0); setPhRefCount(0); setDiagRefCount(0); setQueue([]); setRecentPres([])
    }
  }

  const myNotifs = useMemo(() => unreadCount, [unreadCount])
  const rangeLabel = useMemo(() => {
    if (from || to) return `${from || '...'} to ${to || '...'}`
    return 'All time'
  }, [from, to])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-sky-100 to-violet-100 p-5">
        <div className="text-sm text-slate-600">Welcome</div>
        <div className="text-2xl font-semibold text-slate-800">{doc?.name || 'Doctor'}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/doctor/prescription" className="btn">+ New Prescription</Link>
          <Link to="/doctor/prescriptions" className="btn-outline-navy">Prescription History</Link>
          <Link to="/doctor/patients" className="btn-outline-navy">My Patients</Link>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 flex-wrap">
        <input type="date" value={from} onChange={e=>{ setFrom(e.target.value) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <span className="text-slate-500 text-sm">to</span>
        <input type="date" value={to} onChange={e=>{ setTo(e.target.value) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <button
          type="button"
          onClick={()=>{ setFrom(''); setTo('') }}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
          title="Reset dates"
        >Reset</button>
        <button
          type="button"
          onClick={()=>{ const t = new Date().toISOString().slice(0,10); setFrom(t); setTo(t) }}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
        >Today</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Queued Patients" value={queuedCount} tone="sky" />
        <Stat title="Prescriptions" value={prescCount} tone="violet" />
        <Stat title="Referrals" value={labRefCount + phRefCount + diagRefCount} tone="emerald" />
        <Stat title="Unread Notifications" value={myNotifs} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-medium text-slate-800">Queue</div>
            <div className="text-xs text-slate-500">{rangeLabel}</div>
          </div>
          <div className="divide-y divide-slate-200">
            {queue.map(q => (
              <button
                key={q._id}
                type="button"
                onClick={()=>navigate(`/doctor/prescription?tokenId=${encodeURIComponent(String(q._id))}`)}
                className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{q.patientName || '-'} <span className="text-xs text-slate-500">{q.mrn || ''}</span></div>
                  <div className="text-xs text-slate-600">{new Date(q.createdAt).toLocaleTimeString()}</div>
                </div>
                <div className="mt-0.5 text-xs text-slate-600">Status: queued</div>
              </button>
            ))}
            {queue.length===0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No patients in queue</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-medium text-slate-800">Recent Prescriptions</div>
            <Link to="/doctor/prescriptions" className="text-xs text-sky-700 hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-slate-200">
            {recentPres.map(r => (
              <div key={r.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.patientName} <span className="text-xs text-slate-500">{r.mrNo || ''}</span></div>
                  <div className="text-xs text-slate-600">{new Date(r.createdAt).toLocaleTimeString()}</div>
                </div>
                <div className="mt-0.5 text-xs text-slate-600">{r.diagnosis || '-'}</div>
              </div>
            ))}
            {recentPres.length===0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No prescriptions</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium text-slate-800">Referrals</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-700">
            <div className="text-xs opacity-80">Lab Referrals</div>
            <div className="text-lg font-semibold">{labRefCount}</div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-700">
            <div className="text-xs opacity-80">Pharmacy Referrals</div>
            <div className="text-lg font-semibold">{phRefCount}</div>
          </div>
          <div className="rounded-lg border border-violet-100 bg-violet-50 p-3 text-violet-700">
            <div className="text-xs opacity-80">Diagnostic Referrals</div>
            <div className="text-lg font-semibold">{diagRefCount}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ title, value, tone }: { title: string; value: any; tone: 'sky'|'violet'|'amber'|'emerald' }) {
  const tones: any = { sky: 'bg-sky-100 text-sky-700 border-sky-100', violet: 'bg-violet-100 text-violet-700 border-violet-100', amber: 'bg-amber-100 text-amber-700 border-amber-100', emerald: 'bg-emerald-100 text-emerald-700 border-emerald-100' }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-sm opacity-80">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}
