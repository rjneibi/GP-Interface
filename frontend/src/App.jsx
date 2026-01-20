import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import Cases from "./pages/Cases";
import Intelligence from "./pages/Intelligence";

// ✅ NEW pages
import DecisionAssistant from "./pages/DecisionAssistant";
import PatternExplorer from "./pages/PatternExplorer";
import AnalystPerformance from "./pages/AnalystPerformance";

import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./auth/ProtectedRoute";
import RequireRole from "./auth/RequireRole";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Core */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/intelligence" element={<Intelligence />} />

            {/* ✅ NEW Analyst value pages */}
            <Route path="/decision-assistant" element={<DecisionAssistant />} />
            <Route path="/pattern-explorer" element={<PatternExplorer />} />
            <Route path="/performance" element={<AnalystPerformance />} />

            {/* Optional aliases */}
            <Route path="/intel" element={<Navigate to="/intelligence" replace />} />

            <Route path="/reports" element={<Reports />} />

            {/* Admin-only */}
            <Route element={<RequireRole allow={["admin", "superadmin"]} />}>
              <Route path="/admin" element={<Admin />} />
            </Route>

            {/* Superadmin-only */}
            <Route element={<RequireRole allow={["superadmin"]} />}>
              <Route path="/superadmin" element={<SuperAdmin />} />
            </Route>
          </Route>
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
