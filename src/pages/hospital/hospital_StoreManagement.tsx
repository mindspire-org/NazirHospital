import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import { Package, ArrowDownToLine, ArrowUpFromLine, BarChart3, Warehouse, Sparkles, Search } from 'lucide-react'

type StoreItem = { id: string; code?: string; name: string; reorderLevel?: number; minStock?: number; maxStock?: number; active?: boolean }

type StoreLocation = { id: string; name: string }

type StoreCategory = { id: string; name: string }

type StoreUnit = { id: string; name: string; abbr?: string }

type DepartmentLite = { id: string; name: string }

function todayIso(){
  try { return new Date().toISOString().slice(0,10) } catch { return '' }
}

function TabPill({ active, label, icon: Icon, hint, onClick }: { active: boolean; label: string; icon: any; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-black/5'
          : 'group inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 ring-1 ring-white/15 hover:bg-white/15'
      }
      title={hint}
    >
      <Icon className={active ? 'h-4 w-4 text-sky-700' : 'h-4 w-4 text-white/90'} />
      <span>{label}</span>
      <span className={active ? 'ml-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700' : 'ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80'}>
        {hint}
      </span>
    </button>
  )
}

function Card({ title, subtitle, children, right }: { title: string; subtitle?: string; children: any; right?: any }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <Sparkles className="h-5 w-5 text-sky-700" />
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 max-w-md text-sm text-slate-600">{desc}</div>
    </div>
  )
}

