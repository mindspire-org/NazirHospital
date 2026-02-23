import { Request, Response } from 'express'
import { AestheticSidebarPermission } from '../models/SidebarPermission'
import { sidebarPermissionCreateSchema, sidebarPermissionUpdateSchema, sidebarPermissionQuerySchema } from '../validators/sidebarPermission'

// Default sidebar configuration for Aesthetic
const defaultSidebarItems = [
  { path: '/aesthetic', label: 'Dashboard', order: 1 },
  { path: '/aesthetic/token-generator', label: 'Token Generation', order: 2 },
  { path: '/aesthetic/token-history', label: 'Token History', order: 3 },
  { path: '/aesthetic/procedure-catalog', label: 'Procedure Catalog', order: 4 },
  { path: '/aesthetic/reports', label: 'Reports', order: 5 },
  { path: '/aesthetic/patients', label: 'Patients', order: 6 },
  { path: '/aesthetic/inventory', label: 'Inventory', order: 7 },
  { path: '/aesthetic/suppliers', label: 'Suppliers', order: 8 },
  { path: '/aesthetic/supplier-returns', label: 'Supplier Returns', order: 9 },
  { path: '/aesthetic/purchase-history', label: 'Purchase History', order: 10 },
  { path: '/aesthetic/return-history', label: 'Return History', order: 11 },
  { path: '/aesthetic/expenses', label: 'Expenses', order: 12 },
  { path: '/aesthetic/doctor-management', label: 'Doctor Management', order: 13 },
  { path: '/aesthetic/doctor-schedules', label: 'Doctor Schedules', order: 14 },
  { path: '/aesthetic/appointments', label: 'Appointments', order: 15 },
  { path: '/aesthetic/doctor-finance', label: 'Doctor Finance', order: 16 },
  { path: '/aesthetic/doctor-payouts', label: 'Doctor Payouts', order: 17 },
  { path: '/aesthetic/audit-logs', label: 'Audit Logs', order: 18 },
  { path: '/aesthetic/user-management', label: 'User Management', order: 19 },
  { path: '/aesthetic/notifications', label: 'Notifications', order: 20 },
  { path: '/aesthetic/consent-templates', label: 'Consent Templates', order: 21 },
  { path: '/aesthetic/sidebar-permissions', label: 'Sidebar Permissions', order: 22 },
  { path: '/aesthetic/settings', label: 'Settings', order: 23 },
]

// Default visibility by role for Aesthetic
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
  let roles = await AestheticSidebarPermission.find({}, { role: 1 }).sort({ role: 1 }).lean()
  if (!roles.length) {
    await createDefaultPermissions()
    roles = await AestheticSidebarPermission.find({}, { role: 1 }).sort({ role: 1 }).lean()
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
  if (role === 'superadmin') return res.status(403).json({ message: 'The "superadmin" role is reserved and cannot be created' })

  const existing = await AestheticSidebarPermission.findOne({ role }).lean()
  if (existing) return res.status(400).json({ message: 'Role already exists' })

  const created = await AestheticSidebarPermission.create({
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
  await AestheticSidebarPermission.deleteOne({ role })
  res.json({ ok: true })
}

export async function getPermissions(req: Request, res: Response) {
  const parsed = sidebarPermissionQuerySchema.safeParse(req.query)
  const { role } = parsed.success ? (parsed.data as any) : {}

  const filter: any = {}
  if (role) {
    const r = normalizeRole(role)
    if (r === 'superadmin') return res.status(403).json({ message: 'The "superadmin" role is reserved and cannot be queried' })
    filter.role = r
  }

  const permissions = await AestheticSidebarPermission.find(filter).lean()

  if (permissions.length === 0 && !role) {
    const defaults = await createDefaultPermissions()
    return res.json(defaults)
  }

  if (permissions.length === 0 && role) {
    const roleDefault = getDefaultForRole(role)
    const newPerm = await AestheticSidebarPermission.create({ role: normalizeRole(role), permissions: roleDefault, updatedBy: (req as any).user?.name || 'system' })
    return res.json([newPerm])
  }

  res.json(permissions)
}

export async function updatePermissions(req: Request, res: Response) {
  const { role } = req.params
  const data = sidebarPermissionUpdateSchema.parse(req.body)
  const actor = (req as any).user?.name || (req as any).user?.email || 'system'
  if (normalizeRole(role) === 'superadmin') {
    return res.status(403).json({ message: 'The "superadmin" role is reserved and cannot be modified' })
  }

  const updated = await AestheticSidebarPermission.findOneAndUpdate(
    { role: normalizeRole(role) },
    { permissions: data.permissions, updatedBy: actor },
    { new: true, upsert: true }
  )

  res.json(updated)
}

export async function resetToDefaults(req: Request, res: Response) {
  const { role } = req.params
  const actor = (req as any).user?.name || (req as any).user?.email || 'system'

  const roleDefault = getDefaultForRole(role)
  const reset = await AestheticSidebarPermission.findOneAndUpdate(
    { role: normalizeRole(role) },
    { permissions: roleDefault, updatedBy: actor },
    { new: true, upsert: true }
  )

  res.json(reset)
}

export async function createDefaultPermissions(){
  const role = 'admin'
  const exists = await AestheticSidebarPermission.findOne({ role }).lean()
  if (!exists){
    const created = await AestheticSidebarPermission.create({ role, permissions: getDefaultForRole(role), updatedBy: 'system' })
    return [created]
  }
  return [exists]
}
