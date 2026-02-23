import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CreditCard,
  Boxes,
  Users,
  Truck,
  ReceiptText,
  ShoppingCart,
  RotateCcw,
  CalendarCheck,
  UserCog,
  Settings,
  CalendarDays,
  BarChart3,
  BookText,
  FileClock,
  Wallet,
  Users2,
  ClipboardCheck,
  Bell,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { pharmacyApi } from '../../utils/api'

const nav = [
  { to: '/pharmacy', label: 'Dashboard', end: true, Icon: LayoutDashboard },
  { to: '/pharmacy/pos', label: 'Point of Sale', Icon: CreditCard },
  { to: '/pharmacy/inventory', label: 'Inventory', Icon: Boxes },
  { to: '/pharmacy/customers', label: 'Customers', Icon: Users },
  { to: '/pharmacy/suppliers', label: 'Suppliers', Icon: Truck },
  { to: '/pharmacy/companies', label: 'Companies', Icon: Users },
  { to: '/pharmacy/sales-history', label: 'Sales History', Icon: ReceiptText },
  { to: '/pharmacy/purchase-history', label: 'Purchase History', Icon: ShoppingCart },
  { to: '/pharmacy/return-history', label: 'Return History', Icon: RotateCcw },
  { to: '/pharmacy/staff-attendance', label: 'Staff Attendance', Icon: CalendarCheck },
  { to: '/pharmacy/staff-management', label: 'Staff Management', Icon: UserCog },
  { to: '/pharmacy/staff-settings', label: 'Staff Settings', Icon: Settings },
  { to: '/pharmacy/staff-monthly', label: 'Staff Monthly', Icon: CalendarDays },
  { to: '/pharmacy/reports', label: 'Reports', Icon: BarChart3 },
  { to: '/pharmacy/notifications', label: 'Notifications', Icon: Bell },
  { to: '/pharmacy/guidelines', label: 'Guidelines', Icon: BookText },
  { to: '/pharmacy/returns', label: 'Customer Return', Icon: RotateCcw },
  { to: '/pharmacy/supplier-returns', label: 'Supplier Return', Icon: RotateCcw },
  { to: '/pharmacy/prescriptions', label: 'Prescription Intake', Icon: ClipboardCheck },
  { to: '/pharmacy/referrals', label: 'Referrals', Icon: FileClock },
  { to: '/pharmacy/audit-logs', label: 'Audit Logs', Icon: FileClock },
  { to: '/pharmacy/expenses', label: 'Expenses', Icon: Wallet },
  { to: '/pharmacy/pay-in-out', label: 'Pay In/Out', Icon: Wallet },
  { to: '/pharmacy/manager-cash-count', label: 'Manager Cash Count', Icon: Wallet },
  { to: '/pharmacy/settings', label: 'Settings', Icon: Settings },
  { to: '/pharmacy/sidebar-permissions', label: 'Sidebar Permissions', Icon: Settings },
  { to: '/pharmacy/user-management', label: 'User Management', Icon: Users2 },
]

export const pharmacySidebarNav = nav

type Props = { collapsed?: boolean }

export default function Pharmacy_Sidebar({ collapsed }: Props) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [username, setUsername] = useState<string>('')
  const [items, setItems] = useState(nav)
  async function handleLogout(){
    try { await pharmacyApi.logoutUser(username || undefined) } catch {}
    try {
      localStorage.removeItem('pharmacy.user')
      localStorage.removeItem('pharma_user')
      localStorage.removeItem('pharmacy.token')
    } catch {}
    navigate('/pharmacy/login')
  }

  useEffect(() => {
    // Determine role from localStorage
    try {
      const raw = localStorage.getItem('pharmacy.user') || localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        if (u?.role) setRole(String(u.role).toLowerCase())
        if (u?.username) setUsername(String(u.username))
      }
    } catch {}
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await pharmacyApi.listSidebarPermissions(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        const isAdmin = String(role || '').toLowerCase() === 'admin'
        const computed = nav
          .filter(item => {
            if (item.to === '/pharmacy/sidebar-permissions' && !isAdmin) return false
            const perm = map.get(item.to)
            return perm ? perm.visible !== false : true
          })
          .sort((a, b) => {
            const oa = map.get(a.to)?.order ?? Number.MAX_SAFE_INTEGER
            const ob = map.get(b.to)?.order ?? Number.MAX_SAFE_INTEGER
            if (oa !== ob) return oa - ob
            const ia = nav.findIndex(n => n.to === a.to)
            const ib = nav.findIndex(n => n.to === b.to)
            return ia - ib
          })
        if (mounted) setItems(computed)
      } catch {
        if (mounted) setItems(nav)
      }
    })()
    return () => { mounted = false }
  }, [role])
  return (
    <aside
      className={`hidden md:flex ${collapsed ? 'md:w-16' : 'md:w-72'} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r`}
      style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
    >
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-3'} space-y-1`}>
        {items.map(item => {
          const Icon = item.Icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => (isActive ? ({ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)' } as any) : undefined)}
              className={({ isActive }) => {
                const base = collapsed
                  ? 'rounded-md p-2 text-sm font-medium flex items-center justify-center'
                  : 'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2'
                const active = isActive
                  ? 'text-white'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                return `${base} ${active}`
              }}
              end={item.end}
            >
              {({ isActive }) => (
                <>
                  <Icon className={collapsed ? (isActive ? 'h-5 w-5 text-white' : 'h-5 w-5 text-slate-700') : (isActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-700')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className={collapsed ? 'p-2' : 'p-3'}>
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={collapsed ? 'w-full inline-flex items-center justify-center rounded-md p-2 text-sm font-medium' : 'w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium'}
          style={{ backgroundColor: '#ffffff', color: 'var(--navy)', border: '1px solid var(--navy)' }}
          onMouseEnter={e => { try { ;(e.currentTarget as any).style.backgroundColor = 'rgba(15,45,92,0.06)' } catch {} }}
          onMouseLeave={e => { try { ;(e.currentTarget as any).style.backgroundColor = '#ffffff' } catch {} }}
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
