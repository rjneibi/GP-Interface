import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import Cases from "./pages/Cases";
import CaseDetails from "./pages/CaseDetails";

// ✅ NEW useful pages
import FraudAnalytics from "./pages/FraudAnalytics";
import AlertManagement from "./pages/AlertManagement";
import MLDashboard from "./pages/MLDashboard";

import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./auth/ProtectedRoute";
import RequireRole from "./auth/RequireRole";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        
        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Core Pages */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/:caseId" element={<CaseDetails />} />
            
            {/* ✅ NEW Fraud Detection Features */}
            <Route path="/fraud-analytics" element={<FraudAnalytics />} />
            <Route path="/alert-management" element={<AlertManagement />} />
            
            {/* Reports */}
            <Route path="/reports" element={<Reports />} />
            
            {/* ML Dashboard (Admin+ only) */}
            <Route path="/ml-dashboard" element={
              <RequireRole allowedRoles={["admin", "superadmin"]}>
                <MLDashboard />
              </RequireRole>
            } />
            
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