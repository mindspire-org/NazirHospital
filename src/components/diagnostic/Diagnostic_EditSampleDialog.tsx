import { useEffect, useMemo, useState } from 'react'
import { diagnosticApi } from '../../utils/api'

export type EditSamplePayload = {
  tests?: string[]
  patient?: {
    mrn?: string
    fullName?: string
    phone?: string
    age?: string
    gender?: string
    address?: string
    guardianRelation?: string
    guardianName?: string
    cnic?: string
  }
  subtotal?: number
  discount?: number
  net?: number
}

export default function Diagnostic_EditSampleDialog({
  open,
  onClose,
  order,
  onSaved,
}: {
  open: boolean
  onClose: ()=>void
  order: { id: string; patient: any; tests: string[] }
  onSaved: (updated: any)=>void
}){
  const [loading, setLoading] = useState(false)
  const [tests, setTests] = useState<Array<{ id: string; name: string; price: number }>>([])
  const [selected, setSelected] = useState<string[]>(order.tests || [])

  const [fullName, setFullName] = useState(order.patient?.fullName || '')
  const [phone, setPhone] = useState(order.patient?.phone || '')
  const [mrn, setMrn] = useState(order.patient?.mrn || '')
  const [cnic, setCnic] = useState(order.patient?.cnic || '')
  const [guardianName, setGuardianName] = useState(order.patient?.guardianName || '')
  const [address, setAddress] = useState(order.patient?.address || '')
  const [discount, setDiscount] = useState<number>(0)

  useEffect(()=>{ (async()=>{
    try { const res = await diagnosticApi.listTests({ limit: 1000 }) as any; setTests((res?.items||res||[]).map((t:any)=>({ id: String(t._id||t.id), name: t.name, price: Number(t.price||0) })))} catch { setTests([]) }
  })() }, [])

  useEffect(()=>{ setSelected(order.tests||[]) }, [order.id])

  const priceMap = useMemo(()=> Object.fromEntries(tests.map(t=>[t.id, Number(t.price||0)])), [tests])
  const subtotal = useMemo(()=> selected.reduce((s,id)=> s + Number(priceMap[id]||0), 0), [selected, priceMap])
  const net = Math.max(0, subtotal - Number(discount||0))

  async function save(){
    if (loading) return
    setLoading(true)
    try {
      const payload: EditSamplePayload = {
        tests: selected,
        patient: {
          mrn: mrn || undefined,
          fullName: fullName || undefined,
          phone: phone || undefined,
          address: address || undefined,
          guardianName: guardianName || undefined,
          cnic: cnic || undefined,
        },
        subtotal,
        discount: Number(discount)||0,
        net,
      }
      const updated = await diagnosticApi.updateOrder(order.id, payload)
      onSaved(updated)
      onClose()
    } catch (e) {
      alert('Failed to save changes')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-lg font-semibold text-slate-800">Edit Sample</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-600">Patient Name</label>
            <input value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Phone</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">MR Number</label>
            <input value={mrn} onChange={e=>setMrn(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">CNIC</label>
            <input value={cnic} onChange={e=>setCnic(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-600">Guardian Name</label>
            <input value={guardianName} onChange={e=>setGuardianName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-600">Address</label>
            <input value={address} onChange={e=>setAddress(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold text-slate-800">Tests</div>
          <div className="flex flex-wrap gap-2">
            {tests.map(t => {
              const active = selected.includes(t.id)
              return (
                <button key={t.id} onClick={()=> setSelected(prev => active ? prev.filter(x=>x!==t.id) : [...prev, t.id])} className={`rounded-md border px-2 py-1 text-xs ${active? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                  {t.name} · PKR {t.price.toLocaleString()}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-slate-600">Subtotal</div>
            <div className="text-lg font-semibold">PKR {subtotal.toLocaleString()}</div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-slate-600">Discount</div>
            <input type="number" value={discount} onChange={e=> setDiscount(Number(e.target.value||0))} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1" />
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-slate-600">Net</div>
            <div className="text-lg font-semibold">PKR {net.toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
          <button onClick={save} disabled={loading || selected.length===0 || !fullName} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{loading? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  )
}
