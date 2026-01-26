import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../auth/session";

export default function AppLayout() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const role = user?.role;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: "📊", roles: ["analyst", "admin", "superadmin"] },
    { path: "/transactions", label: "Transactions", icon: "💳", roles: ["analyst", "admin", "superadmin"] },
    { path: "/cases", label: "Cases", icon: "📋", roles: ["analyst", "admin", "superadmin"] },
    { path: "/intelligence", label: "Intelligence", icon: "🧠", roles: ["analyst", "admin", "superadmin"] },
    { path: "/reports", label: "Reports", icon: "📈", roles: ["analyst", "admin", "superadmin"] },
    { path: "/admin", label: "Admin", icon: "⚙️", roles: ["admin", "superadmin"] },
    { path: "/superadmin", label: "Super Admin", icon: "👑", roles: ["superadmin"] },
  ].filter((item) => item.roles.includes(role));

  return (
    <div className="dark-gradient-bg flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 dark-card border-r border-slate-700/50 flex flex-col">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold">Fraud Detect</h1>
              <p className="text-xs text-slate-400">v1.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {user?.username?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div className="text-sm text-white font-medium">{user?.username}</div>
                <div className="text-xs text-slate-400">{user?.role}</div>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-slate-700/50 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto content-layer">
        <Outlet />
      </main>
    </div>
  );
}
