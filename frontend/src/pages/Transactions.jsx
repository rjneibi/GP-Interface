import { useEffect, useMemo, useState } from "react";
import { getSettings } from "../services/adminStore";
import { txApi, notesApi } from "../services/apiClient";
import { txStreamService } from "../services/txStreamService";
import RealtimeTxChart from "../components/RealtimeTxChart";

const badgeClass = (label) => {
  if (label === "GREEN") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/20";
  if (label === "ORANGE") return "bg-amber-500/15 text-amber-200 border-amber-500/20";
  return "bg-rose-500/15 text-rose-200 border-rose-500/20";
};

const labelFromRisk = (risk, settings) => {
  const orange = settings?.orangeThreshold ?? 40;
  const red = settings?.redThreshold ?? 70;
  if (risk >= red) return "RED";
  if (risk >= orange) return "ORANGE";
  return "GREEN";
};

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
    { feature: "merchant_risk", impact: String(tx.merchant || "").includes("Crypto") ? 0.28 : 0.1 },
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

  if (risk >= red) reasons.push(`risk score (${risk}%) is above the RED threshold (${red}%)`);
  else if (risk >= orange) reasons.push(`risk score (${risk}%) is above the ORANGE threshold (${orange}%)`);
  else reasons.push(`risk score (${risk}%) remains below policy thresholds`);

  if (Number(tx.amount || 0) >= 15000) reasons.push(`high amount (${Number(tx.amount).toLocaleString()} AED)`);
  if (tx.country !== "UAE") reasons.push(`foreign origin detected (${tx.country})`);
  if (String(tx.merchant || "").includes("Crypto")) reasons.push(`high-risk merchant category (Crypto)`);
  if (tx.device === "ATM") reasons.push(`ATM channel/device risk`);

  return `This transaction was classified as ${labelFromRisk(risk, settings)} because ${reasons.join(", ")}.`;
}

