import { useEffect, useState } from 'react'
import BB_NewReceiverRequest from '../../../components/lab/bloodbank/BB_NewReceiverRequest'
import BB_ReceiverList from '../../../components/lab/bloodbank/BB_ReceiverList'
import BB_ReceiverProfile from '../../../components/lab/bloodbank/BB_ReceiverProfile'
import type { Receiver } from '../../../components/lab/bloodbank/BB_NewReceiverRequest'
import { labApi } from '../../../utils/api'

export default function Lab_BB_Receivers(){
  const [rows, setRows] = useState<Receiver[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editRec, setEditRec] = useState<Receiver | undefined>(undefined)
  const [openProfile, setOpenProfile] = useState(false)
  const [profileRec, setProfileRec] = useState<Receiver | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshTick, setRefreshTick] = useState(0)
  const [q, setQ] = useState('')
  const [qDraft, setQDraft] = useState('')
  const [statusFilter, setStatusFilter] = useState<''|'URGENT'|'PENDING'|'DISPENSED'|'APPROVED'>('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      setLoading(true)
      try {
        const res = await labApi.listBBReceivers({ q: q || undefined, status: statusFilter || undefined, type: typeFilter || undefined, page, limit })
        if (!mounted) return
        const mapped: Receiver[] = (res.items || []).map((d: any)=>({
          id: d._id,
          code: d.code,
          name: d.name,
          status: d.status,
          units: d.units,
          type: d.type || '',
          when: d.when || '',
          phone: d.phone,
          cnic: d.cnic,
          mrNumber: d.mrNumber,
          pid: d.pid,
          ward: d.ward,
          gender: d.gender || '',
          age: d.age,
        }))
        setRows(mapped)
        setTotal(res.total || 0)
        setTotalPages(res.totalPages || 1)
        setSelectedId(undefined)
      } finally { setLoading(false) }
    })()
    return ()=>{ mounted = false }
  }, [page, limit, refreshTick, q, statusFilter, typeFilter])

  const exportCsv = () => {
    const header = ['ID','Name','Status','Units','Type','When']
    const data = rows.map(r => [r.id, r.name, r.status, String(r.units), r.type, r.when])
    const csv = [header, ...data]
      .map(line => line.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'receivers.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">Receiver Details</div>
          <div className="text-sm text-slate-500">Manage patient requests and blood retrieval details.</div>
        </div>
        <div className="flex items-center gap-2">
          <input value={qDraft} onChange={e=>setQDraft(e.target.value)} placeholder="Search name/MR/PID/CNIC" className="w-64 rounded-md border border-slate-300 px-2 py-1 text-sm" />
          <button onClick={()=>{ setPage(1); setQ(qDraft.trim()); }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Search</button>
          <select value={statusFilter} onChange={e=>{ setPage(1); setStatusFilter(e.target.value as any) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
            <option value="">All Status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="DISPENSED">DISPENSED</option>
            <option value="URGENT">URGENT</option>
          </select>
          <select value={typeFilter} onChange={e=>{ setPage(1); setTypeFilter(e.target.value) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
            <option value="">All Types</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t=> <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={exportCsv} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Export List</button>
          <button onClick={()=>setOpenAdd(true)} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">+ New Receiver Request</button>
        </div>
      </div>

      <BB_ReceiverList
        rows={rows}
        selectedId={selectedId}
        onSelect={(id)=>setSelectedId(id)}
        onView={(id)=>{ const rec = rows.find(r=>r.id===id); setProfileRec(rec); setOpenProfile(Boolean(rec)); }}
        onEdit={(id)=>{ const rec = rows.find(r=>r.id===id); setEditRec(rec); setOpenEdit(Boolean(rec)); }}
        onApprove={async (id)=>{
          try {
            await labApi.updateBBReceiver(id, { status: 'APPROVED' })
            setRefreshTick(t=>t+1)
          } catch (e: any) {
            const msg = e?.message || 'Failed to approve receiver'
            alert(msg)
          }
        }}
        onDispense={async (id)=>{
          try {
            await labApi.updateBBReceiver(id, { status: 'DISPENSED' })
            setRefreshTick(t=>t+1)
          } catch (e: any) {
            const msg = e?.message || 'Failed to dispense units'
            alert(msg)
          }
        }}
        onDelete={async (id)=>{
          try {
            await labApi.deleteBBReceiver(id)
            const res = await labApi.listBBReceivers({ q: q || undefined, status: statusFilter || undefined, type: typeFilter || undefined, page, limit })
            if ((res.items||[]).length === 0 && page > 1) {
              setPage(p=> Math.max(1, p-1))
            } else {
              const mapped: Receiver[] = (res.items || []).map((d: any)=>({
                id: d._id,
                code: d.code,
                name: d.name,
                status: d.status,
                units: d.units,
                type: d.type || '',
                when: d.when || '',
                phone: d.phone,
                cnic: d.cnic,
                mrNumber: d.mrNumber,
                pid: d.pid,
                ward: d.ward,
                gender: d.gender || '',
                age: d.age,
              }))
              setRows(mapped)
              setTotal(res.total || 0)
              setTotalPages(res.totalPages || 1)
              setSelectedId(s=> s===id ? undefined : s)
            }
          } catch {}
        }}
      />

      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
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

      <BB_NewReceiverRequest
        open={openAdd}
        onClose={()=>setOpenAdd(false)}
        onCreate={async (r)=>{
          try {
            await labApi.createBBReceiver({
              name: r.name,
              units: r.units,
              type: r.type,
              when: r.when,
              phone: r.phone,
              cnic: r.cnic,
              mrNumber: r.mrNumber,
              pid: r.pid,
              ward: r.ward,
              gender: r.gender,
              age: r.age,
            })
            setOpenAdd(false)
            setPage(1)
            setRefreshTick(t=>t+1)
          } catch {}
        }}
      />

      <BB_NewReceiverRequest
        open={openEdit}
        mode="edit"
        initial={editRec}
        onClose={()=>setOpenEdit(false)}
        onUpdate={async (r)=>{
          try {
            await labApi.updateBBReceiver(r.id, {
              name: r.name,
              units: r.units,
              type: r.type,
              when: r.when,
              phone: r.phone,
              cnic: r.cnic,
              mrNumber: r.mrNumber,
              pid: r.pid,
              ward: r.ward,
              gender: r.gender,
              age: r.age,
            })
            setOpenEdit(false)
            setSelectedId(r.id)
            setRefreshTick(t=>t+1)
          } catch {}
        }}
      />

      <BB_ReceiverProfile
        open={openProfile}
        onClose={()=>setOpenProfile(false)}
        receiver={profileRec}
      />
    </div>
  )
}
