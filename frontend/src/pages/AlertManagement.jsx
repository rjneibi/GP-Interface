import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getAccessToken, getCurrentUser } from "../auth/session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function AlertManagement() {
  const context = useOutletContext();
  const darkMode = context?.darkMode ?? true;
  const currentUser = getCurrentUser();
  
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  
  // Alert thresholds (can be made configurable)
  const [settings, setSettings] = useState({
    highRiskThreshold: 70,
    amountThreshold: 10000,
    autoCreateCase: true,
    notifyEmail: false,
  });

  // Theme classes
  const cardClass = darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const textMutedClass = darkMode ? "text-white/60" : "text-gray-500";

  useEffect(() => {
    loadTransactions();
    // In real app, would poll for new transactions
    const interval = setInterval(loadTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    generateAlerts();
  }, [transactions, settings]);

  const loadTransactions = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/transactions/`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data || []);
      }
    } catch (err) {
      console.error("Error loading transactions:", err);
    }
  };

  const generateAlerts = () => {
    const newAlerts = [];
    const recentTxs = transactions.slice(-50); // Last 50 transactions
    
    recentTxs.forEach(tx => {
      const alertId = `alert-${tx.tx_id}`;
      
      // Skip if alert already exists
      if (alerts.find(a => a.id === alertId)) return;
      
      // High Risk Alert
      if (tx.risk >= settings.highRiskThreshold) {
        newAlerts.push({
          id: alertId,
          type: "high_risk",
          severity: "critical",
          title: "High Risk Transaction Detected",
          message: `Transaction ${tx.tx_id} flagged with ${tx.risk}% risk score`,
          transaction: tx,
          timestamp: new Date(tx.created_at || tx.ts),
          status: "active",
          acknowledgedBy: null,
          acknowledgedAt: null,
        });
      }
      
      // High Amount Alert
      if (tx.amount >= settings.amountThreshold) {
        newAlerts.push({
          id: `amount-${tx.tx_id}`,
          type: "high_amount",
          severity: "warning",
          title: "High Value Transaction",
          message: `Transaction ${tx.tx_id} for $${tx.amount.toLocaleString()}`,
          transaction: tx,
          timestamp: new Date(tx.created_at || tx.ts),
          status: "active",
          acknowledgedBy: null,
          acknowledgedAt: null,
        });
      }
      
      // Suspicious Pattern (example: multiple transactions from same user)
      const userTxs = recentTxs.filter(t => t.user === tx.user);
      if (userTxs.length >= 5 && tx.risk >= 40) {
        newAlerts.push({
          id: `pattern-${tx.tx_id}`,
          type: "suspicious_pattern",
          severity: "warning",
          title: "Suspicious Activity Pattern",
          message: `User ${tx.user} has ${userTxs.length} transactions in quick succession`,
          transaction: tx,
          timestamp: new Date(tx.created_at || tx.ts),
          status: "active",
          acknowledgedBy: null,
          acknowledgedAt: null,
        });
      }
    });
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 100)); // Keep last 100 alerts
    }
  };

  const acknowledgeAlert = (alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { 
            ...alert, 
            status: "acknowledged",
            acknowledgedBy: currentUser?.username,
            acknowledgedAt: new Date()
          }
        : alert
    ));
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: "dismissed" }
        : alert
    ));
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus === "all") return true;
    return alert.status === filterStatus;
  });

  const stats = {
    active: alerts.filter(a => a.status === "active").length,
    acknowledged: alerts.filter(a => a.status === "acknowledged").length,
    dismissed: alerts.filter(a => a.status === "dismissed").length,
    critical: alerts.filter(a => a.severity === "critical" && a.status === "active").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>Alert Management</h1>
          <p className={textMutedClass}>Real-time fraud detection alerts and notifications</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            darkMode 
              ? "bg-white/5 border border-white/10 text-white hover:bg-white/10" 
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`rounded-xl border p-6 ${cardClass}`}>
          <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>Alert Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                High Risk Threshold
              </label>
              <input
                type="number"
                value={settings.highRiskThreshold}
                onChange={(e) => setSettings({...settings, highRiskThreshold: parseInt(e.target.value)})}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode 
                    ? "bg-white/5 border-white/10 text-white" 
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                min="0"
                max="100"
              />
              <p className={`text-xs mt-1 ${textMutedClass}`}>
                Alert when risk score ≥ this value (0-100)
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                Amount Threshold ($)
              </label>
              <input
                type="number"
                value={settings.amountThreshold}
                onChange={(e) => setSettings({...settings, amountThreshold: parseInt(e.target.value)})}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode 
                    ? "bg-white/5 border-white/10 text-white" 
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                min="0"
                step="1000"
              />
              <p className={`text-xs mt-1 ${textMutedClass}`}>
                Alert for transactions ≥ this amount
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.autoCreateCase}
                onChange={(e) => setSettings({...settings, autoCreateCase: e.target.checked})}
                className="rounded"
              />
              <label className={`text-sm ${textClass}`}>
                Auto-create cases for critical alerts
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notifyEmail}
                onChange={(e) => setSettings({...settings, notifyEmail: e.target.checked})}
                className="rounded"
              />
              <label className={`text-sm ${textClass}`}>
                Email notifications (coming soon)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Alerts" value={stats.active} color="blue" darkMode={darkMode} />
        <StatCard label="Critical" value={stats.critical} color="rose" darkMode={darkMode} />
        <StatCard label="Acknowledged" value={stats.acknowledged} color="amber" darkMode={darkMode} />
        <StatCard label="Dismissed" value={stats.dismissed} color="emerald" darkMode={darkMode} />
      </div>

      {/* Filter */}
      <div className={`rounded-xl border p-4 ${cardClass}`}>
        <div className="flex gap-2">
          {["all", "active", "acknowledged", "dismissed"].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filterStatus === status
                  ? "bg-blue-600 text-white"
                  : darkMode
                  ? "bg-white/5 text-white/70 hover:bg-white/10"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className={`rounded-xl border p-8 text-center ${cardClass}`}>
            <p className={textMutedClass}>
              {filterStatus === "all" ? "No alerts yet" : `No ${filterStatus} alerts`}
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={acknowledgeAlert}
              onDismiss={dismissAlert}
              darkMode={darkMode}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, darkMode }) {
  const colors = {
    blue: darkMode ? "border-blue-500/20 bg-blue-500/10 text-blue-300" : "border-blue-200 bg-blue-50 text-blue-700",
    rose: darkMode ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-700",
    amber: darkMode ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700",
    emerald: darkMode ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className={`text-sm ${darkMode ? "text-white/60" : "text-gray-600"}`}>{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function AlertCard({ alert, onAcknowledge, onDismiss, darkMode }) {
  const severityColors = {
    critical: darkMode ? "border-rose-500/30 bg-rose-500/10" : "border-rose-300 bg-rose-50",
    warning: darkMode ? "border-amber-500/30 bg-amber-500/10" : "border-amber-300 bg-amber-50",
    info: darkMode ? "border-blue-500/30 bg-blue-500/10" : "border-blue-300 bg-blue-50",
  };

  const statusBadge = {
    active: { color: darkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700", icon: "🔵" },
    acknowledged: { color: darkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700", icon: "✅" },
    dismissed: { color: darkMode ? "bg-gray-500/20 text-gray-300" : "bg-gray-100 text-gray-700", icon: "✖️" },
  };

  const textClass = darkMode ? "text-white" : "text-gray-900";
  const textMutedClass = darkMode ? "text-white/60" : "text-gray-600";

  return (
    <div className={`rounded-xl border p-4 ${severityColors[alert.severity]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${statusBadge[alert.status].color}`}>
            {statusBadge[alert.status].icon} {alert.status}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
            alert.severity === "critical" 
              ? darkMode ? "bg-rose-500/20 text-rose-300" : "bg-rose-100 text-rose-700"
              : darkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"
          }`}>
            {alert.severity}
          </span>
        </div>
        <span className={`text-xs ${textMutedClass}`}>
          {new Date(alert.timestamp).toLocaleString()}
        </span>
      </div>

      <h3 className={`font-semibold mb-1 ${textClass}`}>{alert.title}</h3>
      <p className={`text-sm mb-3 ${textMutedClass}`}>{alert.message}</p>

      {alert.transaction && (
        <div className={`mb-3 p-3 rounded-lg ${darkMode ? "bg-white/5" : "bg-white/50"}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <span className={textMutedClass}>Amount:</span>
              <span className={`ml-2 font-semibold ${textClass}`}>
                ${alert.transaction.amount?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className={textMutedClass}>Risk:</span>
              <span className={`ml-2 font-semibold ${textClass}`}>
                {alert.transaction.risk}%
              </span>
            </div>
            <div>
              <span className={textMutedClass}>Country:</span>
              <span className={`ml-2 font-semibold ${textClass}`}>
                {alert.transaction.country}
              </span>
            </div>
            <div>
              <span className={textMutedClass}>Merchant:</span>
              <span className={`ml-2 font-semibold ${textClass}`}>
                {alert.transaction.merchant}
              </span>
            </div>
          </div>
        </div>
      )}

      {alert.acknowledgedBy && (
        <p className={`text-xs ${textMutedClass} mb-3`}>
          Acknowledged by {alert.acknowledgedBy} at {new Date(alert.acknowledgedAt).toLocaleString()}
        </p>
      )}

      {alert.status === "active" && (
        <div className="flex gap-2">
          <button
            onClick={() => onAcknowledge(alert.id)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              darkMode 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            ✅ Acknowledge
          </button>
          <button
            onClick={() => onDismiss(alert.id)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              darkMode 
                ? "bg-white/5 hover:bg-white/10 text-white/70" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            ✖️ Dismiss
          </button>
        </div>
      )}
    </div>
  );
}