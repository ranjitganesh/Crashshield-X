import React from "react";
import { PathAnalysisResult, InstabilityState, RiskLevel } from "../types";
import { Shield, AlertTriangle, CheckCircle2, TrendingUp, Cpu, HeartPulse, Clock, Sparkles, FileText, ArrowRight } from "lucide-react";

interface PathAnalyzerProps {
  analysis?: PathAnalysisResult | null;
  processName?: string;
  pid?: number | null;
}

export const PathAnalyzer: React.FC<PathAnalyzerProps> = ({ analysis, processName, pid }) => {
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-900/90 rounded-xl border border-slate-800">
        <TrendingUp className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <h3 className="text-lg font-semibold text-slate-300">No Process Analysis Loaded</h3>
        <p className="text-sm text-slate-500 max-w-md mt-1">
          Select a process to view its real-time Instability Path Analysis, Health Index, and Diagnostic Root-Cause breakdown.
        </p>
      </div>
    );
  }

  const {
    state,
    risk_level,
    health_index,
    instability_score,
    matched_pattern,
    path_sequence,
    persistence_count,
    anomaly_duration_sec,
    diagnostic_summary,
    recommended_action,
  } = analysis;

  const getStateColor = (s: InstabilityState) => {
    switch (s) {
      case "Confirmed":
        return { text: "text-rose-400", bg: "bg-rose-950/80", border: "border-rose-600" };
      case "Developing":
        return { text: "text-orange-400", bg: "bg-orange-950/80", border: "border-orange-600" };
      case "Suspicious":
        return { text: "text-amber-400", bg: "bg-amber-950/80", border: "border-amber-600" };
      case "Recovered":
        return { text: "text-cyan-400", bg: "bg-cyan-950/80", border: "border-cyan-600" };
      default:
        return { text: "text-emerald-400", bg: "bg-emerald-950/80", border: "border-emerald-600" };
    }
  };

  const stateColors = getStateColor(state);

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Section Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">
            7.5 / 7.6 Instability Path Analyzer & Health State
          </h2>
        </div>
        <span className="px-2.5 py-0.5 text-xs rounded bg-slate-800 text-cyan-300 font-mono border border-slate-700">
          PID {pid}: {processName}
        </span>
      </div>

      <div className="p-5 flex-1 overflow-auto space-y-5">
        {/* Top Cards: State, Health Index, Risk Level, Instability Score */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* State Card */}
          <div className={`p-4 rounded-xl border ${stateColors.bg} ${stateColors.border} flex flex-col justify-between`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-400">Process State</span>
              {state === "Confirmed" ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
              ) : state === "Normal" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div className="mt-2">
              <span className={`text-2xl font-black ${stateColors.text}`}>{state}</span>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{matched_pattern}</p>
            </div>
          </div>

          {/* Health Index Card */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-400">Health Index</span>
              <HeartPulse className={`w-5 h-5 ${health_index > 70 ? "text-emerald-400" : health_index > 40 ? "text-amber-400" : "text-rose-500"}`} />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{health_index.toFixed(1)}</span>
                <span className="text-xs text-slate-400 font-semibold">/ 100</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    health_index > 70 ? "bg-emerald-400" : health_index > 40 ? "bg-amber-400" : "bg-rose-500"
                  }`}
                  style={{ width: `${health_index}%` }}
                />
              </div>
            </div>
          </div>

          {/* Risk Level Card */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-400">Risk Assessment</span>
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="mt-2">
              <span
                className={`inline-block px-2.5 py-0.5 rounded text-sm font-black uppercase ${
                  risk_level === "CRITICAL"
                    ? "bg-rose-600 text-white animate-pulse"
                    : risk_level === "HIGH"
                    ? "bg-orange-500 text-white"
                    : risk_level === "MODERATE"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                }`}
              >
                {risk_level}
              </span>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Score: {instability_score.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Anomaly Persistence Card */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-400">Persistence Cycles</span>
              <Clock className="w-5 h-5 text-slate-400" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-cyan-300">{persistence_count}</span>
                <span className="text-xs text-slate-400">iterations</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Duration: {anomaly_duration_sec.toFixed(1)}s
              </p>
            </div>
          </div>
        </div>

        {/* Transition Sequence Path Box */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80">
          <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Temporal Transition Event Sequence ({path_sequence.length} Events)
          </h4>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {path_sequence.length === 0 ? (
              <span className="text-slate-500 font-sans italic">Nominal baseline state active. No anomalous event transitions recorded.</span>
            ) : (
              path_sequence.map((ev, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                  <span
                    className={`px-2.5 py-1 rounded-md border font-semibold ${
                      ev.includes("PERSISTENCE")
                        ? "bg-rose-950 text-rose-300 border-rose-700 animate-pulse"
                        : ev.includes("RECOVERY")
                        ? "bg-cyan-950 text-cyan-300 border-cyan-700"
                        : ev.includes("SPIKE") || ev.includes("BURST")
                        ? "bg-orange-950 text-orange-300 border-orange-700"
                        : "bg-slate-800 text-slate-200 border-slate-700"
                    }`}
                  >
                    {ev}
                  </span>
                </React.Fragment>
              ))
            )}
          </div>
        </div>

        {/* Diagnostics & Preventive Action */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Diagnostic Summary */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>7.9 / 7.10 Diagnostic Root Cause Summary</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              {diagnostic_summary}
            </p>
          </div>

          {/* Recommended Action */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Closed-Loop Preventive Action</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              {recommended_action}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
