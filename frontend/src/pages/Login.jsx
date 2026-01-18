import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setSession } from "../auth/session";
import { login as apiLogin } from "../services/api";


export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("analyst@bank.com");
  const [password, setPassword] = useState("password");

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0,
    [email, password]
  );

 const onSubmit = async (e) => {
  e.preventDefault();
  if (!canSubmit) return;

  try {
    const res = await apiLogin(email, password); // { token, role, user }
    setSession(res);

    if (res.role === "superadmin") nav("/superadmin");
    else if (res.role === "admin") nav("/admin");
    else nav("/dashboard");
  } catch (err) {
    alert(err.message || "Login failed");
  }
};


  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Premium background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(80rem_80rem_at_50%_-10%,rgba(56,189,248,0.16),transparent_60%),radial-gradient(70rem_70rem_at_0%_70%,rgba(99,102,241,0.14),transparent_55%),radial-gradient(60rem_60rem_at_100%_60%,rgba(16,185,129,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/55" />
        <div className="absolute inset-0 [background:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.15]" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 grid place-items-center">
            <span className="text-sm font-semibold text-white/80">SF</span>
          </div>
          <div>
            <div className="text-sm font-semibold">Secure Fraud Console</div>
            <div className="text-xs text-white/50">
              GP2 • Hybrid Model + Web System
            </div>
          </div>
        </div>

        {/* no 3D button */}
        <div className="text-xs text-white/45 hidden sm:block">
          Internal demo • API-ready
        </div>
      </div>

      {/* Main */}
      <div className="relative z-10 flex min-h-[calc(100vh-84px)] items-center justify-center px-6 pb-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left section */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live risk scoring • Role-based access • Reports
            </div>

            <h1 className="mt-5 text-5xl font-semibold leading-tight">
              Detect fraud in real time,
              <span className="text-white/70"> explain decisions</span>,
              <br />
              and generate reports.
            </h1>

            <p className="mt-4 text-white/60 max-w-lg">
              Your hybrid ML model runs behind an API. The UI visualizes
              transactions as green / amber / red risk levels for analysts,
              admins, and superadmins.
            </p>

            <div className="mt-6 flex gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-white/50">Status</div>
                <div className="mt-1 font-semibold">System Online</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-white/50">Mode</div>
                <div className="mt-1 font-semibold">Demo + API-ready</div>
              </div>
            </div>
          </div>

          {/* Right login card */}
          <div className="w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.45)] p-7">
              <h2 className="text-2xl font-semibold">Sign in</h2>
              <p className="mt-1 text-sm text-white/60">
                Access dashboards, transactions, and model reports.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-white/60">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-white/60">Password</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-2xl bg-sky-500 py-3 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50 disabled:hover:bg-sky-500 transition"
                >
                  Sign in
                </button>

                <div className="text-xs text-white/45">
                  Demo routing: email containing <b>admin</b> or <b>super</b>.
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
