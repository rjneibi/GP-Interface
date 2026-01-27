import { useEffect, useMemo, useState } from "react";
import { caseApi } from "../services/caseApi";
import { getCurrentUser } from "../auth/session";

const pill = {
  ok: "bg-emerald-500/15 text-emerald-200 border-emerald-500/20",
  warn: "bg-amber-500/15 text-amber-200 border-amber-500/20",
  danger: "bg-rose-500/15 text-rose-200 border-rose-500/20",
  info: "bg-sky-500/15 text-sky-200 border-sky-500/20",
};

const toMins = (ms) => Math.max(0, Math.floor(ms / 60000));

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

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-xs text-white/40 mt-1">{hint}</div> : null}
    </div>
  );
}

export default function AnalystPerformance() {
  const user = getCurrentUser();
  const myKey = user?.email || ""; // robust: assigned_to may be email or id string

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setErr("");
        const data = await caseApi.list();
        if (!alive) return;
        setCases(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load performance data");
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
    const now = Date.now();
    const open = cases.filter((c) => c.status !== "CLOSED");
    const closed = cases.filter((c) => c.status === "CLOSED");
    const esc = cases.filter((c) => c.status === "ESCALATED");

    const dueSoon = open.filter((c) => toMins(new Date(c.sla_due_at).getTime() - now) <= 30).length;
    const overdue = open.filter((c) => new Date(c.sla_due_at).getTime() < now).length;

    const avgSla =
      open.length === 0
        ? 0
        : Math.round(
            open.reduce((acc, c) => acc + toMins(new Date(c.sla_due_at).getTime() - now), 0) / open.length
          );

    const closureRate = cases.length ? Math.round((closed.length / cases.length) * 100) : 0;
    const escRate = cases.length ? Math.round((esc.length / cases.length) * 100) : 0;

    const my = myKey
      ? cases.filter((c) => String(c.assigned_to || "").toLowerCase() === String(myKey).toLowerCase())
      : [];

    const myOpen = my.filter((c) => c.status !== "CLOSED");
    const myDueSoon = myOpen.filter((c) => toMins(new Date(c.sla_due_at).getTime() - now) <= 30).length;

    const pressureTone = overdue > 0 ? "danger" : dueSoon >= 3 ? "warn" : "ok";

    return {
      open,
      closed,
      esc,
      dueSoon,
      overdue,
      avgSla,
      closureRate,
      escRate,
      my,
      myOpen,
      myDueSoon,
      pressureTone,
    };
  }, [cases, myKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Performance</h1>
          <p className="text-white/60 mt-1">
            Workload pressure, SLA health, escalation patterns, and “my queue” metrics.
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
        title="Queue Health"
        subtitle="Operational view of SLA pressure and throughput."
        right={<Badge tone={view.pressureTone} text={view.overdue ? "Overdue cases" : view.dueSoon ? "Due soon" : "Stable"} />}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Stat label="Open Cases" value={view.open.length} hint="Not CLOSED" />
          <Stat label="Avg SLA Remaining" value={`${view.avgSla} min`} hint="Across open cases" />
          <Stat label="Due Soon" value={view.dueSoon} hint="≤ 30 minutes" />
          <Stat label="Overdue" value={view.overdue} hint="SLA already passed" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <Stat label="Closure Rate" value={`${view.closureRate}%`} hint="Closed / total" />
          <Stat label="Escalation Rate" value={`${view.escRate}%`} hint="Escalated / total" />
          <Stat label="Closed Cases" value={view.closed.length} hint="Total CLOSED" />
        </div>
      </Card>

      <Card
        title="My Queue"
        subtitle="Personal workload metrics (requires cases to have assigned_to)."
        right={<Badge tone="info" text={myKey ? myKey : "No user"} />}
      >
        {!myKey ? (
          <div className="text-sm text-white/60">No logged-in user email detected.</div>
        ) : view.my.length === 0 ? (
          <div className="text-sm text-white/60">
            No cases currently assigned to you. (This is fine if you haven’t enabled auto-assignment yet.)
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Stat label="Assigned to me" value={view.my.length} hint="All statuses" />
            <Stat label="My Open" value={view.myOpen.length} hint="Not CLOSED" />
            <Stat label="My Due Soon" value={view.myDueSoon} hint="≤ 30 minutes" />
          </div>
        )}

        <div className="text-xs text-white/45 mt-3">
          Next upgrade (optional): add action audit logs to compute average handling time + accuracy proxy.
        </div>
      </Card>

      <Card title="Why this is industry-grade" subtitle="This is how teams keep SLAs and quality under control.">
        <ul className="list-disc pl-5 text-sm text-white/70 space-y-2">
          <li><b>SLA management</b> prevents backlog from becoming a financial loss.</li>
          <li><b>Pressure indicators</b> tell ops when to shift staff or tighten policy.</li>
          <li><b>Escalation rate</b> reveals model drift or new fraud waves.</li>
          <li><b>My queue metrics</b> support fair workload distribution and performance review.</li>
        </ul>
      </Card>
    </div>
  );
}
