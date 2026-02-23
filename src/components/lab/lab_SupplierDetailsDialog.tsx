import { useEffect, useState } from 'react'
import type { Supplier } from './lab_AddSupplierDialog'
import { labApi } from '../../utils/api'

type Props = {
  open: boolean
  onClose: () => void
  supplier: Supplier | null
}

export default function Lab_SupplierDetailsDialog({ open, onClose, supplier }: Props) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [purchases, setPurchases] = useState<any[]>([])

  useEffect(() => {
    let mounted = true
    if (!open || !supplier?.id) { setRows([]); setPurchases([]); return }
    ;(async () => {
      try {
        setLoading(true)
        let arr1: any[] = []
        let arr2: any[] = []
        try { const r1 = await labApi.listSupplierPurchases(supplier.id); arr1 = r1.items || [] } catch {}
        if (supplier.name){ try { const r2 = await labApi.listPurchases({ search: supplier.name, limit: 500 }); arr2 = r2.items || [] } catch {} }
        if (!mounted) return
        const dedup = new Map<string, any>()
        for (const p of [...arr1, ...arr2]){
          const k = `${p.invoice}|${p.date}`
          if (!dedup.has(k)) dedup.set(k, p)
        }
        const purs = Array.from(dedup.values())
        setPurchases(purs)
        let items: any[] = []
        for (const p of purs){
          for (const l of (p.lines || [])){
            const unitsPerPack = Number(l.unitsPerPack || 1)
            const packs = Number(l.packs || 0)
            const totalUnits = Number(l.totalItems || (unitsPerPack * packs))
            const buyPerPack = Number(l.buyPerPack || 0)
            const unitBuy = Number(l.buyPerUnit || (unitsPerPack ? buyPerPack/unitsPerPack : 0))
            const salePerPack = Number(l.salePerPack || 0)
            const unitSale = Number(l.salePerUnit || (unitsPerPack ? salePerPack/unitsPerPack : 0))
            items.push({
              item: l.name || '-',
              packs,
              unitsPerPack,
              totalUnits,
              buyPerPack,
              unitBuy,
              salePerPack,
              unitSale,
              profitPerUnit: unitSale - unitBuy,
              invoice: p.invoice,
              expiry: l.expiry || '-',
              minStock: l.minStock || 0,
              updated: (p.updatedAt || p.date || '').slice(0,10),
            })
          }
        }
        setRows(items)
      } catch {
        setRows([]); setPurchases([])
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [open, supplier?.id])

  if (!open || !supplier) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="text-lg font-semibold text-slate-800">Supplier Details</div>
          <button onClick={onClose} className="btn-outline-navy">Close</button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-6">
          <div className="text-xl font-bold text-slate-900">{supplier.name}</div>
          <div className="mt-2 grid gap-4 rounded-lg border border-slate-200 p-4">
            <div className="font-medium text-slate-800">Supplier Info</div>
            <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <div>Phone: <span className="text-slate-600">{supplier.phone || '-'}</span></div>
              <div>Address: <span className="text-slate-600">{supplier.address || '-'}</span></div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Purchase Summary</div>
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-medium">Invoice</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Total</th>
                    <th className="px-3 py-2 font-medium">Paid</th>
                    <th className="px-3 py-2 font-medium">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading...</td></tr>
                  )}
                  {!loading && purchases.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No purchases</td></tr>
                  )}
                  {!loading && purchases.map((p:any)=> (
                    <tr key={p._id}>
                      <td className="px-3 py-2">{p.invoice}</td>
                      <td className="px-3 py-2">{p.date}</td>
                      <td className="px-3 py-2">Rs {Number(p.totalAmount||0).toFixed(2)}</td>
                      <td className="px-3 py-2">Rs {Number(p.paid||0).toFixed(2)}</td>
                      <td className="px-3 py-2">Rs {Number(p.remaining||0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Supplied Items</div>
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Packs</th>
                    <th className="px-3 py-2 font-medium">Units/Pack</th>
                    <th className="px-3 py-2 font-medium">Total Units</th>
                    <th className="px-3 py-2 font-medium">Buy/Pack</th>
                    <th className="px-3 py-2 font-medium">Unit Buy</th>
                    <th className="px-3 py-2 font-medium">Sale/Pack</th>
                    <th className="px-3 py-2 font-medium">Unit Sale</th>
                    <th className="px-3 py-2 font-medium">Profit/Unit</th>
                    <th className="px-3 py-2 font-medium">Invoice #</th>
                    <th className="px-3 py-2 font-medium">Expiry</th>
                    <th className="px-3 py-2 font-medium">Min Stock</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading && (
                    <tr><td colSpan={13} className="px-3 py-6 text-center text-slate-500">Loading...</td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={13} className="px-3 py-6 text-center text-slate-500">No items</td></tr>
                  )}
                  {!loading && rows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{r.item}</td>
                      <td className="px-3 py-2">{r.packs}</td>
                      <td className="px-3 py-2">{r.unitsPerPack}</td>
                      <td className="px-3 py-2">{r.totalUnits}</td>
                      <td className="px-3 py-2">{r.buyPerPack.toFixed(2)}</td>
                      <td className="px-3 py-2">{r.unitBuy.toFixed(2)}</td>
                      <td className="px-3 py-2">{r.salePerPack.toFixed(2)}</td>
                      <td className="px-3 py-2">{r.unitSale.toFixed(2)}</td>
                      <td className="px-3 py-2">{(r.profitPerUnit||0).toFixed(2)}</td>
                      <td className="px-3 py-2">{r.invoice}</td>
                      <td className="px-3 py-2">{r.expiry}</td>
                      <td className="px-3 py-2">{r.minStock}</td>
                      <td className="px-3 py-2">{r.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
