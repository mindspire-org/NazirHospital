import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCw, FileDown, CalendarDays, Package, TrendingDown, AlertTriangle } from 'lucide-react'
import Aesthetic_InventoryTable from '../../components/aesthetic/aesthetic_InventoryTable'
import Aesthetic_UpdateStock from '../../components/aesthetic/aesthetic_UpdateStock'
import { aestheticApi } from '../../utils/api'
import Aesthetic_EditInventoryItem from '../../components/aesthetic/aesthetic_EditInventoryItem'
import Aesthetic_ConfirmDialog from '../../components/aesthetic/aesthetic_ConfirmDialog'

export default function Pharmacy_Inventory() {
  const navigate = useNavigate()
  const [updateStockOpen, setUpdateStockOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editMedicine, setEditMedicine] = useState<string>('')
  const tabs = ['All Items','Pending Review','Low Stock','Expiring Soon','Out of Stock'] as const
  type Tab = typeof tabs[number]
  const [activeTab, setActiveTab] = useState<Tab>('All Items')
  const [rows, setRows] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<string | null>(null)
  const [stats, setStats] = useState<{ stockSaleValue: number; lowStockCount: number; outOfStockCount: number; expiringSoonCount: number }>({ stockSaleValue: 0, lowStockCount: 0, outOfStockCount: 0, expiringSoonCount: 0 })
  const [settings, setSettings] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit, setLimit] = useState(10)
  
  const approveOne = async (id: string) => {
    // optimistic remove
    setRows(prev => prev.filter((r: any) => r.draftId !== id))
    aestheticApi.approvePurchaseDraft(id).finally(()=> { setRefreshTick(t=>t+1); setActiveTab('All Items') })
  }
  const rejectOne = async (id: string) => {
    setRows(prev => prev.filter((r: any) => r.draftId !== id))
    aestheticApi.deletePurchaseDraft(id).finally(()=> setRefreshTick(t=>t+1))
  }
  const approveAll = async () => {
    if (activeTab !== 'Pending Review') return
    const ids = Array.from(new Set((rows as any[]).map(r=>r.draftId).filter(Boolean))) as string[]
    // optimistic remove
    setRows(prev => prev.filter((r: any) => !ids.includes(r.draftId)))
    Promise.all(ids.map(id => aestheticApi.approvePurchaseDraft(id).catch(()=>{}))).finally(()=> { setRefreshTick(t=>t+1); setActiveTab('All Items') })
  }
  const rejectAll = async () => {
    if (activeTab !== 'Pending Review') return
    const ids = Array.from(new Set((rows as any[]).map(r=>r.draftId).filter(Boolean))) as string[]
    setRows(prev => prev.filter((r: any) => !ids.includes(r.draftId)))
    Promise.all(ids.map(id => aestheticApi.deletePurchaseDraft(id).catch(()=>{}))).finally(()=> setRefreshTick(t=>t+1))
  }

  useEffect(() => {
    const load = async () => {
      try {
        // fetch dashboard summary regardless of tab
        try {
          const sum: any = await aestheticApi.inventorySummary({})
          if (sum?.stats) setStats(sum.stats)
        } catch {}
        // Override Expiring Items count to use LAST expiry (within 30 days)
        try {
          const BIG_LIMIT = 2000
          const resLast: any = await aestheticApi.listInventory({ page: 1, limit: BIG_LIMIT })
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
        // settings (for printing header)
        try {
          const s: any = await aestheticApi.getSettings()
          setSettings(s)
        } catch {}
        if (activeTab === 'Pending Review') {
          const res: any = await aestheticApi.listPurchaseDrafts({ search: search || undefined, limit: 200 })
          const drafts: any[] = res?.items ?? res ?? []
          const mapped = drafts.flatMap((d: any) => (d.lines || []).map((l: any) => ({
            invoice: d.invoice || '-',
            medicine: l.name || '-',
            generic: l.genericName || '-',
            category: l.category || '-',
            packs: l.packs ?? '-',
            unitsPerPack: l.unitsPerPack ?? '-',
            unitSale: (l.unitsPerPack && l.salePerPack) ? Number((l.salePerPack / l.unitsPerPack).toFixed(3)) : '-',
            totalItems: (l.totalItems != null) ? l.totalItems : ((l.unitsPerPack || 1) * (l.packs || 0)),
            minStock: (l.minStock != null) ? l.minStock : '-',
            expiry: l.expiry || '-',
            supplier: d.supplierName || '-',
            draftId: d._id,
          })))
          setRows(mapped)
        } else if (activeTab === 'All Items') {
          const res: any = await aestheticApi.listInventory({ search: search || undefined, page, limit })
          const items: any[] = res?.items ?? res ?? []
          const tp = Number(res?.totalPages || 1)
          if (!isNaN(tp)) setTotalPages(tp)
          const mapped = (items || []).map((it: any)=>({
            invoice: it.lastInvoice || '-',
            medicine: it.name || '-',
            generic: it.genericName || it.lastGenericName || '-',
            category: it.category || '-',
            packs: (it.unitsPerPack && it.unitsPerPack>0) ? Math.floor((it.onHand||0) / it.unitsPerPack) : '-',
            unitsPerPack: it.unitsPerPack ?? '-',
            unitSale: (it.lastSalePerUnit != null) ? Number((it.lastSalePerUnit).toFixed(3)) : '-',
            totalItems: it.onHand ?? 0,
            minStock: (it.minStock != null) ? it.minStock : '-',
            expiry: (String(it.lastExpiry || it.earliestExpiry || '').slice(0,10)) || '-',
            supplier: it.lastSupplier || '-',
          }))
          setRows(mapped)
        } else {
          // Derived tabs: Low Stock, Expiring Soon, Out of Stock
          const BIG_LIMIT = 2000
          const res: any = await aestheticApi.listInventory({ search: search || undefined, page: 1, limit: BIG_LIMIT })
          const items: any[] = res?.items ?? res ?? []
          // Compare by whole days to avoid timezone/time-of-day edge cases
          const today = new Date(); today.setHours(0,0,0,0)
          const soonDays = 30
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
              const days = Math.floor(((expDate as Date).getTime() - today.getTime()) / 86400000)
              return days >= 0 && days <= soonDays
            }
            return false
          })
          const mapped = filtered.map((it: any)=>({
            invoice: it.lastInvoice || '-',
            medicine: it.name || '-',
            generic: it.genericName || it.lastGenericName || '-',
            category: it.category || '-',
            packs: (it.unitsPerPack && it.unitsPerPack>0) ? Math.floor((it.onHand||0) / it.unitsPerPack) : '-',
            unitsPerPack: it.unitsPerPack ?? '-',
            unitSale: (it.lastSalePerUnit != null) ? Number((it.lastSalePerUnit).toFixed(3)) : '-',
            totalItems: it.onHand ?? 0,
            minStock: (it.minStock != null) ? it.minStock : '-',
            expiry: (String(it.lastExpiry || it.earliestExpiry || '').slice(0,10)) || '-',
            supplier: it.lastSupplier || '-',
          }))
          setRows(mapped)
        }
      } catch {
        setRows([])
      }
    }
    load()
  }, [activeTab, search, refreshTick, page, limit])

  function handleExport(){
    const csvRows: string[] = []
    const headers = ['Invoice #','Medicine','Category','Packs','Units/Pack','Unit Sale','Total Items','Min Stock','Expiry','Supplier']
    csvRows.push(headers.join(','))
    rows.forEach((r: any)=>{
      const vals = [r.invoice, r.medicine, r.category, r.packs, r.unitsPerPack, r.unitSale, r.totalItems, r.minStock, r.expiry, r.supplier]
      csvRows.push(vals.map(v => typeof v === 'string' ? '"'+v.replace(/"/g,'""')+'"' : String(v)).join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aesthetic_inventory_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handlePrint(){
    const cols = ['Invoice #','Medicine','Generic','Category','Packs','Units/Pack','Unit Sale','Total Items','Min Stock','Expiry','Supplier']
    const htmlRows = rows.map((r: any)=>{
      const cells = [r.invoice, r.medicine, r.generic||'-', r.category, r.packs, r.unitsPerPack, r.unitSale, r.totalItems, r.minStock, r.expiry, r.supplier]
        .map((v: any)=> `<td style="padding:6px 8px;border:1px solid #cbd5e1;">${(v??'').toString()}</td>`)
        .join('')
      return `<tr>${cells}</tr>`
    }).join('')
    const head = `
      <div style="text-align:center;margin-bottom:8px;">
        ${settings?.logoDataUrl ? `<img src='${settings.logoDataUrl}' style='height:48px;object-fit:contain;margin-bottom:6px;'/>` : ''}
        <div style="font-size:18px;font-weight:800;letter-spacing:.5px;">${(settings?.pharmacyName||'Pharmacy').toUpperCase()}</div>
        ${settings?.address ? `<div style='font-size:12px;color:#475569;'>${settings.address}</div>`:''}
        ${(settings?.phone||settings?.email)? `<div style='font-size:12px;color:#475569;'>${settings?.phone? 'PHONE: '+settings.phone : ''} ${settings?.email? ' EMAIL: '+settings.email : ''}</div>`:''}
        <div style="margin-top:6px;font-size:16px;font-weight:600;">Inventory Printout</div>
        <div style="font-size:12px;color:#475569;">${new Date().toLocaleString()}</div>
      </div>
    `
    const table = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr>${cols.map(c=>`<th style='text-align:left;padding:6px 8px;border:1px solid #cbd5e1;background:#f1f5f9;'>${c}</th>`).join('')}</tr>
        </thead>
        <tbody>${htmlRows || `<tr><td colspan='${cols.length}' style='text-align:center;padding:16px;border:1px solid #cbd5e1;color:#64748b;'>No data</td></tr>`}</tbody>
      </table>
      ${settings?.billingFooter ? `<div style='text-align:center;margin-top:12px;font-size:12px;color:#334155;'>${settings.billingFooter}</div>`:''}
    `
    const html = `<!doctype html><html><head><title>Inventory Printout</title><meta charset='utf-8'/></head><body style='font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji";color:#0f172a;padding:16px;'>${head}${table}</body></html>`

    // Use a hidden iframe to avoid popup blockers and blank windows
    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    document.body.appendChild(frame)
    const doc = frame.contentWindow?.document || frame.contentDocument
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
    frame.onload = () => {
      try { frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch {}
      setTimeout(()=>{ document.body.removeChild(frame) }, 100)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M5 6.75A2.75 2.75 0 0 1 7.75 4h8.5A2.75 2.75 0 0 1 19 6.75V9h-1.5V6.75c0-.69-.56-1.25-1.25-1.25h-8.5c-.69 0-1.25.56-1.25 1.25V9H5V6.75Z"/><path d="M4.25 9.75A2.75 2.75 0 0 1 7 7h10a2.75 2.75 0 0 1 2.75 2.75v7.5A2.75 2.75 0 0 1 17 20H7a2.75 2.75 0 0 1-2.75-2.75v-7.5Z"/></svg>
        <h2 className="text-xl font-bold">Inventory</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="text-2xl font-extrabold text-slate-900">Inventory Control</div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setUpdateStockOpen(true)} className="btn"><RotateCw className="h-4 w-4" /> Update Stock</button>
            <button onClick={() => navigate('/aesthetic/inventory/add-invoice')} className="btn"><CalendarDays className="h-4 w-4" /> Add Invoice</button>
            <button onClick={()=>setRefreshTick(t=>t+1)} className="btn-outline-navy"><RotateCw className="h-4 w-4" /> Refresh</button>
            <button onClick={handleExport} className="btn-outline-navy"><FileDown className="h-4 w-4" /> Export</button>
          </div>
        </div>

        <div className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="card p-4 border-emerald-200 bg-emerald-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Stock Value</div>
                <div className="mt-1 text-lg font-semibold text-emerald-700">{stats.stockSaleValue?.toFixed ? stats.stockSaleValue.toFixed(2) : '0.00'}</div>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="card p-4 border-yellow-200 bg-yellow-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Low Stock Items</div>
                <div className="mt-1 text-lg font-semibold text-yellow-700">{stats.lowStockCount ?? 0}</div>
              </div>
              <div className="rounded-lg bg-yellow-100 p-2 text-yellow-700">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="card p-4 border-orange-200 bg-orange-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Expiring Items</div>
                <div className="mt-1 text-lg font-semibold text-orange-600">{stats.expiringSoonCount ?? 0}</div>
              </div>
              <div className="rounded-lg bg-orange-100 p-2 text-orange-600">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="card p-4 border-rose-200 bg-rose-50/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-600">Out of Stock Items</div>
                <div className="mt-1 text-lg font-semibold text-rose-700">{stats.outOfStockCount ?? 0}</div>
              </div>
              <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[240px]">
            <input id="pharmacy-inventory-search" value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search medicines or scan barcode..." />
          </div>
          <button onClick={handlePrint} className="btn-outline-navy">Print</button>
          <button className="btn-outline-navy">Filter</button>
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

        <Aesthetic_InventoryTable
          rows={rows}
          pending={activeTab==='Pending Review'}
          onApprove={approveOne}
          onReject={rejectOne}
          onApproveAll={approveAll}
          onRejectAll={rejectAll}
          onEdit={(medicine)=>{ setEditMedicine(medicine); setEditOpen(true) }}
          onDelete={async(medicine)=>{
            const m = (medicine||'').trim()
            if (!m) return
            setToDelete(m)
            setConfirmOpen(true)
          }}
        />
        {activeTab === 'All Items' && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-sm">
            <div className="text-slate-600">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-50">Prev</button>
              <button onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      <Aesthetic_UpdateStock open={updateStockOpen} onClose={() => setUpdateStockOpen(false)} />
      <Aesthetic_EditInventoryItem open={editOpen} onClose={()=>{ setEditOpen(false); setRefreshTick(t=>t+1) }} medicine={editMedicine} />
      <Aesthetic_ConfirmDialog
        open={confirmOpen}
        title="Delete Inventory Item"
        message={toDelete ? `Are you sure you want to delete ${toDelete}? This will remove it from inventory.` : 'Are you sure?'}
        confirmText="Delete"
        onCancel={()=>{ setConfirmOpen(false); setToDelete(null) }}
        onConfirm={async()=>{
          const key = (toDelete||'').trim().toLowerCase()
          if (!key) { setConfirmOpen(false); return }
          try {
            await aestheticApi.deleteInventoryItem(key)
            setRefreshTick(t=>t+1)
          } catch {}
          setConfirmOpen(false)
          setToDelete(null)
        }}
      />
    </div>
  )
}