export default function Hospital_StoreManagement(){
  const [tab, setTab] = useState<'items'|'receive'|'issue'|'stock'|'reports'>(()=> 'items')

  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [units, setUnits] = useState<StoreUnit[]>([])
  const [locations, setLocations] = useState<StoreLocation[]>([])
  const [departments, setDepartments] = useState<DepartmentLite[]>([])

  const [items, setItems] = useState<StoreItem[]>([])
  const [itemQuery, setItemQuery] = useState('')

  const [newCategory, setNewCategory] = useState('')
  const [newUnit, setNewUnit] = useState({ name: '', abbr: '' })
  const [newLocation, setNewLocation] = useState('')

  const [newItem, setNewItem] = useState({ code: '', name: '', categoryId: '', unitId: '', reorderLevel: '', minStock: '', maxStock: '' })

  const [receiveForm, setReceiveForm] = useState({
    date: todayIso(),
    locationId: '',
    referenceNo: '',
    notes: '',
    lines: [{ itemId: '', qty: '', unitCost: '', lotNo: '', expiryDate: '' }],
  })

  const [issueForm, setIssueForm] = useState({
    date: todayIso(),
    locationId: '',
    departmentId: '',
    encounterId: '',
    referenceNo: '',
    notes: '',
    lines: [{ itemId: '', qty: '' }],
  })

  const [stockLocationId, setStockLocationId] = useState('')
  const [stockRows, setStockRows] = useState<Array<{ itemId: string; locationId: string; qtyOnHand: number; worth: number }>>([])

  const [worthLocationId, setWorthLocationId] = useState('')
  const [worthRes, setWorthRes] = useState<{ totalWorth: number; items: Array<{ itemId: string; locationId: string; qtyOnHand: number; worth: number }> } | null>(null)

  const [expiringTo, setExpiringTo] = useState(()=>{
    try {
      const dt = new Date(); dt.setDate(dt.getDate() + 30)
      return dt.toISOString().slice(0,10)
    } catch { return '' }
  })
  const [expiringLocationId, setExpiringLocationId] = useState('')
  const [expiringLots, setExpiringLots] = useState<any[]>([])

  const [lowOnly, setLowOnly] = useState(true)
  const [lowStock, setLowStock] = useState<any[]>([])

  const [loadingMasters, setLoadingMasters] = useState(false)

  const itemNameById = useMemo(()=>{
    const m = new Map<string, string>()
    for (const it of items) m.set(it.id, it.name)
    return m
  }, [items])
  const locationNameById = useMemo(()=>{
    const m = new Map<string, string>()
    for (const it of locations) m.set(it.id, it.name)
    return m
  }, [locations])

  async function loadMasters(){
    setLoadingMasters(true)
    const [cats, uns, locs, deps, its] = await Promise.all([
      hospitalApi.storeListCategories({ limit: 500 }) as any,
      hospitalApi.storeListUnits({ limit: 500 }) as any,
      hospitalApi.storeListLocations({ limit: 500 }) as any,
      hospitalApi.listDepartments() as any,
      hospitalApi.storeListItems({ limit: 500 }) as any,
    ])

    setCategories((cats.items || []).map((c: any)=>({ id: String(c._id||c.id), name: c.name })))
    setUnits((uns.items || []).map((u: any)=>({ id: String(u._id||u.id), name: u.name, abbr: u.abbr })))
    setLocations((locs.items || []).map((l: any)=>({ id: String(l._id||l.id), name: l.name })))
    setDepartments((deps.departments || deps.items || deps || []).map((d: any)=>({ id: String(d._id||d.id), name: d.name })))
    setItems((its.items || []).map((i: any)=>({ id: String(i._id||i.id), code: i.code, name: i.name, reorderLevel: i.reorderLevel, minStock: i.minStock, maxStock: i.maxStock, active: i.active })))
    setLoadingMasters(false)
  }

  useEffect(()=>{
    let cancelled = false
    ;(async ()=>{
      try { await loadMasters() } catch { try { setLoadingMasters(false) } catch {} }
      if (cancelled) return
    })()
    return ()=>{ cancelled = true }
  }, [])

  useEffect(()=>{
    if (!receiveForm.locationId && locations[0]?.id) setReceiveForm(f => ({ ...f, locationId: locations[0].id }))
    if (!issueForm.locationId && locations[0]?.id) setIssueForm(f => ({ ...f, locationId: locations[0].id }))
  }, [locations])

  const filteredItems = useMemo(()=>{
    const q = itemQuery.trim().toLowerCase()
    if (!q) return items
    return items.filter(i => (i.name||'').toLowerCase().includes(q) || (i.code||'').toLowerCase().includes(q))
  }, [items, itemQuery])

  async function addCategory(){
    const name = newCategory.trim()
    if (!name) return
    await hospitalApi.storeCreateCategory({ name })
    setNewCategory('')
    await loadMasters()
  }

  async function addUnit(){
    const name = newUnit.name.trim()
    if (!name) return
    await hospitalApi.storeCreateUnit({ name, abbr: newUnit.abbr.trim() || undefined })
    setNewUnit({ name: '', abbr: '' })
    await loadMasters()
  }

  async function addLocation(){
    const name = newLocation.trim()
    if (!name) return
    await hospitalApi.storeCreateLocation({ name })
    setNewLocation('')
    await loadMasters()
  }

  async function addItem(){
    if (!newItem.name.trim()) return
    await hospitalApi.storeCreateItem({
      code: newItem.code.trim() || undefined,
      name: newItem.name.trim(),
      categoryId: newItem.categoryId || undefined,
      unitId: newItem.unitId || undefined,
      reorderLevel: newItem.reorderLevel !== '' ? Number(newItem.reorderLevel) : undefined,
      minStock: newItem.minStock !== '' ? Number(newItem.minStock) : undefined,
      maxStock: newItem.maxStock !== '' ? Number(newItem.maxStock) : undefined,
      active: true,
    })
    setNewItem({ code: '', name: '', categoryId: '', unitId: '', reorderLevel: '', minStock: '', maxStock: '' })
    await loadMasters()
  }

  async function submitReceive(){
    const lines = receiveForm.lines
      .filter(l => l.itemId && l.qty)
      .map(l => ({
        itemId: l.itemId,
        qty: Number(l.qty),
        unitCost: Number(l.unitCost),
        lotNo: String(l.lotNo||'').trim(),
        expiryDate: String(l.expiryDate||'').trim(),
      }))
    if (!receiveForm.locationId || !receiveForm.date || !lines.length) return
    await hospitalApi.storeReceive({
      date: receiveForm.date,
      locationId: receiveForm.locationId,
      referenceNo: receiveForm.referenceNo || undefined,
      notes: receiveForm.notes || undefined,
      lines,
    })
    setReceiveForm({ date: todayIso(), locationId: receiveForm.locationId, referenceNo: '', notes: '', lines: [{ itemId: '', qty: '', unitCost: '', lotNo: '', expiryDate: '' }] })
    alert('Received successfully')
  }

  async function submitIssue(){
    const lines = issueForm.lines
      .filter(l => l.itemId && l.qty)
      .map(l => ({ itemId: l.itemId, qty: Number(l.qty) }))
    if (!issueForm.locationId || !issueForm.departmentId || !issueForm.date || !lines.length) return
    await hospitalApi.storeIssue({
      date: issueForm.date,
      locationId: issueForm.locationId,
      departmentId: issueForm.departmentId,
      encounterId: issueForm.encounterId.trim() || undefined,
      referenceNo: issueForm.referenceNo || undefined,
      notes: issueForm.notes || undefined,
      lines,
    })
    setIssueForm({ date: todayIso(), locationId: issueForm.locationId, departmentId: issueForm.departmentId, encounterId: '', referenceNo: '', notes: '', lines: [{ itemId: '', qty: '' }] })
    alert('Issued successfully')
  }

  async function loadStock(){
    const res = await hospitalApi.storeStock({ locationId: stockLocationId || undefined }) as any
    setStockRows(res.items || [])
  }

  async function loadWorth(){
    const res = await hospitalApi.storeWorth({ locationId: worthLocationId || undefined }) as any
    setWorthRes({ totalWorth: Number(res.totalWorth || 0), items: res.items || [] })
  }

  async function loadLowStock(){
    const res = await hospitalApi.storeLowStock({ onlyLow: lowOnly }) as any
    setLowStock(res.items || [])
  }

  async function loadExpiring(){
    const res = await hospitalApi.storeExpiring({ to: expiringTo, locationId: expiringLocationId || undefined }) as any
    setExpiringLots(res.items || [])
  }

  const stats = useMemo(() => {
    const totalWorth = Number(worthRes?.totalWorth || 0)
    const lowCount = Array.isArray(lowStock) ? lowStock.length : 0
    const expCount = Array.isArray(expiringLots) ? expiringLots.length : 0
    return {
      items: items.length,
      locations: locations.length,
      masters: categories.length + units.length,
      totalWorth,
      lowCount,
      expCount,
    }
  }, [items.length, locations.length, categories.length, units.length, worthRes, lowStock, expiringLots])

  const tabs: Array<{ id: typeof tab; label: string; icon: any; hint: string }> = [
    { id: 'items', label: 'Masters & Items', icon: Package, hint: 'Catalog & setup' },
    { id: 'receive', label: 'Receive', icon: ArrowDownToLine, hint: 'GRN / IN' },
    { id: 'issue', label: 'Issue', icon: ArrowUpFromLine, hint: 'OUT (FIFO)' },
    { id: 'stock', label: 'Stock', icon: Warehouse, hint: 'Balances' },
    { id: 'reports', label: 'Reports', icon: BarChart3, hint: 'Worth / Alerts' },
  ]

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-[#0B2B5B] via-[#0B3B7A] to-[#0EA5E9] p-6 text-white shadow-sm">
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
                <Warehouse className="h-4 w-4" />
                Hospital Store
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Store Management</h2>
              <div className="mt-1 text-sm text-white/80">IN / OUT, FIFO valuation, expiry tracking, and stock alerts.</div>
            </div>
            <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map(t => (
                <TabPill key={t.id} active={tab === t.id} label={t.label} icon={t.icon} hint={t.hint} onClick={() => setTab(t.id)} />
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-xs text-white/70">Items</div>
              <div className="mt-1 text-lg font-semibold">{stats.items}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-xs text-white/70">Locations</div>
              <div className="mt-1 text-lg font-semibold">{stats.locations}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-xs text-white/70">Masters</div>
              <div className="mt-1 text-lg font-semibold">{stats.masters}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-xs text-white/70">Worth</div>
              <div className="mt-1 text-lg font-semibold">{stats.totalWorth.toFixed(2)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-xs text-white/70">Low Stock</div>
              <div className="mt-1 text-lg font-semibold">{stats.lowCount}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <div className="text-xs text-white/70">Expiring</div>
              <div className="mt-1 text-lg font-semibold">{stats.expCount}</div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-black/10 blur-3xl" />
      </div>

      {tab === 'items' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
          <Card
            title="Store Masters"
            subtitle="Categories, Units and Locations used across the store module."
            right={
              <button
                type="button"
                onClick={()=>loadMasters()}
                className="rounded-full border border-white/0 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {loadingMasters ? 'Refreshing…' : 'Refresh'}
              </button>
            }
          >
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">Category</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input value={newCategory} onChange={e=>setNewCategory(e.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm" placeholder="e.g. Consumables" />
                    <button type="button" onClick={addCategory} className="h-10 shrink-0 rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700">Add</button>
                  </div>
                  <div className="mt-2 max-h-24 space-y-1 overflow-auto text-xs text-slate-700">
                    {categories.length ? categories.map(c => <div key={c.id} className="rounded-md bg-white px-2 py-1 ring-1 ring-black/5">{c.name}</div>) : <div className="text-slate-500">No categories yet.</div>}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">Unit</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <input value={newUnit.name} onChange={e=>setNewUnit(v=>({ ...v, name: e.target.value }))} className="col-span-2 h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm sm:col-span-2" placeholder="e.g. Piece" />
                    <input value={newUnit.abbr} onChange={e=>setNewUnit(v=>({ ...v, abbr: e.target.value }))} className="col-span-1 h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm sm:col-span-1" placeholder="pcs" />
                    <button type="button" onClick={addUnit} className="col-span-1 h-10 min-w-[84px] rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 sm:justify-self-start">Add</button>
                  </div>
                  <div className="mt-2 max-h-24 space-y-1 overflow-auto text-xs text-slate-700">
                    {units.length ? units.map(u => <div key={u.id} className="flex items-center justify-between rounded-md bg-white px-2 py-1 ring-1 ring-black/5"><span>{u.name}</span><span className="text-slate-500">{u.abbr || ''}</span></div>) : <div className="text-slate-500">No units yet.</div>}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">Location</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input value={newLocation} onChange={e=>setNewLocation(e.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm" placeholder="e.g. Main Store" />
                    <button type="button" onClick={addLocation} className="h-10 shrink-0 rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700">Add</button>
                  </div>
                  <div className="mt-2 max-h-24 space-y-1 overflow-auto text-xs text-slate-700">
                    {locations.length ? locations.map(l => <div key={l.id} className="rounded-md bg-white px-2 py-1 ring-1 ring-black/5">{l.name}</div>) : <div className="text-slate-500">No locations yet.</div>}
                  </div>
                </div>
              </div>
            </div>
          </Card>
          </div>

          <div className="lg:col-span-1">
          <Card title="Item Catalog" subtitle="Create and maintain store items with reorder levels and units.">
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
                <input value={newItem.code} onChange={e=>setNewItem(v=>({ ...v, code: e.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" placeholder="Item code (optional)" />
                <input value={newItem.name} onChange={e=>setNewItem(v=>({ ...v, name: e.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" placeholder="Item name" />
                <select value={newItem.categoryId} onChange={e=>setNewItem(v=>({ ...v, categoryId: e.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
                  <option value="">Category (optional)</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={newItem.unitId} onChange={e=>setNewItem(v=>({ ...v, unitId: e.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
                  <option value="">Unit (optional)</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input value={newItem.reorderLevel} onChange={e=>setNewItem(v=>({ ...v, reorderLevel: e.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" placeholder="Reorder level" />
                <input value={newItem.minStock} onChange={e=>setNewItem(v=>({ ...v, minStock: e.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" placeholder="Min stock" />
                <input value={newItem.maxStock} onChange={e=>setNewItem(v=>({ ...v, maxStock: e.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" placeholder="Max stock" />
                <button type="button" onClick={addItem} className="h-10 self-end rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700">Add Item</button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={itemQuery} onChange={e=>setItemQuery(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm" placeholder="Search items by name or code..." />
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[560px] w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Code</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-right">Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredItems.length ? (
                      <tr><td colSpan={3} className="px-3 py-8"><EmptyState title="No items yet" desc="Add your first store item to start receiving and issuing stock." /></td></tr>
                    ) : (
                      filteredItems.map(i => (
                        <tr key={i.id} className="border-t hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-600">{i.code || '-'}</td>
                          <td className="px-3 py-2 font-medium text-slate-900">{i.name}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{i.reorderLevel ?? i.minStock ?? '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
          </div>
        </div>
      )}

      {tab === 'receive' && (
        <Card title="Receive Stock" subtitle="Create a receiving entry (IN). Batch / expiry is required.">
          <div className="grid gap-3">
            <div className="grid gap-2 md:grid-cols-3">
              <input type="date" value={receiveForm.date} onChange={e=>setReceiveForm(f=>({ ...f, date: e.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              <select value={receiveForm.locationId} onChange={e=>setReceiveForm(f=>({ ...f, locationId: e.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Select location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <input value={receiveForm.referenceNo} onChange={e=>setReceiveForm(f=>({ ...f, referenceNo: e.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Reference No (optional)" />
              <input value={receiveForm.notes} onChange={e=>setReceiveForm(f=>({ ...f, notes: e.target.value }))} className="md:col-span-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Notes (optional)" />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Unit Cost</th>
                    <th className="px-3 py-2 text-left">Lot No</th>
                    <th className="px-3 py-2 text-left">Expiry</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {!receiveForm.lines.length ? (
                    <tr><td colSpan={6} className="px-3 py-8"><EmptyState title="Add a line" desc="Start by adding at least one receiving line." /></td></tr>
                  ) : (
                    receiveForm.lines.map((l, idx) => (
                      <tr key={idx} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <select value={l.itemId} onChange={e=>{
                            const v = e.target.value
                            setReceiveForm(f=>({ ...f, lines: f.lines.map((x,i)=> i===idx ? { ...x, itemId: v } : x) }))
                          }} className="w-full min-w-56 max-w-88 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
                            <option value="">Select item</option>
                            {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2"><input value={l.qty} onChange={e=>setReceiveForm(f=>({ ...f, lines: f.lines.map((x,i)=> i===idx ? { ...x, qty: e.target.value } : x) }))} className="w-24 min-w-22 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" /></td>
                        <td className="px-3 py-2"><input value={l.unitCost} onChange={e=>setReceiveForm(f=>({ ...f, lines: f.lines.map((x,i)=> i===idx ? { ...x, unitCost: e.target.value } : x) }))} className="w-28 min-w-26 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" /></td>
                        <td className="px-3 py-2"><input value={l.lotNo} onChange={e=>setReceiveForm(f=>({ ...f, lines: f.lines.map((x,i)=> i===idx ? { ...x, lotNo: e.target.value } : x) }))} className="w-36 min-w-36 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" /></td>
                        <td className="px-3 py-2"><input type="date" value={l.expiryDate} onChange={e=>setReceiveForm(f=>({ ...f, lines: f.lines.map((x,i)=> i===idx ? { ...x, expiryDate: e.target.value } : x) }))} className="w-40 min-w-40 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" /></td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={()=>setReceiveForm(f=>({ ...f, lines: f.lines.filter((_,i)=> i!==idx) }))} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Remove</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={()=>setReceiveForm(f=>({ ...f, lines: [...f.lines, { itemId: '', qty: '', unitCost: '', lotNo: '', expiryDate: '' }] }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Add line</button>
              <button type="button" onClick={submitReceive} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Post Receive</button>
            </div>
          </div>
        </Card>
      )}

      {tab === 'issue' && (
        <Card title="Issue Stock" subtitle="Issue stock OUT using FIFO. Department is mandatory; encounter is optional.">
          <div className="grid gap-3">
            <div className="grid gap-2 md:grid-cols-3">
              <input type="date" value={issueForm.date} onChange={e=>setIssueForm(f=>({ ...f, date: e.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              <select value={issueForm.locationId} onChange={e=>setIssueForm(f=>({ ...f, locationId: e.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Select location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <select value={issueForm.departmentId} onChange={e=>setIssueForm(f=>({ ...f, departmentId: e.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input value={issueForm.encounterId} onChange={e=>setIssueForm(f=>({ ...f, encounterId: e.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="EncounterId (optional)" />
              <input value={issueForm.referenceNo} onChange={e=>setIssueForm(f=>({ ...f, referenceNo: e.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Reference No (optional)" />
              <input value={issueForm.notes} onChange={e=>setIssueForm(f=>({ ...f, notes: e.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Notes (optional)" />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[560px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {!issueForm.lines.length ? (
                    <tr><td colSpan={3} className="px-3 py-8"><EmptyState title="Add a line" desc="Add at least one issue line." /></td></tr>
                  ) : (
                    issueForm.lines.map((l, idx) => (
                      <tr key={idx} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <select value={l.itemId} onChange={e=>{
                            const v = e.target.value
                            setIssueForm(f=>({ ...f, lines: f.lines.map((x,i)=> i===idx ? { ...x, itemId: v } : x) }))
                          }} className="w-full min-w-56 max-w-88 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
                            <option value="">Select item</option>
                            {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2"><input value={l.qty} onChange={e=>setIssueForm(f=>({ ...f, lines: f.lines.map((x,i)=> i===idx ? { ...x, qty: e.target.value } : x) }))} className="w-28 min-w-26 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" /></td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={()=>setIssueForm(f=>({ ...f, lines: f.lines.filter((_,i)=> i!==idx) }))} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Remove</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={()=>setIssueForm(f=>({ ...f, lines: [...f.lines, { itemId: '', qty: '' }] }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Add line</button>
              <button type="button" onClick={submitIssue} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700">Post Issue</button>
            </div>
          </div>
        </Card>
      )}

      {tab === 'stock' && (
        <Card
          title="Stock Overview"
          subtitle="On-hand balances with valuation (based on lot costs)."
          right={
            <div className="flex flex-wrap gap-2">
              <select value={stockLocationId} onChange={e=>setStockLocationId(e.target.value)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm">
                <option value="">All locations</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button type="button" onClick={loadStock} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Refresh</button>
            </div>
          }
        >
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Location</th>
                  <th className="px-3 py-2 text-right">On hand</th>
                  <th className="px-3 py-2 text-right">Worth</th>
                </tr>
              </thead>
              <tbody>
                {!stockRows.length ? (
                  <tr><td colSpan={4} className="px-3 py-8"><EmptyState title="No stock loaded" desc="Click Refresh to load stock. Receive stock first if this is a new setup." /></td></tr>
                ) : (
                  stockRows.map((r, idx) => (
                    <tr key={idx} className="border-t hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">{itemNameById.get(String(r.itemId)) || String(r.itemId)}</td>
                      <td className="px-3 py-2 text-slate-600">{locationNameById.get(String(r.locationId)) || String(r.locationId)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{r.qtyOnHand}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{Number(r.worth || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'reports' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="Inventory Worth (FIFO)"
            subtitle="Run valuation summary across store lots (FIFO by lot receipt order)."
            right={
              <div className="flex flex-wrap gap-2">
                <select value={worthLocationId} onChange={e=>setWorthLocationId(e.target.value)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm">
                  <option value="">All locations</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button type="button" onClick={loadWorth} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Run</button>
              </div>
            }
          >
            {!worthRes ? (
              <EmptyState title="Run worth report" desc="Click Run to calculate the inventory worth." />
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-linear-to-r from-sky-50 to-indigo-50 px-4 py-3 ring-1 ring-black/5">
                  <div className="text-xs text-slate-600">Total worth</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">{worthRes.totalWorth.toFixed(2)}</div>
                </div>
                <div className="max-h-64 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[720px] w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Location</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Worth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!worthRes.items.length ? (
                        <tr><td colSpan={4} className="px-3 py-8"><EmptyState title="No data" desc="No lots found for valuation." /></td></tr>
                      ) : (
                        worthRes.items.map((r, idx) => (
                          <tr key={idx} className="border-t hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-slate-900">{itemNameById.get(String(r.itemId)) || String(r.itemId)}</td>
                            <td className="px-3 py-2 text-slate-600">{locationNameById.get(String(r.locationId)) || String(r.locationId)}</td>
                            <td className="px-3 py-2 text-right text-slate-700">{r.qtyOnHand}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">{Number(r.worth||0).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>

          <Card
            title="Low Stock"
            subtitle="Items at/below reorder level."
            right={
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-2 text-slate-700">
                  <input type="checkbox" checked={lowOnly} onChange={e=>setLowOnly(e.target.checked)} />
                  Only low
                </label>
                <button type="button" onClick={loadLowStock} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Run</button>
              </div>
            }
          >
            <div className="max-h-64 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[520px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">On hand</th>
                    <th className="px-3 py-2 text-right">Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {!lowStock.length ? (
                    <tr><td colSpan={3} className="px-3 py-8"><EmptyState title="No results" desc="Run the report to see low stock items." /></td></tr>
                  ) : (
                    lowStock.map((r, idx) => (
                      <tr key={idx} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-900">{r.item?.name || '-'}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{r.qtyOnHand}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{r.reorderLevel ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="lg:col-span-2">
            <Card
              title="Expiring Lots"
              subtitle="Lots with expiry within selected window."
              right={
                <div className="flex flex-wrap gap-2">
                  <select value={expiringLocationId} onChange={e=>setExpiringLocationId(e.target.value)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm">
                    <option value="">All locations</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <input type="date" value={expiringTo} onChange={e=>setExpiringTo(e.target.value)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm" />
                  <button type="button" onClick={loadExpiring} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Run</button>
                </div>
              }
            >
              <div className="max-h-72 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[860px] w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Location</th>
                      <th className="px-3 py-2 text-left">Lot</th>
                      <th className="px-3 py-2 text-left">Expiry</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!expiringLots.length ? (
                      <tr><td colSpan={5} className="px-3 py-8"><EmptyState title="No results" desc="Run the report to see lots expiring soon." /></td></tr>
                    ) : (
                      expiringLots.map((l, idx) => (
                        <tr key={idx} className="border-t hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-900">{itemNameById.get(String(l.itemId)) || String(l.itemId)}</td>
                          <td className="px-3 py-2 text-slate-600">{locationNameById.get(String(l.locationId)) || String(l.locationId)}</td>
                          <td className="px-3 py-2 text-slate-700">{l.lotNo}</td>
                          <td className="px-3 py-2 text-slate-700">{l.expiryDate}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">{l.qtyOnHand}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
