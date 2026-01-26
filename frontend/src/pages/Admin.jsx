import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getAccessToken } from "../auth/session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";

export default function Admin() {
  const context = useOutletContext();
  const darkMode = context?.darkMode ?? true;
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("analyst");

  // Theme classes
  const cardClass = darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const textMutedClass = darkMode ? "text-white/60" : "text-gray-500";
  const inputClass = darkMode 
    ? "bg-white/5 border-white/10 text-white placeholder-white/40" 
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400";

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/auth/users`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/auth/users`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, role }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`User created successfully!\n\nTemporary Password: ${data.temporary_password}\n\nPlease save this password and share it securely with the user.`);
        setUsername("");
        setEmail("");
        setRole("analyst");
        setShowCreateForm(false);
        fetchUsers();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      alert("Failed to create user");
    }
  };

  const handleResetPassword = async (userId, username) => {
    if (!confirm(`Reset password for ${username}?`)) return;
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/auth/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Password reset!\n\nNew temporary password: ${data.temporary_password}`);
      } else {
        alert("Failed to reset password");
      }
    } catch (error) {
      alert("Failed to reset password");
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Delete user ${username}? This action cannot be undone.`)) return;
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/auth/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        alert("User deleted successfully");
        fetchUsers();
      } else {
        alert("Failed to delete user");
      }
    } catch (error) {
      alert("Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div className={`rounded-xl border p-8 text-center ${cardClass} ${textMutedClass}`}>
        Loading users...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-semibold ${textClass}`}>User Management</h1>
        <p className={textMutedClass}>Manage user accounts and permissions</p>
      </div>

      {/* Create User Button */}
      <div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
          data-testid="create-user-btn"
        >
          {showCreateForm ? "Cancel" : "Create New User"}
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className={`rounded-xl border p-6 ${cardClass}`}>
          <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>Create New User</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textMutedClass}`}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
                placeholder="Enter username"
                data-testid="create-user-username"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${textMutedClass}`}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
                placeholder="user@example.com"
                data-testid="create-user-email"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${textMutedClass}`}>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? "bg-slate-800 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                }`}
                data-testid="create-user-role"
              >
                <option value="analyst">Analyst</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>

            <div className={`rounded-lg border p-3 ${darkMode ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              <p className="text-sm">
                <strong>Note:</strong> A random secure password will be generated. You must save and share it securely with the user.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
                data-testid="submit-create-user"
              >
                Create User
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  darkMode ? "border-white/10 text-white/70 hover:bg-white/5" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? "bg-white/5" : "bg-gray-50"}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Username</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Email</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Role</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Status</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Last Login</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? "divide-white/5" : "divide-gray-100"}`}>
              {users.map((user) => (
                <tr key={user.id} className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"}>
                  <td className={`px-4 py-3 text-sm font-medium ${textClass}`}>{user.username}</td>
                  <td className={`px-4 py-3 text-sm ${textMutedClass}`}>{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      user.role === 'superadmin' 
                        ? darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
                        : user.role === 'admin' 
                        ? darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                        : darkMode ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.is_active ? (
                        <span className={`text-xs flex items-center gap-1 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                          Active
                        </span>
                      ) : (
                        <span className={`text-xs flex items-center gap-1 ${darkMode ? "text-rose-400" : "text-rose-600"}`}>
                          <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                          Inactive
                        </span>
                      )}
                      {user.must_change_password && (
                        <span className={`text-xs ${darkMode ? "text-amber-400" : "text-amber-600"}`}>(Must change pwd)</span>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-sm ${textMutedClass}`}>
                    {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleResetPassword(user.id, user.username)}
                        className={`text-sm font-medium ${darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
                        data-testid={`reset-pwd-${user.username}`}
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className={`text-sm font-medium ${darkMode ? "text-rose-400 hover:text-rose-300" : "text-rose-600 hover:text-rose-700"}`}
                        data-testid={`delete-user-${user.username}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className={`text-center py-12 ${textMutedClass}`}>
            No users found. Create your first user above.
          </div>
        )}
      </div>
    </div>
  );
}
