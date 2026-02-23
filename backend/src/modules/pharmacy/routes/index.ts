import { Router } from 'express'
import * as Suppliers from '../controllers/suppliers.controller'
import * as Customers from '../controllers/customers.controller'
import * as Expenses from '../controllers/expenses.controller'
import * as Settings from '../controllers/settings.controller'
import * as Staff from '../controllers/staff.controller'
import * as Shifts from '../controllers/shifts.controller'
import * as StaffEarnings from '../controllers/staff_earnings.controller'
import * as Attendance from '../controllers/attendance.controller'
import * as Sales from '../controllers/dispense.controller'
import * as Purchases from '../controllers/purchases.controller'
import * as Returns from '../controllers/returns.controller'
import * as Audit from '../controllers/audit.controller'
import * as Users from '../controllers/users.controller'
import * as Drafts from '../controllers/drafts.controller'
import * as InventoryItems from '../controllers/inventory_items.controller'
import * as CashMovements from '../controllers/cash_movement.controller'
import * as CashCounts from '../controllers/cash_count.controller'
import * as Notifications from '../controllers/notifications.controller'
import * as SidebarPerms from '../controllers/sidebarPermission.controller'
import * as HoldSales from '../controllers/hold_sales.controller'
import * as Companies from '../controllers/companies.controller'

const r = Router()

// Suppliers
r.get('/suppliers', Suppliers.list)
r.post('/suppliers', Suppliers.create)
r.put('/suppliers/:id', Suppliers.update)
r.delete('/suppliers/:id', Suppliers.remove)
r.post('/suppliers/:id/payment', Suppliers.recordPayment)
r.get('/suppliers/:id/purchases', Suppliers.purchases)
// Supplier-Companies
r.get('/suppliers/:id/companies', Companies.listForSupplier)
r.post('/suppliers/:id/companies', Companies.assignToSupplier)

// Customers
r.get('/customers', Customers.list)
r.post('/customers', Customers.create)
r.put('/customers/:id', Customers.update)
r.delete('/customers/:id', Customers.remove)

// Expenses
r.get('/expenses', Expenses.list)
r.post('/expenses', Expenses.create)
r.delete('/expenses/:id', Expenses.remove)
r.get('/expenses/summary', Expenses.summary)

// Cash Movements (Pay In/Out)
r.get('/cash-movements', CashMovements.list)
r.post('/cash-movements', CashMovements.create)
r.delete('/cash-movements/:id', CashMovements.remove)
r.get('/cash-movements/summary', CashMovements.summary)

// Manager Cash Count
r.get('/cash-counts', CashCounts.list)
r.post('/cash-counts', CashCounts.create)
r.delete('/cash-counts/:id', CashCounts.remove)
r.get('/cash-counts/summary', CashCounts.summary)

// Settings
r.get('/settings', Settings.get)
r.put('/settings', Settings.update)

// Staff
r.get('/staff', Staff.list)
r.post('/staff', Staff.create)
r.put('/staff/:id', Staff.update)
r.delete('/staff/:id', Staff.remove)

// Shifts
r.get('/shifts', Shifts.list)
r.post('/shifts', Shifts.create)
r.put('/shifts/:id', Shifts.update)
r.delete('/shifts/:id', Shifts.remove)

// Staff Earnings
r.get('/staff-earnings', StaffEarnings.list)
r.post('/staff-earnings', StaffEarnings.create)
r.put('/staff-earnings/:id', StaffEarnings.update)
r.delete('/staff-earnings/:id', StaffEarnings.remove)

// Attendance
r.get('/attendance', Attendance.list)
r.post('/attendance', Attendance.upsert)

// Sales / Dispense (POS)
r.get('/sales', Sales.list)
r.post('/sales', Sales.create)
r.get('/sales/summary', Sales.summary)

// Hold Sales (server-side held bills)
r.get('/hold-sales', HoldSales.list)
r.get('/hold-sales/:id', HoldSales.getOne)
r.post('/hold-sales', HoldSales.create)
r.delete('/hold-sales/:id', HoldSales.remove)

// Purchases
r.get('/purchases', Purchases.list)
r.post('/purchases', Purchases.create)
r.delete('/purchases/:id', Purchases.remove)
r.get('/purchases/summary', Purchases.summary)

// Companies
r.get('/companies', Companies.list)
r.post('/companies', Companies.create)
r.put('/companies/:id', Companies.update)
r.delete('/companies/:id', Companies.remove)

// Returns (Customer/Supplier)
r.get('/returns', Returns.list)
r.post('/returns', Returns.create)

// Audit Logs
r.get('/audit-logs', Audit.list)
r.post('/audit-logs', Audit.create)

// Users (Pharmacy)
r.get('/users', Users.list)
r.post('/users', Users.create)
r.put('/users/:id', Users.update)
r.delete('/users/:id', Users.remove)
r.post('/users/login', Users.login)
r.post('/users/logout', Users.logout)

// Sidebar Roles & Permissions
r.get('/sidebar-roles', SidebarPerms.listRoles)
r.post('/sidebar-roles', SidebarPerms.createRole)
r.delete('/sidebar-roles/:role', SidebarPerms.deleteRole)

r.get('/sidebar-permissions', SidebarPerms.getPermissions)
r.put('/sidebar-permissions/:role', SidebarPerms.updatePermissions)
r.post('/sidebar-permissions/:role/reset', SidebarPerms.resetToDefaults)

// Purchase Drafts (Pending Review)
r.get('/purchase-drafts', Drafts.list)
r.get('/purchase-drafts/lines', Drafts.listLines)
r.post('/purchase-drafts', Drafts.create)
r.get('/purchase-drafts/:id', Drafts.getOne)
r.put('/purchase-drafts/:id', Drafts.update)
r.post('/purchase-drafts/:id/approve', Drafts.approve)
r.delete('/purchase-drafts/:id', Drafts.remove)

// Inventory items (aggregated store)
r.get('/inventory', InventoryItems.list)
// Filtered inventory views for tabs (low|out|expiring)
r.get('/inventory/filter', InventoryItems.listFiltered)
r.put('/inventory/:key', InventoryItems.update)
// Inventory summary aggregated from purchases
r.get('/inventory/summary', InventoryItems.summary)
// Delete an inventory item by key
r.delete('/inventory/:key', InventoryItems.remove)

// Notifications
r.get('/notifications', Notifications.getNotifications)
r.post('/notifications/generate', Notifications.generateNotifications)
r.post('/notifications/:id/read', Notifications.markNotificationRead)
r.post('/notifications/read-all', Notifications.markAllNotificationsRead)
r.delete('/notifications/:id', Notifications.deleteNotification)

export default r
