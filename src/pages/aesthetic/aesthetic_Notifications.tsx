import { useEffect, useState } from 'react'
import { Bell, CheckCircle, Trash2, RefreshCcw, AlertTriangle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { aestheticApi } from '../../utils/api'

 type Notification = {
  _id: string
  type: 'low_stock' | 'expiring_soon' | 'purchase' | 'finance' | 'closing_balance' | 'alert'
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  read: boolean
  createdAt: string
  metadata?: any
}

export default function Pharmacy_Notifications(){
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all'|'unread'|'critical'|'warning'|'success'|'info'>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)

  const load = async () => {
    try {
      setLoading(true)
      const params: any = { page, limit }
      if (filter === 'unread') params.read = false
      else if (filter !== 'all') params.severity = filter
      const res: any = await aestheticApi.getNotifications(params)
      const list: Notification[] = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.notifications)
          ? res.notifications
          : Array.isArray(res?.data)
            ? res.data
            : []
      const t = Number(res?.total ?? res?.count ?? res?.pagination?.total ?? (Array.isArray(res?.items)? res.items.length : 0))
      setNotifications(list)
      setTotal(isNaN(t) ? list.length : t)
    } catch (e){ console.error(e); setNotifications([]) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [page, limit, filter])

  const markAll = async () => { try { await aestheticApi.markAllNotificationsRead(); await load() } catch(e){ console.error(e) } }
  const markOne = async (id: string) => { try { await aestheticApi.markNotificationRead(id); setNotifications(prev=> prev.map(n=> n._id===id? { ...n, read: true } : n)) } catch(e){ console.error(e) } }
  const removeOne = async (id: string) => { try { await aestheticApi.deleteNotification(id); setNotifications(prev=> prev.filter(n=> n._id!==id)) } catch(e){ console.error(e) } }
  const generate = async () => { try { await aestheticApi.generateNotifications(); await load() } catch(e){ console.error(e) } }

  const start = (page - 1) * limit + 1
  const end = Math.min(start + notifications.length - 1, total)

  const pill = (sev: Notification['severity']) => {
    if (sev==='critical') return 'bg-rose-100 text-rose-800 ring-rose-300 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700'
    if (sev==='warning') return 'bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700'
    if (sev==='success') return 'bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700'
    return 'bg-blue-100 text-blue-800 ring-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-xl font-bold">Notifications</h2>
        <div className="ml-auto flex items-center gap-2">
          <select value={filter} onChange={e=> { setPage(1); setFilter(e.target.value as any) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="info">Info</option>
          </select>
          <select value={limit} onChange={e=> { setPage(1); setLimit(Number(e.target.value)) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <button onClick={load} className="btn-outline-navy inline-flex items-center gap-1"><RefreshCcw className="h-4 w-4" /> Refresh</button>
          <button onClick={markAll} className="btn-outline-navy inline-flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Mark all read</button>
          <button onClick={generate} className="btn inline-flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Generate</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <div>{loading ? 'Loading…' : total > 0 ? `Showing ${start}-${end} of ${total}` : 'No notifications'}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1 || loading} onClick={()=> setPage(p=> Math.max(1, p-1))} className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
            <div className="min-w-[4rem] text-center">Page {page}</div>
            <button disabled={end>=total || loading} onClick={()=> setPage(p=> p+1)} className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {notifications.length === 0 && !loading && (
            <div className="p-6 text-sm text-slate-500">No notifications</div>
          )}
          {notifications.map(n => (
            <div key={n._id} className={`flex items-start gap-3 p-4 ${!n.read ? 'bg-sky-50/50 dark:bg-sky-900/20' : ''}`}>
              <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read? 'bg-slate-300' : 'bg-indigo-600'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{n.title}</div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${pill(n.severity)}`}>{n.severity.toUpperCase()}</span>
                </div>
                <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{n.message}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Clock className="h-3 w-3" />{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <div className="shrink-0 flex items-center gap-1">
                {!n.read && <button onClick={()=>markOne(n._id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Mark read</button>}
                <button onClick={()=>removeOne(n._id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-950/30">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
