import { useState, useEffect } from "react";
import { getAccessToken } from "../auth/session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [quickStats, setQuickStats] = useState(null);
  const [error, setError] = useState("");
  
  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all_time");

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
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
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
      console.error("Error generating report:", err);
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
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
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
      console.error("Error exporting CSV:", err);
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Reports</h1>
          <p className="text-white/60 mt-2">Generate detailed fraud detection analytics and performance reports</p>
        </div>
        {report && (
          <button
            onClick={exportCSV}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white px-6 py-3 font-semibold flex items-center gap-2 transition"
            data-testid="export-report-csv-btn"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Quick Stats Cards */}
      {quickStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Today"
            transactions={quickStats.today.transactions.total_transactions}
            highRisk={quickStats.today.risk.total_high_risk}
            cases={quickStats.today.cases.total_cases}
            color="blue"
          />
          <StatCard
            title="Last 7 Days"
            transactions={quickStats.last_7_days.transactions.total_transactions}
            highRisk={quickStats.last_7_days.risk.total_high_risk}
            cases={quickStats.last_7_days.cases.total_cases}
            color="purple"
          />
          <StatCard
            title="Last 30 Days"
            transactions={quickStats.last_30_days.transactions.total_transactions}
            highRisk={quickStats.last_30_days.risk.total_high_risk}
            cases={quickStats.last_30_days.cases.total_cases}
            color="indigo"
          />
          <StatCard
            title="All Time"
            transactions={quickStats.all_time.transactions.total_transactions}
            highRisk={quickStats.all_time.risk.total_high_risk}
            cases={quickStats.all_time.cases.total_cases}
            color="slate"
          />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Generate Detailed Report</h2>
        
        <div className="space-y-4">
          {/* Period Selector */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Select Period</label>
            <div className="flex gap-2 flex-wrap">
              {["today", "7days", "30days", "all_time"].map((period) => (
                <button
                  key={period}
                  onClick={() => setPeriod(period)}
                  className={`px-4 py-2 rounded-xl font-medium transition ${
                    selectedPeriod === period
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                      : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
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
              <label className="block text-sm font-medium text-white/70 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedPeriod("custom");
                }}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedPeriod("custom");
                }}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <button
            onClick={generateReport}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 px-4 transition"
            data-testid="generate-report-btn"
          >
            {loading ? "Generating Report..." : "Generate Comprehensive Report"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-200 px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
            <h2 className="text-2xl font-bold mb-2">Fraud Detection Analysis Report</h2>
            <p className="text-purple-100">Generated: {new Date(report.report_generated_at).toLocaleString()}</p>
            <p className="text-purple-100">Period: {report.report_period}</p>
          </div>

          {/* Transaction Metrics */}
          <MetricsSection title="Transaction Metrics" icon="📊">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard label="Total Transactions" value={report.transaction_metrics.total_transactions.toLocaleString()} />
              <MetricCard label="Total Amount" value={`$${report.transaction_metrics.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`} />
              <MetricCard label="Average Amount" value={`$${report.transaction_metrics.average_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`} />
              <MetricCard label="Min Amount" value={`$${report.transaction_metrics.min_amount.toLocaleString()}`} />
              <MetricCard label="Max Amount" value={`$${report.transaction_metrics.max_amount.toLocaleString()}`} />
            </div>
          </MetricsSection>

          {/* Risk Distribution */}
          <MetricsSection title="Risk Analysis" icon="⚠️">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard label="High Risk (≥70)" value={report.risk_metrics.total_high_risk} color="red" />
              <MetricCard label="Medium Risk (40-69)" value={report.risk_metrics.total_medium_risk} color="orange" />
              <MetricCard label="Low Risk (<40)" value={report.risk_metrics.total_low_risk} color="green" />
              <MetricCard label="Avg Risk Score" value={`${report.risk_metrics.average_risk_score}%`} />
              <MetricCard label="High Risk %" value={`${report.risk_metrics.high_risk_percentage}%`} color="red" />
            </div>
          </MetricsSection>

          {/* Case Metrics */}
          <MetricsSection title="Case Management" icon="📋">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard label="Total Cases" value={report.case_metrics.total_cases} />
              <MetricCard label="New" value={report.case_metrics.new_cases} color="blue" />
              <MetricCard label="In Progress" value={report.case_metrics.in_progress_cases} color="yellow" />
              <MetricCard label="Resolved" value={report.case_metrics.resolved_cases} color="green" />
              <MetricCard label="Avg Resolution (hrs)" value={report.case_metrics.avg_resolution_time_hours?.toFixed(1) || "N/A"} />
            </div>
          </MetricsSection>

          {/* Model Performance */}
          <MetricsSection title="Model Performance" icon="🤖">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard label="Total Predictions" value={report.model_performance.total_predictions.toLocaleString()} />
              <MetricCard label="Accuracy" value={`${report.model_performance.high_risk_accuracy}%`} color="green" />
              <MetricCard label="Precision" value={`${report.model_performance.precision}%`} />
              <MetricCard label="Recall" value={`${report.model_performance.recall}%`} />
              <MetricCard label="False Positive Rate" value={`${report.model_performance.false_positive_rate}%`} color="orange" />
            </div>
          </MetricsSection>

          {/* Geographic Analysis */}
          {report.country_analysis && report.country_analysis.length > 0 && (
            <MetricsSection title="Geographic Analysis" icon="🌍">
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Country</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Transactions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Avg Risk</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">High Risk Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {report.country_analysis.map((country, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-sm font-medium text-white">{country.country}</td>
                        <td className="px-6 py-4 text-sm text-white/70">{country.transaction_count.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-white/70">${country.total_amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            country.average_risk >= 70 ? 'bg-rose-500/20 text-rose-200' :
                            country.average_risk >= 40 ? 'bg-amber-500/20 text-amber-200' :
                            'bg-emerald-500/20 text-emerald-200'
                          }`}>
                            {country.average_risk}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/70">{country.high_risk_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MetricsSection>
          )}

          {/* Merchant Analysis */}
          {report.merchant_analysis && report.merchant_analysis.length > 0 && (
            <MetricsSection title="Merchant Risk Analysis" icon="🏪">
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Merchant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Transactions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Avg Risk</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">High Risk %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {report.merchant_analysis.map((merchant, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-sm font-medium text-white">{merchant.merchant}</td>
                        <td className="px-6 py-4 text-sm text-white/70">{merchant.transaction_count.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-white/70">${merchant.total_amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-white/70">{merchant.average_risk}%</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            merchant.high_risk_percentage >= 50 ? 'bg-rose-500/20 text-rose-200' :
                            merchant.high_risk_percentage >= 25 ? 'bg-amber-500/20 text-amber-200' :
                            'bg-emerald-500/20 text-emerald-200'
                          }`}>
                            {merchant.high_risk_percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MetricsSection>
          )}

          {/* Top Risk Transactions */}
          {report.top_risk_transactions && report.top_risk_transactions.length > 0 && (
            <MetricsSection title="Top Risk Transactions" icon="🚨">
              <div className="space-y-3">
                {report.top_risk_transactions.map((tx, idx) => (
                  <div key={idx} className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">{tx.tx_id}</div>
                      <div className="text-sm text-white/60">
                        {tx.merchant} • {tx.country} • ${tx.amount.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-rose-300">{tx.risk}%</div>
                      <div className="text-xs text-rose-400">Risk Score</div>
                    </div>
                  </div>
                ))}
              </div>
            </MetricsSection>
          )}
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatCard({ title, transactions, highRisk, cases, color }) {
  const colorClasses = {
    blue: "border-blue-500/20 bg-blue-500/10",
    purple: "border-purple-500/20 bg-purple-500/10",
    indigo: "border-indigo-500/20 bg-indigo-500/10",
    slate: "border-white/10 bg-white/5",
  };

  return (
    <div className={`${colorClasses[color]} border rounded-2xl p-5`}>
      <div className="text-sm font-medium text-white/60 mb-3">{title}</div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-xs text-white/50">Transactions:</span>
          <span className="text-sm font-semibold text-white">{transactions}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-white/50">High Risk:</span>
          <span className="text-sm font-semibold text-rose-300">{highRisk}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-white/50">Cases:</span>
          <span className="text-sm font-semibold text-amber-300">{cases}</span>
        </div>
      </div>
    </div>
  );
}

function MetricsSection({ title, icon, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetricCard({ label, value, color }) {
  const colorClasses = {
    red: "border-rose-500/20 bg-rose-500/10 text-rose-200",
    orange: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    yellow: "border-yellow-500/20 bg-yellow-500/10 text-yellow-200",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-200",
  };

  return (
    <div className={`border rounded-xl p-4 ${color ? colorClasses[color] : 'border-white/10 bg-white/5'}`}>
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color ? '' : 'text-white'}`}>{value}</div>
    </div>
  );
}
