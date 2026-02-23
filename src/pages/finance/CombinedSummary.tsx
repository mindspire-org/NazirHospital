import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'

export default function Finance_CombinedSummary(){
  type Totals = { account: 'CASH'|'BANK'; inflow: number; outflow: number; net: number }
  type Mod = { cash: Totals; bank: Totals }
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<{ hospital?: Mod; diagnostic?: Mod; pharmacy?: Mod; lab?: Mod } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ load() }, [])

  async function load(){
    setLoading(true)
    try {
      const res: any = await financeApi.combinedCashBank({ from: from||undefined, to: to||undefined })
      setData({ hospital: res?.hospital, diagnostic: res?.diagnostic, pharmacy: res?.pharmacy, lab: res?.lab })
    } catch {
      setData(null)
    } finally { setLoading(false) }
  }

  function Card({ title, mod }: { title: string; mod?: Mod }){
    const cash = mod?.cash || { account: 'CASH', inflow: 0, outflow: 0, net: 0 }
    const bank = mod?.bank || { account: 'BANK', inflow: 0, outflow: 0, net: 0 }
    const totalNet = (cash?.net||0) + (bank?.net||0)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-slate-800">{title}</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Cash</div>
            <div className="mt-1 flex items-center justify-between text-sm"><span>Inflow</span><span className="font-medium text-emerald-700">{(cash.inflow||0).toFixed(2)}</span></div>
            <div className="flex items-center justify-between text-sm"><span>Outflow</span><span className="font-medium text-rose-700">{(cash.outflow||0).toFixed(2)}</span></div>
            <div className="mt-1 flex items-center justify-between text-sm"><span>Net</span><span className={`font-semibold ${cash.net>=0?'text-emerald-700':'text-rose-700'}`}>{(cash.net||0).toFixed(2)}</span></div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Bank</div>
            <div className="mt-1 flex items-center justify-between text-sm"><span>Inflow</span><span className="font-medium text-emerald-700">{(bank.inflow||0).toFixed(2)}</span></div>
            <div className="flex items-center justify-between text-sm"><span>Outflow</span><span className="font-medium text-rose-700">{(bank.outflow||0).toFixed(2)}</span></div>
            <div className="mt-1 flex items-center justify-between text-sm"><span>Net</span><span className={`font-semibold ${bank.net>=0?'text-emerald-700':'text-rose-700'}`}>{(bank.net||0).toFixed(2)}</span></div>
          </div>
        </div>
        <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${totalNet>=0?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-rose-200 bg-rose-50 text-rose-700'}`}>Total Net: {(totalNet||0).toFixed(2)}</div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-800">Combined Summary</div>
          <div className="text-sm text-slate-500">Cash/Bank inflow/outflow across modules</div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button onClick={load} className="btn">{loading?'Loading...':'Refresh'}</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Hospital" mod={data?.hospital} />
        <Card title="Diagnostic" mod={data?.diagnostic} />
        <Card title="Pharmacy" mod={data?.pharmacy} />
        <Card title="Lab" mod={data?.lab} />
      </div>
    </div>
  )
}
