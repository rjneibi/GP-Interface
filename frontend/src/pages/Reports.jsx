import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getAccessToken } from "../auth/session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";

export default function Reports() {
  const context = useOutletContext();
  const darkMode = context?.darkMode ?? true;
  
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [quickStats, setQuickStats] = useState(null);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all_time");

  // Theme classes
  const cardClass = darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const textMutedClass = darkMode ? "text-white/60" : "text-gray-500";
  const inputClass = darkMode 
    ? "bg-white/5 border-white/10 text-white" 
    : "bg-white border-gray-300 text-gray-900";

  useEffect(() => {
    fetchQuickStats();
  }, []);

  const fetchQuickStats = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/reports/quick-stats`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setQuickStats(data);
      }
    } catch (err) {
      console.error("Error fetching quick stats:", err);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError("");
    
    try {
      const token = getAccessToken();
      let url = `${API_BASE}/api/reports/comprehensive`;
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", new Date(startDate).toISOString());
      if (endDate) params.append("end_date", new Date(endDate).toISOString());
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      } else {
        setError("Failed to generate report");
      }
    } catch (err) {
      setError(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const token = getAccessToken();
      let url = `${API_BASE}/api/reports/export/csv`;
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", new Date(startDate).toISOString());
      if (endDate) params.append("end_date", new Date(endDate).toISOString());
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `fraud_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      alert("Failed to export CSV");
    }
  };

  const setPeriod = (period) => {
    setSelectedPeriod(period);
    const now = new Date();
    
    switch (period) {
      case "today":
        setStartDate(new Date(now.setHours(0, 0, 0, 0)).toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        break;
      case "7days":
        setStartDate(new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        break;
      case "30days":
        setStartDate(new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        break;
      case "all_time":
        setStartDate("");
        setEndDate("");
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>Reports</h1>
          <p className={textMutedClass}>Generate detailed fraud detection analytics</p>
        </div>
        <button
          onClick={exportCSV}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium"
          data-testid="export-report-csv-btn"
        >
          Export CSV
        </button>
      </div>

      {/* Quick Stats */}
      {quickStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickStatCard title="Today" stats={quickStats.today} darkMode={darkMode} />
          <QuickStatCard title="Last 7 Days" stats={quickStats.last_7_days} darkMode={darkMode} />
          <QuickStatCard title="Last 30 Days" stats={quickStats.last_30_days} darkMode={darkMode} />
          <QuickStatCard title="All Time" stats={quickStats.all_time} darkMode={darkMode} />
        </div>
      )}

      {/* Report Generator */}
      <div className={`rounded-xl border p-6 ${cardClass}`}>
        <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>Generate Detailed Report</h2>
        
        <div className="space-y-4">
          {/* Period Selector */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textMutedClass}`}>Select Period</label>
            <div className="flex gap-2 flex-wrap">
              {["today", "7days", "30days", "all_time"].map((period) => (
                <button
                  key={period}
                  onClick={() => setPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedPeriod === period
                      ? "bg-blue-600 text-white"
                      : darkMode
                      ? "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                  }`}
                >
                  {period === "today" && "Today"}
                  {period === "7days" && "Last 7 Days"}
                  {period === "30days" && "Last 30 Days"}
                  {period === "all_time" && "All Time"}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textMutedClass}`}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setSelectedPeriod("custom"); }}
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textMutedClass}`}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setSelectedPeriod("custom"); }}
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
              />
            </div>
          </div>

          <button
            onClick={generateReport}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3"
            data-testid="generate-report-btn"
          >
            {loading ? "Generating Report..." : "Generate Comprehensive Report"}
          </button>
        </div>

        {error && (
          <div className={`mt-4 rounded-lg border p-3 ${darkMode ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {error}
          </div>
        )}
      </div>

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="rounded-xl bg-blue-600 text-white p-6">
            <h2 className="text-xl font-bold mb-2">Fraud Detection Analysis Report</h2>
            <p className="text-blue-100">Generated: {new Date(report.report_generated_at).toLocaleString()}</p>
            <p className="text-blue-100">Period: {report.report_period}</p>
          </div>

          {/* Transaction Metrics */}
          <MetricsSection title="Transaction Metrics" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard label="Total Transactions" value={report.transaction_metrics.total_transactions.toLocaleString()} darkMode={darkMode} />
              <MetricCard label="Total Amount" value={`$${report.transaction_metrics.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`} darkMode={darkMode} />
              <MetricCard label="Average Amount" value={`$${report.transaction_metrics.average_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`} darkMode={darkMode} />
              <MetricCard label="Min Amount" value={`$${report.transaction_metrics.min_amount.toLocaleString()}`} darkMode={darkMode} />
              <MetricCard label="Max Amount" value={`$${report.transaction_metrics.max_amount.toLocaleString()}`} darkMode={darkMode} />
            </div>
          </MetricsSection>

          {/* Risk Distribution */}
          <MetricsSection title="Risk Analysis" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard label="High Risk" value={report.risk_metrics.total_high_risk} color="rose" darkMode={darkMode} />
              <MetricCard label="Medium Risk" value={report.risk_metrics.total_medium_risk} color="amber" darkMode={darkMode} />
              <MetricCard label="Low Risk" value={report.risk_metrics.total_low_risk} color="emerald" darkMode={darkMode} />
              <MetricCard label="Avg Risk Score" value={`${report.risk_metrics.average_risk_score}%`} darkMode={darkMode} />
              <MetricCard label="High Risk %" value={`${report.risk_metrics.high_risk_percentage}%`} color="rose" darkMode={darkMode} />
            </div>
          </MetricsSection>

          {/* Case Metrics */}
          <MetricsSection title="Case Management" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard label="Total Cases" value={report.case_metrics.total_cases} darkMode={darkMode} />
              <MetricCard label="New" value={report.case_metrics.new_cases} color="blue" darkMode={darkMode} />
              <MetricCard label="In Progress" value={report.case_metrics.in_progress_cases} color="amber" darkMode={darkMode} />
              <MetricCard label="Resolved" value={report.case_metrics.resolved_cases} color="emerald" darkMode={darkMode} />
              <MetricCard label="Avg Resolution (hrs)" value={report.case_metrics.avg_resolution_time_hours?.toFixed(1) || "N/A"} darkMode={darkMode} />
            </div>
          </MetricsSection>

          {/* Geographic Analysis */}
          {report.country_analysis && report.country_analysis.length > 0 && (
            <MetricsSection title="Geographic Analysis" darkMode={darkMode}>
              <div className={`overflow-x-auto rounded-lg border ${darkMode ? "border-white/10" : "border-gray-200"}`}>
                <table className="w-full">
                  <thead className={darkMode ? "bg-white/5" : "bg-gray-50"}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Country</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Transactions</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Total Amount</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>Avg Risk</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${textMutedClass}`}>High Risk Count</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? "divide-white/5" : "divide-gray-100"}`}>
                    {report.country_analysis.map((country, idx) => (
                      <tr key={idx} className={darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"}>
                        <td className={`px-4 py-3 text-sm font-medium ${textClass}`}>{country.country}</td>
                        <td className={`px-4 py-3 text-sm ${textMutedClass}`}>{country.transaction_count.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-sm ${textMutedClass}`}>${country.total_amount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <RiskBadge risk={country.average_risk} darkMode={darkMode} />
                        </td>
                        <td className={`px-4 py-3 text-sm ${textMutedClass}`}>{country.high_risk_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MetricsSection>
          )}
        </div>
      )}
    </div>
  );
}

