import { useEffect, useMemo, useState } from "react";
import { txApi, auditApi } from "../services/apiClient";
import { getSettings } from "../services/adminStore"; // still local for thresholds for now

const badgeClass = (label) => {
  if (label === "GREEN")
    return "bg-emerald-500/15 text-emerald-200 border-emerald-500/20";
  if (label === "ORANGE")
    return "bg-amber-500/15 text-amber-200 border-amber-500/20";
  return "bg-rose-500/15 text-rose-200 border-rose-500/20";
};

const labelFromRisk = (risk, settings) => {
  const orange = settings?.orangeThreshold ?? 40;
  const red = settings?.redThreshold ?? 70;
  if (risk >= red) return "RED";
  if (risk >= orange) return "ORANGE";
  return "GREEN";
};

export default function Dashboard() {
  const [settings, setSettings] = useState(() => getSettings());

  const [rows, setRows] = useState([]); // ALWAYS array
  const [logs, setLogs] = useState([]); // ALWAYS array

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // refresh loop (Admin thresholds can change locally; tx/audit change in backend)
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setErr("");
        const [txs, audits] = await Promise.all([txApi.list(), auditApi.list()]);

        if (!alive) return;

        setSettings(getSettings()); // still local for now
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
    const t = setInterval(load, 1200);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const computed = useMemo(() => {
    const maxAmount = 40000;

    const enriched = rows.map((tx) => {
      const amount = Number(tx.amount || 0);
      const risk = Math.min(100, Math.round((amount / maxAmount) * 100));
      const label = labelFromRisk(risk, settings);
      return { ...tx, risk, label };
    });

    const total = enriched.length;
    const green = enriched.filter((t) => t.label === "GREEN").length;
    const orange = enriched.filter((t) => t.label === "ORANGE").length;
    const red = enriched.filter((t) => t.label === "RED").length;

    const avgRisk =
      total === 0 ? 0 : Math.round(enriched.reduce((sum, t) => sum + t.risk, 0) / total);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-white/60 mt-1">
          Fraud Operations overview — thresholds, persisted transactions, and audit activity.
        </p>
        <div className="text-xs text-white/45 mt-2">
          Policy: ORANGE ≥ <b>{orangeTh}</b> • RED ≥ <b>{redTh}</b> • Auto-block:{" "}
          <b>{autoBlock ? "ON" : "OFF"}</b>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Loading dashboard data...
        </div>
      )}

      {err && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          {err}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi title="Total Transactions" value={computed.total} />
        <Kpi title="GREEN" value={computed.green} tone="green" />
        <Kpi title="ORANGE" value={computed.orange} tone="orange" />
        <Kpi title="RED" value={computed.red} tone="red" />
        <Kpi title="Avg Risk" value={`${computed.avgRisk}%`} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alerts */}
        <Card title="High-Risk Alerts (RED)" subtitle="Most recent RED transactions">
          {computed.recentRed.length === 0 ? (
            <div className="text-sm text-white/60">No RED alerts yet.</div>
          ) : (
            <div className="space-y-2">
              {computed.recentRed.map((t) => (
                <div
                  key={t.tx_id || t.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{t.tx_id}</div>
                      <div className="text-xs text-white/50 mt-1">
                        {t.user} • {t.merchant}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white/80">
                        {Number(t.amount || 0).toLocaleString()} AED
                      </div>
                      <div className="text-xs text-white/50 mt-1">{t.risk}% risk</div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${badgeClass(
                        t.label
                      )}`}
                    >
                      {t.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent transactions */}
        <Card title="Recent Transactions" subtitle="Latest 6 seen in the system">
          {computed.recentTx.length === 0 ? (
            <div className="text-sm text-white/60">No transactions yet.</div>
          ) : (
            <div className="space-y-2">
              {computed.recentTx.map((t) => (
                <div
                  key={t.tx_id || t.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-3"
                >
                  <div>
                    <div className="text-sm font-semibold">{t.tx_id}</div>
                    <div className="text-xs text-white/50 mt-1">
                      {t.merchant} • {t.country} • {t.device}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-white/80">
                      {Number(t.amount || 0).toLocaleString()} AED
                    </div>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${badgeClass(
                          t.label
                        )}`}
                      >
                        {t.label}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Audit feed */}
        <Card title="Audit Activity" subtitle="Latest system actions (admin + transactions)">
          {logs.length === 0 ? (
            <div className="text-sm text-white/60">No audit logs yet.</div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {logs
                .slice()
                .reverse()
                .slice(0, 12)
                .map((l) => (
                  <div
                    key={l.id}
                    className="rounded-2xl border border-white/10 bg-black/30 p-3"
                  >
                    <div className="text-xs text-white/50">
                      {l.created_at ? new Date(l.created_at).toLocaleString() : ""}
                    </div>
                    <div className="text-sm font-semibold mt-1">{l.action}</div>
                    <div className="text-xs text-white/60 mt-1">
                      {JSON.stringify(l.meta || {})}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>

      <div className="text-xs text-white/45">
        Tip: Add transactions in Transactions page → come back here → stats update.
      </div>
    </div>
  );
}

function Kpi({ title, value, tone }) {
  const toneClass =
    tone === "green"
      ? "border-emerald-500/20 bg-emerald-500/10"
      : tone === "orange"
      ? "border-amber-500/20 bg-amber-500/10"
      : tone === "red"
      ? "border-rose-500/20 bg-rose-500/10"
      : "border-white/10 bg-white/5";

  return (
    <div className={`rounded-2xl border ${toneClass} p-4`}>
      <div className="text-xs text-white/50">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-lg font-semibold">{title}</div>
      {subtitle && <div className="text-xs text-white/50 mt-1">{subtitle}</div>}
      <div className="mt-4">{children}</div>
    </div>
  );
}
