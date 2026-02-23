import { useEffect, useMemo, useState } from 'react'
import Hospital_AddStaffDialog, { type PharmacyStaff } from '../../components/hospital/hospital_AddStaffDialog'
import Hospital_StaffEarningsDialog from '../../components/hospital/hospital_StaffEarningsDialog'
import { hospitalApi } from '../../utils/api'

type Shift = { id: string; name: string }
type BiometricLink = { deviceId: string; enrollId: string }
type DeviceUser = { enrollId: string; name?: string }
type StaffRow = PharmacyStaff & { biometric?: BiometricLink | null }

export default function Pharmacy_StaffManagement(){
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<PharmacyStaff | null>(null)
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [reloadTick, setReloadTick] = useState(0)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [earningsOpen, setEarningsOpen] = useState(false)
  const [earningsStaff, setEarningsStaff] = useState<{ id: string; name: string } | null>(null)

  const [fetchingBio, setFetchingBio] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [connectStaff, setConnectStaff] = useState<{ id: string; name: string; existing?: BiometricLink | null } | null>(null)
  const [deviceUsers, setDeviceUsers] = useState<DeviceUser[]>([])
  const [selectedEnrollId, setSelectedEnrollId] = useState('')
  const [loadingDeviceUsers, setLoadingDeviceUsers] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(()=>{
    let mounted = true
    ;(async () => {
      try {
        const [staffRes, shiftRes] = await Promise.all([
          (hospitalApi as any).listStaff(),
          (hospitalApi as any).listShifts(),
        ])
        if (!mounted) return
        const rawStaff: any[] = (staffRes?.staff || staffRes?.items || staffRes || [])
        const list: StaffRow[] = rawStaff.map((x:any)=>({
          id: x._id,
          name: x.name,
          position: x.position || x.role || '',
          phone: x.phone,
          joinDate: x.joinDate || '',
          address: x.address || '',
          status: x.status || (x.active===false? 'Inactive' : 'Active'),
          salary: x.salary,
          shiftId: x.shiftId,
          biometric: x.biometric || null,
        }))
        setStaff(list)
        setTotal(Number(staffRes?.total || list.length || 0))
        setTotalPages(Number(staffRes?.totalPages || 1))
        const rawShifts: any[] = (shiftRes?.items || shiftRes?.shifts || shiftRes || [])
        setShifts(rawShifts.map((x:any)=>({ id: x._id, name: x.name })))
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [page, limit, reloadTick])

  const addStaff = async (s: PharmacyStaff) => {
    await hospitalApi.createStaff({
      name: s.name,
      role: s.position as any,
      phone: s.phone,
      salary: s.salary,
      shiftId: s.shiftId,
      joinDate: s.joinDate,
      address: s.address,
      active: s.status !== 'Inactive',
    })
    setReloadTick(t=>t+1)
  }

  const runFetch = async () => {
    try {
      setFetchingBio(true)
      await (hospitalApi as any).fetchBiometricNow()
      setNotice({ text: 'Sync started…', kind: 'success' })
      // Poll status for a short time; when it finishes, refresh list automatically.
      try {
        const startedAt = Date.now()
        const poll = async () => {
          const s: any = await (hospitalApi as any).biometricStatus?.()
          if (s?.running) return false
          return true
        }
        let done = false
        while (!done && (Date.now() - startedAt) < 60_000) {
          await new Promise(r => setTimeout(r, 2000))
          try { done = await poll() } catch {}
        }
      } catch {}
      setReloadTick(t=>t+1)
    } catch (e) {
      console.error(e)
      setNotice({ text: 'Failed to fetch biometric logs', kind: 'error' })
    } finally {
      setFetchingBio(false)
      try { setTimeout(()=> setNotice(null), 2500) } catch {}
    }
  }

  const openConnect = async (s: StaffRow) => {
    setConnectStaff({ id: s.id, name: s.name, existing: (s as any).biometric || null })
    setSelectedEnrollId(String((s as any)?.biometric?.enrollId || ''))
    setConnectOpen(true)
    setLoadingDeviceUsers(true)
    try {
      const res = await (hospitalApi as any).listBiometricDeviceUsers()
      const users: DeviceUser[] = (res?.users || []).map((u:any)=>({ enrollId: String(u.enrollId||''), name: String(u.name||'') }))
      setDeviceUsers(users.filter(u => !!u.enrollId))
    } catch (e) {
      console.error(e)
      setDeviceUsers([])
    } finally {
      setLoadingDeviceUsers(false)
    }
  }

  const doConnect = async () => {
    if (!connectStaff?.id) return
    const enrollId = String(selectedEnrollId || '').trim()
    if (!enrollId) {
      setNotice({ text: 'Please select biometric enroll ID', kind: 'error' })
      try { setTimeout(()=> setNotice(null), 2500) } catch {}
      return
    }
    try {
      setConnecting(true)
      await (hospitalApi as any).connectStaffBiometric(connectStaff.id, { enrollId })
      setNotice({ text: 'Staff connected to biometric ID', kind: 'success' })
      setConnectOpen(false)
      setConnectStaff(null)
      setSelectedEnrollId('')
      setReloadTick(t=>t+1)
    } catch (e) {
      console.error(e)
      setNotice({ text: 'Failed to connect staff', kind: 'error' })
    } finally {
      setConnecting(false)
      try { setTimeout(()=> setNotice(null), 2500) } catch {}
    }
  }
  const requestDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true) }
  const performDelete = async () => {
    const id = deleteId; if (!id) { setDeleteOpen(false); return }
    try { await hospitalApi.deleteStaff(id); setReloadTick(t=>t+1); setNotice({ text: 'Staff deleted', kind: 'success' }) }
    catch(e){ console.error(e); setNotice({ text: 'Failed to delete staff', kind: 'error' }) }
    finally { setDeleteOpen(false); setDeleteId(null); try { setTimeout(()=> setNotice(null), 2500) } catch {} }
  }
  const openEdit = (row: PharmacyStaff) => { setEditing(row); setEditOpen(true) }
  const saveEdit = async (updated: PharmacyStaff) => {
    await hospitalApi.updateStaff(updated.id, {
      name: updated.name,
      role: updated.position as any,
      phone: updated.phone,
      salary: updated.salary,
      shiftId: updated.shiftId,
      joinDate: updated.joinDate,
      address: updated.address,
      active: updated.status !== 'Inactive',
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
          <button onClick={runFetch} disabled={fetchingBio} className="btn-outline-navy disabled:opacity-50">{fetchingBio ? 'Fetching…' : 'Fetch'}</button>
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
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Shift</th>
                <th className="px-4 py-2 font-medium">Salary</th>
                <th className="px-4 py-2 font-medium">Join Date</th>
                <th className="px-4 py-2 font-medium">Biometric ID</th>
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
                  <td className="px-4 py-2">{(s as any)?.biometric?.enrollId ? String((s as any).biometric.enrollId) : '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button onClick={()=>openConnect(s)} className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700">Connect</button>
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

      <Hospital_AddStaffDialog open={addOpen} onClose={()=>setAddOpen(false)} onSave={addStaff} />
      <Hospital_AddStaffDialog open={editOpen} onClose={()=>setEditOpen(false)} onSave={saveEdit} initial={editing ?? undefined} title="Edit Staff" submitLabel="Save" />
      {earningsStaff && (
        <Hospital_StaffEarningsDialog
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

      {connectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Connect Biometric</div>
            <div className="px-5 py-4 text-sm text-slate-700 space-y-3">
              <div>
                <div className="text-xs text-slate-500">Staff</div>
                <div className="font-medium text-slate-800">{connectStaff?.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Enroll ID</div>
                <select
                  value={selectedEnrollId}
                  onChange={e=>setSelectedEnrollId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  disabled={loadingDeviceUsers}
                >
                  <option value="">— Select enroll ID —</option>
                  {deviceUsers.map(u => (
                    <option key={u.enrollId} value={u.enrollId}>
                      {u.enrollId}{u.name ? ` — ${u.name}` : ''}
                    </option>
                  ))}
                </select>
                {loadingDeviceUsers && (
                  <div className="mt-2 text-xs text-slate-500">Loading device users…</div>
                )}
                {!loadingDeviceUsers && deviceUsers.length === 0 && (
                  <div className="mt-2 text-xs text-slate-500">No device users found (or device unreachable)</div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button
                onClick={()=>{ setConnectOpen(false); setConnectStaff(null); setSelectedEnrollId('') }}
                className="btn-outline-navy"
                disabled={connecting}
              >
                Cancel
              </button>
              <button onClick={doConnect} className="btn disabled:opacity-50" disabled={connecting}>
                {connecting ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// shiftName helper removed
