import { Router } from 'express'
import * as Users from '../controllers/users.controller'
import * as Auth from '../controllers/auth.controller'
import * as Sidebar from '../controllers/sidebarPermission.controller'

const r = Router()

// Auth
r.post('/login', Auth.login)
r.post('/logout', Auth.logout)

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
