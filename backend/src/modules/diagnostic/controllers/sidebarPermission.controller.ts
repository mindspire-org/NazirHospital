import { Request, Response } from 'express'
import { SidebarPermission } from '../models/SidebarPermission'
import { sidebarPermissionCreateSchema, sidebarPermissionUpdateSchema, sidebarPermissionQuerySchema } from '../validators/sidebarPermission'

// Default sidebar configuration
const defaultSidebarItems = [
  { path: '/diagnostic', label: 'Dashboard', order: 1 },
  { path: '/diagnostic/token-generator', label: 'Token Generator', order: 2 },
  { path: '/diagnostic/tests', label: 'Tests', order: 3 },
  { path: '/diagnostic/sample-tracking', label: 'Sample Tracking', order: 4 },
  { path: '/diagnostic/result-entry', label: 'Result Entry', order: 5 },
  { path: '/diagnostic/report-generator', label: 'Report Generator', order: 6 },
  { path: '/diagnostic/referrals', label: 'Referrals', order: 7 },
  { path: '/diagnostic/audit-logs', label: 'Audit Logs', order: 8 },
  { path: '/diagnostic/settings', label: 'Settings', order: 9 },
  { path: '/diagnostic/user-management', label: 'User Management', order: 10 },
]

// Default visibility by role
const defaultVisibility: Record<string, Array<{ path: string; label: string; visible: boolean; order: number }>> = {
  admin: defaultSidebarItems.map(item => ({ ...item, visible: true })),
}

const defaultAllVisible = defaultSidebarItems.map(item => ({ ...item, visible: true }))

const normalizeRole = (role: string) => String(role || '').trim().toLowerCase()

function getDefaultForRole(role: string) {
  const r = normalizeRole(role)
  const preset = (defaultVisibility as any)[r]
  return Array.isArray(preset) ? preset : defaultAllVisible
}

export async function listRoles(_req: Request, res: Response) {
  let roles = await SidebarPermission.find({}, { role: 1 }).sort({ role: 1 }).lean()
  if (!roles.length) {
    await createDefaultPermissions()
    roles = await SidebarPermission.find({}, { role: 1 }).sort({ role: 1 }).lean()
  }
  const items = roles.map(r => r.role).filter((r: any) => String(r || '').trim().toLowerCase() !== 'superadmin')
  res.json({ items })
}

export async function createRole(req: Request, res: Response) {
  const parsed = sidebarPermissionCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues })
  }

  const actor = (req as any).user?.name || (req as any).user?.email || 'system'
  const role = normalizeRole(parsed.data.role)
  if (!role) return res.status(400).json({ message: 'Role is required' })

  // Disallow creating reserved superadmin role from UI
  if (role === 'superadmin') {
    return res.status(403).json({ message: 'The "superadmin" role is reserved and cannot be created' })
  }

  const existing = await SidebarPermission.findOne({ role }).lean()
  if (existing) return res.status(400).json({ message: 'Role already exists' })

  const created = await SidebarPermission.create({
    role,
    permissions: parsed.data.permissions?.length ? parsed.data.permissions : getDefaultForRole(role),
    updatedBy: actor,
  })

  res.status(201).json(created)
}

export async function deleteRole(req: Request, res: Response) {
  const role = normalizeRole(req.params.role)
  if (!role) return res.status(400).json({ message: 'Role is required' })
  if (['admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ message: 'Default roles cannot be deleted' })
  }

  await SidebarPermission.deleteOne({ role })
  res.json({ ok: true })
}

export async function getPermissions(req: Request, res: Response) {
  const parsed = sidebarPermissionQuerySchema.safeParse(req.query)
  const { role } = parsed.success ? parsed.data as any : {}
  
  const filter: any = {}
  if (role) {
    const r = normalizeRole(role)
    if (r === 'superadmin') {
      return res.status(403).json({ message: 'The "superadmin" role is reserved and cannot be queried' })
    }
    filter.role = r
  }
  
  const permissions = await SidebarPermission.find(filter).lean()
  
  // If no permissions exist, create default ones
  if (permissions.length === 0 && !role) {
    const defaultPerms = await createDefaultPermissions()
    return res.json(defaultPerms)
  }
  
  if (permissions.length === 0 && role) {
    const roleDefault = getDefaultForRole(role)
    const newPerm = await SidebarPermission.create({
      role: normalizeRole(role),
      permissions: roleDefault,
      updatedBy: (req as any).user?.name || 'system'
    })
    return res.json([newPerm])
  }
  
  res.json(permissions)
}

export async function updatePermissions(req: Request, res: Response) {
  const { role } = req.params
  const data = sidebarPermissionUpdateSchema.parse(req.body)
  
  const actor = (req as any).user?.name || (req as any).user?.email || 'system'
  // Disallow modifying reserved superadmin role
  if (normalizeRole(role) === 'superadmin') {
    return res.status(403).json({ message: 'The "superadmin" role is reserved and cannot be modified' })
  }
  
  const updated = await SidebarPermission.findOneAndUpdate(
    { role },
    { 
      permissions: data.permissions,
      updatedBy: actor
    },
    { new: true, upsert: true }
  )
  
  // Log the action
  try {
    const { DiagnosticAuditLog } = await import('../models/AuditLog')
    await DiagnosticAuditLog.create({
      actor,
      action: 'Update Sidebar Permissions',
      label: 'UPDATE_SIDEBAR_PERMISSIONS',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Updated permissions for ${role} role`,
    })
  } catch {}
  
  res.json(updated)
}

export async function resetToDefaults(req: Request, res: Response) {
  const { role } = req.params
  const actor = (req as any).user?.name || (req as any).user?.email || 'system'

  const roleDefault = getDefaultForRole(role)
  
  const reset = await SidebarPermission.findOneAndUpdate(
    { role: normalizeRole(role) },
    { 
      permissions: roleDefault,
      updatedBy: actor
    },
    { new: true, upsert: true }
  )
  
  // Log the action
  try {
    const { DiagnosticAuditLog } = await import('../models/AuditLog')
    await DiagnosticAuditLog.create({
      actor,
      action: 'Reset Sidebar Permissions',
      label: 'RESET_SIDEBAR_PERMISSIONS',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Reset permissions to defaults for ${role} role`,
    })
  } catch {}
  
  res.json(reset)
}

async function createDefaultPermissions() {
  const actor = 'system'
  const role = 'admin'
  const exists = await SidebarPermission.findOne({ role })
  if (!exists) {
    const created = await SidebarPermission.create({
      role,
      permissions: defaultVisibility.admin,
      updatedBy: actor
    })
    return [created]
  }
  return [exists]
}
