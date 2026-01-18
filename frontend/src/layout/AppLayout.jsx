import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getUser, getRole } from "../auth/session";

export default function AppLayout() {
  const navigate = useNavigate();

  const user = getUser();
  const role = getRole(); // "analyst" | "admin" | "superadmin"

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  // Role-aware navigation
  const navItems = [
    { to: "/dashboard", label: "Dashboard", roles: ["analyst", "admin", "superadmin"] },
    { to: "/transactions", label: "Transactions", roles: ["analyst", "admin", "superadmin"] },
    { to: "/reports", label: "Reports", roles: ["analyst", "admin", "superadmin"] },
    { to: "/admin", label: "Admin", roles: ["admin", "superadmin"] },
    { to: "/superadmin", label: "SuperAdmin", roles: ["superadmin"] },
  ].filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 hidden md:flex flex-col border-r border-white/10 bg-white/5">
        <div className="p-5 border-b border-white/10">
          <div className="text-lg font-semibold">Secure Fraud Console</div>
          <div className="text-xs text-white/50 mt-1">GP2 System</div>

          {/* user + role */}
          <div className="mt-3 text-xs text-white/60">
            {user?.email ? (
              <>
                <span className="text-white/80">{user.email}</span>
                <span className="text-white/40"> • </span>
                <span className="uppercase">{role}</span>
              </>
            ) : (
              <span className="text-white/40">Not signed in</span>
            )}
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-xl px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-white/5">
          <div className="text-sm text-white/70">
            Fraud Detection Platform • <span className="text-white">v1</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-white/60 hidden sm:inline">
              {user?.email ? `${user.email} • ${role}` : "Role-based system demo"}
            </span>
            <div className="h-9 w-9 rounded-full bg-sky-500/90" />
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
