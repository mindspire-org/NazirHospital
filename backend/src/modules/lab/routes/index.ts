import { Router } from 'express'
import * as Drafts from '../controllers/drafts.controller'
import * as Purchases from '../controllers/purchases.controller'
import * as InventoryItems from '../controllers/inventory_items.controller'
import * as Staff from '../controllers/staff.controller'
import * as Shifts from '../controllers/shifts.controller'
import * as Attendance from '../controllers/attendance.controller'
import * as StaffEarnings from '../controllers/staff_earnings.controller'
import * as Expenses from '../controllers/expenses.controller'
import * as Users from '../controllers/users.controller'
import * as Audit from '../controllers/audit.controller'
import * as Settings from '../controllers/settings.controller'
import * as Patients from '../controllers/patients.controller'
import * as Tests from '../controllers/tests.controller'
import * as Orders from '../controllers/orders.controller'
import * as Results from '../controllers/results.controller'
import * as Appointments from '../controllers/appointments.controller'
import * as Suppliers from '../controllers/suppliers.controller'
import * as Returns from '../controllers/returns.controller'
import * as Dashboard from '../controllers/dashboard.controller'
import * as Reports from '../controllers/reports.controller'
import * as BBDonors from '../controllers/bb_donors.controller'
import * as BBReceivers from '../controllers/bb_receivers.controller'
import * as BBInventory from '../controllers/bb_inventory.controller'
import * as CashMovements from '../controllers/cash_movement.controller'
import * as CashCounts from '../controllers/cash_count.controller'
import * as SidebarPerms from '../controllers/sidebarPermission.controller'
import * as IncomeLedger from '../controllers/income_ledger.controller'
import { auth } from '../../../common/middleware/auth'

const r = Router()

// Public auth endpoints
r.post('/users/login', Users.login)
r.post('/users/logout', Users.logout)
// Legacy compatibility
r.post('/login', Users.login)
r.post('/logout', Users.logout)

// All other Lab endpoints require auth
r.use(auth)

// Purchase Drafts (Pending Review)
r.get('/purchase-drafts', Drafts.list)
r.post('/purchase-drafts', Drafts.create)
r.post('/purchase-drafts/:id/approve', Drafts.approve)
r.delete('/purchase-drafts/:id', Drafts.remove)

// Inventory items (aggregated store)
r.get('/inventory', InventoryItems.list)
r.put('/inventory/:key', InventoryItems.update)
r.get('/inventory/summary', InventoryItems.summary)
r.delete('/inventory/:key', InventoryItems.remove)

// Purchases
r.get('/purchases', Purchases.list)
r.post('/purchases', Purchases.create)
r.delete('/purchases/:id', Purchases.remove)
r.get('/purchases/summary', Purchases.summary)

// Suppliers
r.get('/suppliers', Suppliers.list)
r.post('/suppliers', Suppliers.create)
r.put('/suppliers/:id', Suppliers.update)
r.delete('/suppliers/:id', Suppliers.remove)
r.post('/suppliers/:id/payment', Suppliers.recordPayment)
r.get('/suppliers/:id/purchases', Suppliers.purchases)

// Returns (Supplier/Customer)
r.get('/returns', Returns.list)
r.post('/returns', Returns.create)
r.post('/returns/undo', Returns.undo)

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

// Attendance
r.get('/attendance', Attendance.list)
r.post('/attendance', Attendance.upsert)

// Staff Earnings
r.get('/staff-earnings', StaffEarnings.list)
r.post('/staff-earnings', StaffEarnings.create)
r.put('/staff-earnings/:id', StaffEarnings.update)
r.delete('/staff-earnings/:id', StaffEarnings.remove)

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

// Users
r.get('/users', Users.list)
r.post('/users', Users.create)
r.put('/users/:id', Users.update)
r.delete('/users/:id', Users.remove)

// Sidebar Roles & Permissions
r.get('/sidebar-roles', SidebarPerms.listRoles)
r.post('/sidebar-roles', SidebarPerms.createRole)
r.delete('/sidebar-roles/:role', SidebarPerms.deleteRole)

r.get('/sidebar-permissions', SidebarPerms.getPermissions)
r.put('/sidebar-permissions/:role', SidebarPerms.updatePermissions)
r.post('/sidebar-permissions/:role/reset', SidebarPerms.resetToDefaults)

// Audit Logs
r.get('/audit-logs', Audit.list)
r.post('/audit-logs', Audit.create)

// Settings
r.get('/settings', Settings.get)
r.put('/settings', Settings.update)

// Patients (MRN find-or-create)
r.post('/patients/find-or-create', Patients.findOrCreate)
r.get('/patients/by-mrn', Patients.getByMrn)
r.get('/patients/search', Patients.search)
r.put('/patients/:id', Patients.update)

// Tests (Catalog)
r.get('/tests', Tests.list)
r.post('/tests', Tests.create)
r.put('/tests/:id', Tests.update)
r.delete('/tests/:id', Tests.remove)

// Orders (Sample Intake)
r.get('/orders', Orders.list)
r.post('/orders', Orders.create)
r.post('/orders/token/:tokenNo/receive-payment', Orders.receivePayment)
r.put('/orders/token/:tokenNo', Orders.updateToken)
r.put('/orders/:id/track', Orders.updateTrack)
r.delete('/orders/:id', Orders.remove)

// Income Ledger
r.get('/income-ledger', IncomeLedger.list)

// Appointments (Lab)
r.get('/appointments', Appointments.list)
r.post('/appointments', Appointments.create)
r.put('/appointments/:id', Appointments.update)
r.patch('/appointments/:id/status', Appointments.updateStatus)
r.post('/appointments/:id/convert-to-token', Appointments.convertToToken)
r.delete('/appointments/:id', Appointments.remove)

// Results
r.get('/results', Results.list)
r.get('/results/:id', Results.get)
r.post('/results', Results.create)
r.put('/results/:id', Results.update)

// Dashboard
r.get('/dashboard/summary', Dashboard.summary)
// Reports
r.get('/reports/summary', Reports.summary)

// Blood Bank
// Donors
r.get('/bb/donors', BBDonors.list)
r.post('/bb/donors', BBDonors.create)
r.put('/bb/donors/:id', BBDonors.update)
r.delete('/bb/donors/:id', BBDonors.remove)

// Receivers
r.get('/bb/receivers', BBReceivers.list)
r.post('/bb/receivers', BBReceivers.create)
r.put('/bb/receivers/:id', BBReceivers.update)
r.delete('/bb/receivers/:id', BBReceivers.remove)

// Inventory (Blood Bags)
r.get('/bb/inventory', BBInventory.list)
r.post('/bb/inventory', BBInventory.create)
r.put('/bb/inventory/:id', BBInventory.update)
r.delete('/bb/inventory/:id', BBInventory.remove)
r.get('/bb/inventory/summary', BBInventory.summary)

export default r
