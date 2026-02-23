import { useEffect, useMemo, useState } from 'react'
import { pharmacyApi } from '../../utils/api'

export type EarningsCategory = 'Bonus'|'Award'|'LumpSum'|'RevenueShare'

type Earning = {
  _id?: string
  staffId: string
  date: string
  category: EarningsCategory
  amount?: number
  rate?: number
  base?: number
  notes?: string
}

export default function Pharmacy_StaffEarningsDialog({ open, onClose, staff, month }: { open: boolean; onClose: ()=>void; staff: { id: string; name: string }; month?: string }){
  const [items, setItems] = useState<Earning[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Earning>({ staffId: staff.id, date: new Date().toISOString().slice(0,10), category: 'Bonus', amount: 0, rate: undefined, base: undefined, notes: '' })
  const [editId, setEditId] = useState<string | null>(null)

  const firstDay = useMemo(()=> month ? `${month}-01` : undefined, [month])
  const lastDay = useMemo(()=>{
    if (!month) return undefined
    const dt = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
  }, [month])

  useEffect(()=>{
    if (!open) return
    let mounted = true
    ;(async()=>{
      setLoading(true)
      try{
        const res = await pharmacyApi.listStaffEarnings({ staffId: staff.id, from: firstDay, to: lastDay, limit: 100 })
        if (!mounted) return
        setItems((res.items||[]))
      } finally { setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [open, staff.id, firstDay, lastDay])

  const computedAmount = useMemo(()=>{
    if (form.category==='RevenueShare'){
      const rate = Number(form.rate||0), base = Number(form.base||0)
      return Math.round(base * (rate/100))
    }
    return Number(form.amount||0)
  }, [form])

  const resetForm = () => setForm({ staffId: staff.id, date: new Date().toISOString().slice(0,10), category: 'Bonus', amount: 0 })

  const save = async () => {
    const payload: any = { staffId: staff.id, date: form.date, category: form.category, notes: form.notes }
    if (form.category==='RevenueShare') { payload.rate = Number(form.rate||0); payload.base = Number(form.base||0) }
    else { payload.amount = Number(form.amount||0) }
    if (editId){
      await pharmacyApi.updateStaffEarning(editId, payload)
    } else {
      await pharmacyApi.createStaffEarning(payload)
    }
    resetForm()
    setEditId(null)
    // reload
    const res = await pharmacyApi.listStaffEarnings({ staffId: staff.id, from: firstDay, to: lastDay, limit: 100 })
    setItems((res.items||[]))
  }

  const onEdit = (row: Earning) => {
    setEditId(String(row._id))
    setForm({
      staffId: staff.id,
      date: row.date,
      category: row.category,
      amount: row.amount,
      rate: row.rate,
      base: row.base,
      notes: row.notes,
    })
  }

  const onDelete = async (id?: string) => {
    if (!id) return
    await pharmacyApi.deleteStaffEarning(id)
    const res = await pharmacyApi.listStaffEarnings({ staffId: staff.id, from: firstDay, to: lastDay, limit: 100 })
    setItems((res.items||[]))
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">Additional Earnings — {staff.name}</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-outline-navy">Close</button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 font-semibold text-slate-800">{editId? 'Edit Earning' : 'Add Earning'}</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm text-slate-700">Date
                <input type="date" value={form.date} onChange={e=> setForm(f=>({ ...f, date: e.target.value }))} className="input mt-1" />
              </label>
              <label className="text-sm text-slate-700">Category
                <select value={form.category} onChange={e=> setForm(f=>({ ...f, category: e.target.value as EarningsCategory }))} className="select mt-1">
                  <option value="Bonus">Bonus</option>
                  <option value="Award">Award</option>
                  <option value="LumpSum">Lump-sum</option>
                  <option value="RevenueShare">Revenue / % Share</option>
                </select>
              </label>
              {form.category==='RevenueShare' ? (
                <>
                  <label className="text-sm text-slate-700">Base Amount
                    <input type="number" min={0} value={form.base||''} onChange={e=> setForm(f=>({ ...f, base: Number(e.target.value) }))} className="input mt-1" placeholder="e.g. 500000" />
                  </label>
                  <label className="text-sm text-slate-700">Rate (%)
                    <input type="number" min={0} max={100} value={form.rate||''} onChange={e=> setForm(f=>({ ...f, rate: Number(e.target.value) }))} className="input mt-1" placeholder="e.g. 10" />
                  </label>
                </>
              ) : (
                <label className="text-sm text-slate-700">Amount (PKR)
                  <input type="number" min={0} value={form.amount||0} onChange={e=> setForm(f=>({ ...f, amount: Number(e.target.value) }))} className="input mt-1" placeholder="e.g. 10000" />
                </label>
              )}
              <label className="sm:col-span-2 lg:col-span-3 text-sm text-slate-700">Notes
                <input value={form.notes||''} onChange={e=> setForm(f=>({ ...f, notes: e.target.value }))} className="input mt-1" placeholder="Optional" />
              </label>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="text-slate-600">Computed Amount: <span className="font-medium text-slate-800">PKR {Number(computedAmount||0).toLocaleString()}</span></div>
              <div className="flex items-center gap-2">
                {editId && <button onClick={()=>{ setEditId(null); resetForm() }} className="btn-outline-navy">Cancel Edit</button>}
                <button onClick={save} className="btn">{editId? 'Save Changes' : 'Add Earning'}</button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Notes</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {items.map(it => (
                  <tr key={String(it._id)}>
                    <td className="px-4 py-2">{it.date}</td>
                    <td className="px-4 py-2">{it.category}</td>
                    <td className="px-4 py-2">PKR {Number(it.amount||0).toLocaleString()}</td>
                    <td className="px-4 py-2">{it.notes||'—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={()=>onEdit(it)} className="rounded-md bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-700">Edit</button>
                        <button onClick={()=>onDelete(it._id)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length===0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>{loading? 'Loading...' : 'No additional earnings'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
