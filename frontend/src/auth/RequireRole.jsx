import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getRole } from "./session";

export default function RequireRole({ allow = [] }) {
  const role = getRole();
  const location = useLocation();

  // Not logged in? go login
  if (!role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Not allowed? go dashboard (safe)
  if (!allow.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