/* ---------------- Notes fallback so demo never breaks ---------------- */
const LS_NOTES_KEY = "demo_notes_by_tx";
function lsGetNote(txId) {
  try {
    const raw = localStorage.getItem(LS_NOTES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj?.[txId] || "";
  } catch {
    return "";
  }
}
function lsSetNote(txId, content) {
  try {
    const raw = localStorage.getItem(LS_NOTES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[txId] = content || "";
    localStorage.setItem(LS_NOTES_KEY, JSON.stringify(obj));
  } catch {}
}
function lsDeleteNote(txId) {
  try {
    const raw = localStorage.getItem(LS_NOTES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    delete obj[txId];
    localStorage.setItem(LS_NOTES_KEY, JSON.stringify(obj));
  } catch {}
}

export default function Transactions() {
  const [settings, setSettings] = useState(() => getSettings());

  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // global stream state
  const [streamOn, setStreamOn] = useState(() => txStreamService.isRunning());

  // ✅ NEW: search + filters
  const [query, setQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [merchantFilter, setMerchantFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all"); // GREEN/ORANGE/RED/all

  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [minRisk, setMinRisk] = useState("");
  const [maxRisk, setMaxRisk] = useState("");

  // refresh settings loop
  useEffect(() => {
    const t = setInterval(() => setSettings(getSettings()), 800);
    return () => clearInterval(t);
  }, []);

  // subscribe to stream state
  useEffect(() => {
    return txStreamService.subscribe((v) => setStreamOn(v));
  }, []);

  // load tx list loop
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

  const viewRows = useMemo(() => {
    return rows.map((t) => {
      const risk = typeof t.risk === "number" ? t.risk : computeRisk(t.amount);
      const label = labelFromRisk(risk, settings);
      return { ...t, risk, label };
    });
  }, [rows, settings]);

  // ✅ options for filters
  const userOptions = useMemo(() => {
    const set = new Set(viewRows.map((t) => t.user).filter(Boolean));
    return ["all", ...Array.from(set).sort((a, b) => String(a).localeCompare(String(b)))];
  }, [viewRows]);

  const merchantOptions = useMemo(() => {
    const set = new Set(viewRows.map((t) => t.merchant).filter(Boolean));
    return ["all", ...Array.from(set).sort((a, b) => String(a).localeCompare(String(b)))];
  }, [viewRows]);

  // ✅ apply filters
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const minA = minAmount === "" ? null : Number(minAmount);
    const maxA = maxAmount === "" ? null : Number(maxAmount);
    const minR = minRisk === "" ? null : Number(minRisk);
    const maxR = maxRisk === "" ? null : Number(maxRisk);

    return viewRows.filter((t) => {
      if (userFilter !== "all" && String(t.user) !== String(userFilter)) return false;
      if (merchantFilter !== "all" && String(t.merchant) !== String(merchantFilter)) return false;
      if (labelFilter !== "all" && t.label !== labelFilter) return false;

      const amount = Number(t.amount || 0);
      if (minA !== null && amount < minA) return false;
      if (maxA !== null && amount > maxA) return false;

      const risk = Number(t.risk || 0);
      if (minR !== null && risk < minR) return false;
      if (maxR !== null && risk > maxR) return false;

      if (!q) return true;

      const hay = [
        t.tx_id,
        t.user,
        t.merchant,
        t.country,
        t.channel,
        t.device,
        t.card_type,
        String(t.amount ?? ""),
        String(t.risk ?? ""),
        t.label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [viewRows, query, userFilter, merchantFilter, labelFilter, minAmount, maxAmount, minRisk, maxRisk]);

  const orange = settings?.orangeThreshold ?? 40;
  const red = settings?.redThreshold ?? 70;

  const clearAllTransactions = async () => {
    if (!confirm("Are you sure you want to delete ALL transactions? This cannot be undone.")) {
      return;
    }
    
    try {
      setLoading(true);
      // Delete all transactions one by one
      for (const tx of rows) {
        try {
          await txApi.delete(tx.tx_id);
        } catch (e) {
          console.error(`Failed to delete ${tx.tx_id}:`, e);
        }
      }
      
      // Refresh the list
      setRows([]);
      alert("All transactions deleted successfully!");
      
      // Reload from server
      const fresh = await txApi.list();
      setRows(fresh || []);
    } catch (error) {
      console.error("Error clearing transactions:", error);
      alert("Failed to clear some transactions");
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = async () => {
    try {
      const blob = await txApi.exportCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export transactions. Please try again.");
    }
  };

  const resetFilters = () => {
    setQuery("");
    setUserFilter("all");
    setMerchantFilter("all");
    setLabelFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setMinRisk("");
    setMaxRisk("");
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
            onClick={exportToCsv}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
            data-testid="export-csv-btn"
          >
            Export CSV
          </button>
          <button
            onClick={clearAllTransactions}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
            data-testid="clear-transactions-btn"
          >
            Clear
          </button>

          <button
            onClick={() => txStreamService.toggle()}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition border ${
              streamOn
                ? "bg-rose-500/15 text-rose-200 border-rose-500/30 hover:bg-rose-500/20"
                : "bg-emerald-500/15 text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/20"
            }`}
            data-testid="toggle-stream-btn"
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

      {/* ✅ NEW: Real-time Graph */}
      <RealtimeTxChart txs={filteredRows} />

      {/* ✅ NEW: Search + Filters */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Search & Filters</div>
            <div className="text-xs text-white/50 mt-1">Filter by user, merchant, amount range, risk range, and tier.</div>
          </div>
          <button
            onClick={resetFilters}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-white/60">Search</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
              placeholder="tx_id, user, merchant, country, device..."
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-white/60">User</div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none"
            >
              {userOptions.map((u) => (
                <option key={u} value={u}>
                  {u === "all" ? "All users" : u}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-white/60">Merchant</div>
            <select
              value={merchantFilter}
              onChange={(e) => setMerchantFilter(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none"
            >
              {merchantOptions.map((m) => (
                <option key={m} value={m}>
                  {m === "all" ? "All merchants" : m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-white/60">Tier</div>
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none"
            >
              <option value="all">All tiers</option>
              <option value="GREEN">GREEN</option>
              <option value="ORANGE">ORANGE</option>
              <option value="RED">RED</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-white/60">Min Amount (AED)</div>
            <input
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              type="number"
              min={0}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
              placeholder="e.g. 1000"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-white/60">Max Amount (AED)</div>
            <input
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              type="number"
              min={0}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
              placeholder="e.g. 20000"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-white/60">Risk Range (%)</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={minRisk}
                onChange={(e) => setMinRisk(e.target.value)}
                type="number"
                min={0}
                max={100}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
                placeholder="min"
              />
              <input
                value={maxRisk}
                onChange={(e) => setMaxRisk(e.target.value)}
                type="number"
                min={0}
                max={100}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
                placeholder="max"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-white/45">
          Showing <b className="text-white/70">{filteredRows.length}</b> transactions (after filters).
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-6 gap-2 px-4 py-3 text-xs text-white/50 border-b border-white/10">
          <div>ID</div>
          <div>User</div>
          <div>Merchant</div>
          <div>Amount</div>
          <div>Risk</div>
          <div>Status</div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-white/60">
            No matching transactions. Try clearing filters or click “Start Stream”.
          </div>
        ) : (
          filteredRows.map((t) => (
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
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${badgeClass(t.label)}`}>
                  {t.label}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {selected && <TxModal tx={selected} onClose={() => setSelected(null)} settings={settings} />}
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
  const explanation = useMemo(() => explainText(tx, risk, settings), [tx, risk, settings]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setNoteErr("");
        setNoteLoading(true);

        // Try backend first
        const items = await notesApi.listByTx(tx.tx_id);
        if (!alive) return;
        const first = Array.isArray(items) ? items[0] : null;
        const content = first?.content || first?.note || "";

        setNote(content || "");
        // mirror to localstorage for demo continuity
        lsSetNote(tx.tx_id, content || "");
      } catch (e) {
        if (!alive) return;

        // ✅ fallback to localStorage (NO WHITE SCREEN)
        const local = lsGetNote(tx.tx_id);
        setNote(local);
        setNoteErr("Backend note API unavailable — using local demo notes.");
      } finally {
        if (alive) setNoteLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [tx.tx_id]);

  const act = (newStatus) => setStatus(newStatus);

  const save = async () => {
    // Always save locally first (demo-safe)
    lsSetNote(tx.tx_id, note);

    try {
      await notesApi.create({ tx_id: tx.tx_id, content: note });
      alert("Note saved ✅");
    } catch (e) {
      alert("Saved locally ✅ (backend note API not available).");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this note?")) return;

    lsDeleteNote(tx.tx_id);
    setNote("");

    try {
      await notesApi.deleteByTx(tx.tx_id);
    } catch (e) {
      // demo-safe
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
          <div className="text-xs text-white/50 mt-1">Human-readable justification for the fraud prediction.</div>
          <p className="mt-3 text-sm text-white/80 leading-relaxed">{explanation}</p>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Case Actions (demo)</div>
          <div className="text-xs text-white/50 mt-1">Mimics SOC workflow (Open → Reviewed → Escalated → Blocked).</div>

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
          <div className="text-xs text-white/50 mt-1">Later: backend API returns top features + contributions per prediction.</div>

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
            Demo-safe: saves locally if backend isn’t running.
          </div>

          {noteLoading && <div className="mt-3 text-xs text-white/60">Loading note...</div>}
          {noteErr && <div className="mt-3 text-xs text-amber-200">{noteErr}</div>}

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