function QuickStatCard({ title, stats, darkMode }) {
  const cardClass = darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const mutedClass = darkMode ? "text-white/50" : "text-gray-500";
  
  return (
    <div className={`border rounded-xl p-4 ${cardClass}`}>
      <div className={`text-sm font-medium mb-3 ${mutedClass}`}>{title}</div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className={`text-xs ${mutedClass}`}>Transactions:</span>
          <span className={`text-sm font-semibold ${textClass}`}>{stats?.transactions?.total_transactions || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className={`text-xs ${mutedClass}`}>High Risk:</span>
          <span className={`text-sm font-semibold ${darkMode ? "text-rose-300" : "text-rose-600"}`}>{stats?.risk?.total_high_risk || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className={`text-xs ${mutedClass}`}>Cases:</span>
          <span className={`text-sm font-semibold ${darkMode ? "text-amber-300" : "text-amber-600"}`}>{stats?.cases?.total_cases || 0}</span>
        </div>
      </div>
    </div>
  );
}

function MetricsSection({ title, children, darkMode }) {
  const cardClass = darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  
  return (
    <div className={`rounded-xl border p-6 ${cardClass}`}>
      <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>{title}</h3>
      {children}
    </div>
  );
}

function MetricCard({ label, value, color, darkMode }) {
  const colorClasses = {
    rose: darkMode ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-700",
    amber: darkMode ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700",
    emerald: darkMode ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: darkMode ? "border-blue-500/20 bg-blue-500/10 text-blue-300" : "border-blue-200 bg-blue-50 text-blue-700",
  };
  
  const defaultClass = darkMode ? "border-white/10 bg-white/5 text-white" : "border-gray-200 bg-white text-gray-900";
  const labelClass = darkMode ? "text-white/50" : "text-gray-500";
  
  return (
    <div className={`border rounded-lg p-4 ${color ? colorClasses[color] : defaultClass}`}>
      <div className={`text-xs ${labelClass} mb-1`}>{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function RiskBadge({ risk, darkMode }) {
  const getClass = () => {
    if (risk >= 70) return darkMode ? "bg-rose-500/20 text-rose-300" : "bg-rose-100 text-rose-700";
    if (risk >= 40) return darkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700";
    return darkMode ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700";
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${getClass()}`}>
      {risk}%
    </span>
  );
}
