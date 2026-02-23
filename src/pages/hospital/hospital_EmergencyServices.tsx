import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

type ServiceCatalogItem = {
  id: string
  name: string
  price: number
  category?: string
  active: boolean
}

type SelectedLine = {
  id: string
  qty: number
}

function money(n: number){
  try { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) } catch { return String(n) }
}

export default function Hospital_EmergencyServices(){
  const { id } = useParams()
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [category, setCategory] = useState<string>('All')

  // Demo catalog (frontend only). Later we will load from backend.
  const [catalog] = useState<ServiceCatalogItem[]>([
    { id: 'svc1', name: 'ER Consultation', price: 500, category: 'Consultation', active: true },
    { id: 'svc2', name: 'ECG', price: 800, category: 'Investigation', active: true },
    { id: 'svc3', name: 'Nebulization', price: 300, category: 'Procedure', active: true },
  ])

  const categories = useMemo(()=>{
    const set = new Set<string>()
    for (const c of catalog) if (c.category) set.add(c.category)
    return ['All', ...Array.from(set).sort()]
  }, [catalog])

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    return catalog.filter(s => {
      if (!s.active) return false
      if (category !== 'All' && String(s.category||'') !== category) return false
      if (!qq) return true
      return [s.name, s.category, s.price].filter(Boolean).join(' ').toLowerCase().includes(qq)
    })
  }, [catalog, category, q])

  const [selected, setSelected] = useState<SelectedLine[]>([])
  const selectedSet = useMemo(()=> new Set(selected.map(s => s.id)), [selected])

  const toggleSelect = (svc: ServiceCatalogItem) => {
    if (selectedSet.has(svc.id)) setSelected(prev => prev.filter(l => l.id !== svc.id))
    else setSelected(prev => prev.concat({ id: svc.id, qty: 1 }))
  }

  const goAddService = () => {
    const returnTo = id ? `/hospital/emergency/${encodeURIComponent(String(id))}/services` : '/hospital/emergency-services'
    navigate(`/hospital/emergency-services/add?returnTo=${encodeURIComponent(returnTo)}`)
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600">Emergency</div>
          <h2 className="text-xl font-semibold text-slate-800">Services & Prices</h2>
          <div className="mt-1 text-xs text-slate-500">Case #{id || '—'} (frontend scaffold)</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goAddService} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">Add Service</button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search services..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Service</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-left font-medium">Price</th>
                  <th className="px-3 py-2 text-left font-medium">Add</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map(s => {
                  const isSel = selectedSet.has(s.id)
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">{s.name}</td>
                      <td className="px-3 py-2 text-slate-600">{s.category || '—'}</td>
                      <td className="px-3 py-2">{money(s.price)}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={()=>toggleSelect(s)}
                          className={isSel
                            ? 'rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700'
                            : 'rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50'
                          }
                        >
                          {isSel ? 'Added' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No services found</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  )
}
