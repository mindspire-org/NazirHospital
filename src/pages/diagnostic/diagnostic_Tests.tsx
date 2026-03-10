import { useEffect, useState } from 'react'
import { diagnosticApi } from '../../utils/api'

type Test = { id: string; name: string; price: number }

export default function Diagnostic_Tests(){
  const [items, setItems] = useState<Test[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState(20)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const load = async () => {
    setLoading(true)
    try {
      const res = await diagnosticApi.listTests({ q: q || undefined, type: 'test', page, limit: rows }) as any
      const arr = (res?.items || res || []).map((x:any)=>({ id: String(x._id||x.id), name: x.name, price: Number(x.price||0) }))
      setItems(arr)
      setTotal(Number(res?.total ?? arr.length ?? 0))
      setTotalPages(Number(res?.totalPages ?? 1))
    } catch { setItems([]); setTotal(0); setTotalPages(1) }
    finally { setLoading(false) }
  }
  useEffect(()=>{ load() }, [q, page, rows])

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')

  const openAdd = () => { setEditId(null); setFormName(''); setFormPrice(''); setShowModal(true) }
  const openEdit = (id: string) => {
    const it = items.find(i=>i.id===id); if (!it) return
    setEditId(id); setFormName(it.name); setFormPrice(String(it.price||0)); setShowModal(true)
  }
  const saveModal = async () => {
    if (!formName || !formPrice) return
    const priceNum = Number(formPrice)||0
    try {
      if (editId){
        await diagnosticApi.updateTest(editId, { name: formName, price: priceNum })
      } else {
        await diagnosticApi.createTest({ name: formName, price: priceNum })
        setPage(1)
      }
      await load()
    } catch {}
    setShowModal(false)
  }
  const remove = async (id: string) => {
    try {
      await diagnosticApi.deleteTest(id)
      if (items.length <= 1 && page > 1) setPage(p => Math.max(1, p-1))
      else await load()
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Tests</h2>
        <button onClick={openAdd} className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">+ Add Test</button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[240px]">
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search by test name..." className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span>Rows</span>
            <select value={rows} onChange={e=>{ setRows(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Test Name</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map(it => (
                <tr key={it.id}>
                  <td className="px-3 py-2">{it.name}</td>
                  <td className="px-3 py-2">PKR {Number(it.price||0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button onClick={()=>openEdit(it.id)} className="rounded-md border border-slate-300 px-2 py-1 text-violet-700 hover:bg-violet-50">Edit</button>
                    <button onClick={()=>remove(it.id)} className="rounded-md border border-slate-300 px-2 py-1 text-rose-700 hover:bg-rose-50">Delete</button>
                  </td>
                </tr>
              ))}
              {items.length===0 && (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">{loading ? 'Loading...' : 'No tests yet'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <div>{total === 0 ? '0' : `${Math.min((page-1)*rows+1, total)}-${Math.min((page-1)*rows + items.length, total)}`} of {total}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=> setPage(p=> Math.max(1, p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Prev</button>
            <span>{page} / {Math.max(1, totalPages)}</span>
            <button disabled={page>=Math.max(1, totalPages)} onClick={()=> setPage(p=> p+1)} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">{editId ? 'Edit Test' : 'Add Test'}</h3>
                <p className="text-sm text-slate-600">Enter a test name and set its price.</p>
              </div>
              <button onClick={()=>setShowModal(false)} className="text-slate-500">✖</button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Test Name</label>
                <input value={formName} onChange={e=>setFormName(e.target.value)} placeholder="Enter test name (e.g., MRI Brain, X-Ray Chest)" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Price</label>
                <input type="number" value={formPrice} onChange={e=>setFormPrice(e.target.value)} placeholder="Price" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setShowModal(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveModal} disabled={!formName || !formPrice} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
