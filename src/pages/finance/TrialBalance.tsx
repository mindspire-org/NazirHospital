import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'

export default function Finance_TrialBalance(){
  type Row = { account: string; debit: number; credit: number; balance: number }
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ load() }, [])

  async function load(){
    setLoading(true)
    try {
      const res: any = await financeApi.trialBalance({ from: from || undefined, to: to || undefined })
      const list: Row[] = (res?.rows||[]).map((r:any)=>({ account: String(r.account||''), debit: Number(r.debit||0), credit: Number(r.credit||0), balance: Number(r.balance||0) }))
      setRows(list)
    } catch { setRows([]) }
    finally { setLoading(false) }
  }

  const totals = useMemo(()=>{
    const d = rows.reduce((s,r)=> s + (r.debit||0), 0)
    const c = rows.reduce((s,r)=> s + (r.credit||0), 0)
    const b = d - c
    return { debit: d, credit: c, balance: b }
  }, [rows])

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-800">Trial Balance</div>
          <div className="text-sm text-slate-500">Summaries by account</div>
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

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Debit</th>
              <th className="px-4 py-2 font-medium">Credit</th>
              <th className="px-4 py-2 font-medium">Balance (D - C)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {rows.map((r)=> (
              <tr key={r.account}>
                <td className="px-4 py-2">{r.account}</td>
                <td className="px-4 py-2">{r.debit.toFixed(2)}</td>
                <td className="px-4 py-2">{r.credit.toFixed(2)}</td>
                <td className={`px-4 py-2 ${r.balance<0?'text-rose-600':'text-slate-800'}`}>{r.balance.toFixed(2)}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={4}>No data</td></tr>
            )}
          </tbody>
          <tfoot className="bg-slate-50 text-slate-800">
            <tr>
              <td className="px-4 py-2 font-medium">Totals</td>
              <td className="px-4 py-2 font-medium">{totals.debit.toFixed(2)}</td>
              <td className="px-4 py-2 font-medium">{totals.credit.toFixed(2)}</td>
              <td className={`px-4 py-2 font-semibold ${totals.balance<0?'text-rose-700':'text-slate-900'}`}>{totals.balance.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
