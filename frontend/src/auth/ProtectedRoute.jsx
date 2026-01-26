import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated, getCurrentUser } from "./session";

export default function ProtectedRoute() {
  const authed = isAuthenticated();
  const user = getCurrentUser();

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  // If user must change password, redirect to change-password page
  // Allow access to change-password page itself
  if (user?.must_change_password && window.location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
