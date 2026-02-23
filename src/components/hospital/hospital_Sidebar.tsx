import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { hospitalApi } from "../../utils/api";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  PlusCircle,
  Ticket,
  History,
  Building2,
  Activity,
  Siren,
  ReceiptText,
  Bed,
  Users,
  LogOut,
  Calendar,
  UserCog,
  Settings,
  CalendarDays,
  Search,
  Stethoscope,
  ScrollText,
  Database,
  CreditCard,
  Wallet,
  ChevronRight,
  Wrench,
  AlertTriangle,
  Trash2,
  Boxes,
  QrCode,
} from "lucide-react";

type NavItem = { to: string; label: string; end?: boolean; icon: LucideIcon };

const navTop: NavItem[] = [
  { to: "/hospital", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/hospital/appointments", label: "Appointments", icon: Calendar },
  {
    to: "/hospital/finance/cash-sessions",
    label: "Cash Sessions",
    icon: Wallet,
  },
  {
    to: "/hospital/token-generator",
    label: "Token Generator",
    icon: PlusCircle,
  },
  { to: "/hospital/today-tokens", label: "Today's Tokens", icon: Ticket },
  { to: "/hospital/token-history", label: "Token History", icon: History },
  { to: "/hospital/emergency", label: "Emergency", icon: Siren },
  {
    to: "/hospital/emergency-services",
    label: "Emergency Services",
    icon: ReceiptText,
  },
  { to: "/hospital/departments", label: "Departments", icon: Building2 },
];

const navBottom: NavItem[] = [
  { to: "/hospital/search-patients", label: "Search Patients", icon: Search },
  { to: "/hospital/user-management", label: "Users", icon: UserCog },
  {
    to: "/hospital/sidebar-permissions",
    label: "Sidebar Permissions",
    icon: Settings,
  },
  { to: "/hospital/audit", label: "Audit log", icon: ScrollText },
  { to: "/hospital/settings", label: "Settings", icon: Settings },
  { to: "/hospital/backup", label: "Backup", icon: Database },
];

const groups: { label: string; icon: LucideIcon; items: NavItem[] }[] = [
  {
    label: "Corporate Panel",
    icon: Building2,
    items: [
      {
        to: "/hospital/corporate",
        label: "Corporate Dashboard",
        icon: Building2,
      },
      {
        to: "/hospital/corporate/companies",
        label: "Companies",
        icon: Building2,
      },
      {
        to: "/hospital/corporate/rate-rules",
        label: "Rate Rules",
        icon: Settings,
      },
      {
        to: "/hospital/corporate/transactions",
        label: "Transactions",
        icon: CreditCard,
      },
      { to: "/hospital/corporate/claims", label: "Claims", icon: ReceiptText },
      { to: "/hospital/corporate/payments", label: "Payments", icon: Wallet },
      { to: "/hospital/corporate/reports", label: "Reports", icon: ScrollText },
    ],
  },
  {
    label: "FBR",
    icon: QrCode,
    items: [
      { to: "/hospital/fbr", label: "FBR Dashboard", icon: QrCode },
      { to: "/hospital/fbr/settings", label: "FBR Settings", icon: Settings },
      { to: "/hospital/fbr/logs", label: "FBR Logs", icon: ScrollText },
      { to: "/hospital/fbr/reports", label: "FBR Reports", icon: ReceiptText },
      {
        to: "/hospital/fbr/credentials",
        label: "FBR Credentials",
        icon: Settings,
      },
    ],
  },
  {
    label: "IPD Management",
    icon: Activity,
    items: [
      { to: "/hospital/ipd", label: "IPD Dashboard", icon: Activity },
      { to: "/hospital/bed-management", label: "Bed Management", icon: Bed },
      { to: "/hospital/patient-list", label: "Patient List", icon: Users },
      { to: "/hospital/ipd-referrals", label: "Referrals", icon: Activity },
      { to: "/hospital/discharged", label: "Discharged", icon: LogOut },
      { to: "/hospital/ipd-billing", label: "IPD Billing", icon: ReceiptText },
      {
        to: "/hospital/ipd-transactions",
        label: "Recent IPD Payments",
        icon: CreditCard,
      },
    ],
  },
  {
    label: "IPD Forms",
    icon: ScrollText,
    items: [
      {
        to: "/hospital/forms/received-deaths",
        label: "Received Death",
        icon: ScrollText,
      },
      {
        to: "/hospital/forms/death-certificates",
        label: "Death Certificates",
        icon: ScrollText,
      },
      {
        to: "/hospital/forms/birth-certificates",
        label: "Birth Certificates",
        icon: ScrollText,
      },
      {
        to: "/hospital/forms/short-stays",
        label: "Short Stays",
        icon: ScrollText,
      },
      {
        to: "/hospital/forms/discharge-summaries",
        label: "Discharge Summaries",
        icon: ScrollText,
      },
      { to: "/hospital/forms/invoices", label: "Invoices", icon: ReceiptText },
    ],
  },
  {
    label: "Staff Management",
    icon: UserCog,
    items: [
      {
        to: "/hospital/staff-dashboard",
        label: "Staff Dashboard",
        icon: LayoutDashboard,
      },
      {
        to: "/hospital/staff-attendance",
        label: "Staff Attendance",
        icon: Calendar,
      },
      {
        to: "/hospital/staff-monthly",
        label: "Staff Monthly",
        icon: CalendarDays,
      },
      {
        to: "/hospital/staff-settings",
        label: "Staff Settings",
        icon: Settings,
      },
      {
        to: "/hospital/staff-management",
        label: "Staff Management",
        icon: UserCog,
      },
    ],
  },
  {
    label: "Doctor Management",
    icon: Stethoscope,
    items: [
      { to: "/hospital/doctors", label: "Add Doctors", icon: Stethoscope },
      {
        to: "/hospital/doctor-schedules",
        label: "Doctor Schedules",
        icon: CalendarDays,
      },
      {
        to: "/hospital/finance/doctors",
        label: "Doctors Finance",
        icon: Wallet,
      },
      {
        to: "/hospital/finance/doctor-payouts",
        label: "Doctor Payouts",
        icon: CreditCard,
      },
    ],
  },
  {
    label: "Expense Management",
    icon: ReceiptText,
    items: [
      {
        to: "/hospital/finance/transactions",
        label: "Transactions",
        icon: CreditCard,
      },
      {
        to: "/hospital/finance/expenses",
        label: "Expense History",
        icon: ReceiptText,
      },
    ],
  },
  {
    label: "Equipment Management",
    icon: Wrench,
    items: [
      { to: "/hospital/equipment", label: "Equipment", icon: Wrench },
      {
        to: "/hospital/equipment-due",
        label: "Equipment Due",
        icon: CalendarDays,
      },
      {
        to: "/hospital/equipment/kpis",
        label: "Equipment KPIs",
        icon: Activity,
      },
      {
        to: "/hospital/equipment/breakdown-register",
        label: "Breakdown Register",
        icon: AlertTriangle,
      },
      {
        to: "/hospital/equipment/condemnation-register",
        label: "Condemnation Register",
        icon: Trash2,
      },
    ],
  },
  {
    label: "Store Management",
    icon: Boxes,
    items: [
      {
        to: "/hospital/store-management",
        label: "Store Management",
        icon: Boxes,
      },
    ],
  },
];

export const hospitalSidebarNav: NavItem[] = [
  ...navTop,
  ...groups.flatMap((g) => g.items),
  ...navBottom,
];

export default function Hospital_Sidebar({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [role, setRole] = useState<string>("admin");
  const [permMap, setPermMap] = useState<Map<string, any>>(new Map());
  const width = collapsed ? "md:w-16" : "md:w-72";
  const isGroupActive = (items: NavItem[]) =>
    items.some((i) => pathname.startsWith(i.to));

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem("hospital.session") ||
        localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.role) setRole(String(u.role).toLowerCase());
      }
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await hospitalApi.listSidebarPermissions(role);
        const doc = Array.isArray(res) ? res[0] : res;
        const map = new Map<string, any>();
        const perms = (doc?.permissions || []) as Array<{
          path: string;
          visible?: boolean;
          order?: number;
        }>;
        for (const p of perms) map.set(p.path, p);
        if (mounted) setPermMap(map);
      } catch {
        if (mounted) setPermMap(new Map());
      }
    })();
    return () => {
      mounted = false;
    };
  }, [role]);

  const canShow = (path: string) => {
    if (
      path === "/hospital/sidebar-permissions" &&
      String(role || "").toLowerCase() !== "admin"
    )
      return false;
    const perm = permMap.get(path);
    return perm ? perm.visible !== false : true;
  };

  const canShowGroup = (label: string) => {
    if (label === "Corporate Panel") return false;
    if (label === "FBR") return false;
    return true;
  };

  const byOrder = (a: NavItem, b: NavItem) => {
    const oa = permMap.get(a.to)?.order ?? Number.MAX_SAFE_INTEGER;
    const ob = permMap.get(b.to)?.order ?? Number.MAX_SAFE_INTEGER;
    if (oa !== ob) return oa - ob;
    return 0;
  };
  return (
    <aside
      className={`hidden md:flex ${width} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r`}
      style={{ background: "#ffffff", borderColor: "#e2e8f0" }}
    >
      <nav
        className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? "p-2" : "p-3"} space-y-1`}
      >
        {[...navTop]
          .filter((i) => canShow(i.to))
          .sort(byOrder)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                style={({ isActive }) =>
                  isActive
                    ? ({
                        background:
                          "linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)",
                      } as any)
                    : undefined
                }
                className={({ isActive }) => {
                  const base = collapsed
                    ? "rounded-md p-2 text-sm font-medium flex items-center justify-center"
                    : "rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2";
                  const active = isActive
                    ? "text-white"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900";
                  return `${base} ${active}`;
                }}
                end={item.end}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={
                        collapsed
                          ? isActive
                            ? "h-5 w-5 text-white"
                            : "h-5 w-5 text-slate-700"
                          : isActive
                            ? "h-4 w-4 text-white"
                            : "h-4 w-4 text-slate-700"
                      }
                    />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

        {/* Management groups */}
        {groups
          .filter((g) => canShowGroup(g.label))
          .map((group) => {
            const GIcon = group.icon;
            const isOpen = open[group.label] ?? isGroupActive(group.items);
            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() =>
                    setOpen((prev) => ({ ...prev, [group.label]: !isOpen }))
                  }
                  className={
                    collapsed
                      ? `w-full flex items-center justify-center rounded-md p-2 text-sm font-medium ${isOpen ? "text-slate-900 bg-slate-50" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}`
                      : `w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${isOpen ? "text-slate-900 bg-slate-50" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}`
                  }
                  title={collapsed ? group.label : undefined}
                >
                  <div className="flex items-center gap-3">
                    <GIcon
                      className={
                        collapsed
                          ? "h-5 w-5 shrink-0 text-slate-700"
                          : "h-4 w-4 shrink-0 text-slate-700"
                      }
                    />
                    {!collapsed && (
                      <span className="truncate">{group.label}</span>
                    )}
                  </div>
                  {!collapsed && (
                    <div className="ml-auto flex items-center shrink-0 pr-1 text-slate-500">
                      <ChevronRight
                        aria-hidden
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  )}
                </button>
                {isOpen && (
                  <div className="space-y-1">
                    {group.items
                      .filter((i) => canShow(i.to))
                      .sort(byOrder)
                      .map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            title={collapsed ? item.label : undefined}
                            style={({ isActive }) =>
                              isActive
                                ? ({
                                    background:
                                      "linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)",
                                  } as any)
                                : undefined
                            }
                            className={({ isActive }) => {
                              const base = collapsed
                                ? "rounded-md p-2 text-sm font-medium flex items-center justify-center"
                                : "ml-6 rounded-md px-3 py-2 text-sm flex items-center gap-2";
                              const active = isActive
                                ? "text-white"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900";
                              return `${base} ${active}`;
                            }}
                            end={item.end}
                          >
                            {({ isActive }) => (
                              <>
                                <Icon
                                  className={
                                    collapsed
                                      ? isActive
                                        ? "h-5 w-5 text-white"
                                        : "h-5 w-5 text-slate-700"
                                      : isActive
                                        ? "h-4 w-4 text-white"
                                        : "h-4 w-4 text-slate-700"
                                  }
                                />
                                {!collapsed && (
                                  <span className="truncate">{item.label}</span>
                                )}
                              </>
                            )}
                          </NavLink>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}

        {[...navBottom]
          .filter((i) => canShow(i.to))
          .sort(byOrder)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                style={({ isActive }) =>
                  isActive
                    ? ({
                        background:
                          "linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)",
                      } as any)
                    : undefined
                }
                className={({ isActive }) => {
                  const base = collapsed
                    ? "rounded-md p-2 text-sm font-medium flex items-center justify-center"
                    : "rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2";
                  const active = isActive
                    ? "text-white"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900";
                  return `${base} ${active}`;
                }}
                end={item.end}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={
                        collapsed
                          ? isActive
                            ? "h-5 w-5 text-white"
                            : "h-5 w-5 text-slate-700"
                          : isActive
                            ? "h-4 w-4 text-white"
                            : "h-4 w-4 text-slate-700"
                      }
                    />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
      </nav>
      <div className={collapsed ? "p-2" : "p-3"}>
        <button
          onClick={async () => {
            try {
              const raw = localStorage.getItem("hospital.session");
              const u = raw ? JSON.parse(raw) : null;
              await hospitalApi.logoutHospitalUser(u?.username || "");
            } catch {}
            try {
              localStorage.removeItem("hospital.session");
            } catch {}
            navigate("/hospital/login");
          }}
          title={collapsed ? "Logout" : undefined}
          className={
            collapsed
              ? "w-full inline-flex items-center justify-center rounded-md p-2 text-sm font-medium"
              : "w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
          }
          style={{
            backgroundColor: "#ffffff",
            color: "var(--navy)",
            border: "1px solid var(--navy)",
          }}
          onMouseEnter={(e) => {
            try {
              (e.currentTarget as any).style.backgroundColor =
                "rgba(15,45,92,0.06)";
            } catch {}
          }}
          onMouseLeave={(e) => {
            try {
              (e.currentTarget as any).style.backgroundColor = "#ffffff";
            } catch {}
          }}
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
