import { useEffect, useMemo, useState } from "react";
import { txApi } from "../services/apiClient";
import { caseApi } from "../services/caseApi";

const pill = {
  ok: "bg-emerald-500/15 text-emerald-200 border-emerald-500/20",
  warn: "bg-amber-500/15 text-amber-200 border-amber-500/20",
  danger: "bg-rose-500/15 text-rose-200 border-rose-500/20",
  info: "bg-sky-500/15 text-sky-200 border-sky-500/20",
};

const toMins = (ms) => Math.max(0, Math.floor(ms / 60000));

function computeRisk(amount) {
  const maxAmount = 40000;
  const a = Number(amount || 0);
  return Math.min(100, Math.round((a / maxAmount) * 100));
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

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-xs text-white/40 mt-1">{hint}</div> : null}
    </div>
  );
}

function Badge({ text, tone = "info" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${pill[tone]}`}>
      {text}
    </span>
  );
}

function miniBar(value, max) {
  const pct = max <= 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full bg-white/40" style={{ width: `${pct}%` }} />
    </div>
  );
}

function HeatCell({ v, vmax }) {
  // intensity tiers using only grayscale (stays consistent with your theme)
  const pct = vmax ? v / vmax : 0;
  const cls =
    pct >= 0.8 ? "bg-white/15" : pct >= 0.5 ? "bg-white/10" : pct >= 0.2 ? "bg-white/5" : "bg-black/20";

  return (
    <div className={`h-10 rounded-xl border border-white/10 ${cls} flex items-center justify-center`}>
      <span className="text-sm text-white/80">{v || 0}</span>
    </div>
  );
}

export default function Intelligence() {
  const [txs, setTxs] = useState([]);
  const [cases, setCases] = useState([]);
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
        setErr(e?.message || "Failed to load intelligence");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 1500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const view = useMemo(() => {
    const now = Date.now();

    const txView = txs.map((t) => ({
      ...t,
      risk: computeRisk(t.amount),
      tsMs: new Date(t.ts || 0).getTime(),
    }));

    const openCases = cases.filter((c) => c.status !== "CLOSED");
    const highCases = cases.filter((c) => Number(c.risk_score || 0) >= 75);
    const escCases = cases.filter((c) => c.status === "ESCALATED");

    // last 15 minutes activity
    const tx15 = txView.filter((t) => now - t.tsMs <= 15 * 60 * 1000);
    const red15 = tx15.filter((t) => t.risk >= 70);
    const big15 = tx15.filter((t) => Number(t.amount || 0) >= 15000);

    // top entities
    const countBy = (arr, keyFn) => {
      const m = new Map();
      for (const x of arr) {
        const k = keyFn(x) || "Unknown";
        m.set(k, (m.get(k) || 0) + 1);
      }
      return [...m.entries()].map(([k, v]) => ({ key: k, count: v })).sort((a, b) => b.count - a.count);
    };

    const topMerchants = countBy(tx15, (t) => t.merchant).slice(0, 5);
    const topCountries = countBy(tx15, (t) => t.country).slice(0, 5);
    const topChannels = countBy(tx15, (t) => t.channel).slice(0, 5);

    // heatmap: country x channel (last 60 minutes)
    const tx60 = txView.filter((t) => now - t.tsMs <= 60 * 60 * 1000);
    const countries = [...new Set(tx60.map((t) => t.country).filter(Boolean))].slice(0, 6);
    const channels = [...new Set(tx60.map((t) => t.channel).filter(Boolean))].slice(0, 5);

    const matrix = {};
    countries.forEach((co) => {
      matrix[co] = {};
      channels.forEach((ch) => (matrix[co][ch] = 0));
    });

    for (const t of tx60) {
      if (!countries.includes(t.country) || !channels.includes(t.channel)) continue;
      // weight by risk tier to make the heatmap “signal aware”
      const w = t.risk >= 70 ? 3 : t.risk >= 40 ? 2 : 1;
      matrix[t.country][t.channel] += w;
    }

    let vmax = 0;
    countries.forEach((co) => channels.forEach((ch) => (vmax = Math.max(vmax, matrix[co][ch]))));

    // attack signals (simple, demo-safe heuristics)
    const signals = [];
    if (red15.length >= 4) signals.push({ tone: "danger", text: "Spike in RED-risk transactions (15 min)" });
    if (big15.length >= 6) signals.push({ tone: "warn", text: "High-value burst detected (15 min)" });
    if (escCases.length >= 2) signals.push({ tone: "danger", text: "Multiple escalations active" });
    if (openCases.length >= 8) signals.push({ tone: "warn", text: "Queue pressure increasing (open cases)" });
    if (signals.length === 0) signals.push({ tone: "ok", text: "No major anomaly indicators right now" });

    // SLA pressure
    const slaMins = openCases.map((c) => toMins(new Date(c.sla_due_at).getTime() - now));
    const avgSla = slaMins.length ? Math.round(slaMins.reduce((a, b) => a + b, 0) / slaMins.length) : 0;
    const dueSoon = openCases.filter((c) => toMins(new Date(c.sla_due_at).getTime() - now) <= 30).length;

    return {
      txView,
      openCases,
      highCases,
      escCases,
      tx15,
      red15,
      big15,
      topMerchants,
      topCountries,
      topChannels,
      heat: { countries, channels, matrix, vmax },
      signals,
      avgSla,
      dueSoon,
    };
  }, [txs, cases]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Intelligence</h1>
          <p className="text-white/60 mt-1">
            Situational awareness: hotspots, attack signals, clustering, and workload pressure.
          </p>
        </div>
        <div className="text-xs text-white/50 mt-2">Live (mock/real) • refresh ~1.5s</div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Loading intelligence...
        </div>
      )}

      {err && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          {err}
        </div>
      )}

      {/* Attack Signals */}
      <Card
        title="Attack Signals"
        subtitle="Quick triage indicators derived from last 15 minutes + case queue state."
        right={<Badge tone="info" text="Analyst View" />}
      >
        <div className="flex flex-wrap gap-2">
          {view.signals.map((s, idx) => (
            <Badge key={idx} tone={s.tone} text={s.text} />
          ))}
        </div>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label="Open Cases" value={view.openCases.length} hint="Active workload (not CLOSED)" />
        <Stat label="High-Risk Cases" value={view.highCases.length} hint="Risk ≥ 75%" />
        <Stat label="Avg SLA Remaining" value={`${view.avgSla} min`} hint="Across open cases" />
        <Stat label="Due Soon" value={view.dueSoon} hint="SLA ≤ 30 min" />
      </div>

      {/* Hot Entities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card title="Top Merchants" subtitle="Most active (last 15 min)">
          <TopList items={view.topMerchants} />
        </Card>

        <Card title="Top Countries" subtitle="Most active (last 15 min)">
          <TopList items={view.topCountries} />
        </Card>

        <Card title="Top Channels" subtitle="Most active (last 15 min)">
          <TopList items={view.topChannels} />
        </Card>
      </div>

      {/* Heatmap */}
      <Card
        title="Hotspot Heatmap"
        subtitle="Country × Channel weighted by risk tier (last 60 min)."
        right={<Badge tone="ok" text="Weighted" />}
      >
        {view.heat.countries.length === 0 || view.heat.channels.length === 0 ? (
          <div className="text-sm text-white/60">Not enough data yet. Keep the stream running.</div>
        ) : (
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `140px repeat(${view.heat.channels.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="text-xs text-white/50" />
            {view.heat.channels.map((ch) => (
              <div key={ch} className="text-xs text-white/50 text-center">
                {ch}
              </div>
            ))}

            {view.heat.countries.map((co) => (
              <div key={co} className="contents">
                <div className="text-xs text-white/60 flex items-center">{co}</div>
                {view.heat.channels.map((ch) => (
                  <HeatCell
                    key={`${co}-${ch}`}
                    v={view.heat.matrix[co][ch]}
                    vmax={view.heat.vmax}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-white/45 mt-3">
          Weighting: GREEN=1 • ORANGE=2 • RED=3 (demo scoring).
        </div>
      </Card>

      {/* Live Queue Preview */}
      <Card
        title="Queue Preview"
        subtitle="Newest cases (quick access for triage)."
        right={<Badge tone="info" text="Live" />}
      >
        <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
          <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[11px] text-white/50 border-b border-white/10">
            <div>Case</div>
            <div>TX</div>
            <div>Risk</div>
            <div>Status</div>
            <div>SLA</div>
          </div>

          {view.openCases.length === 0 ? (
            <div className="px-3 py-4 text-sm text-white/60">No open cases yet.</div>
          ) : (
            view.openCases.slice(0, 8).map((c) => (
              <div
                key={c.case_id}
                className="grid grid-cols-5 gap-2 px-3 py-2 text-xs border-b border-white/5 last:border-b-0"
              >
                <div className="text-white/80">{c.case_id}</div>
                <div className="text-white/70">{c.tx_id}</div>
                <div className="text-white/70 font-semibold">{c.risk_score}%</div>
                <div className="text-white/60">{c.status}</div>
                <div className="text-white/60">{toMins(new Date(c.sla_due_at) - Date.now())} min</div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function TopList({ items }) {
  const max = Math.max(1, ...items.map((x) => x.count || 0));

  if (!items || items.length === 0) {
    return <div className="text-sm text-white/60">No data yet.</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((x) => (
        <div key={x.key} className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-white/80 truncate">{x.key}</div>
            <div className="text-sm font-semibold text-white/85">{x.count}</div>
          </div>
          <div className="mt-2">{miniBar(x.count, max)}</div>
        </div>
      ))}
    </div>
  );
}
