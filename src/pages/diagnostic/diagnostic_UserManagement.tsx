import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { diagnosticApi } from '../../utils/api'

type User = { _id: string; username: string; role: string }

export default function Diagnostic_UserManagement() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<User['role']>('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{ _id: string; username: string; role: User['role'] } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [roles, setRoles] = useState<string[]>([])
  const [newRoleName, setNewRoleName] = useState('')
  const [creatingRole, setCreatingRole] = useState(false)
  const [addUserError, setAddUserError] = useState('')

  async function load(){
    setLoading(true)
    try {
      const [rolesRes, usersRes] = await Promise.allSettled([
        (diagnosticApi as any).listSidebarRoles?.() as any,
        diagnosticApi.listUsers() as any,
      ])

      if (rolesRes.status === 'fulfilled') {
        const list = (rolesRes.value?.items || []) as string[]
        if (Array.isArray(list)) {
          setRoles(list)
          if (!newRole && list.length) setNewRole(list[0] as User['role'])
        }
      }

      if (usersRes.status === 'fulfilled') {
        setUsers((usersRes.value?.items || []) as User[])
      }
    } catch (e: any) {
      console.error('Failed to load users', e?.message || e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await load()
      } finally {
        if (!mounted) return
      }
    })()
    return () => { mounted = false }
  }, [])

  const addUser = async () => {
    setAddUserError('')
    if (!newUsername || !newPassword) {
      setAddUserError('Please enter username and password')
      return
    }
    if (newUsername.trim().length < 3) {
      setAddUserError('Username must be at least 3 characters')
      return
    }
    if (newPassword.length < 4) {
      setAddUserError('Password must be at least 4 characters')
      return
    }
    if (!newRole) {
      setAddUserError('Please select a role (or create one first)')
      return
    }
    try {
      const created = await diagnosticApi.createUser({ username: newUsername, role: newRole, password: newPassword }) as any
      setUsers(prev => [...prev, created as User])
      setNewUsername('')
      setNewPassword('')
      setNewRole((roles[0] as any) || '')
    } catch (e: any) {
      let msg = e?.message || 'Failed to add user'
      try {
        const raw = e?.message
        if (raw && typeof raw === 'string' && raw.trim().startsWith('{')) {
          const j = JSON.parse(raw)
          if (Array.isArray(j?.issues) && j.issues.length) {
            const first = j.issues[0]
            msg = first?.message || j?.message || msg
          } else {
            msg = j?.message || j?.error || msg
          }
        }
      } catch {}
      setAddUserError(msg)
    }
  }

  const removeUser = async (_id: string) => {
    try {
      await diagnosticApi.deleteUser(_id)
      setUsers(prev => prev.filter(u => u._id !== _id))
    } catch (e: any) {
      alert(e?.message || 'Failed to delete user')
    }
  }

  const openEdit = (u: User) => setEditing({ _id: u._id, username: u.username, role: u.role })
  const saveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      const updated = await diagnosticApi.updateUser(editing._id, { username: editing.username, role: editing.role }) as any
      setUsers(prev => prev.map(u => (u._id === editing._id ? ({ ...u, username: updated?.username ?? editing.username, role: updated?.role ?? editing.role }) : u)))
      setEditing(null)
    } catch (e: any) {
      // Show lightweight inline error by keeping dialog open; optionally you can add an error text
    } finally {
      setSavingEdit(false)
    }
  }

  const createRole = async () => {
    const role = String(newRoleName || '').trim().toLowerCase()
    if (!role) return
    setCreatingRole(true)
    try {
      await (diagnosticApi as any).createSidebarRole?.(role)
      const next = Array.from(new Set([...(roles || []), role])).sort()
      setRoles(next)
      setNewRoleName('')
      setNewRole(role)
    } catch (e: any) {
      alert(e?.message || 'Failed to create role')
    } finally {
      setCreatingRole(false)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="relative min-h-[70dvh] overflow-hidden rounded-2xl border border-white/20 bg-linear-to-br from-indigo-500/25 via-fuchsia-300/25 to-cyan-300/25 p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-104 w-104 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/20 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">User Management</div>
              <div className="mt-1 text-sm text-slate-600">Create users, assign roles, and control access.</div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${loading ? 'border-slate-200 bg-white/60 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                <span className={`h-2 w-2 rounded-full ${loading ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                {loading ? 'Loading…' : `${users.length} user${users.length === 1 ? '' : 's'}`}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/40 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-200/60 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">All Users</div>
                  <div className="mt-0.5 text-xs text-slate-500">Manage accounts and roles.</div>
                </div>
              </div>

              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50/70 text-slate-700">
                      <tr>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide">User</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide">Role</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 text-slate-800">
                      {users.map(u => (
                        <tr key={u._id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-sky-500 to-indigo-600 text-sm font-semibold text-white shadow-sm">
                                {(u.username || 'U').slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900">{u.username}</div>
                                <div className="text-xs text-slate-500">ID: {String(u._id).slice(-6)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => openEdit(u)}
                                className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => removeUser(u._id)}
                                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && !loading && (
                        <tr>
                          <td className="px-5 py-10 text-center text-slate-500" colSpan={3}>
                            No users yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-white/40 bg-white/80 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Add New User</div>
                    <div className="mt-0.5 text-xs text-slate-500">Create a user and assign a role.</div>
                  </div>
                  <div className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white dark:bg-slate-700">Healthspire</div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Create role</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      value={newRoleName}
                      onChange={e=>setNewRoleName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-200/60"
                      placeholder="e.g. cashier"
                    />
                    <button
                      type="button"
                      onClick={createRole}
                      disabled={creatingRole || !newRoleName.trim()}
                      className="rounded-xl bg-linear-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-200/60 transition hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 dark:shadow-none"
                    >
                      {creatingRole ? 'Creating…' : 'Create'}
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">User details</div>
                  <div className="mt-2 grid gap-3">
                    <input
                      value={newUsername}
                      onChange={e=>setNewUsername(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-200/60"
                      placeholder="Username"
                    />

                    <select
                      value={newRole}
                      onChange={e=>setNewRole(e.target.value as User['role'])}
                      className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-200/60"
                    >
                      {!newRole && <option value="" disabled>Select role</option>}
                      {(roles || []).map(r => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>

                    <input
                      type="password"
                      value={newPassword}
                      onChange={e=>setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-200/60"
                      placeholder="Password (min 4 chars)"
                    />

                    <button
                      type="button"
                      onClick={addUser}
                      className="w-full rounded-xl bg-linear-to-r from-sky-600 via-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-sky-200/60 transition hover:from-sky-700 hover:via-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-sky-300/70 dark:shadow-none"
                    >
                      Add User
                    </button>

                    {addUserError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                        {addUserError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/40 bg-white/70 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-md">
                <div className="text-sm font-semibold text-slate-900">Tip</div>
                <div className="mt-1 text-sm text-slate-600">
                  Create a role, then configure its module visibility in{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/diagnostic/sidebar-permissions')}
                    className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:decoration-slate-500"
                  >
                    Sidebar Permissions
                  </button>
                  .
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
            <div className="bg-linear-to-r from-sky-600 via-blue-600 to-indigo-600 px-5 py-4 text-white">
              <div className="text-lg font-semibold">Edit User</div>
              <div className="mt-0.5 text-xs text-white/80">Update username and role.</div>
            </div>
            <div className="space-y-3">
              <div className="px-5 pt-5">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Username</label>
                <input value={editing.username} onChange={e=>setEditing(prev => prev ? { ...prev, username: e.target.value } : prev)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-sky-900/40" />
              </div>
              <div className="px-5">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Role</label>
                <select value={editing.role} onChange={e=>setEditing(prev => prev ? { ...prev, role: e.target.value as User['role'] } : prev)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-sky-900/40">
                  {(roles || []).map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-4">
              <button type="button" onClick={()=>setEditing(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={savingEdit} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-950 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-700">{savingEdit ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
