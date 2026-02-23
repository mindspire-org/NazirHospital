import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LayoutDashboard, CalendarCheck, Users, Settings as Cog, Sparkles, History, FileText, Boxes, Truck, Receipt, UserCog, ScrollText, Bell, ChevronRight } from 'lucide-react'
import { aestheticApi } from '../../utils/api'

type Item = { to: string; label: string; end?: boolean; icon: any }
const nav: Item[] = [
  { to: '/aesthetic', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/aesthetic/token-generator', label: 'Token Generation', icon: CalendarCheck },
  { to: '/aesthetic/today-tokens', label: "Today's Tokens", icon: History },
  { to: '/aesthetic/token-history', label: 'Token History', icon: History },
  { to: '/aesthetic/procedure-catalog', label: 'Procedure Catalog', icon: Sparkles },
  { to: '/aesthetic/reports', label: 'Reports', icon: FileText },
  { to: '/aesthetic/patients', label: 'Patients', icon: Users },
  { to: '/aesthetic/inventory', label: 'Inventory', icon: Boxes },
  { to: '/aesthetic/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/aesthetic/supplier-returns', label: 'Supplier Returns', icon: FileText },
  { to: '/aesthetic/purchase-history', label: 'Purchase History', icon: History },
  { to: '/aesthetic/return-history', label: 'Return History', icon: History },
  { to: '/aesthetic/expenses', label: 'Expenses', icon: Receipt },
  { to: '/aesthetic/doctor-management', label: 'Doctor Management', icon: Users },
  { to: '/aesthetic/doctor-schedules', label: 'Doctor Schedules', icon: CalendarCheck },
  { to: '/aesthetic/appointments', label: 'Appointments', icon: CalendarCheck },
  { to: '/aesthetic/doctor-finance', label: 'Doctor Finance', icon: FileText },
  { to: '/aesthetic/doctor-payouts', label: 'Doctor Payouts', icon: Receipt },
  { to: '/aesthetic/staff-attendance', label: 'Staff Attendance', icon: CalendarCheck },
  { to: '/aesthetic/staff-management', label: 'Staff Management', icon: UserCog },
  { to: '/aesthetic/staff-settings', label: 'Staff Settings', icon: Cog },
  { to: '/aesthetic/staff-monthly', label: 'Staff Monthly', icon: CalendarCheck },
  { to: '/aesthetic/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/aesthetic/user-management', label: 'User Management', icon: UserCog },
  { to: '/aesthetic/notifications', label: 'Notifications', icon: Bell },
  { to: '/aesthetic/consent-templates', label: 'Consent Templates', icon: FileText },
  { to: '/aesthetic/sidebar-permissions', label: 'Sidebar Permissions', icon: Cog },
  
  { to: '/aesthetic/settings', label: 'Settings', icon: Cog },
]

export const aestheticSidebarNav = nav

export default function Aesthetic_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [items, setItems] = useState(nav)
  const [doctorOpen, setDoctorOpen] = useState<boolean>(()=>{ try { return localStorage.getItem('aesthetic.sidebar.doctorOpen') !== 'false' } catch { return true } })
  const [staffOpen, setStaffOpen] = useState<boolean>(()=>{ try { return localStorage.getItem('aesthetic.sidebar.staffOpen') !== 'false' } catch { return true } })
  useEffect(()=>{ try { localStorage.setItem('aesthetic.sidebar.doctorOpen', String(doctorOpen)) } catch {} }, [doctorOpen])
  useEffect(()=>{ try { localStorage.setItem('aesthetic.sidebar.staffOpen', String(staffOpen)) } catch {} }, [staffOpen])
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('aesthetic.session')
      if (raw) {
        const s = JSON.parse(raw||'{}')
        if (s?.role) setRole(String(s.role).toLowerCase())
      }
    } catch {}
  }, [])
  const logout = async () => {
    try { await aestheticApi.logout() } catch {}
    try {
      localStorage.removeItem('aesthetic.session')
      localStorage.removeItem('aesthetic.token')
      localStorage.removeItem('token')
    } catch {}
    navigate('/aesthetic/login')
  }
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const res: any = await (aestheticApi as any).listSidebarPermissions(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        const computed = nav
          .filter(item => {
            if (item.to === '/aesthetic/sidebar-permissions' && String(role||'').toLowerCase() !== 'admin') return false
            const perm = map.get(item.to)
            return perm ? perm.visible !== false : true
          })
          .sort((a,b)=>{
            const oa = map.get(a.to)?.order ?? Number.MAX_SAFE_INTEGER
            const ob = map.get(b.to)?.order ?? Number.MAX_SAFE_INTEGER
            if (oa !== ob) return oa - ob
            const ia = nav.findIndex(n => n.to === a.to)
            const ib = nav.findIndex(n => n.to === b.to)
            return ia - ib
          })
        if (mounted) setItems(computed)
      } catch { if (mounted) setItems(nav) }
    })()
    return ()=>{ mounted = false }
  }, [role])
  const width = collapsed ? 'md:w-16' : 'md:w-64'
  const doctorSet = new Set<string>(['/aesthetic/doctor-management','/aesthetic/doctor-schedules','/aesthetic/doctor-finance','/aesthetic/doctor-payouts'])
  const staffSet = new Set<string>(['/aesthetic/staff-management','/aesthetic/staff-attendance','/aesthetic/staff-settings','/aesthetic/staff-monthly'])

  const renderLink = (item: Item) => {
    const Icon = item.icon
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
        <Icon className="h-4 w-4" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    )
  }

  const renderGroup = (key: 'doctor'|'staff', label: string, IconComp: any, open: boolean, setOpenFn: (v: boolean)=>void, groupItems: Item[]) => {
    if (groupItems.length === 0) return null
    return (
      <div key={`grp-${key}`}>
        <button
          type="button"
          onClick={()=> setOpenFn(!open)}
          className={collapsed
            ? `w-full flex items-center justify-center rounded-md p-2 text-sm font-medium ${open ? 'text-slate-900 bg-slate-50' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`
            : `w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${open ? 'text-slate-900 bg-slate-50' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`
          }
          title={collapsed ? label : undefined}
        >
          <div className="flex items-center gap-3">
            <IconComp className={collapsed ? 'h-5 w-5 shrink-0 text-slate-700' : 'h-4 w-4 shrink-0 text-slate-700'} />
          {!collapsed && (
            <>
              <span className="truncate">{label}</span>
            </>
          )}
          </div>
          {!collapsed && (
            <div className="ml-auto flex items-center shrink-0 pr-1 text-slate-500">
              <ChevronRight aria-hidden className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </div>
          )}
        </button>
        {!collapsed && open && (
          <div className="ml-6 space-y-1">
            {groupItems.map(it => (
              <NavLink
                key={it.to}
                to={it.to}
                style={({ isActive }) => (isActive ? ({ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)' } as any) : undefined)}
                className={({ isActive }) => {
                  const base = 'rounded-md px-3 py-2 text-sm flex items-center gap-2'
                  const active = isActive
                    ? 'text-white'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  return `${base} ${active}`
                }}
                end={it.end}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                <span>{it.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }
  return (
    <aside
      className={`hidden md:flex ${width} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r`}
      style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
    >
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'p-2' : 'p-3'} space-y-1`}>
        {(() => {
          const out: any[] = []
          let printedDoctor = false
          let printedStaff = false
          const doctorItems = items.filter(it => doctorSet.has(it.to))
          const staffItems = items.filter(it => staffSet.has(it.to))
          for (const it of items){
            if (doctorSet.has(it.to)){
              if (!printedDoctor){ out.push(renderGroup('doctor', 'Doctor Management', Users, doctorOpen, setDoctorOpen, doctorItems)); printedDoctor = true }
              continue
            }
            if (staffSet.has(it.to)){
              if (!printedStaff){ out.push(renderGroup('staff', 'Staff Management', UserCog, staffOpen, setStaffOpen, staffItems)); printedStaff = true }
              continue
            }
            out.push(renderLink(it))
          }
          return out
        })()}
      </nav>
      <div className={collapsed ? 'p-2' : 'p-3'}>
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={collapsed ? 'w-full inline-flex items-center justify-center rounded-md p-2 text-sm font-medium' : 'w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium'}
          style={{ backgroundColor: '#ffffff', color: 'var(--navy)', border: '1px solid var(--navy)' }}
          onMouseEnter={e => { try { ;(e.currentTarget as any).style.backgroundColor = 'rgba(15,45,92,0.06)' } catch {} }}
          onMouseLeave={e => { try { ;(e.currentTarget as any).style.backgroundColor = '#ffffff' } catch {} }}
          aria-label="Logout"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
