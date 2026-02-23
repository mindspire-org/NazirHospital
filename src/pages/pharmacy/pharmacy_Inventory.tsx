import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RotateCw, FileDown, CalendarDays, Package, TrendingDown, AlertTriangle } from 'lucide-react'
import Pharmacy_InventoryTable from '../../components/pharmacy/pharmacy_InventoryTable'
import Pharmacy_UpdateStock from '../../components/pharmacy/pharmacy_UpdateStock'
import { pharmacyApi } from '../../utils/api'
import Pharmacy_EditInventoryItem from '../../components/pharmacy/pharmacy_EditInventoryItem'
import Pharmacy_ConfirmDialog from '../../components/pharmacy/pharmacy_ConfirmDialog'

export default function Pharmacy_Inventory() {
  const navigate = useNavigate()
  const location = useLocation()
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
  const [pageCache, setPageCache] = useState<Record<number, any[]>>({})
  
  // Load dashboard summary (counts) sparingly; avoid re-fetching on pagination changes
  useEffect(() => {
    let mounted = true
    // Instant cached stats for perceived speed (only if fresh < 60s)
    try {
      const cached = JSON.parse(localStorage.getItem('pharmacy.inventory.summary') || 'null')
      if (cached?.stats && cached?.at && (Date.now() - Number(cached.at) < 60_000) && mounted) setStats(cached.stats)
    } catch {}
    ;(async ()=>{
      try {
        const sum: any = await pharmacyApi.inventorySummaryCached(undefined, { ttlMs: 120_000, forceRefresh: refreshTick>0 })
        if (mounted && sum?.stats){
          setStats(sum.stats)
          try { localStorage.setItem('pharmacy.inventory.summary', JSON.stringify({ stats: sum.stats, at: Date.now() })) } catch {}
        }
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [refreshTick])

  // Reset page cache when filters change (but not on page changes)
  useEffect(()=>{ setPageCache({}) }, [activeTab, search, limit, refreshTick])

  const approveOne = async (id: string) => {
    // optimistic remove
    setRows(prev => prev.filter((r: any) => r.draftId !== id))
    pharmacyApi.approvePurchaseDraft(id).finally(()=> { setRefreshTick(t=>t+1) })
  }
  const rejectOne = async (id: string) => {
    setRows(prev => prev.filter((r: any) => r.draftId !== id))
    pharmacyApi.deletePurchaseDraft(id).finally(()=> setRefreshTick(t=>t+1))
  }
  const approveAll = async () => {
    if (activeTab !== 'Pending Review') return
    const ids = Array.from(new Set((rows as any[]).map(r=>r.draftId).filter(Boolean))) as string[]
    // optimistic remove
    setRows(prev => prev.filter((r: any) => !ids.includes(r.draftId)))
    Promise.all(ids.map(id => pharmacyApi.approvePurchaseDraft(id).catch(()=>{}))).finally(()=> { setRefreshTick(t=>t+1) })
  }
  const rejectAll = async () => {
    if (activeTab !== 'Pending Review') return
    const ids = Array.from(new Set((rows as any[]).map(r=>r.draftId).filter(Boolean))) as string[]
    setRows(prev => prev.filter((r: any) => !ids.includes(r.draftId)))
    Promise.all(ids.map(id => pharmacyApi.deletePurchaseDraft(id).catch(()=>{}))).finally(()=> setRefreshTick(t=>t+1))
  }

  // Sync tab with URL (?tab=all|pending|low|expiring|out)
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const tab = (sp.get('tab') || '').toLowerCase()
    const map: Record<string, Tab> = {
      all: 'All Items',
      pending: 'Pending Review',
      low: 'Low Stock',
      expiring: 'Expiring Soon',
      out: 'Out of Stock',
    }
    const next = map[tab]
    if (next && next !== activeTab) setActiveTab(next)
    if (!tab) {
      // don't force update; keep current state
    }
  }, [location.search])

  const setTabAndUrl = (t: Tab) => {
    setActiveTab(t)
    setPage(1)
    const sp = new URLSearchParams(location.search)
    const rev: Record<Tab, string> = {
      'All Items': 'all',
      'Pending Review': 'pending',
      'Low Stock': 'low',
      'Expiring Soon': 'expiring',
      'Out of Stock': 'out',
    }
    sp.set('tab', rev[t])
    navigate({ pathname: '/pharmacy/inventory', search: `?${sp.toString()}` }, { replace: true })
  }

  useEffect(() => {
    const load = async () => {
      try {
        // dashboard summary is loaded in a separate effect to avoid blocking pagination
        // settings (for printing header)
        try {
          const s: any = await pharmacyApi.getSettings()
          setSettings(s)
        } catch {}
        if (activeTab === 'Pending Review') {
          const res: any = await pharmacyApi.listPurchaseDraftLines({ search: search || undefined, page, limit })
          const items: any[] = res?.items ?? res ?? []
          const tp = Number(res?.totalPages || 1)
          if (!isNaN(tp)) setTotalPages(tp)
          const mapped = (items || []).map((it: any) => ({
            invoice: it.invoice || '-',
            medicine: it.name || '-',
            generic: it.genericName || '-',
            category: it.category || '-',
            packs: it.packs ?? '-',
            unitsPerPack: it.unitsPerPack ?? '-',
            unitSale: (it.unitsPerPack && it.salePerPack) ? Number((it.salePerPack / it.unitsPerPack).toFixed(3)) : '-',
            totalItems: (it.totalItems != null) ? it.totalItems : ((it.unitsPerPack || 1) * (it.packs || 0)),
            minStock: (it.minStock != null) ? it.minStock : '-',
            expiry: it.expiry || '-',
            supplier: it.supplierName || '-',
            draftId: it.draftId,
          }))
          setRows(mapped)
        } else if (activeTab === 'All Items') {
          // Serve cached page immediately (stale-while-revalidate)
          if (pageCache[page]) setRows(pageCache[page])
          const res: any = await pharmacyApi.listInventoryCached({ search: search || undefined, page, limit }, { ttlMs: 60_000, forceRefresh: refreshTick>0 })
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
          setPageCache(prev => ({ ...prev, [page]: mapped }))
          // Prefetch next page to speed up pagination
          const nextPage = page + 1
          if (nextPage <= (tp || 1) && !pageCache[nextPage]){
            pharmacyApi.listInventoryCached({ search: search || undefined, page: nextPage, limit }, { ttlMs: 60_000 })
              .then((r:any)=>{
                const itms: any[] = r?.items ?? r ?? []
                const m = (itms || []).map((it: any)=>({
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
                setPageCache(prev => ({ ...prev, [nextPage]: m }))
              })
              .catch(()=>{})
          }
        } else {
          // Derived tabs: Low Stock, Expiring Soon, Out of Stock — server-side filtered + paginated
          const status = activeTab === 'Low Stock' ? 'low' : (activeTab === 'Out of Stock' ? 'out' : 'expiring')
          const res: any = await pharmacyApi.listInventoryFilteredCached({ status: status as any, search: search || undefined, page, limit }, { ttlMs: 60_000, forceRefresh: refreshTick>0 })
          // Exclude items that are out of stock from Expiring Soon view
          const itemsRaw: any[] = res?.items ?? res ?? []
          const items: any[] = status==='expiring' ? itemsRaw.filter((it:any)=> Number(it.onHand||0) > 0) : itemsRaw
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
            expiry: (status === 'expiring' ? String(it.earliestExpiry || '').slice(0,10) : String(it.lastExpiry || it.earliestExpiry || '').slice(0,10)) || '-',
            supplier: it.lastSupplier || '-',
          }))
          setRows(mapped)
          // Keep the top widgets consistent when switching tabs (use total from server, not page length)
          const total = Number(res?.total || 0)
          if (activeTab === 'Expiring Soon') setStats(prev => ({ ...(prev||{ stockSaleValue:0, lowStockCount:0, outOfStockCount:0, expiringSoonCount:0 }), expiringSoonCount: total }))
          if (activeTab === 'Low Stock') setStats(prev => ({ ...(prev||{ stockSaleValue:0, lowStockCount:0, outOfStockCount:0, expiringSoonCount:0 }), lowStockCount: total }))
          if (activeTab === 'Out of Stock') setStats(prev => ({ ...(prev||{ stockSaleValue:0, lowStockCount:0, outOfStockCount:0, expiringSoonCount:0 }), outOfStockCount: total }))
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
    a.download = `pharmacy_inventory_${new Date().toISOString().slice(0,10)}.csv`
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
            <button onClick={() => navigate('/pharmacy/inventory/add-invoice')} className="btn"><CalendarDays className="h-4 w-4" /> Add Invoice</button>
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
              onClick={()=>setTabAndUrl(tag)}
              className={`rounded-md border px-3 py-1.5 ${activeTab===tag? 'border-navy-600 bg-navy-50 text-navy-700' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
            >{tag}</button>
          ))}
        </div>

        <Pharmacy_InventoryTable
          rows={rows}
          pending={activeTab==='Pending Review'}
          onApprove={approveOne}
          onReject={rejectOne}
          onApproveAll={approveAll}
          onRejectAll={rejectAll}
          onEdit={(medicine)=>{ setEditMedicine(medicine); setEditOpen(true) }}
          onEditDraft={(id)=> {
            const fromPending = activeTab==='Pending Review'
            const search = fromPending ? '?from=pending' : ''
            navigate(`/pharmacy/inventory/edit-invoice/${encodeURIComponent(id)}${search}`)
          }}
          // Pagination controls for Pending Review and Derived tabs (Low/Expiring/Out). All Items has its own footer below.
          page={activeTab!=='All Items' ? page : undefined}
          totalPages={activeTab!=='All Items' ? totalPages : undefined}
          limit={activeTab!=='All Items' ? limit : undefined}
          onChangeLimit={activeTab!=='All Items' ? (n)=>{ setLimit(n); setPage(1) } : undefined}
          onPrev={activeTab!=='All Items' ? ()=> setPage(p=> Math.max(1, p-1)) : undefined}
          onNext={activeTab!=='All Items' ? ()=> setPage(p=> Math.min(totalPages, p+1)) : undefined}
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

      <Pharmacy_UpdateStock open={updateStockOpen} onClose={() => setUpdateStockOpen(false)} />
      <Pharmacy_EditInventoryItem open={editOpen} onClose={()=>{ setEditOpen(false); setRefreshTick(t=>t+1) }} medicine={editMedicine} />
      <Pharmacy_ConfirmDialog
        open={confirmOpen}
        title="Delete Inventory Item"
        message={toDelete ? `Are you sure you want to delete ${toDelete}? This will remove it from inventory.` : 'Are you sure?'}
        confirmText="Delete"
        onCancel={()=>{ setConfirmOpen(false); setToDelete(null) }}
        onConfirm={async()=>{
          const key = (toDelete||'').trim().toLowerCase()
          if (!key) { setConfirmOpen(false); return }
          try {
            await pharmacyApi.deleteInventoryItem(key)
            setRefreshTick(t=>t+1)
          } catch {}
          setConfirmOpen(false)
          setToDelete(null)
        }}
      />
    </div>
  )
}
