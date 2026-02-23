import { useEffect, useState } from 'react'
import type { Customer } from './pharmacy_AddCustomer'
import { pharmacyApi } from '../../utils/api'

type Props = {
  open: boolean
  onClose: () => void
  customer: Customer | null
}

export default function Pharmacy_PayBill({ open, onClose, customer }: Props) {
  const [receipts, setReceipts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let mounted = true
    if (!open || !customer?.id) { setReceipts([]); setExpanded({}); return }
    ;(async () => {
      try {
        setLoading(true)
        const res = await pharmacyApi.listSales({ customerId: customer.id, payment: 'Credit', limit: 200 })
        if (!mounted) return
        const items = res.items || []
        setReceipts(items)
        const init: Record<string, boolean> = {}
        for (const s of items) init[s._id] = false
        setExpanded(init)
      } catch {
        setReceipts([])
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [open, customer?.id])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-0 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800">Pay Bill</h3>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">×</button>
        </div>
        <div className="space-y-4 px-6 py-5 text-sm">
          <div>
            <div className="mb-2 text-slate-700">Receipts {customer ? `· ${customer.name}` : ''}</div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    {['Bill No','Date','Total','Paid','Remaining','Pay this'].map(h => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-500">Loading...</td></tr>
                  )}
                  {!loading && receipts.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-500">No credit receipts</td></tr>
                  )}
                  {!loading && receipts.map((s: any) => {
                    const paid = 0
                    const remaining = Math.max(0, Number(s.total || 0) - paid)
                    return (
                      <>
                        <tr key={s._id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2">
                            <button type="button" onClick={()=> setExpanded(prev=> ({...prev, [s._id]: !prev[s._id]}))} className="rounded border border-slate-200 px-2 py-0.5 text-xs mr-2">
                              {expanded[s._id] ? 'Hide' : 'View'} items
                            </button>
                            {s.billNo}
                          </td>
                          <td className="px-3 py-2">{new Date(s.datetime).toLocaleDateString()}</td>
                          <td className="px-3 py-2">Rs {Number(s.total||0).toFixed(2)}</td>
                          <td className="px-3 py-2">Rs {paid.toFixed(2)}</td>
                          <td className="px-3 py-2">Rs {remaining.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} max={remaining} className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="0.00" />
                          </td>
                        </tr>
                        {expanded[s._id] && (
                          <tr>
                            <td colSpan={6} className="bg-slate-50 px-3 py-2">
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-xs">
                                  <thead>
                                    <tr className="text-slate-600">
                                      <th className="px-2 py-1">Item</th>
                                      <th className="px-2 py-1">Qty</th>
                                      <th className="px-2 py-1">Price</th>
                                      <th className="px-2 py-1">Line Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(s.lines||[]).map((l:any, idx:number)=> (
                                      <tr key={idx} className="border-t border-slate-200">
                                        <td className="px-2 py-1">{l.name}</td>
                                        <td className="px-2 py-1">{l.qty}</td>
                                        <td className="px-2 py-1">Rs {Number(l.unitPrice||0).toFixed(2)}</td>
                                        <td className="px-2 py-1">Rs {Number((l.unitPrice||0)*(l.qty||0)).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-slate-700">Notes</label>
            <textarea className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Add notes (optional)" rows={3} />
          </div>
          <div>
            <label className="mb-1 block text-slate-700">Amount (General payment)</label>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Enter amount" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button className="btn">Record Payment</button>
          <button onClick={onClose} className="btn-outline-navy">Cancel</button>
        </div>
      </div>
    </div>
  )
}
