import { useEffect, useState } from 'react'
import { pharmacyApi } from '../../utils/api'
import Pharmacy_ConfirmDialog from '../../components/pharmacy/pharmacy_ConfirmDialog'
import Pharmacy_PurchaseSlipDialog from '../../components/pharmacy/pharmacy_PurchaseSlipDialog'

type Row = {
  id: string
  date: string // yyyy-mm-dd
  medicine: string
  supplier: string
  unitsPerPack: number
  totalItems: number
  buyPerPack: number
  buyPerUnit: number
  totalAmount: number
  salePerPack: number
  salePerUnit: number
  invoice: string
  expiry: string // yyyy-mm-dd
}

export default function Pharmacy_PurchaseHistory() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTick, setSearchTick] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [slipOpen, setSlipOpen] = useState(false)
  const [selected, setSelected] = useState<Row | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Row | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res: any = await pharmacyApi.listPurchases({ from: from || undefined, to: to || undefined, search: search || undefined, page, limit })
        const items: any[] = res?.items ?? res ?? []
        const mapped: Row[] = items.map((p: any) => {
          const l = (p.lines && p.lines[0]) || {}
          const buyPerUnit = l.buyPerUnit || ((l.unitsPerPack && l.buyPerPack) ? (l.buyPerPack / l.unitsPerPack) : 0)
          const salePerUnit = l.salePerUnit || ((l.unitsPerPack && l.salePerPack) ? (l.salePerPack / l.unitsPerPack) : 0)
          return {
            id: p._id,
            date: p.date,
            medicine: l.name || '-',
            supplier: p.supplierName || '-',
            unitsPerPack: l.unitsPerPack || 1,
            totalItems: l.totalItems || ((l.unitsPerPack || 1) * (l.packs || 0)) || 0,
            buyPerPack: l.buyPerPack || 0,
            buyPerUnit: Number(buyPerUnit.toFixed(3)),
            totalAmount: p.totalAmount || p?.totals?.net || 0,
            salePerPack: l.salePerPack || 0,
            salePerUnit: Number(salePerUnit.toFixed(3)),
            invoice: p.invoice,
            expiry: l.expiry || '-',
          }
        })
        setRows(mapped)
        setTotal(Number(res.total || mapped.length || 0))
        setTotalPages(Number(res.totalPages || 1))
      } catch {}
    }
    load()
  }, [searchTick, from, to, search, page, limit])

  const openPrint = (row: Row) => {
    setSelected(row)
    setSlipOpen(true)
  }

  const exportCsv = async () => {
    try {
      setExporting(true)
      const pageLimit = 1000
      const first: any = await pharmacyApi.listPurchases({ from: from || undefined, to: to || undefined, search: search || undefined, page: 1, limit: pageLimit })
      let items: any[] = (first.items || first || [])
      const tp = Number(first.totalPages || 1)
      if (tp > 1) {
        const pages = Array.from({ length: tp - 1 }, (_, i) => i + 2)
        const results = await Promise.all(pages.map(p => pharmacyApi.listPurchases({ from: from || undefined, to: to || undefined, search: search || undefined, page: p, limit: pageLimit })))
        for (const r of results) items = items.concat(((r as any).items || r || []))
      }
      const headers = [
        'Date','Medicine','Supplier','Units/Pack','Total Items','Buy/Pack','Buy/Unit','Total Amount','Sale/Pack','Sale/Unit','Invoice #','Expiry'
      ]
      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const toRow = (p: any) => {
        const l = (p.lines && p.lines[0]) || {}
        const buyPerUnit = l.buyPerUnit || ((l.unitsPerPack && l.buyPerPack) ? (l.buyPerPack / l.unitsPerPack) : 0)
        const salePerUnit = l.salePerUnit || ((l.unitsPerPack && l.salePerPack) ? (l.salePerPack / l.unitsPerPack) : 0)
        const totalItems = l.totalItems || ((l.unitsPerPack || 1) * (l.packs || 0)) || 0
        return [
          p.date,
          l.name || '-',
          p.supplierName || '-',
          l.unitsPerPack || 1,
          totalItems,
          l.buyPerPack || 0,
          Number(Number(buyPerUnit).toFixed(3)),
          p.totalAmount || (p?.totals?.net || 0),
          l.salePerPack || 0,
          Number(Number(salePerUnit).toFixed(3)),
          p.invoice,
          l.expiry || '-',
        ]
      }
      const rows = items.map(toRow).map(r => r.map(esc).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth()+1).padStart(2,'0')
      const day = String(d.getDate()).padStart(2,'0')
      a.href = url
      a.download = `purchases_${y}-${m}-${day}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      try {
        const headers = [
          'Date','Medicine','Supplier','Units/Pack','Total Items','Buy/Pack','Buy/Unit','Total Amount','Sale/Pack','Sale/Unit','Invoice #','Expiry'
        ]
        const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const rowsNow = rows.map(r => [r.date, r.medicine, r.supplier, r.unitsPerPack, r.totalItems, r.buyPerPack, r.buyPerUnit, r.totalAmount, r.salePerPack, r.salePerUnit, r.invoice, r.expiry].map(esc).join(','))
        const csv = [headers.join(','), ...rowsNow].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const d = new Date()
        const y = d.getFullYear()
        const m = String(d.getMonth()+1).padStart(2,'0')
        const day = String(d.getDate()).padStart(2,'0')
        a.href = url
        a.download = `purchases_page_${page}_${y}-${m}-${day}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch {}
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Purchase History</div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search</label>
            <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="medicine, supplier, invoice" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={()=>{ setPage(1); setSearchTick(t=>t+1) }} className="btn">Apply</button>
            <button type="button" onClick={exportCsv} disabled={exporting} className="btn-outline-navy disabled:opacity-60">{exporting? 'Exporting...' : 'Download'}</button>
            <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Results</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Medicine</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Units/Pack</th>
                <th className="px-4 py-2 font-medium">Total Items</th>
                <th className="px-4 py-2 font-medium">Buy/Pack</th>
                <th className="px-4 py-2 font-medium">Buy/Unit</th>
                <th className="px-4 py-2 font-medium">Total Amount</th>
                <th className="px-4 py-2 font-medium">Sale/Pack</th>
                <th className="px-4 py-2 font-medium">Sale/Unit</th>
                <th className="px-4 py-2 font-medium">Invoice #</th>
                <th className="px-4 py-2 font-medium">Expiry</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">{r.date}</td>
                  <td className="px-4 py-2">{r.medicine}</td>
                  <td className="px-4 py-2">{r.supplier}</td>
                  <td className="px-4 py-2">{r.unitsPerPack}</td>
                  <td className="px-4 py-2">{r.totalItems}</td>
                  <td className="px-4 py-2">{r.buyPerPack}</td>
                  <td className="px-4 py-2">{r.buyPerUnit}</td>
                  <td className="px-4 py-2">Rs {r.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-2">{r.salePerPack}</td>
                  <td className="px-4 py-2">{r.salePerUnit}</td>
                  <td className="px-4 py-2">{r.invoice}</td>
                  <td className="px-4 py-2">{r.expiry}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={()=>openPrint(r)} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Print</button>
                      <button onClick={()=>{ setToDelete(r); setConfirmOpen(true) }} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-500">No results</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div>
            {total > 0 ? (
              <>Showing {Math.min((page-1)*limit + 1, total)}-{Math.min((page-1)*limit + rows.length, total)} of {total}</>
            ) : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      <Pharmacy_PurchaseSlipDialog open={slipOpen} onClose={()=>setSlipOpen(false)} row={selected as any} />
      <Pharmacy_ConfirmDialog
        open={confirmOpen}
        title="Delete Purchase"
        message={toDelete ? `Delete purchase invoice ${toDelete.invoice} for ${toDelete.medicine}?` : 'Delete purchase?'}
        confirmText="Delete"
        onCancel={()=>{ setConfirmOpen(false); setToDelete(null) }}
        onConfirm={async()=>{
          if (!toDelete) { setConfirmOpen(false); return }
          try {
            await pharmacyApi.deletePurchase(toDelete.id)
            setRows(prev => prev.filter(x => x.id !== toDelete.id))
          } catch {}
          setConfirmOpen(false)
          setToDelete(null)
        }}
      />
    </div>
  )
}
