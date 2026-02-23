import { useMemo, useState } from 'react'
import { pharmacyApi } from '../../utils/api'

type PurchaseLine = { medicineId?: string; name: string; totalItems: number; unitsPerPack?: number; buyPerUnitAfterTax?: number; buyPerUnit?: number; buyPerPack?: number; }
type Purchase = { invoice: string; date: string; supplierName?: string; lines: PurchaseLine[] }

type Props = {
  open: boolean
  onClose: () => void
  purchase: Purchase | null
  onSubmitted: (payload: { purchase: any; returnDoc: any }) => void
}

export default function Pharmacy_SupplierReturnDialog({ open, onClose, purchase, onSubmitted }: Props){
  const [qtys, setQtys] = useState<Record<number,string>>({})

  const calc = useMemo(() => {
    if (!purchase) return { lines: [], total: 0 }
    const lines = purchase.lines.map((l, idx) => {
      const unit = Number(l.buyPerUnitAfterTax || l.buyPerUnit || ((l.unitsPerPack && l.buyPerPack) ? (l.buyPerPack / l.unitsPerPack) : 0) || 0)
      const rq = Math.max(0, Math.min(parseInt(qtys[idx] || '0') || 0, Number(l.totalItems || 0)))
      const amt = unit * rq
      return { idx, name: l.name, unitPrice: unit, purchasedQty: Number(l.totalItems || 0), returnQty: rq, amount: Math.round(amt*100)/100, medicineId: l.medicineId }
    })
    const total = lines.reduce((s, x) => s + x.amount, 0)
    return { lines, total: Math.round(total*100)/100 }
  }, [purchase, qtys])

  async function submit(){
    if (!purchase) return
    const retLines = calc.lines.filter(x => x.returnQty>0).map(x => {
      const base: any = { name: x.name, qty: x.returnQty, amount: 0 }
      if (x.medicineId) base.medicineId = x.medicineId
      return base
    })
    if (!retLines.length){ onClose(); return }
    const body = { type: 'Supplier', datetime: new Date().toISOString(), reference: purchase.invoice, party: purchase.supplierName || '', lines: retLines }
    try {
      const res = await pharmacyApi.createReturn(body)
      const retDoc = (res?.return) || res
      onSubmitted({ purchase: res?.purchase || null, returnDoc: retDoc })
      try { window.dispatchEvent(new CustomEvent('pharmacy:return', { detail: { reference: purchase.invoice } })) } catch {}
    } catch (err: any) {
      alert(`Failed to save return: ${err?.message || err || ''}`)
    }
  }

  if (!open || !purchase) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="font-medium">Return to Supplier — {purchase.invoice}</div>
          <div className="flex items-center gap-2">
            <button onClick={submit} className="btn">Save</button>
            <button onClick={onClose} className="btn-outline-navy">Close</button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-4">
          <div className="text-sm text-slate-700">Supplier: {purchase.supplierName || ''}</div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Purchased Qty</th>
                  <th className="px-3 py-2">Unit Cost</th>
                  <th className="px-3 py-2">Return Qty</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calc.lines.map((l, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">{l.name}</td>
                    <td className="px-3 py-2">{l.purchasedQty}</td>
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
