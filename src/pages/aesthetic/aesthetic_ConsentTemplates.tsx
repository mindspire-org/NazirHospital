import { useEffect, useState } from 'react'
import { aestheticApi } from '../../utils/api'

export default function Aesthetic_ConsentTemplates(){
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [list, setList] = useState<any[]>([])
  const [edit, setEdit] = useState<null | { _id?: string; name: string; body: string; version?: number; active?: boolean }>(null)

  useEffect(()=>{
    let mounted = true
    ;(async () => {
      try {
        const res: any = await aestheticApi.listConsentTemplates({ search: q || undefined, page, limit })
        if (!mounted) return
        setList(res.items || [])
        setTotal(Number(res.total || 0))
        setTotalPages(Number(res.totalPages || 1))
      } catch {
        setList([]); setTotal(0); setTotalPages(1)
      }
    })()
    return ()=>{ mounted = false }
  }, [q, page, limit])

  const save = async () => {
    if (!edit) return
    const payload: any = { name: (edit.name||'').trim(), body: (edit.body||'').trim(), version: edit.version, active: edit.active }
    if (!edit._id){ await aestheticApi.createConsentTemplate(payload) }
    else { await aestheticApi.updateConsentTemplate(edit._id, payload) }
    setEdit(null)
    setPage(1)
    setQ(q => q)
  }
  const remove = async (id: string) => { await aestheticApi.deleteConsentTemplate(id); setPage(1); setQ(q => q) }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Consent Templates</div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={e=>{ setPage(1); setQ(e.target.value) }} placeholder="Search..." className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={()=>setEdit({ name: '', body: '', version: 1, active: true })} className="btn">+ New Template</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Version</th>
              <th className="px-3 py-2 text-left">Active</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(t => (
              <tr key={t._id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2">{t.version ?? '-'}</td>
                <td className="px-3 py-2">{t.active ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="btn-outline-navy text-xs" onClick={()=>setEdit({ _id: t._id, name: t.name||'', body: t.body||'', version: t.version, active: t.active })}>Edit</button>
                    <button className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50" onClick={()=>remove(t._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={4}>No templates</td></tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-sm">
          <div>{total>0? <>Showing {Math.min((page-1)*limit+1,total)}-{Math.min((page-1)*limit + list.length, total)} of {total}</> : 'No results'}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border px-2 py-1 disabled:opacity-50">Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border px-2 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-base font-semibold mb-3">{edit._id? 'Edit' : 'New'} Template</div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">Name</label>
                <input value={edit.name} onChange={e=>setEdit(s=>s && ({ ...s, name: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Version</label>
                <input type="number" value={edit.version || 1} onChange={e=>setEdit(s=>s && ({ ...s, version: parseInt(e.target.value||'1') }))} className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm">Body</label>
                <textarea rows={10} value={edit.body} onChange={e=>setEdit(s=>s && ({ ...s, body: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input id="ct-active" type="checkbox" checked={!!edit.active} onChange={e=>setEdit(s=>s && ({ ...s, active: e.target.checked }))} />
                <label htmlFor="ct-active" className="text-sm">Active</label>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button className="rounded-md border px-3 py-1.5 text-sm" onClick={()=>setEdit(null)}>Cancel</button>
                <button className="rounded-md bg-fuchsia-700 px-3 py-1.5 text-sm text-white" onClick={save}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
