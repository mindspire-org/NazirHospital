import React, { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import Toast, { type ToastState } from '../ui/Toast'

export default function Billing({ encounterId }: { encounterId: string }){
  const [charges, setCharges] = useState<Array<{ id: string; label: string; amount: number }>>([])
  const [payments, setPayments] = useState<Array<{ id: string; amount: number }>>([])
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const [bi, pay] = await Promise.all([
        hospitalApi.listIpdBillingItems(encounterId, { limit: 500 }) as any,
        hospitalApi.listIpdPayments(encounterId, { limit: 500 }) as any,
      ])
      const crows = (bi.items || []).map((i: any)=>({ id: String(i._id), label: i.description || '', amount: Number(i.amount || 0) }))
      const prows = (pay.payments || []).map((p: any)=>({ id: String(p._id), amount: Number(p.amount || 0) }))
      setCharges(crows); setPayments(prows)
    }catch{}
  }

  const total = charges.reduce((a,c)=>a+c.amount,0)
  const paid = payments.reduce((a,c)=>a+c.amount,0)
  const pending = Math.max(0, total - paid)

  async function save(d: { label: string; amount: number }){
    try{
      await hospitalApi.createIpdBillingItem(encounterId, { type: 'service', description: d.label, qty: 1, unitPrice: d.amount, amount: d.amount })
      setOpen(false); await reload()
      setToast({ type: 'success', message: 'Charge added' })
    }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to add charge' }) }
  }

  async function markPaid(amount: number){
    if (pending <= 0) return
    const amt = Number(amount || 0)
    if (amt <= 0) return
    if (amt > pending){ setToast({ type: 'error', message: 'Cannot pay more than pending' }); return }
    try{ await hospitalApi.createIpdPayment(encounterId, { amount: amt }); await reload(); setToast({ type: 'success', message: 'Payment recorded' }) }catch(e: any){ setToast({ type: 'error', message: e?.message || 'Failed to record payment' }) }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="text-xs font-medium text-rose-700">Pending</div>
          <div className="text-2xl font-bold text-rose-700">Rs{pending.toFixed(0)}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-medium text-emerald-700">Paid</div>
          <div className="text-2xl font-bold text-emerald-700">Rs{paid.toFixed(0)}</div>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        {charges.length === 0 ? (
          <div className="text-slate-500">No billing entries yet.</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {charges.map(c => {
                const disabled = pending <= 0 || c.amount > pending
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2">{c.label}</td>
                    <td className="px-3 py-2">Rs{c.amount.toFixed(0)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button disabled={disabled} onClick={()=>markPaid(c.amount)} className={`rounded-md border border-slate-300 px-2 py-1 text-xs ${disabled? 'opacity-50 cursor-not-allowed':''}`}>{disabled? 'Paid' : 'Mark as Paid'}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-3">
        <button onClick={()=>setOpen(true)} className="btn">Add Charge</button>
      </div>
      <ChargeDialog open={open} onClose={()=>setOpen(false)} onSave={save} />
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}

function ChargeDialog({ open, onClose, onSave }: { open: boolean; onClose: ()=>void; onSave: (d: { label: string; amount: number })=>void }){
  if(!open) return null
  const svcCatalog = [
    { label: 'ER Consultation', amount: 500 },
    { label: 'ECG', amount: 800 },
    { label: 'Nebulization', amount: 300 },
  ]
  const guessAmount = (label: string) => {
    const m = svcCatalog.find(s => String(s.label).toLowerCase() === String(label||'').trim().toLowerCase())
    return m ? Number(m.amount || 0) : null
  }
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSave({ label: String(fd.get('label')||''), amount: parseFloat(String(fd.get('amount')||'0')) || 0 })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Charge</div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <label htmlFor="charge-label" className="block text-xs font-medium text-slate-600">Label</label>
          <input
            id="charge-label"
            name="label"
            placeholder="Select a service or type manually"
            list="ipd-charge-services"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            onChange={(e) => {
              try {
                const amt = guessAmount(e.currentTarget.value)
                if (amt == null) return
                const form = e.currentTarget.form
                const amtEl = form?.querySelector<HTMLInputElement>('input[name="amount"]')
                if (amtEl && (!amtEl.value || Number(amtEl.value) === 0)) amtEl.value = String(amt)
              } catch {}
            }}
          />
          <datalist id="ipd-charge-services">
            {svcCatalog.map(s => (<option key={s.label} value={s.label} />))}
          </datalist>
          <label htmlFor="charge-amount" className="block text-xs font-medium text-slate-600">Amount</label>
          <input id="charge-amount" name="amount" type="number" step="0.01" placeholder="e.g. 1000" className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  )
}
