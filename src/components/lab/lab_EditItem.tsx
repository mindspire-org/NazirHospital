 import { useEffect, useState } from 'react'
 import { labApi } from '../../utils/api'

 type Props = { open: boolean; onClose: () => void; medicine?: string }

 export default function Lab_EditItem({ open, onClose, medicine }: Props) {
  const onlyDate = (s?: string) => {
    if (!s) return ''
    try {
      // handle ISO or yyyy-mm-dd
      const m = String(s).match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) return m[1]
      const d = new Date(s)
      if (!isNaN(d.getTime())) return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)
    } catch {}
    return ''
  }
  const [date, setDate] = useState('')
  const [invoice, setInvoice] = useState('')
  const [genericName, setGenericName] = useState('')
  const [category, setCategory] = useState('')
  const [minStock, setMinStock] = useState<number | ''>('')
  const [unitsPerPack, setUnitsPerPack] = useState<number>(1)
  const [name, setName] = useState('')
  const [onHand, setOnHand] = useState<number>(0)
  const [salePerUnit, setSalePerUnit] = useState<number>(0)
  const [expiry, setExpiry] = useState<string>('')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [supplierName, setSupplierName] = useState('')

  useEffect(()=>{
    if (!open) return
    const today = new Date().toISOString().slice(0,10)
    setDate(today)
    setInvoice('')
    setName(String(medicine||'').trim())
    const key = (medicine||'').trim()
    if (!key) return
    let mounted = true
    labApi.listSuppliers().then((res:any)=>{
      if (!mounted) return
      setSuppliers(res?.items ?? res ?? [])
    }).catch(()=>{})
    labApi.listInventory({ search: key, limit: 1 }).then((res:any)=>{
      if (!mounted) return
      const it = (res?.items || [])[0]
      if (!it) return
      setGenericName(String(it.genericName || ''))
      setCategory(String(it.category||''))
      if (it.minStock != null) setMinStock(Number(it.minStock))
      setUnitsPerPack((it.unitsPerPack!=null && it.unitsPerPack>0)? it.unitsPerPack : 1)
      setOnHand(Number(it.onHand||0))
      if (it.lastSalePerUnit != null) setSalePerUnit(Number(it.lastSalePerUnit))
      if (it.lastExpiry) setExpiry(onlyDate(String(it.lastExpiry)))
      if (it.lastInvoice) setInvoice(String(it.lastInvoice))
      if (it.lastInvoiceDate) setDate(onlyDate(String(it.lastInvoiceDate)))
      if (it.lastSupplier) {
        setSupplierName(String(it.lastSupplier))
        const s = (suppliers||[]).find((x:any)=> String(x.name||'') === String(it.lastSupplier||''))
        if (s) setSupplierId(s._id)
      }
    }).catch(()=>{})
    return ()=>{ mounted = false }
  }, [open, medicine])

  useEffect(()=>{
    if (!open) return
    if (supplierName && suppliers.length && !supplierId){
      const s = suppliers.find((x:any)=> String(x.name||'') === String(supplierName||''))
      if (s) setSupplierId(s._id)
    }
  }, [open, suppliers, supplierName])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-xl bg-white p-0 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-xl font-bold text-slate-800">Edit Inventory Item</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Medicine</label>
              <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Units/Pack</label>
                <input value={unitsPerPack||''} onChange={e=>setUnitsPerPack(Number(e.target.value||0))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Total Items (On Hand)</label>
                <input value={onHand||''} onChange={e=>setOnHand(Number(e.target.value||0))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Unit Sale Price</label>
                <input value={salePerUnit||''} onChange={e=>setSalePerUnit(Number(e.target.value||0))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sale Price / Pack (auto)</label>
                <input disabled value={unitsPerPack? (salePerUnit*unitsPerPack).toFixed(3): ''} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Expiry Date</label>
                <input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Supplier</label>
                <select value={supplierId} onChange={e=>{ setSupplierId(e.target.value); const s = suppliers.find((x:any)=>x._id===e.target.value); setSupplierName(s?.name||'') }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select supplier...</option>
                  {suppliers.map((s:any)=>(<option key={s._id} value={s._id}>{s.name}{s.company?` — ${s.company}`:''}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Invoice No.</label>
                <input value={invoice} onChange={e=>setInvoice(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="btn-outline-navy">Cancel</button>
          <button
            onClick={async()=>{
              if (!(name||'').trim()) return
              try {
                const oldKey = String(medicine||'').trim().toLowerCase()
                await labApi.updateInventoryItem(oldKey, {
                  name: String(name).trim(),
                  genericName: (genericName||'').trim() || undefined,
                  category: (category||'').trim() || undefined,
                  minStock: (minStock===''? undefined : Number(minStock)),
                  unitsPerPack: unitsPerPack || 1,
                  onHand: onHand || 0,
                  salePerUnit: salePerUnit || 0,
                  expiry: onlyDate(expiry) || undefined,
                  invoice: (invoice||'').trim() || undefined,
                  date: onlyDate(date) || undefined,
                  supplierId: supplierId || undefined,
                  supplierName: supplierName || undefined,
                })
                onClose()
              } catch {}
            }}
            className="btn"
          >Save</button>
        </div>
      </div>
    </div>
  )
 }
