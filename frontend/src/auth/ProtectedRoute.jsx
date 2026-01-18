import { Navigate, Outlet } from "react-router-dom";
import { isAuthed } from "./session";

export default function ProtectedRoute() {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <Outlet />;
}
