import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import AppLayout from "./layout/AppLayout";

import ProtectedRoute from "./auth/ProtectedRoute";
import RequireRole from "./auth/RequireRole";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected area */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
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

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
