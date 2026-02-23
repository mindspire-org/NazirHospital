import { Request, Response } from 'express'
import { LabSidebarPermission } from '../models/SidebarPermission'
import { sidebarPermissionCreateSchema, sidebarPermissionUpdateSchema, sidebarPermissionQuerySchema } from '../validators/sidebarPermission'

// Default sidebar configuration for Lab
const defaultSidebarItems = [
  { path: '/lab', label: 'Dashboard', order: 1 },
  { path: '/lab/orders', label: 'Sample Intake', order: 2 },
  { path: '/lab/tracking', label: 'Sample Tracking', order: 3 },
  { path: '/lab/tests', label: 'Test Catalog', order: 4 },
  { path: '/lab/results', label: 'Result Entry', order: 5 },
  { path: '/lab/referrals', label: 'Referrals', order: 6 },
  { path: '/lab/reports', label: 'Reports Generator', order: 7 },
  { path: '/lab/reports-summary', label: 'Reports', order: 8 },
  { path: '/lab/inventory', label: 'Inventory', order: 9 },
  { path: '/lab/suppliers', label: 'Suppliers', order: 10 },
  { path: '/lab/purchase-history', label: 'Purchase History', order: 11 },
  { path: '/lab/supplier-returns', label: 'Supplier Returns', order: 12 },
  { path: '/lab/return-history', label: 'Return History', order: 13 },
  { path: '/lab/bb/donors', label: 'BB • Donors', order: 14 },
  { path: '/lab/bb/inventory', label: 'BB • Inventory', order: 15 },
  { path: '/lab/bb/receivers', label: 'BB • Receivers', order: 16 },
  { path: '/lab/staff-attendance', label: 'Staff Attendance', order: 17 },
  { path: '/lab/staff-management', label: 'Staff Management', order: 18 },
  { path: '/lab/staff-settings', label: 'Staff Settings', order: 19 },
  { path: '/lab/staff-monthly', label: 'Staff Monthly', order: 20 },
  { path: '/lab/expenses', label: 'Expenses', order: 21 },
  { path: '/lab/pay-in-out', label: 'Pay In / Out', order: 22 },
  { path: '/lab/manager-cash-count', label: 'Manager Cash Count', order: 23 },
  { path: '/lab/audit-logs', label: 'Audit Logs', order: 24 },
  { path: '/lab/settings', label: 'Settings', order: 25 },
  { path: '/lab/user-management', label: 'User Management', order: 26 },
  { path: '/lab/sidebar-permissions', label: 'Sidebar Permissions', order: 27 },
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
  let roles = await LabSidebarPermission.find({}, { role: 1 }).sort({ role: 1 }).lean()
  if (!roles.length) {
    await createDefaultPermissions()
    roles = await LabSidebarPermission.find({}, { role: 1 }).sort({ role: 1 }).lean()
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

  const existing = await LabSidebarPermission.findOne({ role }).lean()
  if (existing) return res.status(400).json({ message: 'Role already exists' })

  const created = await LabSidebarPermission.create({
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
  await LabSidebarPermission.deleteOne({ role })
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

  const permissions = await LabSidebarPermission.find(filter).lean()

  if (permissions.length === 0 && !role) {
    const defaults = await createDefaultPermissions()
    return res.json(defaults)
  }

  if (permissions.length === 0 && role) {
    const roleDefault = getDefaultForRole(role)
    const newPerm = await LabSidebarPermission.create({ role: normalizeRole(role), permissions: roleDefault, updatedBy: (req as any).user?.name || 'system' })
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

  const updated = await LabSidebarPermission.findOneAndUpdate(
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
  const reset = await LabSidebarPermission.findOneAndUpdate(
    { role: normalizeRole(role) },
    { permissions: roleDefault, updatedBy: actor },
    { new: true, upsert: true }
  )

  res.json(reset)
}

export async function createDefaultPermissions(){
  const roles = ['admin']
  const docs = [] as any[]
  for (const r of roles){
    const exists = await LabSidebarPermission.findOne({ role: r }).lean()
    if (!exists){
      const created = await LabSidebarPermission.create({ role: r, permissions: getDefaultForRole(r), updatedBy: 'system' })
      docs.push(created)
    }
  }
  if (docs.length === 0){
    return await LabSidebarPermission.find({}).lean()
  }
  return docs
}
