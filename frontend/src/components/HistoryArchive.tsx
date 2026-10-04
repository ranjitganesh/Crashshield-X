import React, { useState, useEffect } from "react";
import { ResourceEvent } from "../types";
import { fetchEvents, fetchAuditLogs } from "../services/api";
import { Archive, Filter, RefreshCw, FileSpreadsheet, FileCode } from "lucide-react";

const DEFAULT_EVENTS: ResourceEvent[] = [
  {
    event_id: "ev_101",
    pid: 9102,
    process_name: "data_aggregator_leak.exe",
    timestamp: Date.now() / 1000 - 15,
    event_type: "MEM_INCREASE",
    delta_cpu: 6.0,
    delta_mem_mb: 50.0,
    delta_threads: 0,
    current_cpu: 12.0,
    current_mem_mb: 110.0,
    current_threads: 6,
    severity: "WARNING",
    description: "Memory monotonic growth / leak pattern: 110.0MB (delta: +50.0MB)",
  },
  {
    event_id: "ev_102",
    pid: 9102,
    process_name: "data_aggregator_leak.exe",
    timestamp: Date.now() / 1000 - 10,
    event_type: "THREAD_INCREASE",
    delta_cpu: 6.5,
    delta_mem_mb: 65.0,
    delta_threads: 10,
    current_cpu: 18.5,
    current_mem_mb: 175.0,
    current_threads: 16,
    severity: "INFO",
    description: "Thread count increased: 16 threads (delta: +10)",
  },
  {
    event_id: "ev_103",
    pid: 9102,
    process_name: "data_aggregator_leak.exe",
    timestamp: Date.now() / 1000 - 5,
    event_type: "CPU_INCREASE",
    delta_cpu: 39.5,
    delta_mem_mb: 135.0,
    delta_threads: 20,
    current_cpu: 58.0,
    current_mem_mb: 310.0,
    current_threads: 36,
    severity: "WARNING",
    description: "CPU surge and cross-resource Developing escalation: 58.0% CPU, 310.0MB RAM",
  },
  {
    event_id: "ev_104",
    pid: 9101,
    process_name: "worker_transient_task.exe",
    timestamp: Date.now() / 1000 - 45,
    event_type: "CPU_SPIKE",
    delta_cpu: 79.5,
    delta_mem_mb: 2.0,
    delta_threads: 0,
    current_cpu: 84.0,
    current_mem_mb: 48.0,
    current_threads: 4,
    severity: "WARNING",
    description: "Sharp CPU surge: 84.0% (delta: +79.5%)",
  },
  {
    event_id: "ev_105",
    pid: 9101,
    process_name: "worker_transient_task.exe",
    timestamp: Date.now() / 1000 - 30,
    event_type: "RECOVERY",
    delta_cpu: -78.0,
    delta_mem_mb: -1.5,
    delta_threads: 0,
    current_cpu: 5.0,
    current_mem_mb: 46.0,
    current_threads: 4,
    severity: "INFO",
    description: "Process resource parameters normalized back to baseline (5.0% CPU, 46.0MB)",
  },
];

const DEFAULT_AUDITS = [
  {
    iso_time: new Date().toLocaleTimeString(),
    pid: 9102,
    process_name: "data_aggregator_leak.exe",
    state: "Developing",
    risk_level: "HIGH",
    event_desc: "Developing cross-resource escalation (Memory + Thread + CPU)",
  },
  {
    iso_time: new Date().toLocaleTimeString(),
    pid: 9101,
    process_name: "worker_transient_task.exe",
    state: "Recovered",
    risk_level: "LOW",
    event_desc: "Transient CPU spike rejected; nominal baseline restored",
  },
];

