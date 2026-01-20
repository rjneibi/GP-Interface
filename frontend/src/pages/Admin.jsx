import { useEffect, useMemo, useState } from "react";
import {
  getUsers,
  getSettings,
  getAuditLogs,
  createUser,
  toggleUserStatus,
  updateThresholds,
  resetAdminDemo,
  initAdminStore,
} from "../services/adminStore";

function safeSnap() {
  // Always return safe defaults so UI NEVER crashes
  const settings = getSettings?.() || {};
  const users = Array.isArray(getUsers?.()) ? getUsers() : [];
  const logs = Array.isArray(getAuditLogs?.()) ? getAuditLogs() : [];

  return {
    settings: {
      orangeThreshold: Number.isFinite(Number(settings.orangeThreshold))
        ? Number(settings.orangeThreshold)
        : 40,
      redThreshold: Number.isFinite(Number(settings.redThreshold))
        ? Number(settings.redThreshold)
        : 70,
      autoBlockRed: typeof settings.autoBlockRed === "boolean" ? settings.autoBlockRed : false,
    },
    users,
    logs,
  };
}

export default function Admin() {
  const [snap, setSnap] = useState(() => safeSnap());

  // create user form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("analyst");

  // editable inputs (safe default)
  const [orangeTh, setOrangeTh] = useState(() => safeSnap().settings.orangeThreshold);
  const [redTh, setRedTh] = useState(() => safeSnap().settings.redThreshold);
  const [autoBlock, setAutoBlock] = useState(() => safeSnap().settings.autoBlockRed);

  // search
  const [q, setQ] = useState("");

  const pullLatest = () => setSnap(safeSnap());

  // ✅ IMPORTANT: init inside effect (NOT at module scope)
  useEffect(() => {
    try {
      initAdminStore?.();
    } catch (e) {
      console.error("initAdminStore failed:", e);
    }
    pullLatest();

    const t = setInterval(() => {
      try {
        initAdminStore?.(); // safe re-init
      } catch (e) {
        console.error("initAdminStore interval failed:", e);
      }
      setSnap(safeSnap());
    }, 800);

    return () => clearInterval(t);
  }, []);

  const { users, settings, logs } = snap;

  const filteredUsers = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return users;

    return users.filter((u) => {
      const email = String(u.email || "").toLowerCase();
      const role = String(u.role || "").toLowerCase();
      const status = String(u.status || "").toLowerCase();
      const id = String(u.id || "").toLowerCase(); // ✅ no crash if id is number

      return (
        email.includes(query) ||
        role.includes(query) ||
        status.includes(query) ||
        id.includes(query)
      );
    });
  }, [users, q]);

  const onCreateUser = () => {
    try {
      if (!email.trim()) throw new Error("Email is required");
      createUser({ email: email.trim(), role });
      setEmail("");
      pullLatest();
    } catch (e) {
      alert(e?.message || "Create user failed");
    }
  };

  const onToggleUser = (id) => {
    try {
      toggleUserStatus(id);
      pullLatest();
    } catch (e) {
      alert(e?.message || "Toggle failed");
    }
  };

  const onSaveThresholds = () => {
    try {
      const o = Number(orangeTh);
      const r = Number(redTh);

      if (!Number.isFinite(o) || o <= 0 || o >= 100) throw new Error("Orange threshold must be 1..99");
      if (!Number.isFinite(r) || r <= 0 || r > 100) throw new Error("Red threshold must be 1..100");
      if (o >= r) throw new Error("Orange must be < Red");

      updateThresholds({
        orangeThreshold: o,
        redThreshold: r,
        autoBlockRed: Boolean(autoBlock),
      });

      pullLatest();
      alert("Thresholds updated ✅");
    } catch (e) {
      alert(e?.message || "Save failed");
    }
  };

  const onResetDemo = () => {
    if (!confirm("Reset admin demo data?")) return;

    try {
      resetAdminDemo();
      initAdminStore?.();

      const next = safeSnap();
      setSnap(next);

      setOrangeTh(next.settings.orangeThreshold);
      setRedTh(next.settings.redThreshold);
      setAutoBlock(next.settings.autoBlockRed);
    } catch (e) {
      alert(e?.message || "Reset failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Admin Console</h1>
          <p className="text-white/60 mt-1">
            User management + risk thresholds + audit logs (mock, API-ready).
          </p>
        </div>

        <button
          onClick={onResetDemo}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
        >
          Reset Demo Data
        </button>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Risk Thresholds" subtitle="Controls GREEN / ORANGE / RED labels">
          <div className="space-y-3">
            <Field label="Orange threshold">
              <input
                value={orangeTh}
                onChange={(e) => setOrangeTh(e.target.value)}
                type="number"
                min={1}
                max={99}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
              />
            </Field>

            <Field label="Red threshold">
              <input
                value={redTh}
                onChange={(e) => setRedTh(e.target.value)}
                type="number"
                min={1}
                max={100}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
              />
            </Field>

            <label className="flex items-center gap-3 text-sm text-white/70">
              <input
                checked={autoBlock}
                onChange={(e) => setAutoBlock(e.target.checked)}
                type="checkbox"
                className="h-4 w-4 accent-sky-500"
              />
              Auto-block RED transactions (policy)
            </label>

            <button
              onClick={onSaveThresholds}
              className="w-full rounded-2xl bg-sky-500 py-3 text-sm font-semibold hover:bg-sky-600 transition"
            >
              Save Thresholds
            </button>

            <div className="text-xs text-white/45">
              Stored: ORANGE ≥ <b>{settings.orangeThreshold}</b> • RED ≥ <b>{settings.redThreshold}</b>
            </div>
          </div>
        </Card>

        <Card title="Create User" subtitle="Adds a new user (mock DB via localStorage)">
          <div className="space-y-3">
            <Field label="Email">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
                placeholder="new.user@bank.com"
              />
            </Field>

            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none"
              >
                <option value="analyst">Analyst</option>
                <option value="admin">Admin</option>
                <option value="superadmin">SuperAdmin</option>
              </select>
            </Field>

            <button
              onClick={onCreateUser}
              className="w-full rounded-2xl bg-emerald-500 py-3 text-sm font-semibold hover:bg-emerald-600 transition"
            >
              Create User
            </button>

            <div className="text-xs text-white/45">(Later: POST /admin/users → DB)</div>
          </div>
        </Card>

        <Card title="Audit Logs" subtitle="System actions (important for fraud systems)">
          <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
            {logs.length === 0 ? (
              <div className="text-sm text-white/60">No audit logs yet.</div>
            ) : (
              [...logs]
                .slice(0, 40)
                .map((l) => (
                  <div key={l.id || `${l.action}-${l.created_at || l.time || Math.random()}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-white/50">
                      {l.time || l.created_at || "—"}
                    </div>
                    <div className="text-sm font-semibold mt-1">{l.action || "—"}</div>
                    <div className="text-xs text-white/60 mt-1">
                      {JSON.stringify(l.meta || {})}
                    </div>
                  </div>
                ))
            )}
          </div>
        </Card>
      </div>

      {/* Users table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Users</div>
            <div className="text-xs text-white/50">Toggle active/disabled (mock policy)</div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full md:w-72 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
            placeholder="Search users..."
          />
        </div>

        <div className="grid grid-cols-5 gap-2 px-4 py-3 text-xs text-white/50 border-b border-white/10">
          <div>ID</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {filteredUsers.map((u) => (
          <div
            key={u.id || u.email}
            className="grid grid-cols-5 gap-2 px-4 py-3 text-sm border-b border-white/5 last:border-b-0"
          >
            <div className="text-white/80">{String(u.id ?? "—")}</div>
            <div className="text-white/70">{String(u.email ?? "—")}</div>
            <div className="text-white/70 uppercase">{String(u.role ?? "—")}</div>
            <div className="text-white/70">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                  u.status === "active"
                    ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
                    : "bg-white/5 text-white/60 border-white/10"
                }`}
              >
                {String(u.status ?? "—")}
              </span>
            </div>
            <div>
              <button
                onClick={() => onToggleUser(u.id)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
              >
                {u.status === "active" ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        ))}
      </div>
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

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-white/60">{label}</div>
      {children}
    </div>
  );
}
