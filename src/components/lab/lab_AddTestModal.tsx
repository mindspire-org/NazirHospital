import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'

export type LabTestFormValues = {
  name: string
  price: string
  parameter?: string
  unit?: string
  normalRangeMale?: string
  normalRangeFemale?: string
  normalRangePediatric?: string
  parameters?: Array<{ name: string; unit?: string; normalRangeMale?: string; normalRangeFemale?: string; normalRangePediatric?: string }>
  consumables?: Array<{ item: string; qty: number }>
}

export default function Lab_AddTestModal({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (values: LabTestFormValues) => void; initial?: Partial<LabTestFormValues> }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('0')
  const [parameter, setParameter] = useState('')
  const [unit, setUnit] = useState('')
  const [normalRangeMale, setNormalRangeMale] = useState('')
  const [normalRangeFemale, setNormalRangeFemale] = useState('')
  const [normalRangePediatric, setNormalRangePediatric] = useState('')
  const [parameters, setParameters] = useState<Array<{ id: string; name: string; unit?: string; normalRangeMale?: string; normalRangeFemale?: string; normalRangePediatric?: string }>>([])
  const [consumables, setConsumables] = useState<Array<{ id: string; item: string; qty: string }>>([])
  const [invOptions, setInvOptions] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setName(initial?.name || '')
      setPrice(initial?.price ?? '0')
      setParameter(initial?.parameter || '')
      setUnit(initial?.unit || '')
      setNormalRangeMale(initial?.normalRangeMale || '')
      setNormalRangeFemale(initial?.normalRangeFemale || '')
      setNormalRangePediatric(initial?.normalRangePediatric || '')
      const initParams = (initial?.parameters || []).map(p=> ({ id: crypto.randomUUID(), name: p.name||'', unit: p.unit||'', normalRangeMale: p.normalRangeMale||'', normalRangeFemale: p.normalRangeFemale||'', normalRangePediatric: p.normalRangePediatric||'' }))
      setParameters(initParams)
      const initCons = (initial?.consumables || []).map(c=> ({ id: crypto.randomUUID(), item: String(c.item||''), qty: String(c.qty||'') }))
      setConsumables(initCons)
      ;(async()=>{
        try{
          const res: any = await labApi.listInventory({ page: 1, limit: 200 })
          const names: string[] = (res?.items || []).map((x:any)=> String(x?.name||'')).filter(Boolean)
          setInvOptions(names)
        } catch { setInvOptions([]) }
      })()
    }
  }, [open, initial])

  if (!open) return null

  const save = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      price: price.trim() || '0',
      parameter: parameter.trim() || undefined,
      unit: unit.trim() || undefined,
      normalRangeMale: normalRangeMale.trim() || undefined,
      normalRangeFemale: normalRangeFemale.trim() || undefined,
      normalRangePediatric: normalRangePediatric.trim() || undefined,
      parameters: parameters
        .map(p=> ({ name: (p.name||'').trim(), unit: (p.unit||'').trim() || undefined, normalRangeMale: (p.normalRangeMale||'').trim() || undefined, normalRangeFemale: (p.normalRangeFemale||'').trim() || undefined, normalRangePediatric: (p.normalRangePediatric||'').trim() || undefined }))
        .filter(p=> !!p.name),
      consumables: consumables
        .map(c=> ({ item: (c.item||'').trim().toLowerCase(), qty: parseInt(String(c.qty||'0'),10) || 0 }))
        .filter(c=> !!c.item && c.qty>0),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4">
      <div className="mt-8 w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg max-h-[85vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-slate-800">{initial ? 'Edit Test' : 'Add New Test'}</div>
          <button onClick={onClose} className="text-slate-500">✖</button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Test Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Enter test name" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Price (PKR)</label>
            <input value={price} onChange={e=>setPrice(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="0" />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-base font-semibold text-slate-800">Consumables (Inventory Items)</div>
            <button type="button" onClick={()=> setConsumables(prev => [...prev, { id: crypto.randomUUID(), item: '', qty: '1' }])} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">+ Add Consumable</button>
          </div>
          <div className="space-y-3">
            {consumables.map((c, idx) => (
              <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-slate-700">Item</label>
                    <input list="lab-inv-items" value={c.item} onChange={e=> setConsumables(prev=> prev.map((x,i)=> i===idx? { ...x, item: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Enter inventory item name" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Qty</label>
                    <input type="number" min={1} value={c.qty} onChange={e=> setConsumables(prev=> prev.map((x,i)=> i===idx? { ...x, qty: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="1" />
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <button type="button" onClick={()=> setConsumables(prev => prev.filter((_,i)=> i!==idx))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Remove</button>
                </div>
              </div>
            ))}
            {consumables.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">No consumables added. Use "+ Add Consumable" to link inventory items that will auto-deduct when this test is performed.</div>
            )}
            <datalist id="lab-inv-items">
              {invOptions.map(n=> <option key={n} value={n} />)}
            </datalist>
          </div>
        </div>

        {/* Removed category, notes, specimen, and fastingRequired fields as requested */}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Parameter</label>
            <input value={parameter} onChange={e=>setParameter(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Enter parameter (optional)" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Unit</label>
            <input value={unit} onChange={e=>setUnit(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Enter unit (optional)" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Normal Range (Male)</label>
            <input value={normalRangeMale} onChange={e=>setNormalRangeMale(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Normal Range (Female)</label>
            <input value={normalRangeFemale} onChange={e=>setNormalRangeFemale(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Normal Range (Pediatric)</label>
            <input value={normalRangePediatric} onChange={e=>setNormalRangePediatric(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-base font-semibold text-slate-800">Parameters</div>
            <button type="button" onClick={()=> setParameters(prev => [...prev, { id: crypto.randomUUID(), name: '', unit: '', normalRangeMale: '', normalRangeFemale: '', normalRangePediatric: '' }])} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">+ Add Parameter</button>
          </div>
          <div className="space-y-3">
            {parameters.map((p, idx) => (
              <div key={p.id} className="rounded-lg border border-slate-200 p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Parameter</label>
                    <input value={p.name} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, name: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Parameter name" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Unit</label>
                    <input value={p.unit||''} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, unit: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Unit (optional)" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Normal Range (Male)</label>
                    <input value={p.normalRangeMale||''} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, normalRangeMale: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Normal Range (Female)</label>
                    <input value={p.normalRangeFemale||''} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, normalRangeFemale: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Normal Range (Pediatric)</label>
                    <input value={p.normalRangePediatric||''} onChange={e=>setParameters(prev=>prev.map((x,i)=> i===idx? { ...x, normalRangePediatric: e.target.value }: x))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="e.g., 3.5-5.0" />
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <button type="button" onClick={()=> setParameters(prev => prev.filter((_,i)=> i!==idx))} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Remove</button>
                </div>
              </div>
            ))}
            {parameters.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500">No parameters added. Use "+ Add Parameter" to add multiple fields that will auto-fill in result entry.</div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={save} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800">{initial ? 'Save Changes' : 'Add Test'}</button>
        </div>
      </div>
    </div>
  )
}
