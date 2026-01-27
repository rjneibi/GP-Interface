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

function riskTier(risk) {
  if (risk >= 70) return { label: "RED", tone: "danger" };
  if (risk >= 40) return { label: "ORANGE", tone: "warn" };
  return { label: "GREEN", tone: "ok" };
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

function Badge({ text, tone = "info" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${pill[tone]}`}>
      {text}
    </span>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-sm text-white/80 mt-1 truncate">{value}</div>
    </div>
  );
}

function bar(pct) {
  const safe = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full bg-white/40" style={{ width: `${safe}%` }} />
    </div>
  );
}

// Mock explainability (deterministic-ish)
function explainability(tx) {
  const amount = Number(tx.amount || 0);
  const items = [
    { feature: "amount", score: Math.min(55, Math.round((amount / 40000) * 55)) },
    { feature: "country_mismatch", score: tx.country !== "UAE" ? 22 : 5 },
    { feature: "merchant_risk", score: String(tx.merchant || "").toLowerCase().includes("crypto") ? 28 : 10 },
    { feature: "device_risk", score: String(tx.device || "").toUpperCase() === "ATM" ? 18 : 8 },
    { feature: "hour_of_day", score: Number(tx.hour || 12) < 6 ? 20 : 6 },
  ];
  return items.sort((a, b) => b.score - a.score).slice(0, 5);
}

function recommend(risk, tx) {
  // action recommendation + confidence
  const isCrypto = String(tx.merchant || "").toLowerCase().includes("crypto");
  const foreign = tx.country && tx.country !== "UAE";
  const atm = String(tx.device || "").toUpperCase() === "ATM" || String(tx.channel || "").toUpperCase() === "ATM";
  const highAmt = Number(tx.amount || 0) >= 15000;

  let action = "Approve";
  let tone = "ok";
  let confidence = Math.min(95, Math.max(55, Math.round(50 + risk * 0.45)));

  if (risk >= 80 || (risk >= 70 && (isCrypto || atm || foreign))) {
    action = "Block";
    tone = "danger";
    confidence = Math.min(98, confidence + 8);
  } else if (risk >= 60 || (risk >= 50 && (foreign || highAmt))) {
    action = "Escalate";
    tone = "warn";
    confidence = Math.min(95, confidence + 4);
  } else if (risk >= 40) {
    action = "Review";
    tone = "info";
  }

  const counters = [];
  if (!foreign) counters.push("Domestic origin (UAE)");
  if (!atm) counters.push("Non-ATM channel");
  if (!isCrypto) counters.push("Non-crypto merchant category");
  if (!highAmt) counters.push("Amount not high-value");

  return { action, tone, confidence, counters: counters.slice(0, 3) };
}

export default function DecisionAssistant() {
  const [txs, setTxs] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedTxId, setSelectedTxId] = useState("");
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
        setErr(e?.message || "Failed to load decision assistant data");
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

  const joined = useMemo(() => {
    const txById = new Map(txs.map((t) => [t.tx_id, t]));
    const list = [];

    // prioritize open cases, then recent high-risk tx
    const openCases = (cases || []).filter((c) => c.status !== "CLOSED");
    for (const c of openCases) {
      const tx = txById.get(c.tx_id);
      if (tx) list.push({ kind: "case", case: c, tx, risk: Number(c.risk_score || computeRisk(tx.amount)) });
    }

    const used = new Set(list.map((x) => x.tx.tx_id));
    const highTx = (txs || [])
      .map((t) => ({ t, risk: computeRisk(t.amount) }))
      .filter((x) => x.risk >= 40)
      .sort((a, b) => new Date(b.t.ts || 0) - new Date(a.t.ts || 0))
      .slice(0, 30);

    for (const x of highTx) {
      if (used.has(x.t.tx_id)) continue;
      list.push({ kind: "tx", case: null, tx: x.t, risk: x.risk });
    }

    // auto-select first
    const firstId = list[0]?.tx?.tx_id || "";
    return { list, firstId };
  }, [txs, cases]);

  useEffect(() => {
    if (!selectedTxId && joined.firstId) setSelectedTxId(joined.firstId);
  }, [selectedTxId, joined.firstId]);

  const selected = useMemo(() => {
    const item = joined.list.find((x) => x.tx.tx_id === selectedTxId) || null;
    if (!item) return null;

    const tx = item.tx;
    const risk = item.risk ?? computeRisk(tx.amount);
    const tier = riskTier(risk);
    const exp = explainability(tx);
    const rec = recommend(risk, tx);

    // similar history: same merchant/country
    const similar = (txs || [])
      .filter((t) => t.tx_id !== tx.tx_id)
      .map((t) => ({ t, risk: computeRisk(t.amount) }))
      .filter((x) => x.t.merchant === tx.merchant || x.t.country === tx.country)
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 6);

    const summary = `Investigation Summary:
• Tx ${tx.tx_id} (${Number(tx.amount || 0).toLocaleString()} AED) at ${tx.merchant} via ${tx.channel}
• Risk: ${risk}% (${tier.label}) — Suggested action: ${rec.action} (confidence ${rec.confidence}%)
• Signals: ${exp.map((e) => `${e.feature} +${e.score}%`).join(", ")}
• Context: ${tx.country || "—"} • ${tx.device || "—"} • ${tx.card_type || "—"}
`;

    return { ...item, risk, tier, exp, rec, similar, summary };
  }, [joined.list, selectedTxId, txs]);

  const copySummary = async () => {
    if (!selected?.summary) return;
    try {
      await navigator.clipboard.writeText(selected.summary);
      alert("Summary copied ✅");
    } catch {
      alert("Copy failed. (Browser permissions)");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Decision Assistant</h1>
          <p className="text-white/60 mt-1">
            Analyst decision support: explainability, confidence, counter-signals, and recommended action.
          </p>
        </div>
        <div className="text-xs text-white/50 mt-2">Live • refresh ~1.5s</div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: queue */}
        <Card
          title="Triage Queue"
          subtitle="Open cases first, then high-risk transactions."
          right={<Badge tone="info" text={`${joined.list.length} items`} />}
        >
          {joined.list.length === 0 ? (
            <div className="text-sm text-white/60">No data yet. Start the transaction stream.</div>
          ) : (
            <div className="space-y-2">
              {joined.list.slice(0, 14).map((x) => {
                const t = x.tx;
                const r = x.risk ?? computeRisk(t.amount);
                const tier = riskTier(r);
                const active = selectedTxId === t.tx_id;

                return (
                  <button
                    key={t.tx_id}
                    onClick={() => setSelectedTxId(t.tx_id)}
                    className={`w-full text-left rounded-2xl border px-3 py-3 transition ${
                      active ? "border-white/20 bg-white/10" : "border-white/10 bg-black/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-white/85">{t.tx_id}</div>
                      <Badge tone={tier.tone} text={`${tier.label} • ${r}%`} />
                    </div>
                    <div className="text-xs text-white/55 mt-1">
                      {t.merchant} • {Number(t.amount || 0).toLocaleString()} AED • {t.country} • {t.channel}
                    </div>
                    {x.kind === "case" ? (
                      <div className="text-[11px] text-white/45 mt-2">
                        Case: {x.case?.case_id} • Status: {x.case?.status}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right: details */}
        <div className="lg:col-span-2 space-y-3">
          {!selected ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              Select an item from the triage queue.
            </div>
          ) : (
            <>
              <Card
                title="Decision Snapshot"
                subtitle="Recommendation + confidence + case context."
                right={<Badge tone={selected.tier.tone} text={`${selected.tier.label} • ${selected.risk}%`} />}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Info label="Transaction" value={selected.tx.tx_id} />
                  <Info label="Merchant" value={selected.tx.merchant || "—"} />
                  <Info label="Amount" value={`${Number(selected.tx.amount || 0).toLocaleString()} AED`} />
                  <Info label="Country" value={selected.tx.country || "—"} />
                  <Info label="Channel" value={selected.tx.channel || "—"} />
                  <Info label="Device" value={selected.tx.device || "—"} />
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs text-white/50">Recommended Action</div>
                    <div className="text-xl font-semibold mt-1">{selected.rec.action}</div>
                    <div className="mt-2">{bar(selected.rec.confidence)}</div>
                    <div className="text-xs text-white/45 mt-2">Confidence: {selected.rec.confidence}%</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 md:col-span-2">
                    <div className="text-xs text-white/50">Counter-signals</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selected.rec.counters.map((x, i) => (
                        <Badge key={i} tone="info" text={x} />
                      ))}
                    </div>
                    <div className="text-[11px] text-white/45 mt-2">
                      These are signals that reduce certainty (helps avoid false positives).
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={copySummary}
                    className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold hover:bg-sky-600 transition"
                  >
                    Copy Investigation Summary
                  </button>

                  <button
                    onClick={() => alert("Demo action: Approve logged (add audit later)")}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => alert("Demo action: Escalate logged (add audit later)")}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition"
                  >
                    Escalate
                  </button>
                  <button
                    onClick={() => alert("Demo action: Block logged (add audit later)")}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/15 transition"
                  >
                    Block
                  </button>
                </div>
              </Card>

              <Card title="Explainability" subtitle="Top contributing factors (mock SHAP style).">
                <div className="space-y-2">
                  {selected.exp.map((e) => (
                    <div key={e.feature} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-white/80">{e.feature}</div>
                        <div className="text-sm font-semibold text-white/85">+{e.score}%</div>
                      </div>
                      <div className="mt-2">{bar(e.score)}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Similar Activity" subtitle="Nearby transactions sharing merchant/country (quick context).">
                {selected.similar.length === 0 ? (
                  <div className="text-sm text-white/60">No similar history yet.</div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                    <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[11px] text-white/50 border-b border-white/10">
                      <div>TX</div>
                      <div>Merchant</div>
                      <div>Amount</div>
                      <div>Country</div>
                      <div>Risk</div>
                    </div>

                    {selected.similar.map((x) => (
                      <div
                        key={x.t.tx_id}
                        className="grid grid-cols-5 gap-2 px-3 py-2 text-xs border-b border-white/5 last:border-b-0"
                      >
                        <div className="text-white/80">{x.t.tx_id}</div>
                        <div className="text-white/70">{x.t.merchant}</div>
                        <div className="text-white/70">{Number(x.t.amount || 0).toLocaleString()} AED</div>
                        <div className="text-white/60">{x.t.country}</div>
                        <div className="text-white/70 font-semibold">{x.risk}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
