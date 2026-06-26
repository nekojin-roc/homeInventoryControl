import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  PackagePlus,
  ScanBarcode,
  Users,
  Archive,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/intake", icon: PackagePlus, label: "Intake" },
  { to: "/pickup", icon: ScanBarcode, label: "Pickup" },
  { to: "/packages", icon: Archive, label: "Packages" },
  { to: "/recipients", icon: Users, label: "Recipients" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar-background">
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-lg font-bold tracking-tight">
            ParcelHub
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex md:hidden h-14 items-center border-b px-4 gap-4 overflow-x-auto">
          <span className="text-lg font-bold tracking-tight shrink-0">
            ParcelHub
          </span>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium shrink-0 transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
