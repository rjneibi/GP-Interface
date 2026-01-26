import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { txApi } from "../services/apiClient";

// Transaction Stream Service
const txStreamService = {
  _running: false,
  _listeners: new Set(),
  _interval: null,
  
  toggle() {
    this._running = !this._running;
    this._listeners.forEach(fn => fn(this._running));
    
    if (this._running) {
      this._interval = setInterval(() => this._generateTx(), 2000);
    } else {
      clearInterval(this._interval);
    }
  },
  
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },
  
  isRunning() { return this._running; },
  
  async _generateTx() {
    const countries = ["US", "UK", "UAE", "DE", "FR", "JP", "SG"];
    const merchants = ["Amazon", "Netflix", "Uber", "Apple Store", "Steam", "Walmart"];
    const channels = ["web", "mobile", "pos", "atm"];
    const devices = ["desktop", "mobile", "tablet", "terminal"];
    const cardTypes = ["visa", "mastercard", "amex"];
    
    const tx = {
      tx_id: `TX-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      user: `user_${Math.floor(Math.random() * 1000)}`,
      amount: Math.floor(Math.random() * 50000) + 100,
      country: countries[Math.floor(Math.random() * countries.length)],
      merchant: merchants[Math.floor(Math.random() * merchants.length)],
      channel: channels[Math.floor(Math.random() * channels.length)],
      device: devices[Math.floor(Math.random() * devices.length)],
      card_type: cardTypes[Math.floor(Math.random() * cardTypes.length)],
      ts: new Date().toISOString()
    };
    
    try {
      await txApi.create(tx);
    } catch (e) {
      console.error("Failed to create transaction:", e);
    }
  }
};

export default function Transactions() {
  const context = useOutletContext();
  const darkMode = context?.darkMode ?? true;
  
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streamOn, setStreamOn] = useState(txStreamService.isRunning());
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  
  const pollingRef = useRef(null);

  useEffect(() => {
    loadTransactions();
    
    // Subscribe to stream status
    const unsubscribe = txStreamService.subscribe(setStreamOn);
    
    // Poll for new transactions
    pollingRef.current = setInterval(() => {
      loadTransactions();
    }, 3000);
    
    return () => {
      unsubscribe();
      clearInterval(pollingRef.current);
    };
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await txApi.list();
      setRows(data || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllTransactions = async () => {
    if (!confirm("Are you sure you want to delete ALL transactions? This cannot be undone.")) {
      return;
    }
    
    try {
      setLoading(true);
      for (const tx of rows) {
        try {
          await txApi.delete(tx.tx_id);
        } catch (e) {
          console.error(`Failed to delete ${tx.tx_id}:`, e);
        }
      }
      setRows([]);
      alert("All transactions deleted successfully!");
      const fresh = await txApi.list();
      setRows(fresh || []);
    } catch (error) {
      console.error("Error clearing transactions:", error);
      alert("Failed to clear some transactions");
    } finally {
      setLoading(false);
    }
  };

  const getRiskLabel = (risk) => {
    if (risk >= 70) return { text: "HIGH", color: darkMode ? "bg-rose-500/20 text-rose-300" : "bg-rose-100 text-rose-700" };
    if (risk >= 40) return { text: "MEDIUM", color: darkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700" };
    return { text: "LOW", color: darkMode ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700" };
  };

  const filteredRows = rows.filter(tx => {
    const matchesSearch = search === "" || 
      tx.tx_id?.toLowerCase().includes(search.toLowerCase()) ||
      tx.user?.toLowerCase().includes(search.toLowerCase()) ||
      tx.merchant?.toLowerCase().includes(search.toLowerCase());
    
    const matchesRisk = riskFilter === "all" ||
      (riskFilter === "high" && tx.risk >= 70) ||
      (riskFilter === "medium" && tx.risk >= 40 && tx.risk < 70) ||
      (riskFilter === "low" && tx.risk < 40);
    
    return matchesSearch && matchesRisk;
  });

  // Theme classes
  const cardClass = darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const textMutedClass = darkMode ? "text-white/60" : "text-gray-500";
  const inputClass = darkMode 
    ? "bg-white/5 border-white/10 text-white placeholder-white/40" 
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400";
  const btnSecondary = darkMode 
    ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10" 
    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50";

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-6">
        <div className={`rounded-xl border p-8 text-center ${cardClass} ${textMutedClass}`}>
          Loading transactions...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>Transactions</h1>
          <p className={textMutedClass}>Monitor and analyze real-time transaction data</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearAllTransactions}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${btnSecondary}`}
            data-testid="clear-transactions-btn"
          >
            Clear All
          </button>
          <button
            onClick={() => txStreamService.toggle()}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              streamOn
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
            data-testid="toggle-stream-btn"
          >
            {streamOn ? "Stop Stream" : "Start Stream"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`rounded-xl border p-4 ${cardClass}`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by TX ID, user, or merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
            />
          </div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className={`rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Total" 
          value={rows.length} 
          darkMode={darkMode}
        />
        <StatCard 
          label="High Risk" 
          value={rows.filter(tx => tx.risk >= 70).length} 
          color="rose"
          darkMode={darkMode}
        />
        <StatCard 
          label="Medium Risk" 
          value={rows.filter(tx => tx.risk >= 40 && tx.risk < 70).length} 
          color="amber"
          darkMode={darkMode}
        />
        <StatCard 
          label="Low Risk" 
          value={rows.filter(tx => tx.risk < 40).length} 
          color="emerald"
          darkMode={darkMode}
        />
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${cardClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? "bg-white/5" : "bg-gray-50"}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>TX ID</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>User</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Amount</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Merchant</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Country</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Risk</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Time</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? "divide-white/5" : "divide-gray-100"}`}>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-4 py-12 text-center ${textMutedClass}`}>
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredRows.map((tx) => {
                  const riskInfo = getRiskLabel(tx.risk);
                  return (
                    <tr key={tx.tx_id} className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"}>
                      <td className={`px-4 py-3 text-sm font-mono ${textClass}`}>{tx.tx_id}</td>
                      <td className={`px-4 py-3 text-sm ${textMutedClass}`}>{tx.user}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${textClass}`}>
                        ${tx.amount?.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-sm ${textMutedClass}`}>{tx.merchant || "-"}</td>
                      <td className={`px-4 py-3 text-sm ${textMutedClass}`}>{tx.country || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${riskInfo.color}`}>
                          {tx.risk?.toFixed(0)}% {riskInfo.text}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${textMutedClass}`}>
                        {tx.ts ? new Date(tx.ts).toLocaleString() : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, darkMode }) {
  const colorClasses = {
    rose: darkMode ? "border-rose-500/20 bg-rose-500/10" : "border-rose-200 bg-rose-50",
    amber: darkMode ? "border-amber-500/20 bg-amber-500/10" : "border-amber-200 bg-amber-50",
    emerald: darkMode ? "border-emerald-500/20 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50",
  };
  
  const defaultClass = darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const labelClass = darkMode ? "text-white/60" : "text-gray-500";
  
  return (
    <div className={`rounded-xl border p-4 ${color ? colorClasses[color] : defaultClass}`}>
      <div className={`text-xs font-medium ${labelClass}`}>{label}</div>
      <div className={`text-2xl font-bold mt-1 ${textClass}`}>{value}</div>
    </div>
  );
}
