import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'
import Lab_AddSupplierDialog from './lab_AddSupplierDialog'

type Props = { open: boolean; onClose: () => void }

export default function Lab_UpdateStock({ open, onClose }: Props) {
  // Core fields
  const [name, setName] = useState('')
  const [packs, setPacks] = useState<number>(0)
  const [unitsPerPack, setUnitsPerPack] = useState<number>(1)
  const [expiry, setExpiry] = useState('')
  const [buyPerPack, setBuyPerPack] = useState<number>(0)
  const [salePerPack, setSalePerPack] = useState<number>(0)
  const [date, setDate] = useState('')
  const [invoice, setInvoice] = useState('')
  const [totalUnits, setTotalUnits] = useState<number>(0)
  const [genericName, setGenericName] = useState('')
  const [category, setCategory] = useState('')
  const [minStock, setMinStock] = useState<number | ''>('')

  // Suppliers
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)

  // Inventory choices
  const [inventoryNames, setInventoryNames] = useState<string[]>([])

  // Line tax per-line
  const [lineTaxType, setLineTaxType] = useState<'percent'|'fixed'>('percent')
  const [lineTaxValue, setLineTaxValue] = useState<number>(0)
  // Invoice-level taxes
  type TaxRow = { id: string; name?: string; value?: number; type?: 'percent'|'fixed'; applyOn?: 'gross'|'net' }
  const [taxes, setTaxes] = useState<TaxRow[]>([])

  useEffect(() => {
    if (!open) return
    let mounted = true
    const today = new Date().toISOString().slice(0,10)
    setDate(today)
    setInvoice('')
    setTotalUnits(0)
    // Suppliers
    labApi.listSuppliers({ page: 1, limit: 200 }).then((res:any)=>{
      if (!mounted) return
      setSuppliers(res?.items ?? res ?? [])
    }).catch(()=>{})
    // Inventory names for datalist
    labApi.listInventory({ limit: 1000 }).then((res:any)=>{
      if (!mounted) return
      const items: any[] = res?.items ?? []
      const names = Array.from(new Set(items.map((it:any)=> String((it.name||'').trim())).filter(Boolean))) as string[]
      setInventoryNames(names)
    }).catch(()=>{})
    return ()=>{ mounted = false }
  }, [open])

  // Prefill from previous inventory when a medicine/item is selected
  useEffect(()=>{
    if (!open) return
    const key = (name||'').trim()
    if (!key) return
    let mounted = true
    labApi.listInventory({ search: key, limit: 50 }).then((res:any)=>{
      if (!mounted) return
      const items: any[] = res?.items || []
      const it = items.find((x:any)=> String(x.name||'').trim().toLowerCase() === key.toLowerCase()) || items[0]
      if (!it) return
      setGenericName(String(it.genericName||''))
      setCategory(String(it.category||''))
      if (it.minStock != null) setMinStock(Number(it.minStock))
      const u = (it.unitsPerPack!=null && it.unitsPerPack>0)? Number(it.unitsPerPack) : 1
      setUnitsPerPack(u)
      if (it.lastSalePerPack != null) setSalePerPack(Number(it.lastSalePerPack))
      else if (it.lastSalePerUnit != null && u>0) setSalePerPack(Number(it.lastSalePerUnit) * u)
      if (it.lastBuyPerPack != null) setBuyPerPack(Number(it.lastBuyPerPack))
      else if (it.lastBuyPerUnit != null && u>0) setBuyPerPack(Number(it.lastBuyPerUnit) * u)
      if (it.lastLineTaxType) setLineTaxType(it.lastLineTaxType)
      if (it.lastLineTaxValue != null) setLineTaxValue(Number(it.lastLineTaxValue))
      if (it.lastExpiry) setExpiry(String(it.lastExpiry))
      if (it.lastSupplier){
        setSupplierName(String(it.lastSupplier))
        const s = suppliers.find((x:any)=> String(x.name||'') === String(it.lastSupplier||''))
        setSupplierId(s?._id || '')
      }
    }).catch(()=>{})
    return ()=>{ mounted = false }
  }, [open, name, suppliers])

  const unitBuy = unitsPerPack ? (buyPerPack / unitsPerPack) : 0

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white p-0 shadow-2xl ring-1 ring-black/5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-xl font-bold text-slate-800">Update Stock</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Medicine + Date + Invoice */}
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Medicine</label>
              <input list="lab-inventory-items" value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-md border border-amber-400 px-3 py-2 text-sm" placeholder="Item name" />
              <datalist id="lab-inventory-items">
                {inventoryNames.map((n)=> (<option key={n} value={n} />))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Invoice No.</label>
              <input value={invoice} onChange={e=>setInvoice(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Invoice number" />
            </div>
          </div>

          {/* Two-column grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Packs to Add</label>
              <input value={packs||''} onChange={e=>setPacks(Number(e.target.value||0))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Expiry Date</label>
              <input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Units in One Pack</label>
              <input value={unitsPerPack||''} onChange={e=>setUnitsPerPack(Number(e.target.value||0))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Purchase Price / Pack</label>
              <input value={buyPerPack||''} onChange={e=>setBuyPerPack(Number(e.target.value||0))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sale Price / Pack</label>
              <input value={salePerPack||''} onChange={e=>setSalePerPack(Number(e.target.value||0))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Total Units</label>
              <input value={totalUnits||''} onChange={e=>setTotalUnits(Number(e.target.value||0))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Unit Purchase Price (auto)</label>
              <input disabled value={unitsPerPack? (buyPerPack/unitsPerPack).toFixed(3): ''} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Unit Sale Price (auto)</label>
              <input disabled value={unitsPerPack? (salePerPack/unitsPerPack).toFixed(3): ''} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Line Total (auto)</label>
              <input disabled value={((totalUnits>0 ? (unitBuy * totalUnits) : ((buyPerPack||0) * (packs||0)))).toFixed(2)} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Generic Name</label>
              <input value={genericName} onChange={e=>setGenericName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <input value={category} onChange={e=>setCategory(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Min Stock</label>
              <input value={minStock} onChange={e=>{ const v = e.target.value; setMinStock(v===''? '': Number(v||0)) }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Line Taxes (Rs.)</label>
              <div className="flex items-center gap-2">
                <select
                  value={lineTaxType === 'percent' ? '%' : 'Rs.'}
                  onChange={e=> setLineTaxType(e.target.value === '%' ? 'percent' : 'fixed')}
                  className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                >
                  <option>%</option>
                  <option>Rs.</option>
                </select>
                <input value={lineTaxValue||''} onChange={e=>setLineTaxValue(Number(e.target.value||0))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* Supplier row */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Supplier</label>
              <div className="flex items-center gap-2">
                <select value={supplierId} onChange={e=>{ setSupplierId(e.target.value); const s = suppliers.find((x:any)=>x._id===e.target.value); setSupplierName(s?.name||'') }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
                  <option value="">Select supplier...</option>
                  {suppliers.map((s:any)=>(<option key={s._id} value={s._id}>{s.name}{s.company?` — ${s.company}`:''}</option>))}
                </select>
                <button type="button" onClick={()=>setSupplierDialogOpen(true)} className="btn-outline-navy">+ New</button>
              </div>
            </div>
          </div>

          {/* Additional Taxes (invoice-level) */}
          <section className="mt-4 rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">Additional Taxes</div>
            {taxes.map(t => (
              <div key={t.id} className="grid gap-3 p-4 sm:grid-cols-3">
                <input
                  value={t.name || ''}
                  onChange={e=>setTaxes(prev=>prev.map(x=> x.id===t.id ? { ...x, name: e.target.value } : x))}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Tax name (e.g., Advance WHT)"
                />
                <input
                  value={t.value ?? ''}
                  onChange={e=>setTaxes(prev=>prev.map(x=> x.id===t.id ? { ...x, value: Number(e.target.value||0), type: 'percent' } : x))}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Percent %"
                />
                <select
                  value={t.applyOn || 'gross'}
                  onChange={e=>setTaxes(prev=>prev.map(x=> x.id===t.id ? { ...x, applyOn: (e.target.value as 'gross'|'net') } : x))}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="gross">Apply on Gross - Discount</option>
                  <option value="net">Apply on Net</option>
                </select>
                <div className="sm:col-span-3 flex justify-end">
                  <button type="button" onClick={()=> setTaxes(prev=>prev.filter(x=> x.id!==t.id))} className="text-rose-600 hover:underline">Remove</button>
                </div>
              </div>
            ))}
            <div className="px-4 pb-4">
              <button type="button" onClick={()=> setTaxes(prev=> [...prev, { id: crypto.randomUUID(), type: 'percent', applyOn: 'gross' }])} className="btn-outline-navy">+ Add More Tax</button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button
            onClick={async()=>{
              if (!(name||'').trim() || !date || !(invoice||'').trim() || ((totalUnits||0)<=0 && (packs||0)<=0)) return
              try {
                const lines = [{
                  name: name.trim(),
                  genericName: (genericName||'').trim() || undefined,
                  category: (category||'').trim() || undefined,
                  minStock: (minStock===''? undefined : Number(minStock)),
                  unitsPerPack: unitsPerPack || 1,
                  packs: packs || 0,
                  totalItems: (totalUnits && totalUnits>0) ? totalUnits : ((unitsPerPack||1) * (packs||0)),
                  buyPerPack: buyPerPack || 0,
                  salePerPack: salePerPack || 0,
                  expiry: expiry || undefined,
                  lineTaxType: lineTaxType || undefined,
                  lineTaxValue: lineTaxValue || undefined,
                }]
                await labApi.createPurchaseDraft({
                  date,
                  invoice: invoice.trim(),
                  supplierId: supplierId || undefined,
                  supplierName: supplierName || undefined,
                  invoiceTaxes: taxes
                    .filter(t=> (t.name||'').trim() && (t.value||0)>0)
                    .map(t=>({ name: (t.name||'').trim(), value: t.value||0, type: t.type || 'percent', applyOn: t.applyOn || 'gross' })),
                  lines,
                })
                onClose()
              } catch {}
            }}
            className="btn"
          >Save</button>
        </div>
        <Lab_AddSupplierDialog
          open={supplierDialogOpen}
          onClose={()=>setSupplierDialogOpen(false)}
          onSave={async (s:any)=>{
            const created = await labApi.createSupplier({ name: s.name, company: s.company, phone: s.phone, address: s.address, taxId: s.taxId, status: s.status })
            setSuppliers(prev => [{...created}, ...prev])
            setSupplierId(String(created._id||''))
          }}
        />
      </div>
    </div>
  )
}
