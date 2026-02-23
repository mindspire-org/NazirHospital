import { NavLink, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { LayoutDashboard, Users, Stethoscope, ScrollText, Bell, Search, FileText, Settings as SettingsIcon } from 'lucide-react'

type NavItem = { to: string; label: string; end?: boolean; icon: any }

const nav: NavItem[] = [
  { to: '/doctor', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/doctor/patients', label: 'Patients', icon: Users },
  { to: '/doctor/patient-search', label: 'Patient Search', icon: Search },
  { to: '/doctor/prescription', label: 'Prescription', icon: Stethoscope },
  { to: '/doctor/prescription-history', label: 'Prescription History', icon: ScrollText },
  { to: '/doctor/reports', label: 'Reports', icon: FileText },
  { to: '/doctor/notifications', label: 'Notifications', icon: Bell },
  { to: '/doctor/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Doctor_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const logout = async () => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const u = raw ? JSON.parse(raw) : null
      await hospitalApi.logoutHospitalUser(u?.username||'doctor')
    } catch {}
    try { localStorage.removeItem('doctor.session') } catch {}
    navigate('/hospital/login')
  }
  return (
    <aside
      className={`hidden md:flex ${collapsed ? 'md:w-16' : 'md:w-64'} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r`}
      style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
    >
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-3'} space-y-1`}>
        {nav.map(item => {
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
          onClick={logout}
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
