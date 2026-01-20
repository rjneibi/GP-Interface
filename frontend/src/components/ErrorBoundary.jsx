import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Useful for debugging in console
    console.error("UI Crash:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
            <div className="text-lg font-semibold">Something crashed</div>
            <div className="text-sm text-white/70 mt-2">
              Open the browser console to see the error. This page prevents the full app from going blank.
            </div>
            <pre className="mt-4 text-xs text-rose-100/90 whitespace-pre-wrap">
              {String(this.state.error || "Unknown error")}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
