import { Request, Response } from 'express'
import { SidebarPermission } from '../models/SidebarPermission'
import { sidebarPermissionCreateSchema, sidebarPermissionUpdateSchema, sidebarPermissionQuerySchema } from '../validators/sidebarPermission'

// Default sidebar configuration for Reception portal
const defaultSidebarItems = [
  { path: '/reception/token-generator', label: 'Token Generator', order: 1 },
  { path: "/reception/today-tokens", label: "Today's Tokens", order: 2 },
  { path: '/reception/ipd-billing', label: 'IPD Billing', order: 3 },
  { path: '/reception/ipd-transactions', label: 'Recent IPD Payments', order: 4 },
  { path: '/reception/diagnostic/token-generator', label: 'Diagnostic Token Generator', order: 5 },
  { path: '/reception/diagnostic/sample-tracking', label: 'Diagnostic Sample Tracking', order: 6 },
  { path: '/reception/lab/sample-intake', label: 'Lab Sample Intake', order: 7 },
  { path: '/reception/lab/sample-tracking', label: 'Lab Sample Tracking', order: 8 },
  { path: '/reception/lab/manager-cash-count', label: 'Manager Cash Count', order: 9 },
  { path: '/reception/user-management', label: 'User Management', order: 10 },
  { path: '/reception/sidebar-permissions', label: 'Sidebar Permissions', order: 11 },
]

// Default visibility by role
const defaultVisibility: Record<string, Array<{ path: string; label: string; visible: boolean; order: number }>> = {
  admin: defaultSidebarItems.map(item => ({ ...item, visible: true })),
  receptionist: defaultSidebarItems.map(item => ({
    ...item,
    visible: ['/reception/user-management', '/reception/sidebar-permissions'].includes(item.path) ? false : true,
  })),
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
  const items = roles.map((r: any) => r.role).filter((r: any) => String(r || '').trim().toLowerCase() !== 'superadmin')
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
  if (['admin', 'receptionist', 'superadmin'].includes(role)) {
    return res.status(400).json({ message: 'Default roles cannot be deleted' })
  }

  await SidebarPermission.deleteOne({ role })
  res.json({ ok: true })
}

export async function getPermissions(req: Request, res: Response) {
  const parsed = sidebarPermissionQuerySchema.safeParse(req.query)
  const { role } = parsed.success ? (parsed.data as any) : {}

  const filter: any = {}
  if (role) {
    const r = normalizeRole(role)
    if (r === 'superadmin') {
      return res.status(403).json({ message: 'The "superadmin" role is reserved and cannot be queried' })
    }
    filter.role = r
  }

  const permissions = await SidebarPermission.find(filter).lean()

  if (permissions.length === 0 && !role) {
    const defaultPerms = await createDefaultPermissions()
    return res.json(defaultPerms)
  }

  if (permissions.length === 0 && role) {
    const roleDefault = getDefaultForRole(role)
    const newPerm = await SidebarPermission.create({
      role: normalizeRole(role),
      permissions: roleDefault,
      updatedBy: (req as any).user?.name || 'system',
    })
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

  const updated = await SidebarPermission.findOneAndUpdate(
    { role: normalizeRole(role) },
    {
      permissions: data.permissions,
      updatedBy: actor,
    },
    { new: true, upsert: true }
  )

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
      updatedBy: actor,
    },
    { new: true, upsert: true }
  )

  res.json(reset)
}

async function createDefaultPermissions() {
  const actor = 'system'
  const permissions: any[] = []

  for (const [role, items] of Object.entries(defaultVisibility)) {
    const existing = await SidebarPermission.findOne({ role })
    if (!existing) {
      const created = await SidebarPermission.create({
        role,
        permissions: items,
        updatedBy: actor,
      })
      permissions.push(created)
    } else {
      permissions.push(existing)
    }
  }

  return permissions
}
