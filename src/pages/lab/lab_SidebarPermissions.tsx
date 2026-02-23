import { useEffect, useRef, useState } from 'react'
import { labApi } from '../../utils/api'
import { labSidebarNav } from '../../components/lab/lab_Sidebar'

type Permission = {
  path: string
  label: string
  visible: boolean
  order: number
}

type RolePermissions = {
  _id: string
  role: string
  permissions: Permission[]
  updatedBy?: string
}

export default function Lab_SidebarPermissions() {
  const [roles, setRoles] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState<string>('admin')
  const [permissions, setPermissions] = useState<RolePermissions[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [creatingRole, setCreatingRole] = useState(false)
  const [allowedPages, setAllowedPages] = useState<string[] | null>(null)

  const allowedPaths = (() => {
    if (!allowedPages) return null
    const allowedLabels = new Set(
      allowedPages
        .map(p => String(p || '').trim())
        .filter(Boolean)
    )
    const set = new Set<string>()
    for (const item of labSidebarNav) {
      if (allowedLabels.has(item.label)) set.add(item.to)
    }
    return set
  })()

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    setToast({ type, message })
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
        toastTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const info = await (window as any).electronAPI?.getLicenseInfo?.()
        if (!mounted) return
        if (Array.isArray(info?.allowedPages)) setAllowedPages(info.allowedPages)
        else setAllowedPages(null)
      } catch {
        if (mounted) setAllowedPages(null)
      }
    })()
    return () => { mounted = false }
  }, [])

  const normalizePermissions = (perms: Permission[]) => {
    const existing = new Map(perms.map(p => [p.path, p]))
    let nextOrder = (perms || []).reduce((m, p) => Math.max(m, Number(p.order || 0)), 0)

    const allowedNav = allowedPaths ? labSidebarNav.filter(i => allowedPaths.has(i.to)) : labSidebarNav

    const merged: Permission[] = allowedNav.map((item, idx) => {
      const cur = existing.get(item.to)
      if (cur) {
        return {
          ...cur,
          label: item.label,
          order: Number(cur.order || (idx + 1)),
        }
      }
      nextOrder += 1
      return {
        path: item.to,
        label: item.label,
        visible: true,
        order: nextOrder,
      }
    })

    const extra = (perms || []).filter(p => {
      if (allowedPaths && !allowedPaths.has(p.path)) return false
      return !allowedNav.some(i => i.to === p.path)
    })

    const out = merged.concat(extra)
    out.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    return out
  }

  const loadPermissions = async () => {
    setLoading(true)
    try {
      try {
        const r = await labApi.listSidebarRoles() as any
        const list = (r?.items || []) as string[]
        if (Array.isArray(list)) {
          setRoles(list)
          if (!selectedRole || !list.includes(selectedRole)) {
            setSelectedRole(list.includes('admin') ? 'admin' : (list[0] || 'admin'))
          }
        }
      } catch {}

      const res = await labApi.listSidebarPermissions()
      const list: RolePermissions[] = (res || []).map((rp: any) => ({
        ...rp,
        permissions: normalizePermissions((rp?.permissions || []) as Permission[]),
      }))
      setPermissions(list)
    } catch (error) {
      console.error('Failed to load permissions:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPermissions()
  }, [])

  const currentPermissions = permissions.find(p => p.role === selectedRole)

  const createRole = async () => {
    const role = String(newRoleName || '').trim().toLowerCase()
    if (!role) return
    setCreatingRole(true)
    try {
      await labApi.createSidebarRole(role)
      showToast('success', `Role created: ${role}`)
      setNewRoleName('')
      await loadPermissions()
      setSelectedRole(role)
    } catch (error: any) {
      console.error('Failed to create role:', error)
      showToast('error', error?.message || 'Failed to create role')
    }
    setCreatingRole(false)
  }

  const deleteRole = async (role: string) => {
    if (!confirm(`Delete role "${role}"? Users assigned to this role should be updated first.`)) return
    try {
      await labApi.deleteSidebarRole(role)
      showToast('success', `Role deleted: ${role}`)
      await loadPermissions()
    } catch (error: any) {
      console.error('Failed to delete role:', error)
      showToast('error', error?.message || 'Failed to delete role')
    }
  }

  const toggleVisibility = (path: string) => {
    if (!currentPermissions) return

    const updated = {
      ...currentPermissions,
      permissions: currentPermissions.permissions.map(p =>
        p.path === path ? { ...p, visible: !p.visible } : p
      )
    }

    setPermissions(permissions.map(p => p.role === selectedRole ? updated : p))
  }

  const reorderItem = (path: string, direction: 'up' | 'down') => {
    if (!currentPermissions) return

    const perms = [...currentPermissions.permissions]
    const index = perms.findIndex(p => p.path === path)

    if (direction === 'up' && index > 0) {
      ;[perms[index], perms[index - 1]] = [perms[index - 1], perms[index]]
    } else if (direction === 'down' && index < perms.length - 1) {
      ;[perms[index], perms[index + 1]] = [perms[index + 1], perms[index]]
    }

    const updated = {
      ...currentPermissions,
      permissions: perms.map((p, i) => ({ ...p, order: i + 1 }))
    }

    setPermissions(permissions.map(p => p.role === selectedRole ? updated : p))
  }

  const savePermissions = async () => {
    if (!currentPermissions) return

    setSaving(true)
    try {
      await labApi.updateSidebarPermissions(selectedRole, {
        permissions: (allowedPaths
          ? currentPermissions.permissions.filter(p => allowedPaths.has(p.path))
          : currentPermissions.permissions)
      })
      await loadPermissions()
      showToast('success', 'Permissions updated successfully')
    } catch (error) {
      console.error('Failed to save permissions:', error)
      showToast('error', 'Failed to save permissions. Please try again.')
    }
    setSaving(false)
  }

  const resetToDefaults = async () => {
    if (!confirm(`Are you sure you want to reset ${selectedRole} permissions to defaults?`)) return

    setSaving(true)
    try {
      await labApi.resetSidebarPermissions(selectedRole)
      await loadPermissions()
      showToast('success', 'Permissions reset to defaults')
    } catch (error) {
      console.error('Failed to reset permissions:', error)
      showToast('error', 'Failed to reset permissions. Please try again.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading permissions...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-4 top-4 z-60 w-[min(92vw,420px)]">
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ring-1 ring-black/5 ${toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L9.25 10.69 7.28 8.72a.75.75 0 0 0-1.06 1.06l2.5 2.5c.3.3.77.3 1.06 0l4-4Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-4a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h.01a.75.75 0 0 0 .74-.75v-4.5A.75.75 0 0 0 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{toast.type === 'success' ? 'Success' : 'Error'}</div>
              <div className="mt-0.5 text-sm opacity-90">{toast.message}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (toastTimerRef.current) {
                  window.clearTimeout(toastTimerRef.current)
                  toastTimerRef.current = null
                }
                setToast(null)
              }}
              className="ml-1 rounded-md p-1 opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sidebar Permissions</h1>
        <p className="text-slate-600 mt-1">Manage which sidebar pages are visible to different user roles</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Role</label>
          <div className="flex flex-wrap gap-2">
            {roles.map(role => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-md font-medium capitalize transition-colors ${
                  selectedRole === role
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Create new role (e.g. cashier)"
            />
            <button
              type="button"
              onClick={createRole}
              disabled={creatingRole || !newRoleName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-navy rounded-md hover:bg-navy-600 disabled:opacity-50"
            >
              {creatingRole ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </div>

        {currentPermissions && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 capitalize">
                {selectedRole} Permissions
              </h3>
              <div className="flex gap-2">
                {String(selectedRole || '').toLowerCase() !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => deleteRole(selectedRole)}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-50"
                  >
                    Delete Role
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetToDefaults}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 disabled:opacity-50"
                >
                  Reset to Defaults
                </button>
                <button
                  type="button"
                  onClick={savePermissions}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-navy rounded-md hover:bg-navy-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="text-sm text-slate-600 mb-4">
              Last updated by: {currentPermissions.updatedBy || 'Unknown'}
            </div>

            <div className="space-y-2">
              {currentPermissions.permissions
                .sort((a, b) => a.order - b.order)
                .map((permission) => (
                  <div
                    key={permission.path}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{permission.label}</div>
                      <div className="text-xs text-slate-500">{permission.path}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => reorderItem(permission.path, 'up')}
                        disabled={permission.order === 1}
                        className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => reorderItem(permission.path, 'down')}
                        disabled={permission.order === currentPermissions.permissions.length}
                        className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        title="Move down"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleVisibility(permission.path)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          permission.visible ? 'bg-navy' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            permission.visible ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      <span className="text-sm text-slate-600 min-w-[60px]">
                        {permission.visible ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
