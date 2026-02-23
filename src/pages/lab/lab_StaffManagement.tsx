import { useEffect, useMemo, useState } from 'react'
import Lab_AddStaffDialog, { type PharmacyStaff } from '../../components/lab/lab_AddStaffDialog'
import Lab_StaffEarningsDialog from '../../components/lab/lab_StaffEarningsDialog'
import { labApi } from '../../utils/api'

type Shift = { id: string; name: string }

export default function Pharmacy_StaffManagement(){
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<PharmacyStaff | null>(null)
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [staff, setStaff] = useState<PharmacyStaff[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [reloadTick, setReloadTick] = useState(0)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [earningsOpen, setEarningsOpen] = useState(false)
  const [earningsStaff, setEarningsStaff] = useState<{ id: string; name: string } | null>(null)

  useEffect(()=>{
    let mounted = true
    ;(async () => {
      try {
        const [staffRes, shiftRes] = await Promise.all([
          labApi.listStaff({ page, limit }),
          labApi.listShifts(),
        ])
        if (!mounted) return
        const list = (staffRes.items||[]).map((x:any)=>({ id: x._id, name: x.name, position: x.position, phone: x.phone, joinDate: x.joinDate, address: x.address, status: x.status, salary: x.salary, shiftId: x.shiftId }))
        setStaff(list)
        setTotal(Number(staffRes.total || list.length || 0))
        setTotalPages(Number(staffRes.totalPages || 1))
        setShifts((shiftRes.items||[]).map((x:any)=>({ id: x._id, name: x.name })))
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [page, limit, reloadTick])

  const addStaff = async (s: PharmacyStaff) => {
    await labApi.createStaff({
      name: s.name,
      position: s.position,
      phone: s.phone,
      joinDate: s.joinDate,
      address: s.address,
      status: s.status,
      salary: s.salary,
      shiftId: s.shiftId,
    })
    setReloadTick(t=>t+1)
  }
  const requestDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true) }
  const performDelete = async () => {
    const id = deleteId; if (!id) { setDeleteOpen(false); return }
    try { await labApi.deleteStaff(id); setReloadTick(t=>t+1); setNotice({ text: 'Staff deleted', kind: 'success' }) }
    catch(e){ console.error(e); setNotice({ text: 'Failed to delete staff', kind: 'error' }) }
    finally { setDeleteOpen(false); setDeleteId(null); try { setTimeout(()=> setNotice(null), 2500) } catch {} }
  }
  const openEdit = (row: PharmacyStaff) => { setEditing(row); setEditOpen(true) }
  const saveEdit = async (updated: PharmacyStaff) => {
    await labApi.updateStaff(updated.id, {
      name: updated.name,
      position: updated.position,
      phone: updated.phone,
      joinDate: updated.joinDate,
      address: updated.address,
      status: updated.status,
      salary: updated.salary,
      shiftId: updated.shiftId,
    })
    setReloadTick(t=>t+1)
  }

  

  const pageRows = useMemo(()=> staff, [staff])

  return (
    <div className="space-y-4">
      {notice && (
        <div className={`rounded-md border px-3 py-2 text-sm ${notice.kind==='success'? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Staff Management</div>
        <div className="flex items-center gap-2">
          <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button onClick={()=>setAddOpen(true)} className="btn">+ Add Staff</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Position</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Shift</th>
                <th className="px-4 py-2 font-medium">Salary</th>
                <th className="px-4 py-2 font-medium">Join Date</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {pageRows.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.position || '—'}</td>
                  <td className="px-4 py-2">{s.phone || '—'}</td>
                  <td className="px-4 py-2">{s.shiftId ? (shifts.find(x=>x.id===s.shiftId)?.name || '—') : '—'}</td>
                  <td className="px-4 py-2">PKR {Number(s.salary||0).toLocaleString()}</td>
                  <td className="px-4 py-2">{s.joinDate || '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button onClick={()=>openEdit(s)} className="rounded-md bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-700">Edit</button>
                      <button onClick={()=>{ setEarningsStaff({ id: s.id, name: s.name }); setEarningsOpen(true) }} className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700">Earnings</button>
                      <button onClick={()=>requestDelete(s.id)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">No staff records</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div>
            {total > 0 ? (
              <>Showing {Math.min((page-1)*limit + 1, total)}-{Math.min((page-1)*limit + pageRows.length, total)} of {total}</>
            ) : 'No results'}
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <div>Page {page} of {totalPages}</div>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      <Lab_AddStaffDialog open={addOpen} onClose={()=>setAddOpen(false)} onSave={addStaff} />
      <Lab_AddStaffDialog open={editOpen} onClose={()=>setEditOpen(false)} onSave={saveEdit} initial={editing ?? undefined} title="Edit Staff" submitLabel="Save" />
      {earningsStaff && (
        <Lab_StaffEarningsDialog
          open={earningsOpen}
          onClose={()=>{ setEarningsOpen(false); setEarningsStaff(null) }}
          staff={{ id: earningsStaff.id, name: earningsStaff.name }}
        />
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Delete</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete this staff member?</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={()=>{ setDeleteOpen(false); setDeleteId(null) }} className="btn-outline-navy">Cancel</button>
              <button onClick={performDelete} className="btn bg-rose-600 hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// shiftName helper removed
