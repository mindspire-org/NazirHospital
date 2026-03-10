import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { hospitalApi } from '../../utils/api'

type Draft = {
  name: string
  category: string
  price: number
  active: boolean
}

export default function Hospital_EmergencyServiceAdd(){
  const navigate = useNavigate()
  const [sp] = useSearchParams()

  const returnTo = useMemo(() => {
    const rt = sp.get('returnTo')
    return rt ? String(rt) : '/hospital/emergency-services'
  }, [sp])

  const [draft, setDraft] = useState<Draft>({
    name: '',
    category: 'Procedure',
    price: 0,
    active: true,
  })
  const [toast, setToast] = useState<ToastState>(null)

  const canSave = draft.name.trim().length > 0

  const save = async () => {
    if (!canSave) return
    try{
      await hospitalApi.createErService({
        name: draft.name.trim(),
        category: draft.category?.trim() || undefined,
        price: Number(draft.price || 0),
        active: Boolean(draft.active),
      })
      navigate(returnTo)
    }catch(e: any){
      setToast({ type: 'error', message: e?.message || 'Failed to save service' })
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600">Emergency</div>
          <h2 className="text-xl font-semibold text-slate-800">Add Service</h2>
          <div className="mt-1 text-xs text-slate-500">Create a service and set its price (frontend scaffold)</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>navigate(returnTo)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Cancel</button>
          <button disabled={!canSave} onClick={save} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">Save</button>
        </div>
      </div>

      <div className="mt-4 max-w-2xl rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="text-sm font-medium text-slate-700">Service Name</div>
            <input
              value={draft.name}
              onChange={e=>setDraft(d => ({ ...d, name: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. ECG"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700">Category</div>
            <input
              value={draft.category}
              onChange={e=>setDraft(d => ({ ...d, category: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Investigation"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700">Price</div>
            <input
              type="number"
              value={draft.price}
              onChange={e=>setDraft(d => ({ ...d, price: Number(e.target.value || 0) }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={draft.active} onChange={e=>setDraft(d => ({ ...d, active: e.target.checked }))} />
              Active
            </label>
          </div>
        </div>
      </div>
      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}
