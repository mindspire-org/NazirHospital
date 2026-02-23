import { Router } from 'express'
import * as Tests from '../controllers/tests.controller'
import * as Settings from '../controllers/settings.controller'
import * as Orders from '../controllers/orders.controller'
import * as Results from '../controllers/results.controller'
import * as Procedures from '../controllers/procedures.controller'
import * as Users from '../controllers/users.controller'
import * as Audit from '../controllers/audit.controller'
import * as Auth from '../controllers/auth.controller'
import * as Sidebar from '../controllers/sidebarPermission.controller'

const r = Router()

// Auth
r.post('/login', Auth.login)
r.post('/logout', Auth.logout)

// Tests (Catalog for Diagnostics)
r.get('/tests', Tests.list)
r.get('/tests/:id', Tests.get)
r.post('/tests', Tests.create)
r.put('/tests/:id', Tests.update)
r.delete('/tests/:id', Tests.remove)

// Procedures
r.get('/procedures', Procedures.list)
r.post('/procedures', Procedures.create)
r.put('/procedures/:id', Procedures.update)
r.delete('/procedures/:id', Procedures.remove)

// Settings
r.get('/settings', Settings.get)
r.put('/settings', Settings.update)

// Orders (Sample Intake for Diagnostics)
r.get('/orders', Orders.list)
r.post('/orders', Orders.create)
r.put('/orders/:id', Orders.update)
r.put('/orders/:id/track', Orders.updateTrack)
r.put('/orders/:id/items/:testId/track', Orders.updateItemTrack)
r.delete('/orders/:id/items/:testId', Orders.removeItem)
r.delete('/orders/:id', Orders.remove)

// Results
r.get('/results', Results.list)
r.post('/results', Results.create)
r.get('/results/:id', Results.get)
r.put('/results/:id', Results.update)
r.delete('/results/:id', Results.remove)

// Audit Logs
r.get('/audit-logs', Audit.list)
r.post('/audit-logs', Audit.create)

// Users
r.get('/users', Users.list)
r.post('/users', Users.create)
r.put('/users/:id', Users.update)
r.delete('/users/:id', Users.remove)

// Sidebar Roles & Permissions
r.get('/sidebar-roles', Sidebar.listRoles)
r.post('/sidebar-roles', Sidebar.createRole)
r.delete('/sidebar-roles/:role', Sidebar.deleteRole)
r.get('/sidebar-permissions', Sidebar.getPermissions)
r.put('/sidebar-permissions/:role', Sidebar.updatePermissions)
r.post('/sidebar-permissions/:role/reset', Sidebar.resetToDefaults)

export default r
