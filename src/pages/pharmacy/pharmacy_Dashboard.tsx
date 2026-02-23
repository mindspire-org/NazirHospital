import { useEffect, useState } from 'react'
import { pharmacyApi } from '../../utils/api'
import { TrendingUp, DollarSign, ShoppingCart, Package, AlertTriangle, Ban, RefreshCw, Clock, Bell, CreditCard } from 'lucide-react'

export default function Pharmacy_Dashboard() {
  const [stats, setStats] = useState<{ stockSaleValue: number; lowStockCount: number; outOfStockCount: number; expiringSoonCount: number; totalInventoryOnHand: number } | null>(null)
  const [purchasesTotal, setPurchasesTotal] = useState<number>(0)
  const [expiringSoon, setExpiringSoon] = useState<Array<{ name: string; expiry: string; onHand: number }>>([])
  const [lastUpdated, setLastUpdated] = useState<string>('—')
  const [tick, setTick] = useState(0)
  const [salesToday, setSalesToday] = useState<number>(0)
  const [salesMonth, setSalesMonth] = useState<number>(0)
  const [cashSalesToday, setCashSalesToday] = useState<number>(0)
  const [creditSalesToday, setCreditSalesToday] = useState<number>(0)
  const [recentSales, setRecentSales] = useState<Array<{ billNo: string; total: number; datetime: string; customer?: string }>>([])

  function fmtDate(d: Date){
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const day = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${day}`
  }

  // Instant cached summary for perceived speed
  useEffect(()=>{
    try {
      const cached = JSON.parse(localStorage.getItem('pharmacy.inventory.summary') || 'null')
      if (cached?.stats) setStats(cached.stats)
      if (Array.isArray(cached?.expiringSoonItems)){
        const arr = (cached.expiringSoonItems||[]).filter((it:any)=> Number(it.onHand||0) > 0)
        setExpiringSoon(arr.map((it:any)=> ({ name: it.name, expiry: String(it.earliestExpiry||'').slice(0,10), onHand: Number(it.onHand||0) })))
      }
    } catch {}
  }, [])

  useEffect(()=>{
    let mounted = true
    async function load(){
      const today = new Date()
      const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const fromToday = fmtDate(today)
      const fromMonth = fmtDate(firstMonth)

      const tasks = await Promise.allSettled([
        pharmacyApi.inventorySummaryCached(undefined, { ttlMs: 120_000, forceRefresh: tick>0 }),
        pharmacyApi.purchasesSummaryCached({ from: fromMonth, to: fromToday }, { ttlMs: 120_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ from: fromToday, to: fromToday }, { ttlMs: 60_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ from: fromMonth, to: fromToday }, { ttlMs: 120_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ payment: 'Cash', from: fromToday, to: fromToday }, { ttlMs: 60_000, forceRefresh: tick>0 }),
        pharmacyApi.salesSummaryCached({ payment: 'Credit', from: fromToday, to: fromToday }, { ttlMs: 60_000, forceRefresh: tick>0 }),
        pharmacyApi.listSalesCached({ limit: 5 }, { ttlMs: 60_000, forceRefresh: tick>0 }),
      ])

      if (!mounted) return

      const inv = tasks[0].status === 'fulfilled' ? (tasks[0].value as any) : null
      const pur = tasks[1].status === 'fulfilled' ? (tasks[1].value as any) : null
      const sToday = tasks[2].status === 'fulfilled' ? (tasks[2].value as any) : null
      const sMonth = tasks[3].status === 'fulfilled' ? (tasks[3].value as any) : null
      const sCashToday = tasks[4].status === 'fulfilled' ? (tasks[4].value as any) : null
      const sCreditToday = tasks[5].status === 'fulfilled' ? (tasks[5].value as any) : null
      const listSales = tasks[6].status === 'fulfilled' ? (tasks[6].value as any) : null

      if (inv){
        setStats(inv?.stats || null)
        // Use backend-provided expiringSoonItems but exclude out-of-stock from display
        const arrRaw = Array.isArray(inv?.expiringSoonItems) ? inv.expiringSoonItems : []
        const arr = arrRaw.filter((it:any)=> Number(it.onHand||0) > 0)
        setExpiringSoon(arr.map((it:any)=> ({ name: it.name, expiry: String(it.earliestExpiry||'').slice(0,10), onHand: Number(it.onHand||0) })))
        try { localStorage.setItem('pharmacy.inventory.summary', JSON.stringify({ stats: inv?.stats, expiringSoonItems: arrRaw, at: Date.now() })) } catch {}
      }
      if (pur){ setPurchasesTotal(Number(pur?.totalAmount || 0)) }
      if (sToday){ setSalesToday(Number(sToday?.totalAmount || 0)) }
      if (sMonth){ setSalesMonth(Number(sMonth?.totalAmount || 0)) }
      if (sCashToday){ setCashSalesToday(Number(sCashToday?.totalAmount || 0)) }
      if (sCreditToday){ setCreditSalesToday(Number(sCreditToday?.totalAmount || 0)) }
      if (listSales){
        setRecentSales((listSales?.items||[]).slice(0,5).map((s:any)=> ({ billNo: s.billNo, total: s.total||0, datetime: s.datetime, customer: s.customer })))
      }
      setLastUpdated(new Date().toLocaleString())
    }
    load()
    return ()=>{ mounted = false }
  }, [tick])

  useEffect(()=>{
    function onSale(ev: any){
      const s = ev?.detail || {}
      const amt = Number(s?.total || 0)
      setSalesToday(v => v + amt)
      setSalesMonth(v => v + amt)
      if (s?.payment === 'Cash') setCashSalesToday(v => v + amt)
      if (s?.payment === 'Credit') setCreditSalesToday(v => v + amt)
      setRecentSales(rs => [{ billNo: s.billNo, total: s.total || 0, datetime: s.datetime || new Date().toISOString(), customer: s.customer }, ...rs].slice(0,5))
      setLastUpdated(new Date().toLocaleString())
    }
    window.addEventListener('pharmacy:sale', onSale as any)
    return ()=>{ window.removeEventListener('pharmacy:sale', onSale as any) }
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className={`rounded-xl border bg-emerald-50 border-emerald-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Today's Sales</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">Rs {salesToday.toFixed(2)}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><DollarSign className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-violet-50 border-violet-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">This Month's Sales</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">Rs {salesMonth.toFixed(2)}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><TrendingUp className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-green-50 border-green-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Cash Sales</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">Rs {cashSalesToday.toFixed(2)}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><DollarSign className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-amber-50 border-amber-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Credit Sales</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">Rs {creditSalesToday.toFixed(2)}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><CreditCard className="h-4 w-4" /></div>
          </div>
        </div>

        {/* Real data cards */}
        <div className={`rounded-xl border bg-sky-50 border-sky-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">This Month's Purchases</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">Rs {purchasesTotal.toFixed(2)}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><ShoppingCart className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-cyan-50 border-cyan-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Total Inventory</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{stats?.totalInventoryOnHand ?? 0}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><Package className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-yellow-50 border-yellow-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Low Stock Items</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{stats?.lowStockCount ?? 0}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><AlertTriangle className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-rose-50 border-rose-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Out of Stock</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{stats?.outOfStockCount ?? 0}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><Ban className="h-4 w-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border bg-indigo-50 border-indigo-200 p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600">Total Stock Value</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">Rs {(stats?.stockSaleValue ?? 0).toFixed(2)}</div>
            </div>
            <div className="rounded-md bg-white/60 p-2 text-slate-700 shadow-sm"><DollarSign className="h-4 w-4" /></div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-600" />
              <div className="text-sm font-medium text-slate-700">Recent Sales</div>
            </div>
          </div>
          {recentSales.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No recent sales</div>
          ) : (
            <div className="space-y-2">
              {recentSales.map((s, idx)=> (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">{s.billNo}</div>
                    <div className="text-xs text-slate-600 truncate">{new Date(s.datetime).toLocaleString()} · {s.customer || 'Walk-in'}</div>
                  </div>
                  <div className="shrink-0 font-semibold text-slate-900">Rs {Number(s.total||0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <div className="text-sm font-medium text-slate-700">Expiring Soon / Expired</div>
          </div>
          {expiringSoon.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No expiring or expired medicines</div>
          ) : (
            <div className="space-y-2">
              {expiringSoon.map((it, idx)=> (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <div className="font-medium text-slate-800">{it.name}</div>
                  <div className="text-slate-600">{it.expiry}</div>
                  <div className="text-slate-600">On hand: {it.onHand}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="flex items-center justify-end gap-3 text-xs text-slate-500">
        <Clock className="h-4 w-4" />
        <span>Last updated: {lastUpdated}</span>
        <button type="button" onClick={()=> setTick(t=>t+1)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
    </div>
  )
}
