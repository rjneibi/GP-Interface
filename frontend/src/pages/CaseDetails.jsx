import { useEffect, useMemo, useState } from "react";
import { txApi, notesApi } from "../services/apiClient";
import { caseApi } from "../services/caseApi";

/* ---------- Similarity (kNN-like) helpers ---------- */
function amountScore(a, b) {
  const x = Number(a || 0);
  const y = Number(b || 0);
  const diff = Math.abs(x - y);
  const denom = Math.max(1, Math.max(x, y));
  return 1 - diff / denom; // 1 = same amount, 0 = far
}

function simScore(base, other) {
  let score = 0;

  // weights: merchant strongest, then channel/country, then amount
  if (base.merchant && other.merchant && base.merchant === other.merchant) score += 0.45;
  if (base.channel && other.channel && base.channel === other.channel) score += 0.2;
  if (base.country && other.country && base.country === other.country) score += 0.2;

  score += 0.15 * amountScore(base.amount, other.amount);

  return Math.min(1, Math.max(0, score));
}

function scoreLabel(s) {
  if (s >= 0.8) return "Very High";
  if (s >= 0.65) return "High";
  if (s >= 0.5) return "Medium";
  return "Low";
}

function scoreBadgeClass(s) {
  if (s >= 0.8) return "bg-emerald-500/15 text-emerald-200 border-emerald-500/20";
  if (s >= 0.65) return "bg-sky-500/15 text-sky-200 border-sky-500/20";
  if (s >= 0.5) return "bg-amber-500/15 text-amber-200 border-amber-500/20";
  return "bg-white/5 text-white/70 border-white/10";
}

/* ---------- Summary generator helpers ---------- */
function minsRemaining(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 60000));
}

function recommendation(caseData, tx, simRows) {
  const risk = Number(caseData?.risk_score || 0);
  const priority = String(caseData?.priority || "").toUpperCase();

  const hasForeign = tx?.country && tx.country !== "UAE";
  const isATM = String(tx?.channel || "").toUpperCase() === "ATM" || String(tx?.device || "").toUpperCase() === "ATM";
  const isCrypto = String(tx?.merchant || "").toLowerCase().includes("crypto");
  const clusterStrong = (simRows || []).filter((s) => (s._sim || 0) >= 0.65).length;

  // action logic (demo policy)
  if (risk >= 90 || priority === "CRITICAL") {
    return {
      action: "BLOCK + ESCALATE",
      rationale: "Extreme risk score indicates likely fraud. Immediate containment is recommended.",
    };
  }

  if (risk >= 75 || priority === "HIGH") {
    if (clusterStrong >= 2 || isATM || isCrypto) {
      return {
        action: "ESCALATE",
        rationale: "High risk combined with high-risk channel/merchant or cluster activity suggests coordinated behavior.",
      };
    }
    return {
      action: "REQUEST INFO",
      rationale: "High risk but limited clustering; recommend step-up verification and customer outreach.",
    };
  }

  if (risk >= 55 || priority === "MEDIUM") {
    if (hasForeign && isATM) {
      return {
        action: "ESCALATE",
        rationale: "Foreign + ATM combination increases account takeover probability.",
      };
    }
    return {
      action: "REVIEW",
      rationale: "Moderate risk; validate context (device history, customer pattern) before closure.",
    };
  }

  return {
    action: "CLOSE",
    rationale: "Risk and signals are below escalation thresholds; close with documentation if no anomalies remain.",
  };
}

function buildSummary({ caseData, tx, simRows }) {
  const risk = Number(caseData?.risk_score || 0);
  const prio = caseData?.priority || "—";
  const status = caseData?.status || "—";
  const slaMins = caseData?.sla_due_at ? minsRemaining(caseData.sla_due_at) : null;

  const reasons = Array.isArray(caseData?.reason_codes) ? caseData.reason_codes : [];
  const topReasons = reasons.slice(0, 4);

  const strongNeighbors = (simRows || []).filter((s) => (s._sim || 0) >= 0.65);
  const sameMerchant = strongNeighbors.filter((s) => s.merchant === tx?.merchant).length;
  const sameCountry = strongNeighbors.filter((s) => s.country === tx?.country).length;
  const sameChannel = strongNeighbors.filter((s) => s.channel === tx?.channel).length;

  const rec = recommendation(caseData, tx, simRows);

  const amount = Number(tx?.amount || 0).toLocaleString();
  const when = tx?.ts ? new Date(tx.ts).toLocaleString() : "unknown time";

  // Compose a very professional paragraph
  const lines = [];

  lines.push(
    `Case ${caseData.case_id} is currently ${status} with a risk score of ${risk}% (priority: ${prio}).`
  );

  lines.push(
    `The flagged transaction ${tx?.tx_id} occurred on ${when} for ${amount} AED at ${tx?.merchant} via ${tx?.channel} (${tx?.country}).`
  );

  if (topReasons.length) {
    lines.push(`Primary signals: ${topReasons.join("; ")}.`);
  } else {
    lines.push(`Primary signals: policy threshold triggered; investigation required.`);
  }

  if (strongNeighbors.length) {
    lines.push(
      `Similar-activity check found ${strongNeighbors.length} strong neighbor(s) (≥ 65% similarity): ` +
        `${sameMerchant ? `${sameMerchant} share the same merchant` : "limited merchant overlap"}, ` +
        `${sameCountry ? `${sameCountry} share the same country` : "limited geographic overlap"}, ` +
        `${sameChannel ? `${sameChannel} share the same channel` : "limited channel overlap"}.`
    );
  } else {
    lines.push(`Similar-activity check found no strong cluster indicators at this time.`);
  }

  if (slaMins !== null) {
    lines.push(`SLA remaining: ~${slaMins} minute(s).`);
  }

  lines.push(
    `Recommended action: ${rec.action}. Rationale: ${rec.rationale}`
  );

  return lines.join(" ");
}

