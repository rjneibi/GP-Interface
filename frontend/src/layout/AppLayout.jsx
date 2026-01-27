import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../auth/session";
import { useState, useEffect } from "react";

export default function AppLayout() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const role = user?.role;
  
  // Theme state - persist to localStorage
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true; // Default to dark
  });

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navItems = [
    { to: "/dashboard", label: "📊 Dashboard", roles: ["analyst", "admin", "superadmin"] },
    { to: "/transactions", label: "💳 Transactions", roles: ["analyst", "admin", "superadmin"] },
    { to: "/cases", label: "📋 Cases", roles: ["analyst", "admin", "superadmin"] },
    { to: "/fraud-analytics", label: "📈 Fraud Analytics", roles: ["analyst", "admin", "superadmin"] },
    { to: "/alert-management", label: "🚨 Alert Management", roles: ["analyst", "admin", "superadmin"] },
    { to: "/ml-dashboard", label: "🤖 ML Dashboard", roles: ["admin", "superadmin"] },
    { to: "/reports", label: "📄 Reports", roles: ["analyst", "admin", "superadmin"] },
    { to: "/admin", label: "👥 Admin", roles: ["admin", "superadmin"] },
    { to: "/superadmin", label: "⚡ SuperAdmin", roles: ["superadmin"] },
  ].filter((item) => item.roles.includes(role));

  return (
    <div className={`min-h-screen flex ${darkMode ? "bg-slate-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Sidebar */}
      <aside className={`w-64 hidden md:flex flex-col border-r h-screen sticky top-0 overflow-hidden ${
        darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"
      }`}>
        {/* Header */}
        <div className={`p-5 border-b flex-shrink-0 ${darkMode ? "border-white/10" : "border-gray-200"}`}>
          <div className="text-lg font-semibold">Fraud Detection System</div>
          <div className={`text-xs mt-1 ${darkMode ? "text-white/50" : "text-gray-500"}`}>
            AI-Powered Security Platform
          </div>
          <div className={`mt-3 text-xs ${darkMode ? "text-white/60" : "text-gray-600"}`}>
            {user?.username ? (
              <>
                <span className={darkMode ? "text-white/80" : "text-gray-800"}>{user.username}</span>
                <span className={darkMode ? "text-white/40" : "text-gray-400"}> - </span>
                <span className="uppercase">{role}</span>
              </>
            ) : (
              <span className={darkMode ? "text-white/40" : "text-gray-400"}>Not signed in</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? darkMode
                      ? "bg-white/10 text-white"
                      : "bg-blue-50 text-blue-700"
                    : darkMode
                    ? "text-white/70 hover:bg-white/5 hover:text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Theme Toggle & Logout */}
        <div className={`p-4 border-t flex-shrink-0 space-y-3 ${darkMode ? "border-white/10" : "border-gray-200"}`}>
          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
              darkMode
                ? "bg-white/5 text-white/70 hover:bg-white/10"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            data-testid="theme-toggle"
          >
            <span>{darkMode ? "Dark Mode" : "Light Mode"}</span>
            <span className="text-lg">{darkMode ? "🌙" : "☀️"}</span>
          </button>
          
          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition ${
              darkMode
                ? "bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20"
                : "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
            }`}
            data-testid="logout-btn"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`h-16 flex items-center justify-between px-6 border-b ${
          darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"
        }`}>
          <div className={`text-sm ${darkMode ? "text-white/70" : "text-gray-600"}`}>
            Fraud Detection Platform
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs hidden sm:inline ${darkMode ? "text-white/60" : "text-gray-500"}`}>
              {user?.username ? `${user.username} - ${role}` : ""}
            </span>
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${
              darkMode ? "bg-blue-500" : "bg-blue-600"
            } text-white`}>
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`p-6 flex-1 overflow-y-auto min-w-0 ${darkMode ? "" : "bg-gray-50"}`}>
          <Outlet context={{ darkMode }} />
        </main>
      </div>
    </div>
  );
}