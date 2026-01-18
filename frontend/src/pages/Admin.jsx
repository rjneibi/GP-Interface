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

// ✅ init once
initAdminStore();

function readSnap() {
  const s = getSettings();
  return {
    users: getUsers(),
    settings: s,
    logs: getAuditLogs(),
  };
}

export default function Admin() {
  const [snap, setSnap] = useState(() => readSnap());

  // create user form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("analyst");

  // editable inputs
  const [orangeTh, setOrangeTh] = useState(() => readSnap().settings.orangeThreshold);
  const [redTh, setRedTh] = useState(() => readSnap().settings.redThreshold);
  const [autoBlock, setAutoBlock] = useState(() => readSnap().settings.autoBlockRed);

  // search
  const [q, setQ] = useState("");

  const { users, settings, logs } = snap;

  const pullLatest = () => setSnap(readSnap());

  // ✅ Live refresh: so Admin sees TX actions/notes immediately
  useEffect(() => {
    const t = setInterval(() => {
      // (kept for safety in case someone clears storage)
      initAdminStore();
      setSnap(readSnap());
    }, 700);

    return () => clearInterval(t);
  }, []);

  const filteredUsers = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query) ||
        u.status.toLowerCase().includes(query) ||
        u.id.toLowerCase().includes(query)
    );
  }, [users, q]);

  const onCreateUser = () => {
    try {
      createUser({ email, role });
      setEmail("");
      pullLatest();
    } catch (e) {
      alert(e.message);
    }
  };

  const onToggleUser = (id) => {
    toggleUserStatus(id);
    pullLatest();
  };

  const onSaveThresholds = () => {
    try {
      updateThresholds({
        orangeThreshold: Number(orangeTh),
        redThreshold: Number(redTh),
        autoBlockRed: Boolean(autoBlock),
      });
      pullLatest();
      alert("Thresholds updated ✅");
    } catch (e) {
      alert(e.message);
    }
  };

  const onResetDemo = () => {
    if (!confirm("Reset admin demo data?")) return;
    resetAdminDemo();
    initAdminStore();

    const next = readSnap();
    setSnap(next);

    setOrangeTh(next.settings.orangeThreshold);
    setRedTh(next.settings.redThreshold);
    setAutoBlock(next.settings.autoBlockRed);
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
              Stored: ORANGE ≥ <b>{settings?.orangeThreshold ?? "—"}</b> • RED ≥{" "}
              <b>{settings?.redThreshold ?? "—"}</b>
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

        <Card title="Audit Logs" subtitle="System actions (very important for fraud systems)">
          <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
            {logs.length === 0 ? (
              <div className="text-sm text-white/60">No audit logs yet.</div>
            ) : (
              logs
                .slice()
                .reverse()
                .slice(0, 30)
                .map((l) => (
                  <div key={l.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-white/50">{l.time}</div>
                    <div className="text-sm font-semibold mt-1">{l.action}</div>
                    <div className="text-xs text-white/60 mt-1">
                      {JSON.stringify(l.meta)}
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
            key={u.id}
            className="grid grid-cols-5 gap-2 px-4 py-3 text-sm border-b border-white/5 last:border-b-0"
          >
            <div className="text-white/80">{u.id}</div>
            <div className="text-white/70">{u.email}</div>
            <div className="text-white/70 uppercase">{u.role}</div>
            <div className="text-white/70">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                  u.status === "active"
                    ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
                    : "bg-white/5 text-white/60 border-white/10"
                }`}
              >
                {u.status}
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
