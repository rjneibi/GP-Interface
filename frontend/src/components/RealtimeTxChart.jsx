import { useMemo, useState } from "react";

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "bg-white/10 border-white/20 text-white"
          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function Bars({ buckets }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="grid grid-cols-10 gap-2 items-end">
      {buckets.map((b) => {
        const h = Math.round((b.count / max) * 100);
        return (
          <div key={b.label} className="flex flex-col items-center gap-1">
            <div className="w-full h-16 rounded-xl border border-white/10 bg-black/30 overflow-hidden flex items-end">
              <div className="w-full bg-white/30" style={{ height: `${h}%` }} title={`${b.label}: ${b.count}`} />
            </div>
            <div className="text-[10px] text-white/45">{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ points, width = 900, height = 180, yLabel = "" }) {
  const pad = 14;

  const { path, minY, maxY, lastY } = useMemo(() => {
    if (!points || points.length < 2) return { path: "", minY: 0, maxY: 0, lastY: 0 };

    const ys = points.map((p) => p.y);
    const minY0 = Math.min(...ys);
    const maxY0 = Math.max(...ys);

    const minY = minY0 === maxY0 ? minY0 - 1 : minY0;
    const maxY = minY0 === maxY0 ? maxY0 + 1 : maxY0;

    const xMin = points[0].x;
    const xMax = points[points.length - 1].x;

    const xScale = (x) => (xMax === xMin ? pad : pad + ((x - xMin) / (xMax - xMin)) * (width - pad * 2));
    const yScale = (y) => pad + (1 - (y - minY) / (maxY - minY)) * (height - pad * 2);

    let d = "";
    points.forEach((p, i) => {
      const X = xScale(p.x);
      const Y = yScale(p.y);
      d += i === 0 ? `M ${X} ${Y}` : ` L ${X} ${Y}`;
    });

    return { path: d, minY: Math.round(minY), maxY: Math.round(maxY), lastY: ys[ys.length - 1] };
  }, [points, width, height]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/55">
          {yLabel} • Range: <span className="text-white/75">{minY}</span> → <span className="text-white/75">{maxY}</span>
        </div>
        <div className="text-xs text-white/55">
          Latest: <span className="text-white/85 font-semibold">{Math.round(lastY)}</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px] mt-2" role="img" aria-label="Live transactions chart">
        <g opacity="0.2">
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1="0" y1={(height / 5) * i} x2={width} y2={(height / 5) * i} stroke="white" strokeWidth="1" />
          ))}
        </g>
        <path d={path} fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="2.25" />
      </svg>
    </div>
  );
}

export default function RealtimeTxChart({ txs = [] }) {
  const [metric, setMetric] = useState("risk"); // "risk" | "amount"

  const recent = useMemo(() => {
    const arr = Array.isArray(txs) ? txs.slice() : [];
    arr.sort((a, b) => new Date(a.ts || 0) - new Date(b.ts || 0));
    return arr.slice(-140);
  }, [txs]);

  const series = useMemo(() => {
    const now = Date.now();
    return recent
      .map((t) => {
        const x = new Date(t.ts || now).getTime();
        const risk = Number(t.risk ?? t.risk_score ?? 0);
        const amount = Number(t.amount || 0);
        const y = metric === "risk" ? risk : amount;
        return { x, y };
      })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  }, [recent, metric]);

  const kpi = useMemo(() => {
    const last = recent[recent.length - 1];
    if (!last) return { lastRisk: 0, lastAmt: 0, lastId: "—" };
    return {
      lastRisk: Number(last.risk ?? last.risk_score ?? 0),
      lastAmt: Number(last.amount || 0),
      lastId: last.tx_id || "—",
    };
  }, [recent]);

  const buckets = useMemo(() => {
    const now = Date.now();
    const out = [];
    for (let i = 9; i >= 0; i--) {
      const start = now - (i + 1) * 60 * 1000;
      const end = now - i * 60 * 1000;
      const count = recent.filter((t) => {
        const ts = new Date(t.ts || 0).getTime();
        return ts >= start && ts < end;
      }).length;
      out.push({ label: `${i}m`, count });
    }
    return out;
  }, [recent]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Real-time Transactions Graph</div>
          <div className="text-xs text-white/50 mt-1">Live trend + throughput while stream is running.</div>
        </div>

        <div className="flex items-center gap-2">
          <Pill active={metric === "risk"} onClick={() => setMetric("risk")}>
            Risk %
          </Pill>
          <Pill active={metric === "amount"} onClick={() => setMetric("amount")}>
            Amount AED
          </Pill>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="text-xs text-white/50">Latest TX</div>
          <div className="text-lg font-semibold mt-1">{kpi.lastId}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="text-xs text-white/50">Latest Risk</div>
          <div className="text-lg font-semibold mt-1">{Math.round(kpi.lastRisk)}%</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="text-xs text-white/50">Latest Amount</div>
          <div className="text-lg font-semibold mt-1">{fmtMoney(kpi.lastAmt)} AED</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-white/55 mb-2">{metric === "risk" ? "Risk Trend" : "Amount Trend"}</div>
          <LineChart points={series} yLabel={metric === "risk" ? "Risk %" : "Amount AED"} />
          <div className="text-[11px] text-white/45 mt-2">
            Demo uses your local stream/polling. Production: WebSocket/Kafka.
          </div>
        </div>

        <div>
          <div className="text-xs text-white/55 mb-2">Throughput (transactions per minute)</div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
            <Bars buckets={buckets} />
          </div>
          <div className="text-[11px] text-white/45 mt-2">
            Useful for spotting burst attacks / fraud waves.
          </div>
        </div>
      </div>
    </div>
  );
}
