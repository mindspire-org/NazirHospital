import { useEffect, useState } from 'react'
import { TrendingUp, DollarSign, ShoppingCart, AlertTriangle, Ban, RefreshCw, Clock, Bell } from 'lucide-react'
import { labApi } from '../../utils/api'

type Summary = {
  todaysTests: number
  pendingReports: number
  completedToday: number
  samplesReceived: number
  lowReagents: number
  outOfStock: number
  at: string
}

export default function Lab_Dashboard() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      setLoading(true)
      try {
        const s: any = await labApi.dashboardSummary()
        if (!mounted) return
        setData({
          todaysTests: Number(s.todaysTests||0),
          pendingReports: Number(s.pendingReports||0),
          completedToday: Number(s.completedToday||0),
          samplesReceived: Number(s.samplesReceived||0),
          lowReagents: Number(s.lowReagents||0),
          outOfStock: Number(s.outOfStock||0),
          at: String(s.at || new Date().toISOString()),
        })
      } catch (e){ console.error(e); setData(null) }
      finally { setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [tick])

  const cards = [
    { title: "Today's Tests", value: data? data.todaysTests : '—', tone: 'bg-emerald-50 border-emerald-200', icon: TrendingUp },
    { title: 'Pending Reports', value: data? data.pendingReports : '—', tone: 'bg-amber-50 border-amber-200', icon: AlertTriangle },
    { title: 'Completed Today', value: data? data.completedToday : '—', tone: 'bg-green-50 border-green-200', icon: DollarSign },
    { title: 'Samples Received', value: data? data.samplesReceived : '—', tone: 'bg-sky-50 border-sky-200', icon: ShoppingCart },
    { title: 'Low Reagents', value: data? data.lowReagents : '—', tone: 'bg-yellow-50 border-yellow-200', icon: AlertTriangle },
    { title: 'Out of Stock Reagents', value: data? data.outOfStock : '—', tone: 'bg-rose-50 border-rose-200', icon: Ban },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ title, value, tone, icon: Icon }) => (
          <div key={title} className={`rounded-xl border ${tone} p-4`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">{title}</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{loading? '…' : value}</div>
              </div>
              <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-600" />
              <div className="text-sm font-medium text-slate-700">Recent Lab Activity</div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No recent activity</div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <div className="text-sm font-medium text-slate-700">Critical Alerts</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No critical alerts
          </div>
        </section>
      </div>

      <div className="flex items-center justify-end gap-3 text-xs text-slate-500">
        <Clock className="h-4 w-4" />
        <span>Last updated: {data ? new Date(data.at).toLocaleString() : '—'}</span>
        <button onClick={()=>setTick(t=>t+1)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
    </div>
  )
}
