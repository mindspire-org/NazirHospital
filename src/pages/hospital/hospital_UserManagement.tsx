import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

type User = { _id: string; username: string; role: string }

export default function Hospital_UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<string[]>(['admin','staff'])
  const [newRoleName, setNewRoleName] = useState('')
  const [creatingRole, setCreatingRole] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<string>('staff')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{ _id: string; username: string; role: string } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [addUserError, setAddUserError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const [rolesRes, usersRes] = await Promise.allSettled([
          hospitalApi.listSidebarRoles() as any,
          hospitalApi.listHospitalUsers() as any,
        ])
        if (!mounted) return
        if (rolesRes.status === 'fulfilled'){
          const list = (rolesRes.value?.items || []) as string[]
          if (Array.isArray(list) && list.length) setRoles(list)
        }
        if (usersRes.status === 'fulfilled'){
          const arr = (usersRes.value?.users || usersRes.value?.items || usersRes.value || []) as any[]
          const list: User[] = arr.map((u: any) => ({ _id: String(u._id || u.id), username: u.username, role: u.role }))
          setUsers(list)
        }
      } catch (e) { console.error(e); if (mounted){ setUsers([]) } }
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [])

  const addUser = async () => {
    setAddUserError('')
    if (!newUsername.trim()) { setAddUserError('Username is required'); return }
    if (!newPassword || newPassword.length < 4) { setAddUserError('Password must be at least 4 characters'); return }
    try {
      const created = await hospitalApi.createHospitalUser({ username: newUsername.trim(), password: newPassword, role: newRole }) as any
      const u = created?.user || created
      if (u) setUsers(prev => [...prev, { _id: String(u._id || u.id), username: u.username, role: u.role }])
      setNewUsername(''); setNewPassword(''); setNewRole(roles[0] || 'staff')
      setNotice({ text: 'User added', kind: 'success' })
      try { setTimeout(()=> setNotice(null), 2500) } catch {}
    } catch (e: any) {
      let msg = e?.message || 'Failed to add user'
      try {
        const raw = e?.message
        if (raw && typeof raw === 'string' && raw.trim().startsWith('{')) {
          const j = JSON.parse(raw)
          if (Array.isArray(j?.issues) && j.issues.length) msg = j.issues[0]?.message || j?.message || msg
          else msg = j?.message || j?.error || msg
        }
      } catch {}
      setAddUserError(msg)
    }
  }

  const performDelete = async () => {
    const id = deleteId; if (!id) { setDeleteOpen(false); return }
    try { await hospitalApi.deleteHospitalUser(id); setUsers(prev=> prev.filter(u=> (u._id !== id && u._id !== String(id)) && (u._id !== String((u as any).id)))) ; setNotice({ text: 'User deleted', kind: 'success' }) }
    catch (e){ console.error(e); setNotice({ text: 'Failed to delete user', kind: 'error' }) }
    finally { setDeleteOpen(false); setDeleteId(null); try { setTimeout(()=> setNotice(null), 2500) } catch {} }
  }

  const saveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      const updated = await hospitalApi.updateHospitalUser(editing._id, { username: editing.username, role: editing.role }) as any
      const u = updated?.user || updated
      setUsers(prev => prev.map(x => (x._id === editing._id ? ({ ...x, username: u?.username ?? editing.username, role: u?.role ?? editing.role }) : x)))
      setEditing(null)
    } catch (e) { console.error(e) }
    finally { setSavingEdit(false) }
  }

  const createRole = async () => {
    const role = String(newRoleName || '').trim().toLowerCase()
    if (!role) return
    setCreatingRole(true)
    try {
      await hospitalApi.createSidebarRole(role)
      const next = Array.from(new Set([...(roles || []), role])).sort()
      setRoles(next)
      setNewRoleName('')
      setNewRole(role)
      setNotice({ text: `Role created: ${role}`, kind: 'success' })
      try { setTimeout(()=> setNotice(null), 2500) } catch {}
    } catch (e: any) {
      setNotice({ text: e?.message || 'Failed to create role', kind: 'error' })
      try { setTimeout(()=> setNotice(null), 3000) } catch {}
    } finally { setCreatingRole(false) }
  }

  return (
    <div className="min-h-[70dvh] rounded-xl bg-gradient-to-br from-indigo-500/30 via-fuchsia-300/30 to-cyan-300/30 p-6">
      <div className="mx-auto w-full max-w-7xl rounded-xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xl font-bold text-slate-800">User Management</div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${loading? 'border-slate-200 bg-white text-slate-600':'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            <span className={`h-2 w-2 rounded-full ${loading? 'bg-slate-400':'bg-emerald-500'}`} />
            {loading? 'Loading…' : `${users.length} user${users.length===1?'':'s'}`}
          </div>
        </div>

        {notice && (
          <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${notice.kind==='success'? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="text-sm font-semibold text-slate-800">All Users</div>
            </div>
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide">User</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide">Role</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {users.map(u => (
                      <tr key={u._id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                              {(u.username||'U').slice(0,1).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{u.username}</div>
                              <div className="text-xs text-slate-500">ID: {String(u._id).slice(-6)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3"><span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">{u.role}</span></td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={()=>setEditing({ _id: u._id, username: u.username, role: u.role })} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">Edit</button>
                            <button onClick={()=>{ setDeleteId(u._id); setDeleteOpen(true) }} className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length===0 && !loading && (
                      <tr><td className="px-5 py-8 text-center text-slate-500" colSpan={3}>No users yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-800">Create Role</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input value={newRoleName} onChange={e=>setNewRoleName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. ward-admin" />
                <button type="button" onClick={createRole} disabled={creatingRole || !newRoleName.trim()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50">{creatingRole? 'Creating…' : 'Create'}</button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-800">Add New User</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,1fr)_auto]">
                <input value={newUsername} onChange={e=>setNewUsername(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Username" />
                <select value={newRole} onChange={e=>setNewRole(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm min-w-[140px]">
                  {(roles||[]).map(r=> <option key={r} value={r}>{r}</option>)}
                </select>
                <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Password (min 4 chars)" />
                <button onClick={addUser} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Add User</button>
                {addUserError && <div className="sm:col-span-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{addUserError}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="px-5 py-3 text-base font-semibold text-white" style={{ background: 'linear-gradient(90deg, #0284c7, #2563eb)' }}>Edit User</div>
            <div className="space-y-3 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
                <input value={editing.username} onChange={e=>setEditing(prev=> prev? { ...prev, username: e.target.value } : prev)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                <select value={editing.role} onChange={e=>setEditing(prev=> prev? { ...prev, role: e.target.value } : prev)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  {(roles||[]).map(r=> <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setEditing(null)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={savingEdit} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50">{savingEdit? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Delete</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete this user?</div>
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
