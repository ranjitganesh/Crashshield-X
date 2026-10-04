import React from "react";
import { AdaptiveMonitoringStatus } from "../types";
import { Sliders, RefreshCw, Radio, CheckCircle, AlertOctagon, Zap, ArrowRight, Activity } from "lucide-react";

interface AdaptiveControllerProps {
  adaptive?: AdaptiveMonitoringStatus | null;
  processName?: string;
  pid?: number | null;
}

export const AdaptiveController: React.FC<AdaptiveControllerProps> = ({ adaptive, processName, pid }) => {
  if (!adaptive) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-900/90 rounded-xl border border-slate-800">
        <Sliders className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <h3 className="text-lg font-semibold text-slate-300">Adaptive Controller Idle</h3>
        <p className="text-sm text-slate-500 max-w-md mt-1">
          Select a process to view its active Closed-Loop Adaptive Monitoring rate and Re-observation verification state.
        </p>
      </div>
    );
  }

  const {
    base_interval_sec,
    current_interval_sec,
    accelerated_interval_sec,
    burst_interval_sec,
    sampling_mode,
    reobservation_window,
    reobservation_count,
    confirmation_status,
    trigger_reason,
  } = adaptive;

  const frequencyHz = (1 / current_interval_sec).toFixed(2);

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">
            7.7 / 7.8 Adaptive Monitoring & Closed-Loop Controller
          </h2>
        </div>
        <span className="px-2.5 py-0.5 text-xs rounded bg-slate-800 text-cyan-300 font-mono border border-slate-700">
          PID {pid}: {processName}
        </span>
      </div>

      <div className="p-5 flex-1 overflow-auto space-y-5">
        {/* Closed-Loop Rate State Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Sampling Mode */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-400">Sampling Rate Mode</span>
              <Radio className={`w-5 h-5 ${sampling_mode === "BURST" ? "text-purple-400 animate-pulse" : sampling_mode === "ACCELERATED" ? "text-amber-400" : "text-emerald-400"}`} />
            </div>
            <div className="mt-3">
              <span
                className={`text-2xl font-black ${
                  sampling_mode === "BURST"
                    ? "text-purple-400"
                    : sampling_mode === "ACCELERATED"
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {sampling_mode}
              </span>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Interval: <span className="text-white font-bold">{current_interval_sec.toFixed(2)}s</span> ({frequencyHz} Hz)
              </p>
            </div>
          </div>

          {/* Re-observation Progress */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-400">Re-observation Verification</span>
              <RefreshCw className={`w-5 h-5 text-cyan-400 ${reobservation_count > 0 ? "animate-spin" : ""}`} />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span className="text-slate-400 font-sans">Cycles Sampled</span>
                <span className="font-mono font-bold text-cyan-300">
                  {reobservation_count} / {reobservation_window}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (reobservation_count / reobservation_window) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-mono">
                Confirmation Window: {reobservation_window} observations
              </p>
            </div>
          </div>

          {/* Decision Outcome */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-400">Confirmation / Rejection</span>
              {confirmation_status === "CONFIRMED" ? (
                <AlertOctagon className="w-5 h-5 text-rose-500 animate-bounce" />
              ) : confirmation_status === "REJECTED_TRANSIENT" ? (
                <CheckCircle className="w-5 h-5 text-cyan-400" />
              ) : (
                <Activity className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div className="mt-3">
              <span
                className={`inline-block px-2.5 py-1 rounded text-xs font-bold font-mono uppercase ${
                  confirmation_status === "CONFIRMED"
                    ? "bg-rose-900/60 text-rose-300 border border-rose-600"
                    : confirmation_status === "REJECTED_TRANSIENT"
                    ? "bg-cyan-900/60 text-cyan-300 border border-cyan-600"
                    : confirmation_status === "VERIFYING"
                    ? "bg-amber-900/60 text-amber-300 border border-amber-600 animate-pulse"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                }`}
              >
                {confirmation_status}
              </span>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                {confirmation_status === "CONFIRMED"
                  ? "Instability verified across re-observation cycles."
                  : confirmation_status === "REJECTED_TRANSIENT"
                  ? "Transient spike rejected; baseline recovered."
                  : confirmation_status === "VERIFYING"
                  ? "Active high-frequency verification in progress."
                  : "Continuous baseline monitoring."}
              </p>
            </div>
          </div>
        </div>

        {/* Closed-Loop Adaptive State Machine Graphic */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/90">
          <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-cyan-400" />
            Closed-Loop Rate Transition Architecture (Section 7.7 / 7.8)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Step 1 */}
            <div
              className={`p-3 rounded-lg border transition-all ${
                sampling_mode === "STANDARD"
                  ? "bg-emerald-950/60 border-emerald-500 shadow-md"
                  : "bg-slate-900/40 border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-emerald-400 mb-1">
                <span>1. Standard Nominal Mode</span>
                <span className="font-mono text-[11px]">3.0s (0.33 Hz)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Low-overhead background baseline sampling. Activated during healthy operation.
              </p>
            </div>

            {/* Step 2 */}
            <div
              className={`p-3 rounded-lg border transition-all ${
                sampling_mode === "ACCELERATED"
                  ? "bg-amber-950/60 border-amber-500 shadow-md"
                  : "bg-slate-900/40 border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-amber-400 mb-1">
                <span>2. Accelerated Re-observation</span>
                <span className="font-mono text-[11px]">1.0s (1.0 Hz)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Triggered upon single-vector suspicious deviation. Samples 3x faster to confirm pattern.
              </p>
            </div>

            {/* Step 3 */}
            <div
              className={`p-3 rounded-lg border transition-all ${
                sampling_mode === "BURST"
                  ? "bg-purple-950/60 border-purple-500 shadow-md"
                  : "bg-slate-900/40 border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-purple-400 mb-1">
                <span>3. High-Frequency Burst</span>
                <span className="font-mono text-[11px]">0.25s (4.0 Hz)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Engaged upon Developing or Confirmed runaway. High-fidelity forensic telemetry collection.
              </p>
            </div>
          </div>

          {/* Trigger Reason */}
          <div className="mt-4 p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-xs font-mono flex items-center gap-2">
            <span className="text-slate-500 font-sans font-semibold">Active Controller Trigger:</span>
            <span className="text-cyan-300">{trigger_reason}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
