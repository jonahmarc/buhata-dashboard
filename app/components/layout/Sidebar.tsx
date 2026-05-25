import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Users,
  Ticket,
  CreditCard,
  Wrench,
  Activity,
  LogOut,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useAuthStore } from "~/stores/authStore";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/tickets", label: "Tickets", icon: Ticket },
  { to: "/admin/upgrades", label: "Upgrades", icon: Wrench },
  { to: "/admin/billing", label: "Billing", icon: CreditCard },
  { to: "/admin/jobs", label: "Jobs", icon: Activity, disabled: true },
];

export function Sidebar() {
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  const initials = user?.email?.[0]?.toUpperCase() ?? "A";

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-dark-deep border-r border-cream/5">
      {/* Wordmark */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-cream/5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber">
          <span className="font-display text-sm font-bold text-white">B</span>
        </div>
        <div>
          <span className="font-display text-base font-semibold text-cream tracking-wide">
            Buhata
          </span>
          <p className="text-[10px] text-cream/35 -mt-0.5 tracking-wider uppercase">
            Admin
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-cream/25 cursor-not-allowed select-none"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                <span className="ml-auto rounded bg-cream/5 px-1.5 py-0.5 text-[10px] text-cream/25">
                  soon
                </span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-amber/12 text-amber"
                    : "text-cream/50 hover:text-cream hover:bg-cream/5"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-cream/5 px-2.5 py-3 space-y-0.5">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber/15 ring-1 ring-amber/30">
            <span className="text-xs font-semibold text-amber">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-cream">
              {user?.email}
            </p>
            <p className="text-[10px] text-cream/35 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-cream/40 hover:text-cream hover:bg-cream/5 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
