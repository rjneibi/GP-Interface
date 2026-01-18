export default function Reports() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Model Reports</h1>
        <p className="text-white/60 mt-1">
          Next: show accuracy, precision, recall, F1, ROC-AUC + export PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { k: "Accuracy", v: "—" },
          { k: "F1 Score", v: "—" },
          { k: "ROC-AUC", v: "—" },
        ].map((m) => (
          <div key={m.k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">{m.k}</div>
            <div className="text-3xl font-semibold mt-2">{m.v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/60">Report Export</div>
        <button className="mt-3 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm">
          Export PDF (coming next)
        </button>
      </div>
    </div>
  );
}
