// src/auth/session.js
// Real JWT authentication with backend API

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";

/**
 * Login with real backend authentication
 */
export async function login(username, password) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    const data = await response.json();
    
    // Store token and user info
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    return data.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

/**
 * Logout
 */
export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser() {
  const userData = localStorage.getItem("user");
  if (!userData) return null;
  
  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

/**
 * Get access token
 */
export function getAccessToken() {
  return localStorage.getItem("access_token");
}

/**
 * Check if user has required role
 */
export function hasRole(allowedRoles) {
  const user = getCurrentUser();
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getAccessToken() && !!getCurrentUser();
}

/**
 * Change password
 */
export async function changePassword(oldPassword, newPassword) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Password change failed");
  }

  // Update user to remove must_change_password flag
  const user = getCurrentUser();
  if (user) {
    user.must_change_password = false;
    localStorage.setItem("user", JSON.stringify(user));
  }

  return await response.json();
}

/**
 * Get current user info from backend (refresh)
 */
export async function refreshCurrentUser() {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Token might be expired
      logout();
      return null;
    }

    const user = await response.json();
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  } catch (error) {
    console.error("Error refreshing user:", error);
    logout();
    return null;
  }
}
