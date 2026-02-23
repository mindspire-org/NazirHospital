import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'

export default function Finance_Ledger(){
  type Entry = { dateIso: string; refType?: string; refId?: string; memo?: string; debit?: number; credit?: number; running?: number }
  const [account, setAccount] = useState('CASH')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ load() }, [])

  async function load(){
    if (!account.trim()) return
    setLoading(true)
    try {
      const res: any = await financeApi.ledger({ account: account.trim(), from: from||undefined, to: to||undefined })
      const list: Entry[] = (res?.entries||[]).map((r:any)=>({ dateIso: String(r.dateIso||''), refType: String(r.refType||''), refId: r.refId?String(r.refId):undefined, memo: r.memo?String(r.memo):undefined, debit: Number(r.debit||0), credit: Number(r.credit||0), running: Number(r.running||0) }))
      setRows(list)
    } catch { setRows([]) }
    finally { setLoading(false) }
  }

  const totals = useMemo(()=>{
    const d = rows.reduce((s,r)=> s + (r.debit||0), 0)
    const c = rows.reduce((s,r)=> s + (r.credit||0), 0)
    return { debit: d, credit: c }
  }, [rows])

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-700">Account</label>
          <input value={account} onChange={e=>setAccount(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., CASH" />
        </div>
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

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Ref</th>
              <th className="px-4 py-2 font-medium">Memo</th>
              <th className="px-4 py-2 font-medium">Debit</th>
              <th className="px-4 py-2 font-medium">Credit</th>
              <th className="px-4 py-2 font-medium">Running</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {rows.map((r, i)=> (
              <tr key={i}>
                <td className="px-4 py-2">{r.dateIso}</td>
                <td className="px-4 py-2">{r.refType||'-'}{r.refId?`:${r.refId}`:''}</td>
                <td className="px-4 py-2">{r.memo||'-'}</td>
                <td className="px-4 py-2">{Number(r.debit||0).toFixed(2)}</td>
                <td className="px-4 py-2">{Number(r.credit||0).toFixed(2)}</td>
                <td className={`px-4 py-2 ${Number(r.running||0)<0?'text-rose-600':'text-slate-800'}`}>{Number(r.running||0).toFixed(2)}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No entries</td></tr>
            )}
          </tbody>
          <tfoot className="bg-slate-50 text-slate-800">
            <tr>
              <td className="px-4 py-2 font-medium" colSpan={3}>Totals</td>
              <td className="px-4 py-2 font-medium">{totals.debit.toFixed(2)}</td>
              <td className="px-4 py-2 font-medium">{totals.credit.toFixed(2)}</td>
              <td className="px-4 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
