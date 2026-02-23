import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_IPDDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalBeds, setTotalBeds] = useState(0)
  const [occupiedBeds, setOccupiedBeds] = useState(0)
  const [totalAdmitted, setTotalAdmitted] = useState(0)
  const [weeklyData, setWeeklyData] = useState<number[]>(Array(7).fill(0))

  useEffect(() => { load() }, [])

  async function load(){
    setLoading(true); setError(null)
    try {
      // Beds
      const [allBedsRes, occBedsRes] = await Promise.all([
        hospitalApi.listBeds() as any,
        hospitalApi.listBeds({ status: 'occupied' }) as any,
      ])
      const allBeds = allBedsRes?.beds || []
      const occBeds = occBedsRes?.beds || []
      setTotalBeds(allBeds.length)
      setOccupiedBeds(occBeds.length)

      // Currently admitted patients
      const admittedRes = await hospitalApi.listIPDAdmissions({ status: 'admitted', limit: 1000 }) as any
      setTotalAdmitted((admittedRes?.admissions || []).length)

      // Weekly admissions (Sun..Sat)
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0,0,0,0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23,59,59,999)
      const fromIso = startOfWeek.toISOString().slice(0,10)
      const toIso = endOfWeek.toISOString().slice(0,10)
      const weekRes = await hospitalApi.listIPDAdmissions({ from: fromIso, to: toIso, limit: 1000 }) as any
      const counts = Array(7).fill(0) as number[]
      for (const a of (weekRes?.admissions || [])){
        const d = new Date(a.startAt)
        counts[d.getDay()]++
      }
      setWeeklyData(counts)
    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard')
    } finally { setLoading(false) }
  }

  const availableBeds = Math.max(0, totalBeds - occupiedBeds)
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const maxWeekly = Math.max(1, ...weeklyData)
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-sky-500 via-blue-500 to-violet-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="max-w-xl">
            <h1 className="text-2xl font-bold">In-Patient Department</h1>
            <p className="mt-1 text-sm/6 opacity-90">Manage patient admissions, bed allocation and discharge processes.</p>
          </div>
          <div className="hidden md:block">
            <div className="h-28 w-28 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-xl"></div>
          </div>
        </div>
      </div>

      {error && (<div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">{error}</div>)}
      {/* Stats */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Total Patients</div>
          <div className="mt-1 text-2xl font-semibold text-slate-800">{totalAdmitted}</div>
          <div className="text-xs text-slate-500">Currently admitted</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Occupied Beds</div>
          <div className="mt-1 text-2xl font-semibold text-slate-800">{occupiedBeds}</div>
          <div className="text-xs text-slate-500">out of {totalBeds} total</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Available Beds</div>
          <div className="mt-1 text-2xl font-semibold text-slate-800">{availableBeds}</div>
          <div className="text-xs text-slate-500">Ready for new admissions</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Occupancy Rate</div>
          <div className="mt-1 text-2xl font-semibold text-slate-800">{occupancyRate}%</div>
          <div className="text-xs text-slate-500">bed utilization</div>
        </div>
      </div>

      {/* Weekly admissions chart */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">Weekly Admissions</div>
        <div className="mt-4 grid grid-cols-7 items-end gap-3" style={{height: 180}}>
          {weeklyData.map((v, i) => (
            <div key={i} className="flex h-full flex-col items-center justify-end gap-2">
              <div className="w-full rounded-md bg-blue-500" style={{height: `${(v / maxWeekly) * 100}%`}}></div>
              <div className="text-xs text-slate-500">{days[i]}</div>
            </div>
          ))}
        </div>
      </div>

      
    </div>
  )
}
