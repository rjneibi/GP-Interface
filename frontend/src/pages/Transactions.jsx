import { useEffect, useMemo, useRef, useState } from "react";
import { getSettings } from "../services/adminStore"; // thresholds still local for now
import { txApi, notesApi } from "../services/apiClient";

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

const randBetween = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const countries = ["UAE", "KSA", "Qatar", "UK", "USA", "Germany", "India"];
const devices = ["iPhone", "Android", "Windows", "Mac", "ATM", "POS"];
const channels = ["Mobile App", "Web", "ATM", "POS"];
const merchants = [
  "Amazon",
  "Noon",
  "Apple",
  "Careem",
  "Talabat",
  "Booking.com",
  "Crypto Exchange",
];
const cardTypes = ["VISA", "MasterCard", "AMEX"];

function computeRisk(amount) {
  const maxAmount = 40000;
  const a = Number(amount || 0);
  return Math.min(100, Math.round((a / maxAmount) * 100));
}

function fakeExplainability(tx) {
  const base = [
    { feature: "amount", impact: Math.min(0.55, Number(tx.amount || 0) / 60000) },
    { feature: "country_mismatch", impact: tx.country !== "UAE" ? 0.22 : 0.05 },
    { feature: "device_risk", impact: tx.device === "ATM" ? 0.18 : 0.08 },
    {
      feature: "merchant_risk",
      impact: String(tx.merchant || "").includes("Crypto") ? 0.28 : 0.1,
    },
    { feature: "hour_of_day", impact: Number(tx.hour || 0) < 6 ? 0.2 : 0.06 },
  ];

  return base
    .map((x) => ({ ...x, pct: Math.round(x.impact * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
}

function explainText(tx, risk, settings) {
  const reasons = [];
  const orange = settings?.orangeThreshold ?? 40;
  const red = settings?.redThreshold ?? 70;

  if (risk >= red) {
    reasons.push(`risk score (${risk}%) is above the RED threshold (${red}%)`);
  } else if (risk >= orange) {
    reasons.push(
      `risk score (${risk}%) is above the ORANGE threshold (${orange}%)`
    );
  } else {
    reasons.push(`risk score (${risk}%) remains below policy thresholds`);
  }

  if (Number(tx.amount || 0) >= 15000) {
    reasons.push(`high amount (${Number(tx.amount).toLocaleString()} AED)`);
  }
  if (tx.country !== "UAE") reasons.push(`foreign origin detected (${tx.country})`);
  if (String(tx.merchant || "").includes("Crypto"))
    reasons.push(`high-risk merchant category (Crypto)`);
  if (tx.device === "ATM") reasons.push(`ATM channel/device risk`);

  return `This transaction was classified as ${labelFromRisk(
    risk,
    settings
  )} because ${reasons.join(", ")}.`;
}

export default function Transactions() {
  const [settings, setSettings] = useState(() => getSettings());
  const [streamOn, setStreamOn] = useState(false);

  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const timerRef = useRef(null);

  // refresh settings loop (local thresholds for now)
  useEffect(() => {
    const t = setInterval(() => setSettings(getSettings()), 800);
    return () => clearInterval(t);
  }, []);

  // initial load + refresh loop
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setErr("");
        const txs = await txApi.list();
        if (!alive) return;
        setRows(Array.isArray(txs) ? txs : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load transactions");
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

  // simulated stream (POST to backend)
  useEffect(() => {
    if (!streamOn) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(async () => {
      const txId = `TX-${Math.floor(1000 + Math.random() * 9000)}`;

      const payload = {
        tx_id: txId,
        user: `User ${String.fromCharCode(randBetween(65, 90))}`,
        amount: randBetween(50, 40000),
        country: pick(countries),
        device: pick(devices),
        channel: pick(channels),
        merchant: pick(merchants),
        card_type: pick(cardTypes),
        hour: randBetween(0, 23),
        ts: new Date().toISOString(),
      };

      try {
        await txApi.create(payload);
        const txs = await txApi.list();
        setRows(Array.isArray(txs) ? txs : []);
      } catch (e) {
        // If duplicate tx_id happens, just ignore and continue
        console.error(e);
      }
    }, 1100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [streamOn]);

  const viewRows = useMemo(() => {
    return rows.map((t) => {
      const risk = computeRisk(t.amount);
      const label = labelFromRisk(risk, settings);
      return { ...t, risk, label };
    });
  }, [rows, settings]);

  const orange = settings?.orangeThreshold ?? 40;
  const red = settings?.redThreshold ?? 70;

  const clearAllHint = () => {
    alert(
      "Clear all is not implemented in backend yet.\nYou can truncate the DB table or add a DELETE endpoint."
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Transactions</h1>
          <p className="text-white/60 mt-1">
            Click any transaction to see <b>explainability</b>, add notes, and log actions.
          </p>
          <div className="text-xs text-white/45 mt-2">
            Policy: ORANGE ≥ <b>{orange}</b> • RED ≥ <b>{red}</b>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={clearAllHint}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
          >
            Clear
          </button>

          <button
            onClick={() => setStreamOn((v) => !v)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition border ${
              streamOn
                ? "bg-rose-500/15 text-rose-200 border-rose-500/30 hover:bg-rose-500/20"
                : "bg-emerald-500/15 text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/20"
            }`}
          >
            {streamOn ? "Stop Stream" : "Start Stream"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Loading transactions...
        </div>
      )}

      {err && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          {err}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-6 gap-2 px-4 py-3 text-xs text-white/50 border-b border-white/10">
          <div>ID</div>
          <div>User</div>
          <div>Merchant</div>
          <div>Amount</div>
          <div>Risk</div>
          <div>Status</div>
        </div>

        {viewRows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-white/60">
            No transactions yet. Click “Start Stream”.
          </div>
        ) : (
          viewRows.map((t) => (
            <button
              key={t.tx_id}
              onClick={() => setSelected(t)}
              className="w-full text-left grid grid-cols-6 gap-2 px-4 py-3 text-sm border-b border-white/5 last:border-b-0 hover:bg-white/5 transition"
            >
              <div className="text-white/80">{t.tx_id}</div>
              <div className="text-white/70">{t.user}</div>
              <div className="text-white/70">{t.merchant}</div>
              <div className="text-white/70">{Number(t.amount || 0).toLocaleString()} AED</div>
              <div className="text-white/70">
                <span className="font-semibold text-white/85">{t.risk}%</span>
              </div>
              <div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${badgeClass(
                    t.label
                  )}`}
                >
                  {t.label}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {selected && (
        <TxModal
          tx={selected}
          onClose={() => setSelected(null)}
          settings={settings}
        />
      )}
    </div>
  );
}

/* ---------- Modal ---------- */
function TxModal({ tx, onClose, settings }) {
  const [status, setStatus] = useState("Open");

  const [note, setNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(true);
  const [noteErr, setNoteErr] = useState("");

  const risk = tx.risk ?? computeRisk(tx.amount);
  const orange = settings?.orangeThreshold ?? 40;
  const red = settings?.redThreshold ?? 70;

  const reasons = useMemo(() => fakeExplainability(tx), [tx]);

  const explanation = useMemo(
    () => explainText(tx, risk, settings),
    [tx, risk, settings]
  );

  // Load note from backend by tx_id
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setNoteErr("");
        setNoteLoading(true);
        const items = await notesApi.listByTx(tx.tx_id);
        if (!alive) return;
        // assume latest note first or single
        const first = Array.isArray(items) ? items[0] : null;
        setNote(first?.content || "");
      } catch (e) {
        if (!alive) return;
        setNoteErr(e?.message || "Failed to load note");
      } finally {
        if (alive) setNoteLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [tx.tx_id]);

  const act = (newStatus) => {
    setStatus(newStatus);
    // optional: call audit endpoint in backend if you implement it
  };

  const save = async () => {
    try {
      await notesApi.create({ tx_id: tx.tx_id, content: note });
      alert("Note saved ✅");
    } catch (e) {
      alert(e?.message || "Failed to save note");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this note?")) return;
    try {
      await notesApi.deleteByTx(tx.tx_id);
      setNote("");
    } catch (e) {
      alert(e?.message || "Failed to delete note");
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-black/60" />

      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-slate-950 border-l border-white/10 p-5 overflow-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-white/50">Transaction</div>
            <div className="text-xl font-semibold">{tx.tx_id}</div>
            <div className="text-xs text-white/50 mt-1">
              Policy: ORANGE ≥ <b>{orange}</b> • RED ≥ <b>{red}</b>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Info label="User" value={tx.user} />
          <Info label="Merchant" value={tx.merchant} />
          <Info label="Amount" value={`${Number(tx.amount || 0).toLocaleString()} AED`} />
          <Info label="Risk Score" value={`${risk}% • ${labelFromRisk(risk, settings)}`} />
          <Info label="Channel" value={tx.channel} />
          <Info label="Country" value={tx.country} />
          <Info label="Device" value={tx.device} />
          <Info label="Card Type" value={tx.card_type} />
          <Info label="Time" value={tx.ts ? new Date(tx.ts).toLocaleString() : ""} />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Decision Explanation</div>
          <div className="text-xs text-white/50 mt-1">
            Human-readable justification for the fraud prediction.
          </div>
          <p className="mt-3 text-sm text-white/80 leading-relaxed">{explanation}</p>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Case Actions (demo)</div>
          <div className="text-xs text-white/50 mt-1">
            Mimics SOC workflow (Open → Reviewed → Escalated → Blocked).
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => act("Reviewed")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
            >
              Mark Reviewed
            </button>

            <button
              onClick={() => act("Escalated")}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/15 transition"
            >
              Escalate
            </button>

            <button
              onClick={() => act("Blocked")}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/15 transition"
            >
              Block
            </button>
          </div>

          <div className="mt-3 text-xs text-white/50">
            Current case status: <b className="text-white/80">{status}</b>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Explainability (mock SHAP)</div>
          <div className="text-xs text-white/50 mt-1">
            Later: backend API returns top features + contributions per prediction.
          </div>

          <div className="mt-3 space-y-2">
            {reasons.map((r) => (
              <div key={r.feature} className="flex items-center justify-between gap-3">
                <div className="text-sm text-white/70">{r.feature}</div>
                <div className="w-48 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-white/40" style={{ width: `${r.pct}%` }} />
                </div>
                <div className="text-xs text-white/60 w-10 text-right">{r.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Analyst Notes</div>
          <div className="text-xs text-white/50 mt-1">
            Stored in Postgres now.
          </div>

          {noteLoading && (
            <div className="mt-3 text-xs text-white/60">Loading note...</div>
          )}
          {noteErr && (
            <div className="mt-3 text-xs text-rose-200">{noteErr}</div>
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={6}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
            placeholder="Write investigation notes here..."
          />

          <div className="mt-3 flex gap-2">
            <button
              onClick={save}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold hover:bg-sky-600 transition"
            >
              Save Note
            </button>
            <button
              onClick={remove}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
            >
              Delete Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-sm text-white/80 mt-1">{value}</div>
    </div>
  );
}
