import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'

export default function Finance_BalanceSheet(){
  type Item = { account: string; amount: number }
  const [asOf, setAsOf] = useState('')
  const [assets, setAssets] = useState<Item[]>([])
  const [liabilities, setLiabilities] = useState<Item[]>([])
  const [equity, setEquity] = useState<Item|null>(null)
  const [totals, setTotals] = useState<{ assets: number; liabilities: number; equity: number }>({ assets: 0, liabilities: 0, equity: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ load() }, [])

  async function load(){
    setLoading(true)
    try {
      const res: any = await financeApi.balanceSheet(asOf || undefined)
      setAssets(res?.assets||[])
      setLiabilities(res?.liabilities||[])
      setEquity(res?.equity||null)
      setTotals(res?.totals||{ assets: 0, liabilities: 0, equity: 0 })
    } catch {
      setAssets([]); setLiabilities([]); setEquity(null); setTotals({ assets: 0, liabilities: 0, equity: 0 })
    } finally { setLoading(false) }
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-800">Balance Sheet</div>
          <div className="text-sm text-slate-500">As of date</div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">As of</label>
            <input type="date" value={asOf} onChange={e=>setAsOf(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button onClick={load} className="btn">{loading?'Loading...':'Refresh'}</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Assets</div>
          <table className="min-w-full text-left text-sm">
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {assets.map(a => (
                <tr key={a.account}><td className="px-4 py-2">{a.account}</td><td className="px-4 py-2">{Number(a.amount||0).toFixed(2)}</td></tr>
              ))}
              {assets.length===0 && <tr><td className="px-4 py-6 text-center text-slate-500">No assets</td></tr>}
            </tbody>
            <tfoot className="bg-slate-50 text-slate-800"><tr><td className="px-4 py-2 font-medium">Total</td><td className="px-4 py-2 font-semibold">{Number(totals.assets||0).toFixed(2)}</td></tr></tfoot>
          </table>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Liabilities</div>
          <table className="min-w-full text-left text-sm">
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {liabilities.map(a => (
                <tr key={a.account}><td className="px-4 py-2">{a.account}</td><td className="px-4 py-2">{Number(a.amount||0).toFixed(2)}</td></tr>
              ))}
              {liabilities.length===0 && <tr><td className="px-4 py-6 text-center text-slate-500">No liabilities</td></tr>}
            </tbody>
            <tfoot className="bg-slate-50 text-slate-800"><tr><td className="px-4 py-2 font-medium">Total</td><td className="px-4 py-2 font-semibold">{Number(totals.liabilities||0).toFixed(2)}</td></tr></tfoot>
          </table>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Equity</div>
          <table className="min-w-full text-left text-sm">
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {equity ? (
                <tr><td className="px-4 py-2">{equity.account}</td><td className="px-4 py-2">{Number(equity.amount||0).toFixed(2)}</td></tr>
              ) : <tr><td className="px-4 py-6 text-center text-slate-500">No equity</td></tr>}
            </tbody>
            <tfoot className="bg-slate-50 text-slate-800"><tr><td className="px-4 py-2 font-medium">Total</td><td className="px-4 py-2 font-semibold">{Number(totals.equity||0).toFixed(2)}</td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
