import React, { useState } from "react";
import { ProcessSummaryItem, InstabilityState, RiskLevel } from "../types";
import { Activity, AlertTriangle, ShieldCheck, Zap, Search, RefreshCw, Cpu, Layers, HardDrive } from "lucide-react";

interface ProcessTableProps {
  processes: ProcessSummaryItem[];
  selectedPid: number | null;
  onSelectPid: (pid: number) => void;
  onOpenInjector: (pid: number, name: string) => void;
  onResetProcess: (pid: number) => void;
}

export const ProcessTable: React.FC<ProcessTableProps> = ({
  processes,
  selectedPid,
  onSelectPid,
  onOpenInjector,
  onResetProcess,
}) => {
  const [filterState, setFilterState] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filtered = processes.filter((item) => {
    const analysis = item.analysis || item.state;
    const s = analysis?.state || "Normal";
    if (filterState !== "ALL" && s !== filterState) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.snapshot.name.toLowerCase().includes(q) ||
        item.snapshot.pid.toString().includes(q)
      );
    }
    return true;
  });

  const getStateBadgeClass = (state?: InstabilityState) => {
    switch (state) {
      case "Confirmed":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40";
      case "Developing":
        return "bg-orange-500/20 text-orange-400 border-orange-500/40";
      case "Suspicious":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "Recovered":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
      default:
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    }
  };

  const getRiskBadgeClass = (risk?: RiskLevel) => {
    switch (risk) {
      case "CRITICAL":
        return "bg-rose-600 text-white font-bold animate-pulse";
      case "HIGH":
        return "bg-orange-500 text-white font-semibold";
      case "MODERATE":
        return "bg-amber-500 text-slate-950 font-semibold";
      default:
        return "bg-emerald-500/30 text-emerald-300";
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header controls */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">
            7.1 / 7.11 Running Processes Monitor
          </h2>
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
            {filtered.length} Active
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by PID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-48 lg:w-64"
            />
          </div>

          {/* State Filter Buttons */}
          <div className="flex bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-xs font-medium">
            {["ALL", "Normal", "Suspicious", "Developing", "Confirmed", "Recovered"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterState(st)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filterState === st
                    ? "bg-cyan-600 text-white font-semibold shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Process Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-950/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 z-10">
            <tr>
              <th className="py-3 px-4">PID</th>
              <th className="py-3 px-4">Process Name</th>
              <th className="py-3 px-4">CPU %</th>
              <th className="py-3 px-4">Memory (RSS)</th>
              <th className="py-3 px-4">Threads</th>
              <th className="py-3 px-4">State</th>
              <th className="py-3 px-4">Risk Level</th>
              <th className="py-3 px-4">Health Index</th>
              <th className="py-3 px-4">Adaptive Rate</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                  <Activity className="w-8 h-8 text-cyan-500 mx-auto mb-2 animate-pulse" />
                  <p className="font-semibold text-slate-300">Loading Process Snapshots...</p>
                  <p className="text-xs text-slate-500 mt-1">Collecting live host metrics and scenario models.</p>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedPid === item.snapshot.pid;
                const analysis = item.analysis || item.state;
                const state = analysis?.state || "Normal";
                const risk = analysis?.risk_level || "LOW";
                const health = analysis?.health_index ?? 100;
                const mode = item.adaptive?.sampling_mode || "STANDARD";
                const interval = item.adaptive?.current_interval_sec ?? 3.0;

                return (
                  <tr
                    key={item.snapshot.pid}
                    onClick={() => onSelectPid(item.snapshot.pid)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? "bg-cyan-950/40 border-l-4 border-l-cyan-400 text-white"
                        : "hover:bg-slate-800/50 text-slate-300"
                    }`}
                  >
                    <td className="py-2.5 px-4 font-semibold text-cyan-400">
                      {item.snapshot.pid}
                      {item.snapshot.is_simulated && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-purple-900/60 text-purple-300 border border-purple-700">
                          SIM
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                      {item.snapshot.name}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.snapshot.cpu_percent > 70
                                ? "bg-rose-500"
                                : item.snapshot.cpu_percent > 30
                                ? "bg-amber-400"
                                : "bg-cyan-400"
                            }`}
                            style={{ width: `${Math.min(100, item.snapshot.cpu_percent)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right">{item.snapshot.cpu_percent.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span>{item.snapshot.memory_rss_mb.toFixed(1)} MB</span>
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.snapshot.thread_count}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold border ${getStateBadgeClass(
                          state
                        )}`}
                      >
                        {state === "Confirmed" && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                        {state === "Normal" && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                        {state}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${getRiskBadgeClass(risk)}`}>
                        {risk}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                          <div
                            className={`h-full transition-all duration-300 ${
                              health > 70 ? "bg-emerald-400" : health > 40 ? "bg-amber-400" : "bg-rose-500"
                            }`}
                            style={{ width: `${health}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold">{health.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium border ${
                          mode === "BURST"
                            ? "bg-purple-950/80 text-purple-300 border-purple-500 animate-pulse"
                            : mode === "ACCELERATED"
                            ? "bg-amber-950/80 text-amber-300 border-amber-500"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {interval.toFixed(2)}s ({mode})
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInjector(item.snapshot.pid, item.snapshot.name);
                          }}
                          title="Inject Stress / Anomaly Workload"
                          className="px-2 py-1 bg-cyan-900/40 hover:bg-cyan-800/80 text-cyan-300 rounded text-[11px] font-sans transition border border-cyan-700/50 flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3 text-cyan-400" />
                          Stress
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onResetProcess(item.snapshot.pid);
                          }}
                          title="Reset Graph & Baseline"
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