export const HistoryArchive: React.FC = () => {
  const [events, setEvents] = useState<ResourceEvent[]>(DEFAULT_EVENTS);
  const [auditLogs, setAuditLogs] = useState<any[]>(DEFAULT_AUDITS);
  const [selectedTab, setSelectedTab] = useState<"EVENTS" | "AUDIT">("EVENTS");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [evList, auditList] = await Promise.all([fetchEvents(), fetchAuditLogs()]);
      if (evList && evList.length > 0) setEvents(evList);
      if (auditList && auditList.length > 0) setAuditLogs(auditList);
    } catch (e) {
      console.error("Error loading archive logs:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (severityFilter !== "ALL" && e.severity !== severityFilter) return false;
    return true;
  });

  const exportCSV = () => {
    let csv = "Event ID,Timestamp,PID,Process Name,Event Type,Delta CPU (%),Delta Mem (MB),Delta Threads,Current CPU (%),Current Mem (MB),Current Threads,Severity,Description\n";
    filteredEvents.forEach((e) => {
      csv += `${e.event_id},${new Date(e.timestamp * 1000).toISOString()},${e.pid},${e.process_name},${e.event_type},${e.delta_cpu},${e.delta_mem_mb},${e.delta_threads},${e.current_cpu},${e.current_mem_mb},${e.current_threads},${e.severity},"${e.description}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "crashshield_events.csv");
    link.click();
  };

  const exportJSON = () => {
    const data = {
      system: "CrashShield X Diagnostic Archive",
      export_time: new Date().toISOString(),
      events: filteredEvents,
      audit_trail: auditLogs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "crashshield_diagnostic_report.json");
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">
            7.10 / 7.13 Diagnostic History & Event Archive
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab buttons */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setSelectedTab("EVENTS")}
              className={`px-3 py-1 rounded-md transition ${
                selectedTab === "EVENTS" ? "bg-cyan-600 text-white font-bold shadow" : "text-slate-400"
              }`}
            >
              Resource Events ({events.length})
            </button>
            <button
              onClick={() => setSelectedTab("AUDIT")}
              className={`px-3 py-1 rounded-md transition ${
                selectedTab === "AUDIT" ? "bg-cyan-600 text-white font-bold shadow" : "text-slate-400"
              }`}
            >
              State Audit Trail ({auditLogs.length})
            </button>
          </div>

          {/* Severity filter */}
          {selectedTab === "EVENTS" && (
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1 border border-slate-700 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none text-xs font-medium cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">All Severities</option>
                <option value="INFO" className="bg-slate-900">INFO</option>
                <option value="WARNING" className="bg-slate-900">WARNING</option>
                <option value="CRITICAL" className="bg-slate-900">CRITICAL</option>
              </select>
            </div>
          )}

          {/* Export Buttons */}
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={exportJSON}
            className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            Export JSON
          </button>

          <button
            onClick={loadData}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {selectedTab === "EVENTS" ? (
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="sticky top-0 bg-slate-950/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 z-10">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">PID</th>
                <th className="py-3 px-4">Process Name</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Delta Vector (CPU / Mem / Thr)</th>
                <th className="py-3 px-4">Current Readings</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Event Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filteredEvents.map((ev) => (
                <tr key={ev.event_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-4 text-slate-400">
                    {new Date(ev.timestamp * 1000).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-4 text-cyan-400 font-bold">{ev.pid}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-200">{ev.process_name}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        ev.event_type.includes("PERSISTENCE")
                          ? "bg-rose-950 text-rose-300 border border-rose-700"
                          : ev.event_type.includes("RECOVERY")
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-700"
                          : ev.event_type.includes("SPIKE") || ev.event_type.includes("BURST")
                          ? "bg-orange-950 text-orange-300 border border-orange-700"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {ev.event_type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-300">
                    <span>
                      +{ev.delta_cpu.toFixed(1)}% | +{ev.delta_mem_mb.toFixed(1)}MB | +{ev.delta_threads}thr
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">
                    <span>
                      {ev.current_cpu.toFixed(1)}% | {ev.current_mem_mb.toFixed(1)}MB | {ev.current_threads}thr
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.severity === "CRITICAL"
                          ? "bg-rose-600 text-white"
                          : ev.severity === "WARNING"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {ev.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-300 max-w-xs truncate">
                    {ev.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="sticky top-0 bg-slate-950/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 z-10">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">PID</th>
                <th className="py-3 px-4">Process Name</th>
                <th className="py-3 px-4">State Transition</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Audit Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {auditLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-4 text-slate-400">{log.iso_time}</td>
                  <td className="py-2.5 px-4 text-cyan-400 font-bold">{log.pid}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-200">{log.process_name}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-300">{log.state}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                      {log.risk_level}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-300">{log.event_desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
