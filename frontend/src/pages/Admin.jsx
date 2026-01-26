import { useState, useEffect } from "react";
import { getAccessToken } from "../auth/session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  
  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("analyst");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/auth/users`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
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
        setNewPassword(data.temporary_password);
        
        // Reset form
        setUsername("");
        setEmail("");
        setRole("analyst");
        
        // Refresh users list
        fetchUsers();
        
        // Show password modal
        alert(`User created! Temporary Password: ${data.temporary_password}\n\nPlease save this password and share it securely with the user.`);
        setShowCreateForm(false);
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Failed to create user");
    }
  };

  const handleResetPassword = async (userId, username) => {
    if (!confirm(`Reset password for ${username}?`)) return;

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/auth/users/${userId}/reset-password`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Password reset! New temporary password: ${data.temporary_password}\n\nPlease share this securely with the user.`);
      } else {
        alert("Failed to reset password");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Failed to reset password");
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Delete user ${username}? This action cannot be undone.`)) return;

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/auth/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("User deleted successfully");
        fetchUsers();
      } else {
        alert("Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
          Loading users...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-white">User Management</h1>
        <p className="text-white/60 mt-2">Manage user accounts and permissions</p>
      </div>

      {/* Create User Button */}
      <div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 font-semibold transition"
          data-testid="create-user-btn"
        >
          {showCreateForm ? "Cancel" : "+ Create New User"}
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Create New User</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Username *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Enter username"
                data-testid="create-user-username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="user@example.com"
                data-testid="create-user-email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-800 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                data-testid="create-user-role"
              >
                <option value="analyst">Analyst</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-200">
                <strong>Note:</strong> A random secure password will be generated. 
                You must save and share it securely with the user.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 font-semibold transition"
                data-testid="submit-create-user"
              >
                Create User
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 px-6 py-2 font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">Username</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">Last Login</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-white/70">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4 text-sm text-white">{user.username}</td>
                  <td className="px-6 py-4 text-sm text-white/70">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.role === 'superadmin' ? 'bg-purple-500/20 text-purple-200' :
                      user.role === 'admin' ? 'bg-blue-500/20 text-blue-200' :
                      'bg-white/10 text-white/70'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.is_active ? (
                        <span className="text-emerald-400 text-xs flex items-center gap-1">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                          Active
                        </span>
                      ) : (
                        <span className="text-rose-400 text-xs flex items-center gap-1">
                          <span className="w-2 h-2 bg-rose-400 rounded-full"></span>
                          Inactive
                        </span>
                      )}
                      {user.must_change_password && (
                        <span className="text-amber-400 text-xs">(Must change pwd)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/60">
                    {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleResetPassword(user.id, user.username)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition"
                        data-testid={`reset-pwd-${user.username}`}
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="text-rose-400 hover:text-rose-300 text-sm font-medium transition"
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
          <div className="text-center py-12 text-white/50">
            No users found. Create your first user above.
          </div>
        )}
      </div>
    </div>
  );
}
