import { useEffect, useMemo, useState } from "react";
import { txApi } from "../services/apiClient";
import { caseApi } from "../services/caseApi";

const pill = {
  ok: "bg-emerald-500/15 text-emerald-200 border-emerald-500/20",
  warn: "bg-amber-500/15 text-amber-200 border-amber-500/20",
  danger: "bg-rose-500/15 text-rose-200 border-rose-500/20",
  info: "bg-sky-500/15 text-sky-200 border-sky-500/20",
};

function computeRisk(amount) {
  const maxAmount = 40000;
  const a = Number(amount || 0);
  return Math.min(100, Math.round((a / maxAmount) * 100));
}

function Badge({ text, tone = "info" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${pill[tone]}`}>
      {text}
    </span>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? <div className="text-xs text-white/50 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function scoreCluster(items) {
  // campaign suspicion score (demo-safe)
  // weight: count + red share + avg risk + amount burst
  const n = items.length;
  const avgRisk = items.reduce((a, x) => a + x.risk, 0) / Math.max(1, n);
  const red = items.filter((x) => x.risk >= 70).length;
  const redPct = red / Math.max(1, n);
  const amtBurst = items.filter((x) => Number(x.tx.amount || 0) >= 15000).length;

  const score = Math.round(n * 10 + avgRisk * 0.8 + redPct * 35 + amtBurst * 6);
  const tone = score >= 120 ? "danger" : score >= 80 ? "warn" : "info";
  return { score, tone, avgRisk: Math.round(avgRisk), red, redPct: Math.round(redPct * 100), amtBurst };
}

export default function PatternExplorer() {
  const [txs, setTxs] = useState([]);
  const [cases, setCases] = useState([]);
  const [mode, setMode] = useState("merchant"); // merchant | country | device | channel
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setErr("");
        const [t, c] = await Promise.all([txApi.list(), caseApi.list()]);
        if (!alive) return;
        setTxs(Array.isArray(t) ? t : []);
        setCases(Array.isArray(c) ? c : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load patterns");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const view = useMemo(() => {
    const txById = new Map(txs.map((t) => [t.tx_id, t]));
    const openCases = (cases || []).filter((c) => c.status !== "CLOSED");
    const rows = openCases
      .map((c) => {
        const tx = txById.get(c.tx_id);
        if (!tx) return null;
        const risk = Number(c.risk_score || computeRisk(tx.amount));
        return { case: c, tx, risk };
      })
      .filter(Boolean);

    const keyFn =
      mode === "merchant"
        ? (x) => x.tx.merchant
        : mode === "country"
        ? (x) => x.tx.country
        : mode === "device"
        ? (x) => x.tx.device
        : (x) => x.tx.channel;

    const buckets = new Map();
    for (const r of rows) {
      const k = keyFn(r) || "Unknown";
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(r);
    }

    const clusters = [...buckets.entries()]
      .map(([key, items]) => {
        const meta = scoreCluster(items);
        return { key, items, ...meta };
      })
      .sort((a, b) => b.score - a.score);

    return { rows, clusters, openCount: openCases.length };
  }, [txs, cases, mode]);

  const chips = [
    { key: "merchant", label: "Merchant" },
    { key: "country", label: "Country" },
    { key: "device", label: "Device" },
    { key: "channel", label: "Channel" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Pattern Explorer</h1>
          <p className="text-white/60 mt-1">
            Detect fraud campaigns by clustering open cases into suspicious groups.
          </p>
        </div>
        <div className="text-xs text-white/50 mt-2">Live • refresh ~2s</div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Loading...
        </div>
      )}
      {err && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          {err}
        </div>
      )}

      <Card
        title="Clustering Mode"
        subtitle="Choose how you want to group cases to reveal campaign patterns."
        right={<Badge tone="info" text={`${view.openCount} open cases`} />}
      >
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setMode(c.key)}
              className={`rounded-full border px-4 py-2 text-xs transition ${
                mode === c.key
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Card>

      <Card
        title="Suspicious Clusters"
        subtitle="Ranked by campaign score (volume + risk + red share + burst)."
      >
        {view.clusters.length === 0 ? (
          <div className="text-sm text-white/60">No open cases yet. Generate cases via transaction stream.</div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
            <div className="grid grid-cols-6 gap-2 px-3 py-2 text-[11px] text-white/50 border-b border-white/10">
              <div>Cluster Key</div>
              <div>Cases</div>
              <div>Avg Risk</div>
              <div>RED%</div>
              <div>Burst</div>
              <div>Score</div>
            </div>

            {view.clusters.slice(0, 18).map((cl) => (
              <div
                key={cl.key}
                className="grid grid-cols-6 gap-2 px-3 py-2 text-xs border-b border-white/5 last:border-b-0"
              >
                <div className="text-white/85 truncate">{cl.key}</div>
                <div className="text-white/70 font-semibold">{cl.items.length}</div>
                <div className="text-white/70">{cl.avgRisk}%</div>
                <div className="text-white/60">{cl.redPct}%</div>
                <div className="text-white/60">{cl.amtBurst}</div>
                <div>
                  <Badge tone={cl.tone} text={`${cl.score}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-white/45 mt-3">
          Tip: Cluster by <b>Merchant</b> to reveal “cash-out” patterns, or by <b>Device</b> to reveal emulator/ATM abuse.
        </div>
      </Card>

      <Card
        title="How this helps analysts"
        subtitle="This is what ‘campaign detection’ looks like in production systems."
      >
        <ul className="list-disc pl-5 text-sm text-white/70 space-y-2">
          <li><b>Reduces time</b>: investigate a cluster once instead of each case separately.</li>
          <li><b>Improves accuracy</b>: correlated signals are stronger than single-transaction signals.</li>
          <li><b>Better escalation</b>: clusters support escalation to fraud ops / bank investigation teams.</li>
          <li><b>Stops waves early</b>: when clusters spike, you can tighten policy temporarily.</li>
        </ul>
      </Card>
    </div>
  );
}
