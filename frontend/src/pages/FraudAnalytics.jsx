import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getAccessToken } from "../auth/session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function FraudAnalytics() {
  const context = useOutletContext();
  const darkMode = context?.darkMode ?? true;
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7days");

  // Theme classes
  const cardClass = darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const textMutedClass = darkMode ? "text-white/60" : "text-gray-500";

  useEffect(() => {
    loadTransactions();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  // Analytics calculations
  const analytics = {
    // Risk Distribution
    highRisk: transactions.filter(tx => tx.risk >= 70).length,
    mediumRisk: transactions.filter(tx => tx.risk >= 40 && tx.risk < 70).length,
    lowRisk: transactions.filter(tx => tx.risk < 40).length,

    // Amount Analysis
    totalAmount: transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
    avgAmount: transactions.length > 0 
      ? transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0) / transactions.length 
      : 0,
    highValueFraud: transactions.filter(tx => tx.risk >= 70 && tx.amount > 5000).length,

    // Time Analysis
    hourlyDistribution: getHourlyDistribution(transactions),
    
    // Geographic Analysis
    countryStats: getCountryStats(transactions),
    
    // Merchant Analysis
    merchantStats: getMerchantStats(transactions),
    
    // Channel Analysis
    channelStats: getChannelStats(transactions),
  };

  function getHourlyDistribution(txs) {
    const hours = Array(24).fill(0);
    txs.forEach(tx => {
      if (tx.ts || tx.created_at) {
        const date = new Date(tx.ts || tx.created_at);
        hours[date.getHours()]++;
      }
    });
    return hours;
  }

  function getCountryStats(txs) {
    const stats = {};
    txs.forEach(tx => {
      const country = tx.country || "Unknown";
      if (!stats[country]) {
        stats[country] = { count: 0, fraudCount: 0, totalAmount: 0 };
      }
      stats[country].count++;
      stats[country].totalAmount += tx.amount || 0;
      if (tx.risk >= 70) stats[country].fraudCount++;
    });
    
    return Object.entries(stats)
      .map(([country, data]) => ({
        country,
        ...data,
        fraudRate: (data.fraudCount / data.count * 100).toFixed(1)
      }))
      .sort((a, b) => b.fraudCount - a.fraudCount)
      .slice(0, 5);
  }

  function getMerchantStats(txs) {
    const stats = {};
    txs.forEach(tx => {
      const merchant = tx.merchant || "Unknown";
      if (!stats[merchant]) {
        stats[merchant] = { count: 0, fraudCount: 0, totalAmount: 0 };
      }
      stats[merchant].count++;
      stats[merchant].totalAmount += tx.amount || 0;
      if (tx.risk >= 70) stats[merchant].fraudCount++;
    });
    
    return Object.entries(stats)
      .map(([merchant, data]) => ({
        merchant,
        ...data,
        fraudRate: (data.fraudCount / data.count * 100).toFixed(1)
      }))
      .sort((a, b) => b.fraudCount - a.fraudCount)
      .slice(0, 5);
  }

  function getChannelStats(txs) {
    const stats = {};
    txs.forEach(tx => {
      const channel = tx.channel || "unknown";
      if (!stats[channel]) {
        stats[channel] = { count: 0, fraudCount: 0 };
      }
      stats[channel].count++;
      if (tx.risk >= 70) stats[channel].fraudCount++;
    });
    
    return Object.entries(stats).map(([channel, data]) => ({
      channel,
      ...data,
      fraudRate: (data.fraudCount / data.count * 100).toFixed(1)
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={textMutedClass}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>Fraud Analytics</h1>
          <p className={textMutedClass}>Deep insights into fraud patterns and trends</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className={`rounded-lg border px-4 py-2 text-sm ${
            darkMode 
              ? "bg-white/5 border-white/10 text-white" 
              : "bg-white border-gray-300 text-gray-900"
          }`}
        >
          <option value="24hours">Last 24 Hours</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Transactions"
          value={transactions.length}
          darkMode={darkMode}
        />
        <StatCard
          label="High Risk"
          value={analytics.highRisk}
          color="rose"
          percentage={`${((analytics.highRisk / transactions.length) * 100).toFixed(1)}%`}
          darkMode={darkMode}
        />
        <StatCard
          label="Total Amount"
          value={`$${(analytics.totalAmount / 1000).toFixed(1)}K`}
          darkMode={darkMode}
        />
        <StatCard
          label="Avg Amount"
          value={`$${analytics.avgAmount.toFixed(0)}`}
          darkMode={darkMode}
        />
      </div>

      {/* Risk Distribution */}
      <div className={`rounded-xl border p-6 ${cardClass}`}>
        <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>Risk Distribution</h2>
        <div className="grid grid-cols-3 gap-4">
          <RiskBar 
            label="Low Risk" 
            count={analytics.lowRisk} 
            total={transactions.length}
            color="emerald"
            darkMode={darkMode}
          />
          <RiskBar 
            label="Medium Risk" 
            count={analytics.mediumRisk} 
            total={transactions.length}
            color="amber"
            darkMode={darkMode}
          />
          <RiskBar 
            label="High Risk" 
            count={analytics.highRisk} 
            total={transactions.length}
            color="rose"
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className={`rounded-xl border p-6 ${cardClass}`}>
        <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>Transactions by Hour</h2>
        <div className="flex items-end justify-between h-48 gap-1">
          {analytics.hourlyDistribution.map((count, hour) => {
            const maxCount = Math.max(...analytics.hourlyDistribution);
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
            
            return (
              <div key={hour} className="flex-1 flex flex-col items-center">
                <div 
                  className={`w-full rounded-t transition-all ${
                    darkMode ? "bg-blue-500" : "bg-blue-600"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${hour}:00 - ${count} transactions`}
                />
                <div className={`text-xs mt-1 ${textMutedClass}`}>
                  {hour % 3 === 0 ? hour : ""}
                </div>
              </div>
            );
          })}
        </div>
        <div className={`text-center text-xs mt-2 ${textMutedClass}`}>
          Hour of Day (0-23)
        </div>
      </div>

      {/* Geographic Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className={`rounded-xl border p-6 ${cardClass}`}>
          <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>
            Top Countries by Fraud
          </h2>
          <div className="space-y-3">
            {analytics.countryStats.map((stat, index) => (
              <div key={stat.country} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className={`text-sm font-mono ${textMutedClass}`}>
                    #{index + 1}
                  </span>
                  <span className={`font-medium ${textClass}`}>{stat.country}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm ${textMutedClass}`}>
                    {stat.fraudCount} / {stat.count}
                  </span>
                  <span className={`text-sm font-semibold px-2 py-1 rounded ${
                    parseFloat(stat.fraudRate) > 30 
                      ? darkMode ? "bg-rose-500/20 text-rose-300" : "bg-rose-100 text-rose-700"
                      : parseFloat(stat.fraudRate) > 15
                      ? darkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"
                      : darkMode ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {stat.fraudRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Merchants */}
        <div className={`rounded-xl border p-6 ${cardClass}`}>
          <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>
            Top Merchants by Fraud
          </h2>
          <div className="space-y-3">
            {analytics.merchantStats.map((stat, index) => (
              <div key={stat.merchant} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className={`text-sm font-mono ${textMutedClass}`}>
                    #{index + 1}
                  </span>
                  <span className={`font-medium ${textClass}`}>{stat.merchant}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm ${textMutedClass}`}>
                    {stat.fraudCount} / {stat.count}
                  </span>
                  <span className={`text-sm font-semibold px-2 py-1 rounded ${
                    parseFloat(stat.fraudRate) > 30 
                      ? darkMode ? "bg-rose-500/20 text-rose-300" : "bg-rose-100 text-rose-700"
                      : parseFloat(stat.fraudRate) > 15
                      ? darkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"
                      : darkMode ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {stat.fraudRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Channel Analysis */}
      <div className={`rounded-xl border p-6 ${cardClass}`}>
        <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>Fraud by Channel</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analytics.channelStats.map(stat => (
            <div key={stat.channel} className={`p-4 rounded-lg border ${
              darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
            }`}>
              <div className={`text-sm uppercase ${textMutedClass}`}>
                {stat.channel}
              </div>
              <div className={`text-2xl font-bold mt-2 ${textClass}`}>
                {stat.fraudCount}
              </div>
              <div className={`text-xs mt-1 ${textMutedClass}`}>
                {stat.fraudRate}% fraud rate
              </div>
              <div className={`text-xs ${textMutedClass}`}>
                of {stat.count} total
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div className={`rounded-xl border p-6 ${cardClass}`}>
        <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>Key Insights</h2>
        <div className="space-y-3">
          <Insight
            icon="🎯"
            text={`${((analytics.highRisk / transactions.length) * 100).toFixed(1)}% of all transactions are flagged as high risk`}
            darkMode={darkMode}
          />
          <Insight
            icon="💰"
            text={`High-value fraud (>$5K): ${analytics.highValueFraud} transactions worth extra attention`}
            darkMode={darkMode}
          />
          {analytics.countryStats[0] && (
            <Insight
              icon="🌍"
              text={`${analytics.countryStats[0].country} has the highest fraud rate at ${analytics.countryStats[0].fraudRate}%`}
              darkMode={darkMode}
            />
          )}
          {analytics.merchantStats[0] && (
            <Insight
              icon="🏪"
              text={`${analytics.merchantStats[0].merchant} shows elevated fraud patterns - consider enhanced monitoring`}
              darkMode={darkMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, percentage, darkMode }) {
  const colors = {
    rose: darkMode ? "border-rose-500/20 bg-rose-500/10" : "border-rose-200 bg-rose-50",
    amber: darkMode ? "border-amber-500/20 bg-amber-500/10" : "border-amber-200 bg-amber-50",
    emerald: darkMode ? "border-emerald-500/20 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50",
  };

  return (
    <div className={`rounded-xl border p-4 ${color ? colors[color] : (darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white")}`}>
      <div className={`text-sm ${darkMode ? "text-white/60" : "text-gray-600"}`}>{label}</div>
      <div className={`text-2xl font-bold mt-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
        {value}
      </div>
      {percentage && (
        <div className={`text-xs mt-1 ${darkMode ? "text-white/50" : "text-gray-500"}`}>
          {percentage}
        </div>
      )}
    </div>
  );
}

function RiskBar({ label, count, total, color, darkMode }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  const colors = {
    rose: darkMode ? "bg-rose-500" : "bg-rose-600",
    amber: darkMode ? "bg-amber-500" : "bg-amber-600",
    emerald: darkMode ? "bg-emerald-500" : "bg-emerald-600",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
          {label}
        </span>
        <span className={`text-sm ${darkMode ? "text-white/60" : "text-gray-600"}`}>
          {count}
        </span>
      </div>
      <div className={`h-2 rounded-full ${darkMode ? "bg-white/10" : "bg-gray-200"}`}>
        <div 
          className={`h-full rounded-full ${colors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={`text-xs mt-1 ${darkMode ? "text-white/50" : "text-gray-500"}`}>
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
}

function Insight({ icon, text, darkMode }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${
      darkMode ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"
    }`}>
      <span className="text-xl">{icon}</span>
      <p className={`text-sm ${darkMode ? "text-white/80" : "text-gray-700"}`}>{text}</p>
    </div>
  );
}