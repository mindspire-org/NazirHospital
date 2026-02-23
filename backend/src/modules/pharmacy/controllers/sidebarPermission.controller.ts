import { Request, Response } from 'express'
import { SidebarPermission } from '../models/SidebarPermission'
import { sidebarPermissionCreateSchema, sidebarPermissionUpdateSchema, sidebarPermissionQuerySchema } from '../validators/sidebarPermission'

// Default sidebar configuration
const defaultSidebarItems = [
  { path: '/pharmacy', label: 'Dashboard', order: 1 },
  { path: '/pharmacy/pos', label: 'Point of Sale', order: 2 },
  { path: '/pharmacy/inventory', label: 'Inventory', order: 3 },
  { path: '/pharmacy/customers', label: 'Customers', order: 4 },
  { path: '/pharmacy/suppliers', label: 'Suppliers', order: 5 },
  { path: '/pharmacy/sales-history', label: 'Sales History', order: 6 },
  { path: '/pharmacy/purchase-history', label: 'Purchase History', order: 7 },
  { path: '/pharmacy/return-history', label: 'Return History', order: 8 },
  { path: '/pharmacy/staff-attendance', label: 'Staff Attendance', order: 9 },
  { path: '/pharmacy/staff-management', label: 'Staff Management', order: 10 },
  { path: '/pharmacy/staff-settings', label: 'Staff Settings', order: 11 },
  { path: '/pharmacy/staff-monthly', label: 'Staff Monthly', order: 12 },
  { path: '/pharmacy/reports', label: 'Reports', order: 13 },
  { path: '/pharmacy/guidelines', label: 'Guidelines', order: 14 },
  { path: '/pharmacy/returns', label: 'Customer Return', order: 15 },
  { path: '/pharmacy/supplier-returns', label: 'Supplier Return', order: 16 },
  { path: '/pharmacy/audit-logs', label: 'Audit Logs', order: 17 },
  { path: '/pharmacy/expenses', label: 'Expenses', order: 18 },
  { path: '/pharmacy/settings', label: 'Settings', order: 19 },
  { path: '/pharmacy/user-management', label: 'User Management', order: 20 },
]

// Default visibility by role
const defaultVisibility = {
  admin: defaultSidebarItems.map(item => ({ ...item, visible: true })),
  pharmacist: defaultSidebarItems.map(item => ({
    ...item,
    visible: ['/pharmacy/staff-management', '/pharmacy/staff-settings', '/pharmacy/staff-monthly', '/pharmacy/user-management'].includes(item.path) ? false : true
  })),
  salesman: defaultSidebarItems.map(item => ({
    ...item,
    visible: ['/pharmacy/inventory', '/pharmacy/suppliers', '/pharmacy/purchase-history', '/pharmacy/staff-attendance', '/pharmacy/staff-management', '/pharmacy/staff-settings', '/pharmacy/staff-monthly', '/pharmacy/reports', '/pharmacy/guidelines', '/pharmacy/supplier-returns', '/pharmacy/audit-logs', '/pharmacy/expenses', '/pharmacy/settings', '/pharmacy/user-management'].includes(item.path) ? false : true
  }))
}

const defaultAllVisible = defaultSidebarItems.map(item => ({ ...item, visible: true }))

const normalizeRole = (role: string) => String(role || '').trim().toLowerCase()

function getDefaultForRole(role: string) {
  const r = normalizeRole(role)
  const preset = (defaultVisibility as any)[r]
  return Array.isArray(preset) ? preset : defaultAllVisible
}

export async function listRoles(_req: Request, res: Response) {
  const roles = await SidebarPermission.find({}, { role: 1 }).sort({ role: 1 }).lean()
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
  if (['admin', 'pharmacist', 'salesman', 'superadmin'].includes(role)) {
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
    const { AuditLog } = await import('../models/AuditLog')
    await AuditLog.create({
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
    const { AuditLog } = await import('../models/AuditLog')
    await AuditLog.create({
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
  const permissions = []
  
  for (const [role, items] of Object.entries(defaultVisibility)) {
    const existing = await SidebarPermission.findOne({ role })
    if (!existing) {
      const created = await SidebarPermission.create({
        role,
        permissions: items,
        updatedBy: actor
      })
      permissions.push(created)
    } else {
      permissions.push(existing)
    }
  }
  
  return permissions
}
