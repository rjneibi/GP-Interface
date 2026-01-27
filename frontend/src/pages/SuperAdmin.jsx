import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getAccessToken } from "../auth/session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function SuperAdmin() {
  const context = useOutletContext();
  const darkMode = context?.darkMode ?? true;
  
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivity, setUserActivity] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateRange, setDateRange] = useState("7days");
  const [roleFilter, setRoleFilter] = useState("all");
  
  // Tab state
  const [activeTab, setActiveTab] = useState("overview");

  // Theme classes
  const cardClass = darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const textMutedClass = darkMode ? "text-white/60" : "text-gray-500";
  const inputClass = darkMode 
    ? "bg-white/5 border-white/10 text-white placeholder-white/40" 
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400";

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadStatistics(),
        loadAllLogs()
      ]);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/audit/superadmin/all-users`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  const loadStatistics = async () => {
    try {
      const token = getAccessToken();
      const days = dateRange === "today" ? 1 : dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90;
      const response = await fetch(`${API_BASE}/api/audit/superadmin/statistics?days=${days}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (err) {
      console.error("Error loading statistics:", err);
    }
  };

  const loadAllLogs = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/audit/superadmin/comprehensive?limit=200`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  const loadUserActivity = async (username) => {
    try {
      const token = getAccessToken();
      const days = dateRange === "today" ? 1 : dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90;
      const response = await fetch(`${API_BASE}/api/audit/superadmin/user-activity/${username}?days=${days}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserActivity(data);
        setSelectedUser(username);
        setActiveTab("user-detail");
      }
    } catch (err) {
      console.error("Error loading user activity:", err);
    }
  };

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === "" || 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Filter logs based on action
  const filteredLogs = allLogs.filter(log => {
    if (actionFilter === "") return true;
    return log.action.toLowerCase().includes(actionFilter.toLowerCase());
  });

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={textMutedClass}>Loading audit data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>SuperAdmin Audit & Monitoring</h1>
          <p className={textMutedClass}>Complete system activity tracking and user monitoring</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className={`rounded-lg border px-4 py-2 text-sm ${inputClass}`}
        >
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
        </select>
      </div>

      {/* Tabs */}
      <div className={`rounded-xl border ${cardClass}`}>
        <div className="flex border-b border-inherit">
          {[
            { id: "overview", label: "📊 Overview" },
            { id: "all-users", label: "👥 All Users" },
            { id: "activity-logs", label: "📝 Activity Logs" },
            { id: "user-detail", label: "🔍 User Detail", hidden: !selectedUser }
          ].filter(tab => !tab.hidden).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? darkMode
                    ? "border-b-2 border-blue-500 text-white"
                    : "border-b-2 border-blue-600 text-blue-600"
                  : textMutedClass
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && statistics && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={statistics.total_users} darkMode={darkMode} />
                <StatCard label="Active Users" value={statistics.active_users} color="emerald" darkMode={darkMode} />
                <StatCard label="Total Activities" value={statistics.total_activities} color="blue" darkMode={darkMode} />
                <StatCard 
                  label="Activities/User" 
                  value={Math.round(statistics.total_activities / statistics.total_users)} 
                  darkMode={darkMode} 
                />
              </div>

              {/* Top Active Users */}
              <div className={`rounded-xl border p-6 ${cardClass}`}>
                <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Top Active Users</h3>
                <div className="space-y-3">
                  {statistics.top_active_users.map((user, index) => (
                    <div key={user.username} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-mono ${textMutedClass}`}>#{index + 1}</span>
                        <div>
                          <div className={`font-medium ${textClass}`}>{user.username}</div>
                          <div className={`text-xs ${textMutedClass}`}>{user.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-sm ${textClass}`}>{user.activity_count} activities</span>
                        <button
                          onClick={() => loadUserActivity(user.username)}
                          className={`text-sm text-blue-500 hover:text-blue-600`}
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Distribution */}
              <div className={`rounded-xl border p-6 ${cardClass}`}>
                <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Action Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(statistics.action_distribution)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([action, count]) => {
                      const percentage = (count / statistics.total_activities) * 100;
                      return (
                        <div key={action}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm ${textClass}`}>{action}</span>
                            <span className={`text-sm ${textMutedClass}`}>
                              {count} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className={`h-2 rounded-full ${darkMode ? "bg-white/10" : "bg-gray-200"}`}>
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* All Users Tab */}
          {activeTab === "all-users" && (
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search users by username or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm ${inputClass}`}
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className={`rounded-lg border px-4 py-2 text-sm ${inputClass}`}
                >
                  <option value="all">All Roles</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              {/* Users Table */}
              <div className={`rounded-lg border overflow-hidden ${cardClass}`}>
                <table className="w-full">
                  <thead className={darkMode ? "bg-white/5" : "bg-gray-50"}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>User</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Role</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Status</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Last Login</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Activity (7d)</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? "divide-white/5" : "divide-gray-100"}`}>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"}>
                        <td className={`px-4 py-3`}>
                          <div className={`font-medium ${textClass}`}>{user.username}</div>
                          <div className={`text-xs ${textMutedClass}`}>{user.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                            user.role === "superadmin" ? (darkMode ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700") :
                            user.role === "admin" ? (darkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700") :
                            (darkMode ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.is_active 
                              ? (darkMode ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                              : (darkMode ? "bg-gray-500/20 text-gray-300" : "bg-gray-100 text-gray-700")
                          }`}>
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm ${textMutedClass}`}>
                          {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                        </td>
                        <td className={`px-4 py-3 text-sm ${textClass}`}>
                          {user.activity_last_7_days}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => loadUserActivity(user.username)}
                            className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                          >
                            View Activity
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className={`text-center py-8 ${textMutedClass}`}>
                  No users found matching your filters
                </div>
              )}
            </div>
          )}

          {/* Activity Logs Tab */}
          {activeTab === "activity-logs" && (
            <div className="space-y-4">
              {/* Action Filter */}
              <input
                type="text"
                placeholder="Filter by action type..."
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className={`w-full rounded-lg border px-4 py-2 text-sm ${inputClass}`}
              />

              {/* Logs List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredLogs.map(log => (
                  <div key={log.id} className={`rounded-lg border p-4 ${cardClass}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`font-medium ${textClass}`}>{log.action}</div>
                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <div className={`text-xs mt-1 ${textMutedClass}`}>
                            {JSON.stringify(log.meta)}
                          </div>
                        )}
                      </div>
                      <div className={`text-xs ${textMutedClass}`}>
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredLogs.length === 0 && (
                <div className={`text-center py-8 ${textMutedClass}`}>
                  No logs found matching your filter
                </div>
              )}
            </div>
          )}

          {/* User Detail Tab */}
          {activeTab === "user-detail" && userActivity && (
            <div className="space-y-6">
              {/* User Header */}
              <div className={`rounded-xl border p-6 ${darkMode ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`text-xl font-bold ${textClass}`}>{userActivity.username}</h3>
                    <p className={`text-sm ${textMutedClass}`}>
                      Role: {userActivity.role} • User ID: {userActivity.user_id}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("all-users")}
                    className={`text-sm ${textMutedClass} hover:${textClass}`}
                  >
                    ← Back to Users
                  </button>
                </div>
                <div className={`mt-4 text-lg font-semibold ${textClass}`}>
                  {userActivity.total_activities} activities in the selected period
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-3">
                <h4 className={`font-semibold ${textClass}`}>Activity Timeline</h4>
                {userActivity.logs.map(log => (
                  <div key={log.id} className={`rounded-lg border p-4 ${cardClass}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`font-medium ${textClass}`}>{log.action}</div>
                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <div className={`text-xs mt-2 font-mono ${textMutedClass}`}>
                            {JSON.stringify(log.meta, null, 2)}
                          </div>
                        )}
                      </div>
                      <div className={`text-xs ${textMutedClass} whitespace-nowrap ml-4`}>
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}

                {userActivity.logs.length === 0 && (
                  <div className={`text-center py-8 ${textMutedClass}`}>
                    No activity found for this user in the selected period
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, darkMode }) {
  const colors = {
    blue: darkMode ? "border-blue-500/20 bg-blue-500/10 text-blue-300" : "border-blue-200 bg-blue-50 text-blue-700",
    emerald: darkMode ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: darkMode ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700",
  };

  const defaultClass = darkMode ? "border-white/10 bg-white/5 text-white" : "border-gray-200 bg-white text-gray-900";

  return (
    <div className={`rounded-xl border p-4 ${color ? colors[color] : defaultClass}`}>
      <div className={`text-sm ${darkMode ? "text-white/60" : "text-gray-600"}`}>{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}