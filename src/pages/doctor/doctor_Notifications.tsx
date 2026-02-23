import { useEffect, useMemo, useRef, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type DoctorSession = { id: string; name: string; username: string }
type Notification = { id: string; doctorId: string; message: string; createdAt: string; read?: boolean; type?: string; payload?: any }

const apiBaseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'

export default function Doctor_Notifications() {
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [list, setList] = useState<Notification[]>([])
  const esRef = useRef<EventSource | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    try { const raw = localStorage.getItem('doctor.session'); setDoc(raw ? JSON.parse(raw) : null) } catch {}
  }, [])

  useEffect(() => {
    if (!doc?.id) return
    let stopped = false
    ;(async () => {
      try {
        const res = await hospitalApi.listNotifications(doc.id) as any
        const arr = (res?.notifications || []).map((n: any) => ({
          id: String(n._id),
          doctorId: String(n.doctorId),
          message: n.message,
          createdAt: String(n.createdAt || new Date().toISOString()),
          read: !!n.read,
          type: n.type,
          payload: n.payload,
        })) as Notification[]
        setList(arr)
      } catch { setList([]) }
    })()

    // Open SSE stream
    const url = `${apiBaseURL}/hospital/notifications/stream?doctorId=${encodeURIComponent(doc.id)}`
    const es = new EventSource(url, { withCredentials: false })
    esRef.current = es
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.addEventListener('connected', () => setConnected(true))
    es.addEventListener('doctor-notification', (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data || '{}')
        if (data?.type === 'ipd-visit-removed'){
          const visitId = String((data?.payload || {}).visitId || '')
          if (visitId) setList(prev => prev.filter(n => String(n?.payload?.visitId || '') !== visitId))
          return
        }
        const n: Notification = {
          id: String(data.id || crypto.randomUUID()),
          doctorId: String(data.doctorId || doc.id),
          message: String(data.message || ''),
          createdAt: String(data.createdAt || new Date().toISOString()),
          read: !!data.read,
          type: data.type,
          payload: data.payload,
        }
        setList(prev => [n, ...prev])
      } catch {}
    })
    es.addEventListener('ipd-visit-removed', (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data || '{}')
        const visitId = String((data?.payload || {}).visitId || '')
        if (visitId) setList(prev => prev.filter(n => String(n?.payload?.visitId || '') !== visitId))
      } catch {}
    })
    return () => {
      if (stopped) return
      es.close()
      esRef.current = null
      setConnected(false)
      stopped = true
    }
  }, [doc?.id])

  const mine = useMemo(() => (list || []).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()), [list])

  const markRead = async (id: string, read: boolean) => {
    try { await hospitalApi.updateNotification(id, read) } catch {}
    setList(prev => prev.map(n => n.id === id ? { ...n, read } : n))
    try { window.dispatchEvent(new CustomEvent('doctor:notifications-updated')) } catch {}
  }

  useEffect(() => {
    const onUpdated = async () => {
      if (!doc?.id) return
      try {
        const res = await hospitalApi.listNotifications(doc.id) as any
        const arr = (res?.notifications || []).map((n: any) => ({
          id: String(n._id),
          doctorId: String(n.doctorId),
          message: n.message,
          createdAt: String(n.createdAt || new Date().toISOString()),
          read: !!n.read,
          type: n.type,
          payload: n.payload,
        })) as Notification[]
        setList(arr)
      } catch {}
    }
    window.addEventListener('doctor:notifications-updated', onUpdated as any)
    return () => window.removeEventListener('doctor:notifications-updated', onUpdated as any)
  }, [doc?.id])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold text-slate-800">Notifications</div>
        <div className={`text-xs ${connected ? 'text-emerald-600' : 'text-slate-500'}`}>{connected ? 'Live' : 'Disconnected'}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-200">
          {mine.map(n => (
            <div key={n.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <div className="font-medium">{n.message}</div>
                <div className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                {!n.read && <button onClick={()=>markRead(n.id, true)} className="btn">Mark read</button>}
                {n.read && <button onClick={()=>markRead(n.id, false)} className="btn-outline-navy">Mark unread</button>}
              </div>
            </div>
          ))}
          {mine.length === 0 && <div className="px-4 py-8 text-center text-slate-500 text-sm">No notifications</div>}
        </div>
      </div>
    </div>
  )
}
