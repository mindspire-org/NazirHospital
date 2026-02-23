import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'

export default function Finance_Liabilities(){
  type Item = { account: string; amount: number }
  const [asOf, setAsOf] = useState('')
  const [list, setList] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ load() }, [])

  async function load(){
    setLoading(true)
    try {
      const res: any = await financeApi.balanceSheet(asOf || undefined)
      const items: Item[] = (res?.liabilities||[]).map((x:any)=>({ account: String(x.account||''), amount: Number(x.amount||0) }))
      setList(items)
    } catch { setList([]) }
    finally { setLoading(false) }
  }

  const total = list.reduce((s,x)=> s + (x.amount||0), 0)

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-800">Liabilities</div>
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

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {list.map(a => (
              <tr key={a.account}><td className="px-4 py-2">{a.account}</td><td className="px-4 py-2">{a.amount.toFixed(2)}</td></tr>
            ))}
            {list.length===0 && <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={2}>No liabilities</td></tr>}
          </tbody>
          <tfoot className="bg-slate-50 text-slate-800"><tr><td className="px-4 py-2 font-medium">Total</td><td className="px-4 py-2 font-semibold">{total.toFixed(2)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  )
}