/* ---------- Drawer ---------- */
export default function CaseDrawer({ caseData, onClose }) {
  const [tx, setTx] = useState(null);

  const [note, setNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(true);
  const [noteErr, setNoteErr] = useState("");

  const [simRows, setSimRows] = useState([]);
  const [simLoading, setSimLoading] = useState(true);
  const [simErr, setSimErr] = useState("");

  // summary state
  const [summary, setSummary] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  // load main tx + note
  useEffect(() => {
    let alive = true;

    async function loadTxAndNotes() {
      try {
        const t = await txApi.get(caseData.tx_id);
        if (!alive) return;
        setTx(t);

        setNoteLoading(true);
        setNoteErr("");
        const n = await notesApi.listByTx(caseData.tx_id);
        if (!alive) return;
        const first = Array.isArray(n) ? n[0] : null;
        setNote(first?.content || first?.note || "");
      } catch (e) {
        if (!alive) return;
        setNoteErr(e?.message || "Failed to load transaction or notes");
      } finally {
        if (alive) setNoteLoading(false);
      }
    }

    loadTxAndNotes();
    return () => {
      alive = false;
    };
  }, [caseData.tx_id]);

  // load similar transactions
  useEffect(() => {
    let alive = true;

    async function loadSimilar() {
      try {
        setSimErr("");
        setSimLoading(true);

        const baseTx = await txApi.get(caseData.tx_id);
        if (!alive) return;

        const all = await txApi.list();
        if (!alive) return;

        const candidates = (Array.isArray(all) ? all : []).filter((t) => t.tx_id !== baseTx.tx_id);

        const scored = candidates
          .map((t) => ({ ...t, _sim: simScore(baseTx, t) }))
          .filter((t) => t._sim >= 0.35)
          .sort((a, b) => b._sim - a._sim)
          .slice(0, 8);

        setSimRows(scored);
      } catch (e) {
        if (!alive) return;
        setSimErr(e?.message || "Failed to load similar transactions");
      } finally {
        if (alive) setSimLoading(false);
      }
    }

    loadSimilar();
    return () => {
      alive = false;
    };
  }, [caseData.tx_id]);

  // auto-refresh summary inputs when tx changes (e.g., after clicking Open neighbor)
  useEffect(() => {
    if (!summaryOpen) return;
    if (!tx) return;
    // keep summary in sync
    setSummary(buildSummary({ caseData, tx, simRows }));
  }, [summaryOpen, tx, simRows, caseData]);

  if (!tx) return null;

  const slaMins = caseData?.sla_due_at ? minsRemaining(caseData.sla_due_at) : null;

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-black/60" />

      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-slate-950 border-l border-white/10 p-5 overflow-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-white/50">Case</div>
            <div className="text-xl font-semibold">{caseData.case_id}</div>
            <div className="text-xs text-white/50 mt-1">
              TX • {caseData.tx_id}{" "}
              {slaMins !== null ? (
                <>
                  <span className="text-white/40">•</span>{" "}
                  <span className="text-white/60">SLA ~{slaMins} min</span>
                </>
              ) : null}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
          >
            Close
          </button>
        </div>

        {/* Snapshot */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Info label="User" value={tx.user} />
          <Info label="Merchant" value={tx.merchant} />
          <Info label="Amount" value={`${Number(tx.amount || 0).toLocaleString()} AED`} />
          <Info label="Risk Score" value={`${caseData.risk_score}%`} />
          <Info label="Country" value={tx.country} />
          <Info label="Channel" value={tx.channel} />
        </div>

        {/* One-click Investigation Summary */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Investigation Summary</div>
              <div className="text-xs text-white/50 mt-1">
                Audit-ready narrative generated from signals + similar activity.
              </div>
            </div>

            <button
              onClick={() => {
                const text = buildSummary({ caseData, tx, simRows });
                setSummary(text);
                setSummaryOpen(true);
              }}
              className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold hover:bg-sky-600 transition"
            >
              Generate
            </button>
          </div>

          {summaryOpen && (
            <div className="mt-3 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <div className="text-xs text-white/50 mb-2">Generated Summary</div>
                <p className="text-sm text-white/80 leading-relaxed">{summary}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(summary);
                      alert("Copied ✅");
                    } catch {
                      alert("Copy failed (browser permission).");
                    }
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
                >
                  Copy
                </button>

                <button
                  onClick={() => {
                    const prefix = note?.trim() ? note.trim() + "\n\n" : "";
                    setNote(prefix + "INVESTIGATION SUMMARY:\n" + summary);
                    alert("Inserted into notes ✅");
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
                >
                  Insert into Notes
                </button>

                <button
                  onClick={() => {
                    setSummaryOpen(false);
                    setSummary("");
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
                >
                  Dismiss
                </button>
              </div>

              <div className="text-xs text-white/45">
                Tip: Use this summary for compliance, audit logs, and escalation documentation.
              </div>
            </div>
          )}
        </div>

        {/* Reason codes */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Reason Codes</div>
          <ul className="mt-3 list-disc pl-5 text-sm text-white/70">
            {(caseData.reason_codes || []).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        {/* Similar transactions */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Similar Transactions (kNN-style)</div>
              <div className="text-xs text-white/50 mt-1">
                Cluster context: same merchant/country/channel + similar amount.
              </div>
            </div>
            <div className="text-xs text-white/40">demo</div>
          </div>

          {simLoading ? (
            <div className="mt-3 text-xs text-white/60">Finding similar transactions...</div>
          ) : simErr ? (
            <div className="mt-3 text-xs text-rose-200">{simErr}</div>
          ) : simRows.length === 0 ? (
            <div className="mt-3 text-xs text-white/60">
              No strong neighbors found yet. Keep the stream running.
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[11px] text-white/50 border-b border-white/10 bg-black/20">
                <div>ID</div>
                <div>Merchant</div>
                <div>Amount</div>
                <div>Geo/Ch</div>
                <div>Match</div>
              </div>

              {simRows.map((t) => (
                <div
                  key={t.tx_id}
                  className="grid grid-cols-5 gap-2 px-3 py-2 text-xs border-b border-white/5 last:border-b-0"
                >
                  <div className="text-white/80">{t.tx_id}</div>
                  <div className="text-white/70 truncate">{t.merchant}</div>
                  <div className="text-white/70">{Number(t.amount || 0).toLocaleString()} AED</div>
                  <div className="text-white/60">
                    {t.country} • {t.channel}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] ${scoreBadgeClass(
                        t._sim
                      )}`}
                      title={`Similarity score: ${(t._sim * 100).toFixed(0)}%`}
                    >
                      {scoreLabel(t._sim)}
                    </span>

                    <button
                      onClick={async () => {
                        // Fast investigation: open neighbor TX in this drawer
                        try {
                          const opened = await txApi.get(t.tx_id);
                          setTx(opened);

                          // load notes for opened tx
                          setNoteLoading(true);
                          setNoteErr("");
                          const n = await notesApi.listByTx(t.tx_id);
                          const first = Array.isArray(n) ? n[0] : null;
                          setNote(first?.content || first?.note || "");

                          // if summary panel open, refresh summary
                          if (summaryOpen) {
                            setSummary(buildSummary({ caseData, tx: opened, simRows }));
                          }
                        } catch (e) {
                          alert(e?.message || "Failed to open transaction");
                        } finally {
                          setNoteLoading(false);
                        }
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10 transition"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Case Actions</div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {["IN_REVIEW", "ESCALATED", "CLOSED"].map((s) => (
              <button
                key={s}
                onClick={async () => {
                  await caseApi.update(caseData.case_id, { status: s });
                  onClose();
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
              >
                Mark {s}
              </button>
            ))}
          </div>
          <div className="mt-3 text-xs text-white/50">
            Use <b>ESCALATED</b> for cluster activity; document in notes for audit.
          </div>
        </div>

        {/* Notes */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Analyst Notes</div>
          <div className="text-xs text-white/50 mt-1">
            Store investigation rationale for compliance + audit.
          </div>

          {noteLoading && <div className="mt-3 text-xs text-white/60">Loading note...</div>}
          {noteErr && <div className="mt-3 text-xs text-rose-200">{noteErr}</div>}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={7}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
            placeholder="Write investigation notes..."
          />

          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => {
                try {
                  await notesApi.create({
                    tx_id: tx.tx_id, // save for current opened tx (base or neighbor)
                    content: note,
                  });
                  alert("Note saved ✅");
                } catch (e) {
                  alert(e?.message || "Failed to save note");
                }
              }}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold hover:bg-sky-600 transition"
            >
              Save Note
            </button>

            <button
              onClick={() => {
                setNote("");
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
            >
              Clear
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
