import { useEffect, useState } from 'react'
import { RotateCw, FileDown, CalendarDays, Package, TrendingDown, AlertTriangle } from 'lucide-react'
import Lab_InventoryTable from '../../components/lab/lab_InventoryTable'
import Lab_UpdateStock from '../../components/lab/lab_UpdateStock.tsx'
import Lab_EditItem from '../../components/lab/lab_EditItem.tsx'
import Lab_AddInvoice from '../../components/lab/lab_AddInvoice'
import { labApi } from '../../utils/api'

export default function Lab_Inventory() {
  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false)
  const [updateOpen, setUpdateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editMedicine, setEditMedicine] = useState<string>('')
  const tabs = ['All Items','Pending Review','Low Stock','Expiring Soon','Expired','Out of Stock'] as const
  type Tab = typeof tabs[number]
  const [activeTab, setActiveTab] = useState<Tab>('All Items')
  const [rows, setRows] = useState<any[]>([])
  const [stats, setStats] = useState<{ stockSaleValue: number; lowStockCount: number; outOfStockCount: number; expiringSoonCount: number }>({ stockSaleValue: 0, lowStockCount: 0, outOfStockCount: 0, expiringSoonCount: 0 })
  const [search, setSearch] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteName, setDeleteName] = useState<string>('')

  const exportCsv = () => {
    try {
      const headers = ['Invoice','Item','Category','Packs','Units/Pack','Unit Sale','Sale/Pack','Total Units','Min Stock','Expiry','Supplier']
      const lines = rows.map((r:any)=>[
        r.invoice ?? '-',
        r.item ?? '-',
        r.category ?? '-',
        r.packs ?? '-',
        r.unitsPerPack ?? '-',
        r.unitSale ?? '-',
        r.salePerPack ?? '-',
        r.totalUnits ?? '-',
        r.minStock ?? '-',
        r.expiry ?? '-',
        r.supplier ?? '-',
      ])
      const csv = [headers, ...lines]
        .map(row => row.map(v => {
          const s = String(v)
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s
        }).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lab-inventory-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { console.error(e) }
  }

  const approveOne = async (id: string) => {
    // optimistic remove
    setRows(prev => prev.filter((r: any) => r.draftId !== id))
    try { await labApi.approvePurchaseDraft(id) } catch {}
    setRefreshTick(t=>t+1)
    setActiveTab('All Items')
  }
  const rejectOne = async (id: string) => {
    setRows(prev => prev.filter((r: any) => r.draftId !== id))
    try { await labApi.deletePurchaseDraft(id) } catch {}
    setRefreshTick(t=>t+1)
  }
  const approveAll = () => {
    if (activeTab !== 'Pending Review') return
    const ids = Array.from(new Set((rows as any[]).map(r=>r.draftId).filter(Boolean))) as string[]
    setRows(prev => prev.filter((r: any) => !ids.includes(r.draftId)))
    Promise.all(ids.map(id => labApi.approvePurchaseDraft(id).catch(()=>{}))).finally(()=> { setRefreshTick(t=>t+1); setActiveTab('All Items') })
  }
  const rejectAll = () => {
    if (activeTab !== 'Pending Review') return
    const ids = Array.from(new Set((rows as any[]).map(r=>r.draftId).filter(Boolean))) as string[]
    setRows(prev => prev.filter((r: any) => !ids.includes(r.draftId)))
    Promise.all(ids.map(id => labApi.deletePurchaseDraft(id).catch(()=>{}))).finally(()=> setRefreshTick(t=>t+1))
  }

  useEffect(() => {
    const load = async () => {
      try {
        // summary always
        try {
          const sum: any = await labApi.inventorySummary({ search: search || undefined })
          if (sum?.stats) setStats(sum.stats)
        } catch {}
        // Override Expiring Items count to use LAST expiry (within 30 days)
        try {
          const BIG_LIMIT = 2000
          const resLast: any = await labApi.listInventory({ page: 1, limit: BIG_LIMIT })
          const itemsLast: any[] = resLast?.items ?? resLast ?? []
          const today = new Date(); today.setHours(0,0,0,0)
          const soonDays = 30
          const countLast = (itemsLast || []).reduce((acc:number, it:any)=>{
            const expStr = String(it.lastExpiry || '').slice(0,10)
            if (!expStr) return acc
            const d = new Date(expStr + 'T00:00:00')
            if (isNaN(d.getTime())) return acc
            const days = Math.floor((d.getTime() - today.getTime()) / 86400000)
            return (days >= 0 && days <= soonDays) ? acc + 1 : acc
          }, 0)
          setStats(prev => ({ ...(prev||{ stockSaleValue:0, lowStockCount:0, outOfStockCount:0, expiringSoonCount:0 }), expiringSoonCount: countLast }))
        } catch {}
        if (activeTab === 'Pending Review') {
          const res: any = await labApi.listPurchaseDrafts({ search: search || undefined, limit: 200 })
          const drafts: any[] = res?.items ?? res ?? []
          const mapped = drafts.flatMap((d: any) => (d.lines || []).map((l: any) => ({
            invoice: d.invoice || '-',
            item: l.name || '-',
            category: l.category || '-',
            packs: l.packs ?? '-',
            unitsPerPack: l.unitsPerPack ?? '-',
            unitSale: (l.unitsPerPack && l.salePerPack) ? Number((l.salePerPack / l.unitsPerPack).toFixed(3)) : '-',
            salePerPack: l.salePerPack ?? '-',
            totalUnits: (l.totalItems != null) ? l.totalItems : ((l.unitsPerPack || 1) * (l.packs || 0)),
            minStock: (l.minStock != null) ? l.minStock : '-',
            expiry: l.expiry || '-',
            supplier: d.supplierName || '-',
            draftId: d._id,
          })))
          setRows(mapped)
        } else if (activeTab === 'All Items') {
          const res: any = await labApi.listInventory({ search: search || undefined, page, limit })
          const items: any[] = res?.items ?? res ?? []
          const mapped = (items || []).map((it: any)=>{
            const onHand = Number(it.onHand ?? 0)
            const minStock = (it.minStock != null) ? Number(it.minStock) : null
            const expStr = String(it.lastExpiry || '').slice(0,10)
            const expDate = expStr ? new Date(expStr + 'T00:00:00') : null
            const expValid = !!(expDate && !isNaN(expDate.getTime()))
            const now = Date.now()
            const soonMs = 30 * 86400000
            let status: 'low'|'out'|'expiring'|'expired'|undefined
            if (onHand <= 0) status = 'out'
            else if (expValid && (expDate as Date).getTime() < now) status = 'expired'
            else if (minStock != null && onHand < Number(minStock)) status = 'low'
            else if (expValid && (expDate as Date).getTime() - now <= soonMs) status = 'expiring'

            return {
              invoice: it.lastInvoice || '-',
              item: it.name || '-',
              category: it.category || '-',
              packs: (it.unitsPerPack && it.unitsPerPack>0) ? Math.floor((it.onHand||0) / it.unitsPerPack) : '-',
              unitsPerPack: it.unitsPerPack ?? '-',
              unitSale: (it.lastSalePerUnit != null) ? Number((it.lastSalePerUnit).toFixed(3)) : '-',
              salePerPack: (it.lastSalePerPack != null)
                ? Number((it.lastSalePerPack).toFixed?.(2) ?? it.lastSalePerPack)
                : ((it.unitsPerPack && it.lastSalePerUnit != null)
                    ? Number((it.lastSalePerUnit * it.unitsPerPack).toFixed(2))
                    : '-'),
              totalUnits: it.onHand ?? 0,
              minStock: (it.minStock != null) ? it.minStock : '-',
              expiry: (String(it.lastExpiry || it.earliestExpiry || '').slice(0,10)) || '-',
              supplier: it.lastSupplier || '-',
              status,
            }
          })
          setRows(mapped)
          setTotal(Number(res.total || mapped.length || 0))
          setTotalPages(Number(res.totalPages || 1))
        } else {
          // Derived tabs: Low Stock, Expiring Soon, Out of Stock
          const BIG_LIMIT = 2000
          const res: any = await labApi.listInventory({ search: search || undefined, page: 1, limit: BIG_LIMIT })
          const items: any[] = res?.items ?? res ?? []
          const filtered = (items || []).filter((it: any) => {
            const onHand = Number(it.onHand ?? 0)
            const minStock = (it.minStock != null) ? Number(it.minStock) : null
            const expStr = String(it.lastExpiry || '').slice(0,10)
            const expDate = expStr ? new Date(expStr + 'T00:00:00') : null
            const expValid = !!(expDate && !isNaN(expDate.getTime()))
            if (activeTab === 'Low Stock') {
              return onHand > 0 && minStock != null && onHand < Number(minStock)
            }
            if (activeTab === 'Out of Stock') {
              return onHand <= 0
            }
            if (activeTab === 'Expiring Soon') {
              if (!expValid) return false
              const today = new Date(); today.setHours(0,0,0,0)
              const days = Math.floor(((expDate as Date).getTime() - today.getTime()) / 86400000)
              return days >= 0 && days <= 30
            }
            if (activeTab === 'Expired') {
              if (!expValid) return false
              const today = new Date(); today.setHours(0,0,0,0)
              return (expDate as Date).getTime() < today.getTime()
            }
            return false
          })
          const mapped = filtered.map((it: any)=>{
            let status: 'low'|'out'|'expiring'|'expired'|undefined
            if (activeTab === 'Low Stock') status = 'low'
            if (activeTab === 'Out of Stock') status = 'out'
            if (activeTab === 'Expiring Soon') status = 'expiring'
            if (activeTab === 'Expired') status = 'expired'
            return {
              invoice: it.lastInvoice || '-',
              item: it.name || '-',
              category: it.category || '-',
              packs: (it.unitsPerPack && it.unitsPerPack>0) ? Math.floor((it.onHand||0) / it.unitsPerPack) : '-',
              unitsPerPack: it.unitsPerPack ?? '-',
              unitSale: (it.lastSalePerUnit != null) ? Number((it.lastSalePerUnit).toFixed(3)) : '-',
              salePerPack: (it.lastSalePerPack != null)
                ? Number((it.lastSalePerPack).toFixed?.(2) ?? it.lastSalePerPack)
                : ((it.unitsPerPack && it.lastSalePerUnit != null)
                    ? Number((it.lastSalePerUnit * it.unitsPerPack).toFixed(2))
                    : '-'),
              totalUnits: it.onHand ?? 0,
              minStock: (it.minStock != null) ? it.minStock : '-',
              expiry: (String(it.lastExpiry || it.earliestExpiry || '').slice(0,10)) || '-',
              supplier: it.lastSupplier || '-',
              status,
            }
          })
          setRows(mapped)
        }
      } catch {
        setRows([])
      }
    }
    load()
  }, [activeTab, search, page, limit, refreshTick])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M5 6.75A2.75 2.75 0 0 1 7.75 4h8.5A2.75 2.75 0 0 1 19 6.75V9h-1.5V6.75c0-.69-.56-1.25-1.25-1.25h-8.5c-.69 0-1.25.56-1.25 1.25V9H5V6.75Z"/><path d="M4.25 9.75A2.75 2.75 0 0 1 7 7h10a2.75 2.75 0 0 1 2.75 2.75v7.5A2.75 2.75 0 0 1 17 20H7a2.75 2.75 0 0 1-2.75-2.75v-7.5Z"/></svg>
        <h2 className="text-xl font-bold">Inventory Management</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="text-2xl font-extrabold text-slate-900">Inventory Control</div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setUpdateOpen(true)} className="btn"><RotateCw className="h-4 w-4" /> Update Stock</button>
            <button onClick={() => setAddInvoiceOpen(true)} className="btn"><CalendarDays className="h-4 w-4" /> Add Invoice</button>
            <button onClick={()=>setRefreshTick(t=>t+1)} className="btn-outline-navy"><RotateCw className="h-4 w-4" /> Refresh</button>
            <button onClick={exportCsv} className="btn-outline-navy"><FileDown className="h-4 w-4" /> Export CSV</button>
          </div>
        </div>

        <div className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="card p-4 border-emerald-200 bg-emerald-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Stock Value</div>
                <div className="mt-1 text-lg font-semibold text-emerald-700">{stats.stockSaleValue?.toFixed ? stats.stockSaleValue.toFixed(2) : '0.00'}</div>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><Package className="h-5 w-5" /></div>
            </div>
          </div>
          <div className="card p-4 border-yellow-200 bg-yellow-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Low Stock Items</div>
                <div className="mt-1 text-lg font-semibold text-yellow-700">{stats.lowStockCount ?? 0}</div>
              </div>
              <div className="rounded-lg bg-yellow-100 p-2 text-yellow-700"><TrendingDown className="h-5 w-5" /></div>
            </div>
          </div>
          <div className="card p-4 border-orange-200 bg-orange-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Expiring Soon</div>
                <div className="mt-1 text-lg font-semibold text-orange-600">{stats.expiringSoonCount ?? 0}</div>
              </div>
              <div className="rounded-lg bg-orange-100 p-2 text-orange-600"><CalendarDays className="h-5 w-5" /></div>
            </div>
          </div>
          <div className="card p-4 border-rose-200 bg-rose-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Out of Stock</div>
                <div className="mt-1 text-lg font-semibold text-rose-700">{stats.outOfStockCount ?? 0}</div>
              </div>
              <div className="rounded-lg bg-rose-100 p-2 text-rose-700"><AlertTriangle className="h-5 w-5" /></div>
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[240px]">
            <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search (name, category, invoice #)" />
          </div>
          <button onClick={()=>{ setPage(1); setRefreshTick(t=>t+1) }} className="btn-outline-navy">Apply</button>
          <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {tabs.map(tag => (
            <button
              key={tag}
              onClick={()=>setActiveTab(tag)}
              className={`rounded-md border px-3 py-1.5 ${activeTab===tag? 'border-navy-600 bg-navy-50 text-navy-700' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
            >{tag}</button>
          ))}
        </div>

        <Lab_InventoryTable
          rows={rows}
          pending={activeTab==='Pending Review'}
          onApprove={approveOne}
          onReject={rejectOne}
          onApproveAll={approveAll}
          onRejectAll={rejectAll}
          onEdit={(row) => { setEditMedicine((row as any)?.item || ''); setEditOpen(true) }}
          onDelete={async (row) => {
            const name = String((row as any)?.item || '').trim()
            if (!name) return
            setDeleteName(name.toLowerCase())
            setDeleteOpen(true)
          }}
        />
        {activeTab==='All Items' && (
          <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
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
        )}
      </div>

      <Lab_AddInvoice open={addInvoiceOpen} onClose={() => setAddInvoiceOpen(false)} />
      <Lab_UpdateStock open={updateOpen} onClose={() => { setUpdateOpen(false); setActiveTab('Pending Review'); setRefreshTick(t=>t+1) }} />
      <Lab_EditItem open={editOpen} onClose={() => { setEditOpen(false); setRefreshTick(t=>t+1) }} medicine={editMedicine} />

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Delete</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete inventory item {deleteName}?</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={()=>{ setDeleteOpen(false); setDeleteName('') }} className="btn-outline-navy">Cancel</button>
              <button onClick={async()=>{ try { await labApi.deleteInventoryItem(deleteName); setRefreshTick(t=>t+1) } finally { setDeleteOpen(false); setDeleteName('') } }} className="btn bg-rose-600 hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
