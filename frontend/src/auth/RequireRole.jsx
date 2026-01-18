import { Navigate, Outlet } from "react-router-dom";
import { getRole, isAuthed } from "./session";

export default function RequireRole({ allow = [] }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;

  const role = getRole();
  if (!allow.includes(role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
