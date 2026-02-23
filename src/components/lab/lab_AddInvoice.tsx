import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'
import Lab_AddSupplierDialog from './lab_AddSupplierDialog'

type Props = { open: boolean; onClose: () => void }

type ItemRow = {
  id: string
  name?: string
  genericName?: string
  expiry?: string
  packs?: number
  unitsPerPack?: number
  buyPerPack?: number
  salePerPack?: number
  totalItems?: number
  lineTaxType?: 'percent' | 'fixed'
  lineTaxValue?: number
  category?: string
  minStock?: number
}

type TaxRow = { id: string; name?: string; value?: number; type?: 'percent'|'fixed'; applyOn?: 'gross'|'net' }

export default function Lab_AddInvoice({ open, onClose }: Props) {
  const [items, setItems] = useState<ItemRow[]>([{ id: crypto.randomUUID() }])
  const [taxes, setTaxes] = useState<TaxRow[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')

  useEffect(() => {
    let mounted = true
    if (!open) return
    ;(async () => {
      try {
        const res: any = await labApi.listSuppliers({ page: 1, limit: 200 })
        if (!mounted) return
        setSuppliers(res.items || [])
      } catch {
        setSuppliers([])
      }
    })()
    return () => { mounted = false }
  }, [open])

  // derived totals
  const gross = items.reduce((sum, r) => sum + (r.buyPerPack || 0) * (r.packs || 0), 0)
  const lineTaxesTotal = items.reduce((sum, r) => {
    const base = (r.buyPerPack || 0) * (r.packs || 0)
    const t = r.lineTaxType || 'percent'
    const v = r.lineTaxValue || 0
    const tax = t === 'percent' ? base * (v / 100) : v
    return sum + tax
  }, 0)
  const discount = 0
  const taxableBase = Math.max(0, gross - discount)
  const additionalTaxesTotal = taxes.reduce((sum, t) => {
    const type = t.type || 'percent'
    const v = t.value || 0
    const applyOn = t.applyOn || 'gross'
    const base = applyOn === 'gross' ? taxableBase : (taxableBase + lineTaxesTotal)
    const amt = type === 'percent' ? base * (v / 100) : v
    return sum + amt
  }, 0)
  const netTotal = taxableBase + lineTaxesTotal + additionalTaxesTotal

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-xl bg-white p-0 shadow-2xl ring-1 ring-black/5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-xl font-bold text-slate-800">Add Invoice</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-4 px-6 py-5 text-sm">
          {/* Header Fields */}
          <section className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-700">Invoice</div>
            <div className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-slate-700">Supplier</label>
                  <div className="flex items-center gap-2">
                    <select value={supplierId} onChange={e=>setSupplierId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
                      <option value="">Select supplier...</option>
                      {suppliers.map((s:any)=> (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={()=>setSupplierDialogOpen(true)} className="btn-outline-navy">+ New</button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-slate-700">Invoice No</label>
                  <input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-slate-700">Invoice Date</label>
                  <input type="date" value={invoiceDate} onChange={e=>setInvoiceDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
              </div>
            </div>
          </section>

          {/* Items Section */}
          <section className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-700">Items</div>
            <div className="space-y-4 p-4 max-h-[50vh] overflow-y-auto pr-4">
              {items.map((row) => (
                <div key={row.id} className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-slate-700">Item</label>
                    <input
                      value={row.name || ''}
                      onChange={e=>setItems(prev=>prev.map(it=>it.id===row.id?{...it, name:e.target.value}:it))}
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      placeholder="Item name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Generic Name</label>
                    <input value={row.genericName || ''} onChange={e=>setItems(prev=>prev.map(it=>it.id===row.id?{...it, genericName:e.target.value}:it))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Generic name" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Expiry</label>
                    <input type="date" value={row.expiry || ''} onChange={e=>setItems(prev=>prev.map(it=>it.id===row.id?{...it, expiry:e.target.value}:it))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Qty (Packs)</label>
                    <input value={row.packs ?? ''} onChange={e=>setItems(prev=>prev.map(it=>it.id===row.id?{...it, packs: Number(e.target.value||0)}:it))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Units/Pack</label>
                    <input value={row.unitsPerPack ?? ''} onChange={e=>setItems(prev=>prev.map(it=>it.id===row.id?{...it, unitsPerPack: Number(e.target.value||0)}:it))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Total Items (auto)</label>
                    <input
                      value={(row.totalItems ?? ((row.unitsPerPack||1) * (row.packs||0))) || ''}
                      onChange={e=>{
                        const v = e.target.value
                        setItems(prev=>prev.map(it=> it.id===row.id ? { ...it, totalItems: v==='' ? undefined : Number(v) } : it))
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Category</label>
                    <input value={row.category || ''} onChange={e=>setItems(prev=>prev.map(it=>it.id===row.id?{...it, category: e.target.value}:it))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Min Stock</label>
                    <input value={row.minStock ?? ''} onChange={e=>setItems(prev=>prev.map(it=>it.id===row.id?{...it, minStock: Number(e.target.value||0)}:it))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Buy/Pack</label>
                    <input value={row.buyPerPack ?? ''} onChange={e=>setItems(prev=>prev.map(it=>it.id===row.id?{...it, buyPerPack: Number(e.target.value||0)}:it))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Sale/Pack</label>
                    <input value={row.salePerPack ?? ''} onChange={e=>setItems(prev=>prev.map(it=>it.id===row.id?{...it, salePerPack: Number(e.target.value||0)}:it))} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Unit Buy (auto)</label>
                    <input disabled value={row.unitsPerPack? ((row.buyPerPack||0)/(row.unitsPerPack||1)).toFixed(3) : ''} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Unit Sale (auto)</label>
                    <input disabled value={row.unitsPerPack? ((row.salePerPack||0)/(row.unitsPerPack||1)).toFixed(3) : ''} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Line Total (auto)</label>
                    <input disabled value={((row.buyPerPack||0) * (row.packs||0)).toFixed(2)} className="w-full rounded-md border border-slate-2 00 bg-slate-50 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">Line Taxes (Rs.)</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={(row.lineTaxType||'percent') === 'percent' ? '%' : 'Rs.'}
                        onChange={e=>{
                          const val = e.target.value === '%' ? 'percent' : 'fixed'
                          setItems(prev=>prev.map(it=> it.id===row.id ? { ...it, lineTaxType: val as 'percent'|'fixed' } : it))
                        }}
                        className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                      >
                        <option>%</option>
                        <option>Rs.</option>
                      </select>
                      <input
                        value={row.lineTaxValue ?? ''}
                        onChange={e=>setItems(prev=>prev.map(it=> it.id===row.id ? { ...it, lineTaxValue: Number(e.target.value||0) } : it))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                      />
                      <button className="btn-outline-navy" type="button" disabled>+ Add Tax</button>
                    </div>
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems(prev => prev.filter(it => it.id !== row.id))}
                        className="text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="sticky bottom-0 flex items-center justify-start bg-white/80 pt-3 text-xs text-slate-600 backdrop-blur">
                <button
                  type="button"
                  onClick={() => setItems(prev => [...prev, { id: crypto.randomUUID() }])}
                  className="btn-outline-navy"
                >
                  + Add Row
                </button>
              </div>
            </div>
          </section>

          {/* Additional Taxes Section */}
          <section className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-700">Additional Taxes</div>
            <div className="space-y-3 p-4 text-xs text-slate-600">Add invoice-level taxes such as WHT, Delivery, etc.</div>
            {taxes.map(t => (
              <div key={t.id} className="grid gap-3 p-4 sm:grid-cols-3">
                <input
                  value={t.name || ''}
                  onChange={e=>setTaxes(prev=>prev.map(x=> x.id===t.id ? { ...x, name: e.target.value } : x))}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Tax name (e.g., WHT)"
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
                  <button
                    type="button"
                    onClick={() => setTaxes(prev => prev.filter(x => x.id !== t.id))}
                    className="text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => setTaxes(prev => [...prev, { id: crypto.randomUUID(), type: 'percent', applyOn: 'gross' }])}
                className="btn-outline-navy"
              >
                + Add More Tax
              </button>
            </div>
          </section>

          {/* Totals Section */}
          <section className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-700">Totals</div>
            <div className="grid gap-2 p-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center justify-between"><span>Gross</span><span>{gross.toFixed(2)}</span></div>
              <div className="flex items-center justify-between"><span>Discount</span><span>{discount.toFixed(2)}</span></div>
              <div className="flex items-center justify-between"><span>Taxable (Gross - Discount)</span><span>{taxableBase.toFixed(2)}</span></div>
              <div className="flex items-center justify-between"><span>Line Taxes (Rs.)</span><span>{lineTaxesTotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between"><span>Sales Tax</span><span>{additionalTaxesTotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between font-semibold text-navy"><span>Net Total</span><span>{netTotal.toFixed(2)}</span></div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button
            onClick={async()=>{
              const lines = items
                .filter(r=> (r.name||'').trim() && (r.packs||0)>0)
                .map(r=>({
                  name: (r.name||'').trim(),
                  genericName: r.genericName || undefined,
                  unitsPerPack: r.unitsPerPack || 1,
                  packs: r.packs || 0,
                  totalItems: (r.totalItems != null) ? r.totalItems : ((r.unitsPerPack||1) * (r.packs||0)),
                  buyPerPack: r.buyPerPack || 0,
                  buyPerUnit: (r.buyPerPack||0) / (r.unitsPerPack||1),
                  salePerPack: r.salePerPack || 0,
                  salePerUnit: (r.salePerPack||0) / (r.unitsPerPack||1),
                  category: (r.category||undefined),
                  minStock: (r.minStock!=null? r.minStock : undefined),
                  lineTaxType: r.lineTaxType || undefined,
                  lineTaxValue: r.lineTaxValue || undefined,
                  expiry: r.expiry || undefined,
                }))
              if (!invoiceDate || !invoiceNo || !lines.length) return
              try {
                const sel = suppliers.find((s:any)=> String(s._id) === String(supplierId))
                await labApi.createPurchaseDraft({
                  date: invoiceDate,
                  invoice: invoiceNo,
                  supplierId: supplierId || undefined,
                  supplierName: sel?.name || undefined,
                  invoiceTaxes: taxes
                    .filter(t=> (t.name||'').trim() && (t.value||0)>0)
                    .map(t=>({
                      name: (t.name||'').trim(),
                      value: t.value||0,
                      type: t.type || 'percent',
                      applyOn: t.applyOn || 'gross'
                    })),
                  discount,
                  lines,
                })
                onClose()
              } catch {}
            }}
            className="btn"
          >Save Invoice</button>
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
