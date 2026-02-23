import { useEffect, useMemo, useState } from 'react'
import { financeApi } from '../../utils/api'

export default function Finance_Recurring(){
  type Rec = { id: string; name: string; memo?: string; amount: number; accountDebit: string; accountCredit: string; vendorId?: string; frequency: 'daily'|'weekly'|'monthly'; startDate: string; endDate?: string; nextRun: string; active: boolean }
  type Vendor = { id: string; name: string }
  const [list, setList] = useState<Rec[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [form, setForm] = useState<{ name: string; memo: string; amount: string; accountDebit: string; accountCredit: string; vendorId: string; frequency: 'daily'|'weekly'|'monthly'; startDate: string }>(
    { name: '', memo: '', amount: '', accountDebit: 'EXPENSE', accountCredit: 'CASH', vendorId: '', frequency: 'monthly', startDate: new Date().toISOString().slice(0,10) }
  )
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ load(); loadVendors() }, [])

  async function load(){
    setLoading(true)
    try {
      const res: any = await financeApi.recurringList()
      const arr: Rec[] = (res?.recurring||[]).map((r:any)=>({ id: String(r._id||r.id), name: String(r.name||''), memo: r.memo?String(r.memo):undefined, amount: Number(r.amount||0), accountDebit: String(r.accountDebit||''), accountCredit: String(r.accountCredit||''), vendorId: r.vendorId?String(r.vendorId):undefined, frequency: (r.frequency||'monthly') as any, startDate: String(r.startDate||''), endDate: r.endDate?String(r.endDate):undefined, nextRun: String(r.nextRun||''), active: Boolean(r.active!==false) }))
      setList(arr)
    } catch { setList([]) }
    finally { setLoading(false) }
  }
  async function loadVendors(){
    try {
      const res: any = await financeApi.vendors()
      setVendors((res?.vendors||[]).map((v:any)=>({ id: String(v._id||v.id), name: String(v.name||'') })))
    } catch { setVendors([]) }
  }

  const valid = useMemo(()=> form.name.trim() && form.accountDebit.trim() && form.accountCredit.trim() && !!parseFloat(form.amount||'0'), [form])

  async function add(e: React.FormEvent){
    e.preventDefault()
    if (!valid) return
    setLoading(true)
    try {
      await financeApi.recurringCreate({ name: form.name.trim(), memo: form.memo.trim()||undefined, amount: parseFloat(form.amount||'0')||0, accountDebit: form.accountDebit.trim(), accountCredit: form.accountCredit.trim(), vendorId: form.vendorId||undefined, frequency: form.frequency, startDate: form.startDate })
      setForm({ name: '', memo: '', amount: '', accountDebit: 'EXPENSE', accountCredit: 'CASH', vendorId: '', frequency: 'monthly', startDate: new Date().toISOString().slice(0,10) })
      await load()
    } finally { setLoading(false) }
  }
  async function run(id: string){ try { await financeApi.recurringRun(id); await load() } catch {}
  }
  async function toggleActive(r: Rec){ try { await financeApi.recurringUpdate(r.id, { active: !r.active }); await load() } catch {}
  }
  async function remove(id: string){ if (!confirm('Delete this schedule?')) return; try { await financeApi.recurringDelete(id); await load() } catch {}
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="text-2xl font-bold text-slate-800">Recurring Payments</div>

      <form onSubmit={add} className="rounded-xl border border-slate-200 bg-white p-4 grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-slate-700">Name</label>
          <input value={form.name} onChange={e=>setForm(f=>({ ...f, name: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., Rent" required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Amount</label>
          <input type="number" step="0.01" value={form.amount} onChange={e=>setForm(f=>({ ...f, amount: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="0.00" required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Debit A/c</label>
          <input value={form.accountDebit} onChange={e=>setForm(f=>({ ...f, accountDebit: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="EXPENSE" required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Credit A/c</label>
          <input value={form.accountCredit} onChange={e=>setForm(f=>({ ...f, accountCredit: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="CASH" required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Vendor</label>
          <select value={form.vendorId} onChange={e=>setForm(f=>({ ...f, vendorId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">- Optional -</option>
            {vendors.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Frequency</label>
          <select value={form.frequency} onChange={e=>setForm(f=>({ ...f, frequency: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option>monthly</option>
            <option>weekly</option>
            <option>daily</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-700">Start Date</label>
          <input type="date" value={form.startDate} onChange={e=>setForm(f=>({ ...f, startDate: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-3">
          <label className="mb-1 block text-sm text-slate-700">Memo</label>
          <input value={form.memo} onChange={e=>setForm(f=>({ ...f, memo: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
        </div>
        <div className="md:col-span-6 flex items-center justify-end">
          <button disabled={!valid||loading} className="btn">{loading?'Saving...':'Add Schedule'}</button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Debit</th>
              <th className="px-4 py-2 font-medium">Credit</th>
              <th className="px-4 py-2 font-medium">Vendor</th>
              <th className="px-4 py-2 font-medium">Freq</th>
              <th className="px-4 py-2 font-medium">Next Run</th>
              <th className="px-4 py-2 font-medium">Active</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {list.map(r => (
              <tr key={r.id}>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.amount.toFixed(2)}</td>
                <td className="px-4 py-2">{r.accountDebit}</td>
                <td className="px-4 py-2">{r.accountCredit}</td>
                <td className="px-4 py-2">{r.vendorId ? (vendors.find(v=>v.id===r.vendorId)?.name || r.vendorId) : '-'}</td>
                <td className="px-4 py-2">{r.frequency}</td>
                <td className="px-4 py-2">{r.nextRun}</td>
                <td className="px-4 py-2"><span className={`rounded px-2 py-0.5 text-xs ${r.active?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-700'}`}>{r.active?'Yes':'No'}</span></td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button onClick={()=>run(r.id)} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Run</button>
                    <button onClick={()=>toggleActive(r)} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">{r.active?'Deactivate':'Activate'}</button>
                    <button onClick={()=>remove(r.id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length===0 && (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={9}>No schedules</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
