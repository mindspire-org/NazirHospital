import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'

type Line = { account: string; debit?: string; credit?: string }
	export default function Finance_Vouchers(){
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'receipt'|'payment'|'journal'>('journal')
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<Line[]>([{ account: 'CASH', debit: '0', credit: '0' }, { account: 'OPD_REVENUE', debit: '0', credit: '0' }])

  useEffect(()=>{ load() }, [])

  async function load(){
    setLoading(true)
    try {
      const res: any = await financeApi.vouchers({ from: from||undefined, to: to||undefined })
      setRows(res?.vouchers||[])
    } catch { setRows([]) }
    finally { setLoading(false) }
  }

  function updateLine(i: number, patch: Partial<Line>){
    setLines(prev => prev.map((l,idx)=> idx===i ? { ...l, ...patch } : l))
  }
  function addLine(){ setLines(prev => [...prev, { account: '', debit: '0', credit: '0' }]) }
  function removeLine(i: number){ setLines(prev => prev.filter((_,idx)=> idx!==i)) }

  const totals = useMemo(()=>{
    const d = lines.reduce((s,l)=> s + (parseFloat(l.debit||'0')||0), 0)
    const c = lines.reduce((s,l)=> s + (parseFloat(l.credit||'0')||0), 0)
    return { debit: d, credit: c, balanced: Math.abs(d - c) < 0.005 }
  }, [lines])

  async function saveVoucher(e: React.FormEvent){
    e.preventDefault()
    if (!totals.balanced) { alert('Voucher not balanced (debits must equal credits).'); return }
    const mapped = lines.map(l=> ({ account: l.account.trim(), debit: parseFloat(l.debit||'0')||0, credit: parseFloat(l.credit||'0')||0 }))
    try {
      await financeApi.createVoucher({ type, memo: memo||undefined, lines: mapped })
      setMemo('')
      setLines([{ account: 'CASH', debit: '0', credit: '0' }, { account: 'OPD_REVENUE', debit: '0', credit: '0' }])
      await load()
      alert('Voucher saved')
    } catch (e:any){ alert(e?.message || 'Failed to save voucher') }
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-800">Vouchers</div>
          <div className="text-sm text-slate-500">Create and view vouchers</div>
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

      <form onSubmit={saveVoucher} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Type</label>
            <select value={type} onChange={e=>setType(e.target.value as any)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option>journal</option>
              <option>receipt</option>
              <option>payment</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm text-slate-700">Memo</label>
            <input value={memo} onChange={e=>setMemo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Debit</th>
                <th className="px-3 py-2 font-medium">Credit</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-3 py-2"><input value={l.account} onChange={e=>updateLine(i,{ account: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1" placeholder="e.g., CASH" /></td>
                  <td className="px-3 py-2"><input type="number" step="0.01" value={l.debit} onChange={e=>updateLine(i,{ debit: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1" /></td>
                  <td className="px-3 py-2"><input type="number" step="0.01" value={l.credit} onChange={e=>updateLine(i,{ credit: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1" /></td>
                  <td className="px-3 py-2"><button type="button" onClick={()=>removeLine(i)} className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Remove</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 text-slate-800">
              <tr>
                <td className="px-3 py-2 font-medium">
                  <button type="button" onClick={addLine} className="btn-outline-navy">+ Add Line</button>
                </td>
                <td className="px-3 py-2 font-medium">{totals.debit.toFixed(2)}</td>
                <td className="px-3 py-2 font-medium">{totals.credit.toFixed(2)}</td>
                <td className="px-3 py-2 font-medium">{totals.balanced? <span className="text-emerald-700">Balanced</span> : <span className="text-rose-600">Unbalanced</span>}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex items-center justify-end">
          <button disabled={!totals.balanced} className="btn">Save Voucher</button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Recent Vouchers</div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">Type</th><th className="px-4 py-2 font-medium">Memo</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {rows.map((v:any)=>(
              <tr key={String(v._id||v.id)}>
                <td className="px-4 py-2">{String(v.dateIso||'')}</td>
                <td className="px-4 py-2">{String(v.refType||'')}</td>
                <td className="px-4 py-2">{String(v.memo||'')}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={3}>No vouchers</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
