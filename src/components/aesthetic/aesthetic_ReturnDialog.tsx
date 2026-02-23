import { useMemo, useState } from 'react'
import { aestheticApi } from '../../utils/api'

type SaleLine = { medicineId?: string; name: string; unitPrice: number; qty: number }
type Sale = { billNo: string; datetime: string; customer?: string; payment: 'Cash'|'Card'|'Credit'; discountPct?: number; lines: SaleLine[] }

type Props = {
  open: boolean
  onClose: () => void
  sale: Sale | null
  onSubmitted: (payload: { sale: any; returnDoc: any }) => void
}

export default function Pharmacy_ReturnDialog({ open, onClose, sale, onSubmitted }: Props){
  const [qtys, setQtys] = useState<Record<number,string>>({})
  const discountPct = Number(sale?.discountPct || 0)
  const discMultiplier = (100 - discountPct) / 100

  const calc = useMemo(() => {
    if (!sale) return { lines: [], subtotal: 0, total: 0 }
    const lines = sale.lines.map((l, idx) => {
      const rq = Math.max(0, Math.min(parseInt(qtys[idx] || '0') || 0, Number(l.qty || 0)))
      const amt = Number(l.unitPrice || 0) * rq * discMultiplier
      return { idx, name: l.name, unitPrice: Number(l.unitPrice||0), soldQty: Number(l.qty||0), returnQty: rq, amount: Math.round(amt*100)/100, medicineId: l.medicineId }
    })
    const subtotal = lines.reduce((s, x) => s + x.amount, 0)
    return { lines, subtotal: Math.round(subtotal*100)/100, total: Math.round(subtotal*100)/100 }
  }, [sale, qtys, discMultiplier])

  async function submit(){
    if (!sale) return
    const retLines = calc.lines.filter(x => x.returnQty>0).map(x => {
      const base: any = { name: x.name, qty: x.returnQty, amount: 0 }
      if (x.medicineId) base.medicineId = x.medicineId
      return base
    })
    if (!retLines.length){ onClose(); return }
    const body = { type: 'Customer', datetime: new Date().toISOString(), reference: sale.billNo, party: sale.customer || 'Walk-in', lines: retLines }
    const res = await aestheticApi.createReturn(body)
    const retDoc = (res?.return) || res
    onSubmitted({ sale: res?.sale || null, returnDoc: retDoc })
    try { window.dispatchEvent(new CustomEvent('aesthetic:return', { detail: { reference: sale.billNo } })) } catch {}
  }

  if (!open || !sale) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="font-medium">Return Items — {sale.billNo}</div>
          <div className="flex items-center gap-2">
            <button onClick={submit} className="btn">Save</button>
            <button onClick={onClose} className="btn-outline-navy">Close</button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-4">
          <div className="text-sm text-slate-700">Customer: {sale.customer || 'Walk-in'} · Payment: {sale.payment} · Discount: {discountPct}%</div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Sold Qty</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Return Qty</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calc.lines.map((l, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">{l.name}</td>
                    <td className="px-3 py-2">{l.soldQty}</td>
                    <td className="px-3 py-2">{l.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <input value={qtys[idx]||''} onChange={e=>setQtys(p=>({ ...p, [idx]: e.target.value.replace(/[^0-9]/g,'') }))} className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="0" />
                    </td>
                    <td className="px-3 py-2 text-right">Rs {l.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="px-3 py-2 font-medium" colSpan={4}>Total</td>
                  <td className="px-3 py-2 text-right font-semibold">Rs {calc.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
