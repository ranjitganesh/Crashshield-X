import React from "react";
import { ResourceSnapshot } from "../types";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { LineChart as ChartIcon, Cpu, HardDrive, Layers } from "lucide-react";

interface TelemetryChartsProps {
  history: ResourceSnapshot[];
  processName?: string;
  pid?: number | null;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ history, processName, pid }) => {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-900/90 rounded-xl border border-slate-800">
        <ChartIcon className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <h3 className="text-lg font-semibold text-slate-300">No Telemetry Stream</h3>
        <p className="text-sm text-slate-500 max-w-md mt-1">
          Select a process to visualize its live CPU, memory, and thread performance telemetry graphs over time.
        </p>
      </div>
    );
  }

  // Format chart data points with relative time string
  const data = history.map((s, idx) => {
    const timeStr = new Date(s.timestamp * 1000).toLocaleTimeString();
    return {
      time: timeStr,
      cpu: s.cpu_percent,
      memory: s.memory_rss_mb,
      threads: s.thread_count,
    };
  });

  const latest = history[history.length - 1];

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <ChartIcon className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">
            7.12 Real-Time Resource Telemetry & Performance Analysis
          </h2>
        </div>
        <span className="px-2.5 py-0.5 text-xs rounded bg-slate-800 text-cyan-300 font-mono border border-slate-700">
          PID {pid}: {processName} ({history.length} data points)
        </span>
      </div>

      <div className="p-5 flex-1 overflow-auto space-y-6">
        {/* 1. CPU Usage Chart */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                CPU Utilization (%)
              </span>
            </div>
            <span className="font-mono text-sm font-black text-cyan-300">
              {latest.cpu_percent.toFixed(1)}%
            </span>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#cpuGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Memory RSS Chart */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Memory Working Set RSS (MB)
              </span>
            </div>
            <span className="font-mono text-sm font-black text-purple-300">
              {latest.memory_rss_mb.toFixed(1)} MB
            </span>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit="MB" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="memory" stroke="#c084fc" strokeWidth={2} fillOpacity={1} fill="url(#memGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Thread Count Chart */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Active Thread Count
              </span>
            </div>
            <span className="font-mono text-sm font-black text-emerald-300">
              {latest.thread_count} threads
            </span>
          </div>
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="threadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                />
                <Area type="stepAfter" dataKey="threads" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#threadGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
