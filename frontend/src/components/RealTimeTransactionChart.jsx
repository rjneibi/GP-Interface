import { useEffect, useState, useRef } from "react";

export default function RealTimeTransactionChart({ transactions, darkMode }) {
  const [chartData, setChartData] = useState([]);
  const canvasRef = useRef(null);
  const maxDataPoints = 20;

  useEffect(() => {
    if (!transactions || transactions.length === 0) return;

    // Get the last 20 transactions
    const recentTxs = transactions.slice(-maxDataPoints);
    
    // Prepare data for the chart
    const data = recentTxs.map((tx, index) => ({
      index: index,
      txId: tx.tx_id,
      risk: tx.risk || 0,
      amount: tx.amount || 0,
      timestamp: new Date(tx.created_at || tx.ts).getTime()
    }));

    setChartData(data);
  }, [transactions]);

  useEffect(() => {
    drawChart();
  }, [chartData, darkMode]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set colors based on theme
    const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = darkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';
    const lineColor = darkMode ? 'rgba(59, 130, 246, 0.8)' : 'rgba(37, 99, 235, 0.8)';

    // Draw grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Y-axis labels (Risk Score)
    ctx.fillStyle = textColor;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = 100 - (i * 25);
      const y = (height / 4) * i;
      ctx.fillText(value.toString(), width - 5, y - 5);
    }

    if (chartData.length < 2) return;

    // Calculate dimensions
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const xStep = chartWidth / (chartData.length - 1);

    // Draw risk score line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.beginPath();

    chartData.forEach((point, index) => {
      const x = padding + (index * xStep);
      const y = padding + chartHeight - (point.risk / 100) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points with risk-based colors
    chartData.forEach((point, index) => {
      const x = padding + (index * xStep);
      const y = padding + chartHeight - (point.risk / 100) * chartHeight;

      // Color based on risk level
      let pointColor;
      if (point.risk >= 70) {
        pointColor = darkMode ? '#f87171' : '#dc2626'; // red
      } else if (point.risk >= 40) {
        pointColor = darkMode ? '#fbbf24' : '#d97706'; // amber
      } else {
        pointColor = darkMode ? '#34d399' : '#059669'; // emerald
      }

      ctx.fillStyle = pointColor;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Add white border
      ctx.strokeStyle = darkMode ? '#1f2937' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  // Get statistics
  const getStats = () => {
    if (chartData.length === 0) return { avgRisk: 0, highRisk: 0, totalAmount: 0 };

    const avgRisk = chartData.reduce((sum, d) => sum + d.risk, 0) / chartData.length;
    const highRisk = chartData.filter(d => d.risk >= 70).length;
    const totalAmount = chartData.reduce((sum, d) => sum + d.amount, 0);

    return { avgRisk: avgRisk.toFixed(1), highRisk, totalAmount };
  };

  const stats = getStats();

  // Theme classes
  const cardClass = darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const textMutedClass = darkMode ? "text-white/60" : "text-gray-500";

  return (
    <div className={`rounded-xl border p-6 ${cardClass}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-lg font-semibold ${textClass}`}>Real-Time Fraud Detection Monitor</h2>
          <p className={`text-sm ${textMutedClass}`}>Live transaction risk analysis (last {maxDataPoints} transactions)</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${textClass}`}>{stats.avgRisk}%</div>
            <div className={`text-xs ${textMutedClass}`}>Avg Risk</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>{stats.highRisk}</div>
            <div className={`text-xs ${textMutedClass}`}>High Risk</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              ${(stats.totalAmount / 1000).toFixed(1)}K
            </div>
            <div className={`text-xs ${textMutedClass}`}>Total Amount</div>
          </div>
        </div>
      </div>

      {/* Canvas Chart */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="w-full"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-emerald-400' : 'bg-emerald-600'}`}></div>
          <span className={`text-sm ${textMutedClass}`}>Low Risk (&lt;40%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-amber-400' : 'bg-amber-600'}`}></div>
          <span className={`text-sm ${textMutedClass}`}>Medium Risk (40-69%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-rose-400' : 'bg-rose-600'}`}></div>
          <span className={`text-sm ${textMutedClass}`}>High Risk (≥70%)</span>
        </div>
      </div>

      {/* Feature Indicators */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {chartData.slice(-4).map((tx, idx) => (
          <div key={idx} className={`rounded-lg border p-3 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`text-xs font-mono ${textMutedClass} truncate`}>{tx.txId}</div>
            <div className="flex items-center justify-between mt-2">
              <span className={`text-sm font-semibold ${textClass}`}>${(tx.amount / 1000).toFixed(1)}K</span>
              <span className={`text-xs px-2 py-1 rounded ${
                tx.risk >= 70 ? (darkMode ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-700') :
                tx.risk >= 40 ? (darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700') :
                (darkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
              }`}>
                {tx.risk}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}