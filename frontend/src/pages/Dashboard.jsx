import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { txApi, auditApi } from "../services/apiClient";
import { getSettings } from "../services/adminStore";

const labelFromRisk = (risk, settings) => {
  const orange = settings?.orangeThreshold ?? 40;
  const red = settings?.redThreshold ?? 70;
  if (risk >= red) return "RED";
  if (risk >= orange) return "ORANGE";
  return "GREEN";
};

export default function Dashboard() {
  const context = useOutletContext();
  const darkMode = context?.darkMode ?? true;
  
  const [settings, setSettings] = useState(() => getSettings());
  const [rows, setRows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Theme classes
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const textMutedClass = darkMode ? "text-white/60" : "text-gray-500";
  const cardClass = darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white";

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setErr("");
        const [txs, audits] = await Promise.all([txApi.list(), auditApi.list()]);
        if (!alive) return;
        setSettings(getSettings());
        setRows(Array.isArray(txs) ? txs : []);
        setLogs(Array.isArray(audits) ? audits : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load dashboard data");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const computed = useMemo(() => {
    const maxAmount = 40000;
    const enriched = rows.map((tx) => {
      const amount = Number(tx.amount || 0);
      const risk = tx.risk ?? Math.min(100, Math.round((amount / maxAmount) * 100));
      const label = labelFromRisk(risk, settings);
      return { ...tx, risk, label };
    });

    const total = enriched.length;
    const green = enriched.filter((t) => t.label === "GREEN").length;
    const orange = enriched.filter((t) => t.label === "ORANGE").length;
    const red = enriched.filter((t) => t.label === "RED").length;
    const avgRisk = total === 0 ? 0 : Math.round(enriched.reduce((sum, t) => sum + t.risk, 0) / total);

    const recentRed = enriched
      .filter((t) => t.label === "RED")
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 5);

    const recentTx = enriched
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 6);

    return { enriched, total, green, orange, red, avgRisk, recentRed, recentTx };
  }, [rows, settings]);

  const orangeTh = settings?.orangeThreshold ?? 40;
  const redTh = settings?.redThreshold ?? 70;
  const autoBlock = settings?.autoBlockRed ?? false;

  const getBadgeClass = (label) => {
    if (label === "GREEN") return darkMode ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (label === "ORANGE") return darkMode ? "bg-amber-500/15 text-amber-300 border-amber-500/20" : "bg-amber-100 text-amber-700 border-amber-200";
    return darkMode ? "bg-rose-500/15 text-rose-300 border-rose-500/20" : "bg-rose-100 text-rose-700 border-rose-200";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-semibold ${textClass}`}>Dashboard</h1>
        <p className={textMutedClass}>
          Fraud Operations overview - thresholds, persisted transactions, and audit activity.
        </p>
        <div className={`text-xs mt-2 ${darkMode ? "text-white/45" : "text-gray-400"}`}>
          Policy: ORANGE ≥ <b>{orangeTh}</b> | RED ≥ <b>{redTh}</b> | Auto-block: <b>{autoBlock ? "ON" : "OFF"}</b>
        </div>
      </div>

      {loading && (
        <div className={`rounded-xl border p-4 text-sm ${cardClass} ${textMutedClass}`}>
          Loading dashboard data...
        </div>
      )}

      {err && (
        <div className={`rounded-xl border p-4 text-sm ${darkMode ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {err}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Kpi title="Total Transactions" value={computed.total} darkMode={darkMode} />
        <Kpi title="GREEN" value={computed.green} tone="green" darkMode={darkMode} />
        <Kpi title="ORANGE" value={computed.orange} tone="orange" darkMode={darkMode} />
        <Kpi title="RED" value={computed.red} tone="red" darkMode={darkMode} />
        <Kpi title="Avg Risk" value={`${computed.avgRisk}%`} darkMode={darkMode} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* High-Risk Alerts */}
        <Card title="High-Risk Alerts (RED)" subtitle="Most recent RED transactions" darkMode={darkMode}>
          {computed.recentRed.length === 0 ? (
            <div className={`text-sm ${textMutedClass}`}>No RED alerts yet.</div>
          ) : (
            <div className="space-y-2">
              {computed.recentRed.map((t) => (
                <div key={t.tx_id || t.id} className={`rounded-xl border p-3 ${darkMode ? "border-white/10 bg-black/30" : "border-gray-200 bg-gray-50"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className={`text-sm font-semibold ${textClass}`}>{t.tx_id}</div>
                      <div className={`text-xs mt-1 ${textMutedClass}`}>{t.user} - {t.merchant}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm ${darkMode ? "text-white/80" : "text-gray-700"}`}>
                        {Number(t.amount || 0).toLocaleString()} AED
                      </div>
                      <div className={`text-xs mt-1 ${textMutedClass}`}>{t.risk}% risk</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${getBadgeClass(t.label)}`}>
                      {t.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card title="Recent Transactions" subtitle="Latest 6 seen in the system" darkMode={darkMode}>
          {computed.recentTx.length === 0 ? (
            <div className={`text-sm ${textMutedClass}`}>No transactions yet.</div>
          ) : (
            <div className="space-y-2">
              {computed.recentTx.map((t) => (
                <div key={t.tx_id || t.id} className={`flex items-center justify-between rounded-xl border p-3 ${darkMode ? "border-white/10 bg-black/30" : "border-gray-200 bg-gray-50"}`}>
                  <div>
                    <div className={`text-sm font-semibold ${textClass}`}>{t.tx_id}</div>
                    <div className={`text-xs mt-1 ${textMutedClass}`}>{t.merchant} - {t.country} - {t.device}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm ${darkMode ? "text-white/80" : "text-gray-700"}`}>
                      {Number(t.amount || 0).toLocaleString()} AED
                    </div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${getBadgeClass(t.label)}`}>
                        {t.label}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Audit Activity */}
        <Card title="Audit Activity" subtitle="Latest system actions" darkMode={darkMode}>
          {logs.length === 0 ? (
            <div className={`text-sm ${textMutedClass}`}>No audit logs yet.</div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {logs.slice().reverse().slice(0, 12).map((l) => (
                <div key={l.id} className={`rounded-xl border p-3 ${darkMode ? "border-white/10 bg-black/30" : "border-gray-200 bg-gray-50"}`}>
                  <div className={`text-xs ${textMutedClass}`}>
                    {l.created_at ? new Date(l.created_at).toLocaleString() : ""}
                  </div>
                  <div className={`text-sm font-semibold mt-1 ${textClass}`}>{l.action}</div>
                  <div className={`text-xs mt-1 ${textMutedClass}`}>
                    {JSON.stringify(l.meta || {})}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className={`text-xs ${darkMode ? "text-white/45" : "text-gray-400"}`}>
        Tip: Add transactions in Transactions page, then come back here to see updated stats.
      </div>
    </div>
  );
}

function Kpi({ title, value, tone, darkMode }) {
  const toneClasses = {
    green: darkMode ? "border-emerald-500/20 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50",
    orange: darkMode ? "border-amber-500/20 bg-amber-500/10" : "border-amber-200 bg-amber-50",
    red: darkMode ? "border-rose-500/20 bg-rose-500/10" : "border-rose-200 bg-rose-50",
  };
  
  const defaultClass = darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const labelClass = darkMode ? "text-white/50" : "text-gray-500";

  return (
    <div className={`rounded-xl border p-4 ${tone ? toneClasses[tone] : defaultClass}`}>
      <div className={`text-xs ${labelClass}`}>{title}</div>
      <div className={`mt-2 text-2xl font-semibold ${textClass}`}>{value}</div>
    </div>
  );
}

function Card({ title, subtitle, children, darkMode }) {
  const cardClass = darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const subtitleClass = darkMode ? "text-white/50" : "text-gray-500";
  
  return (
    <div className={`rounded-xl border p-5 ${cardClass}`}>
      <div className={`text-lg font-semibold ${textClass}`}>{title}</div>
      {subtitle && <div className={`text-xs mt-1 ${subtitleClass}`}>{subtitle}</div>}
      <div className="mt-4">{children}</div>
    </div>
  );
}
