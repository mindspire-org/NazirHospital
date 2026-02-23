import { useEffect, useState } from 'react'
import BB_KpiCard from '../../../components/lab/bloodbank/BB_KpiCard'
import { Pencil, Trash2 } from 'lucide-react'
import BB_AddBag from '../../../components/lab/bloodbank/BB_AddBag'
import { labApi } from '../../../utils/api'

type Row = { dbid: string; id:string; donor:string; type:string; vol:number; coll:string; exp:string; status:string }

export default function Lab_BB_Inventory(){
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState<Row | undefined>(undefined)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [q, setQ] = useState('')
  const [qDraft, setQDraft] = useState('')
  const [statusFilter, setStatusFilter] = useState<''|'Available'|'Quarantined'|'Used'|'Expired'>('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sumRefreshTick, setSumRefreshTick] = useState(0)
  const [sumTotal, setSumTotal] = useState(0)
  const [sumExpSoon, setSumExpSoon] = useState(0)
  const [sumShortages, setSumShortages] = useState<string[]>([])

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      setLoading(true)
      try {
        const res = await labApi.listBBInventory({ q: q || undefined, status: statusFilter || undefined, type: typeFilter || undefined, page, limit })
        if (!mounted) return
        const mapped: Row[] = (res.items || []).map((b: any)=>({
          dbid: b._id,
          id: b.bagId || '',
          donor: b.donorName || '',
          type: b.bloodType || '',
          vol: b.volume || 0,
          coll: b.collectionDate || '',
          exp: b.expiryDate || '',
          status: b.status || 'Available',
        }))
        setRows(mapped)
        setTotal(res.total || 0)
        setTotalPages(res.totalPages || 1)
      } finally { setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [page, limit, q, statusFilter, typeFilter])
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const s = await labApi.bbInventorySummary()
        if (!mounted) return
        setSumTotal(s.total || 0)
        setSumExpSoon(s.expiringSoon || 0)
        setSumShortages(Array.isArray(s.shortages) ? s.shortages : [])
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [sumRefreshTick])
  const totalUnits = sumTotal
  const expiringSoon = sumExpSoon
  const shortages = sumShortages.length ? sumShortages.join(', ') : '—'
  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">Blood Bag Inventory</div>
          <div className="text-sm text-slate-500">Manage collected units, track expiration, and monitor status.</div>
        </div>
        <button onClick={()=>setOpenAdd(true)} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">+ Add New Bag</button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <BB_KpiCard title="Total Units" value={<span>{totalUnits}</span>} hint="" color="emerald" />
        <BB_KpiCard title="Expiring Soon" value={<span>{expiringSoon}</span>} hint="Within 7 days" color="amber" />
        <BB_KpiCard title="Critical Shortage" value={<span>{shortages}</span>} hint="Based on critical groups" color="rose" />
        <BB_KpiCard title="New Donors" value={<span>0</span>} hint="Today" color="sky" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={qDraft} onChange={e=>setQDraft(e.target.value)} placeholder="Search by Bag ID or Donor Name..." className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={()=>{ setPage(1); setQ(qDraft.trim()); }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Search</button>
        <select value={typeFilter} onChange={e=>{ setPage(1); setTypeFilter(e.target.value) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Types</option>
          {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(t=> <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>{ setPage(1); setStatusFilter(e.target.value as any) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option>Available</option>
          <option>Quarantined</option>
          <option>Used</option>
          <option>Expired</option>
        </select>
        <button onClick={()=>{ setQ(''); setQDraft(''); setTypeFilter(''); setStatusFilter(''); setPage(1) }} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Clear</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <th className="w-48 px-3 py-2">Bag ID / Donor</th>
              <th className="w-24 px-3 py-2">Blood Type</th>
              <th className="w-24 px-3 py-2">Volume (ml)</th>
              <th className="w-32 px-3 py-2">Collection Date</th>
              <th className="w-32 px-3 py-2">Expires</th>
              <th className="w-28 px-3 py-2">Status</th>
              <th className="w-24 px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">No inventory records. Use "Add New Bag" to create an entry.</td>
              </tr>
            ) : rows.map((r) => (
              <tr key={r.dbid}>
                <td className="px-3 py-2"><div className="font-medium">{r.id}</div><div className="text-xs text-slate-500">{r.donor}</div></td>
                <td className="px-3 py-2">
                  <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">{r.type}</span>
                </td>
                <td className="px-3 py-2">{r.vol} ml</td>
                <td className="px-3 py-2">{r.coll}</td>
                <td className="px-3 py-2">
                  <span className={`text-sm ${r.status==='Expired' ? 'text-rose-600 font-semibold' : ''}`}>{r.exp}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${r.status==='Available'?'bg-emerald-100 text-emerald-700': r.status==='Quarantined'?'bg-amber-100 text-amber-700': r.status==='Expired'?'bg-rose-100 text-rose-700': 'bg-slate-100 text-slate-700'}`}>{r.status}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button title="Edit" onClick={()=>{ setEditing(r); setOpenEdit(true) }} className="rounded-md p-1 hover:bg-slate-100"><Pencil className="h-4 w-4"/></button>
                    <button title="Delete" onClick={async ()=>{
                      try {
                        await labApi.deleteBBBag(r.dbid)
                        const res = await labApi.listBBInventory({ page, limit })
                        if ((res.items||[]).length === 0 && page > 1) {
                          setPage(p=> Math.max(1, p-1))
                        } else {
                          const mapped: Row[] = (res.items || []).map((b: any)=>({
                            dbid: b._id,
                            id: b.bagId || '',
                            donor: b.donorName || '',
                            type: b.bloodType || '',
                            vol: b.volume || 0,
                            coll: b.collectionDate || '',
                            exp: b.expiryDate || '',
                            status: b.status || 'Available',
                          }))
                          setRows(mapped)
                          setTotal(res.total || 0)
                          setTotalPages(res.totalPages || 1)
                        }
                        setSumRefreshTick(t=>t+1)
                      } catch {}
                    }} className="rounded-md p-1 hover:bg-rose-50 text-rose-600"><Trash2 className="h-4 w-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-3 py-2 text-sm text-slate-600">
          <div>Page {page} of {totalPages} • {total} total</div>
          <div className="flex items-center gap-2">
            <button disabled={loading || page<=1} onClick={()=>setPage(p=> Math.max(1, p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Prev</button>
            <button disabled={loading || page>=totalPages} onClick={()=>setPage(p=> p+1)} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50">Next</button>
            <select value={limit} onChange={e=>{ setPage(1); setLimit(Number(e.target.value)) }} className="rounded-md border border-slate-300 px-2 py-1">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>
      <BB_AddBag open={openAdd} onClose={()=>setOpenAdd(false)} onCreate={async (r)=>{
        try {
          await labApi.createBBBag({
            bagId: r.id,
            donorName: r.donor,
            bloodType: r.type,
            volume: r.vol,
            collectionDate: r.coll,
            expiryDate: r.exp,
            status: r.status,
            notes: (r as any).notes,
          })
          setOpenAdd(false)
          setPage(1)
          setSumRefreshTick(t=>t+1)
        } catch {}
      }} />
      <BB_AddBag open={openEdit} mode="edit" initial={editing ? { id: editing.id, donor: editing.donor, type: editing.type, vol: editing.vol, coll: editing.coll, exp: editing.exp, status: editing.status } : undefined}
        onClose={()=>setOpenEdit(false)}
        onUpdate={async (r)=>{
          if (!editing) return
          try {
            await labApi.updateBBBag(editing.dbid, {
              bagId: r.id,
              donorName: r.donor,
              bloodType: r.type,
              volume: r.vol,
              collectionDate: r.coll,
              expiryDate: r.exp,
              status: r.status,
              notes: (r as any).notes,
            })
            setOpenEdit(false)
            // Refresh current page
            const res = await labApi.listBBInventory({ q: q || undefined, status: statusFilter || undefined, type: typeFilter || undefined, page, limit })
            const mapped: Row[] = (res.items || []).map((b: any)=>({
              dbid: b._id,
              id: b.bagId || '',
              donor: b.donorName || '',
              type: b.bloodType || '',
              vol: b.volume || 0,
              coll: b.collectionDate || '',
              exp: b.expiryDate || '',
              status: b.status || 'Available',
            }))
            setRows(mapped)
            setTotal(res.total || 0)
            setTotalPages(res.totalPages || 1)
            setSumRefreshTick(t=>t+1)
          } catch {}
        }}
      />
    </div>
  )
}
