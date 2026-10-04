import React, { useState, useEffect, useCallback } from "react";
import {
  SystemMetrics,
  ProcessSummaryItem,
  TemporalResourceGraph,
  PathAnalysisResult,
  AdaptiveMonitoringStatus,
  ResourceSnapshot,
} from "./types";
import { socketManager } from "./services/socket";
import {
  fetchSystemMetrics,
  fetchProcesses,
  fetchProcessDetail,
  selectProcessFocus,
  resetProcess,
} from "./services/api";

import { ProcessTable } from "./components/ProcessTable";
import { ResourceGraph } from "./components/ResourceGraph";
import { PathAnalyzer } from "./components/PathAnalyzer";
import { AdaptiveController } from "./components/AdaptiveController";
import { TelemetryCharts } from "./components/TelemetryCharts";
import { ValidationLab } from "./components/ValidationLab";
import { HistoryArchive } from "./components/HistoryArchive";
import { WorkloadInjectorModal } from "./components/WorkloadInjectorModal";

import {
  ShieldAlert,
  Activity,
  GitBranch,
  TrendingUp,
  Sliders,
  LineChart,
  FlaskConical,
  Archive,
  Zap,
  Cpu,
  HardDrive,
  AlertTriangle,
} from "lucide-react";

type ActiveTab =
  | "PROCESSES"
  | "GRAPH"
  | "ANALYZER"
  | "ADAPTIVE"
  | "TELEMETRY"
  | "VALIDATION"
  | "ARCHIVE";

// Initial fallback processes so UI is never blank
const INITIAL_DEMO_PROCESSES: ProcessSummaryItem[] = [
  {
    snapshot: {
      pid: 9102,
      name: "data_aggregator_leak.exe",
      timestamp: Date.now() / 1000,
      cpu_percent: 58.0,
      memory_rss_mb: 310.0,
      memory_percent: 4.8,
      thread_count: 36,
      status: "running",
      is_simulated: true,
    },
    analysis: {
      pid: 9102,
      process_name: "data_aggregator_leak.exe",
      state: "Developing",
      risk_level: "HIGH",
      health_index: 48.5,
      instability_score: 51.5,
      matched_pattern: "Correlated Multi-Resource Growth (Developing Instability)",
      path_sequence: ["MEM_INCREASE", "THREAD_INCREASE", "CPU_INCREASE"],
      persistence_count: 1,
      anomaly_duration_sec: 14.5,
      is_temporary: false,
      is_confirmed: false,
      diagnostic_summary: "Progressive cross-resource escalation observed (Memory + Thread / CPU drift). Potential resource leak in progress.",
      recommended_action: "Initiate Closed-Loop Burst Sampling (250ms); gather handle & page-fault telemetry.",
    },
    adaptive: {
      pid: 9102,
      process_name: "data_aggregator_leak.exe",
      base_interval_sec: 3.0,
      current_interval_sec: 0.25,
      accelerated_interval_sec: 1.0,
      burst_interval_sec: 0.25,
      sampling_mode: "BURST",
      reobservation_window: 5,
      reobservation_count: 2,
      confirmation_status: "VERIFYING",
      trigger_reason: "Developing cross-resource escalation -> Engaging 250ms High-Frequency Burst",
    },
  },
  {
    snapshot: {
      pid: 9101,
      name: "worker_transient_task.exe",
      timestamp: Date.now() / 1000,
      cpu_percent: 5.0,
      memory_rss_mb: 46.0,
      memory_percent: 1.2,
      thread_count: 4,
      status: "running",
      is_simulated: true,
    },
    analysis: {
      pid: 9101,
      process_name: "worker_transient_task.exe",
      state: "Recovered",
      risk_level: "LOW",
      health_index: 95.0,
      instability_score: 5.0,
      matched_pattern: "Anomalous Path → Recovery Transition",
      path_sequence: ["CPU_SPIKE", "RECOVERY"],
      persistence_count: 0,
      anomaly_duration_sec: 0.0,
      is_temporary: true,
      is_confirmed: false,
      diagnostic_summary: "Process resource metrics stabilized and successfully returned to nominal baseline.",
      recommended_action: "Restore standard polling frequency; mark alert as resolved.",
    },
    adaptive: {
      pid: 9101,
      process_name: "worker_transient_task.exe",
      base_interval_sec: 3.0,
      current_interval_sec: 3.0,
      accelerated_interval_sec: 1.0,
      burst_interval_sec: 0.25,
      sampling_mode: "STANDARD",
      reobservation_window: 5,
      reobservation_count: 0,
      confirmation_status: "REJECTED_TRANSIENT",
      trigger_reason: "Resource metrics returned to nominal baseline -> Restoring standard rate",
    },
  },
];

const INITIAL_GRAPH: TemporalResourceGraph = {
  pid: 9102,
  process_name: "data_aggregator_leak.exe",
  nodes: [
    {
      id: "node_9102_0",
      label: "Baseline (Normal)",
      timestamp: Date.now() / 1000 - 10,
      state: "Normal",
      cpu_percent: 6.0,
      memory_rss_mb: 60.0,
      thread_count: 6,
      description: "Process initialized into baseline monitoring",
      is_active: false,
    },
    {
      id: "node_9102_1",
      label: "MEM_INCREASE (Suspicious)",
      timestamp: Date.now() / 1000 - 7,
      state: "Suspicious",
      event_type: "MEM_INCREASE",
      cpu_percent: 12.0,
      memory_rss_mb: 110.0,
      thread_count: 6,
      description: "Memory increase detected (+50.0MB)",
      is_active: false,
    },
    {
      id: "node_9102_2",
      label: "THREAD_INCREASE (Developing)",
      timestamp: Date.now() / 1000 - 4,
      state: "Developing",
      event_type: "THREAD_INCREASE",
      cpu_percent: 18.5,
      memory_rss_mb: 175.0,
      thread_count: 16,
      description: "Thread count increased (+10 threads)",
      is_active: false,
    },
    {
      id: "node_9102_3",
      label: "CPU_INCREASE (Developing)",
      timestamp: Date.now() / 1000,
      state: "Developing",
      event_type: "CPU_INCREASE",
      cpu_percent: 58.0,
      memory_rss_mb: 310.0,
      thread_count: 36,
      description: "Cross-resource Developing escalation",
      is_active: true,
    },
  ],
  edges: [
    {
      id: "e1",
      source: "node_9102_0",
      target: "node_9102_1",
      transition_type: "MEM_INCREASE",
      delta_time_sec: 3.0,
      delta_cpu: 6.0,
      delta_mem_mb: 50.0,
      delta_threads: 0,
      label: "+3.0s | MEM_INCREASE",
      weight: 1.5,
    },
    {
      id: "e2",
      source: "node_9102_1",
      target: "node_9102_2",
      transition_type: "THREAD_INCREASE",
      delta_time_sec: 3.0,
      delta_cpu: 6.5,
      delta_mem_mb: 65.0,
      delta_threads: 10,
      label: "+3.0s | THREAD_INCREASE",
      weight: 1.5,
    },
    {
      id: "e3",
      source: "node_9102_2",
      target: "node_9102_3",
      transition_type: "CPU_INCREASE",
      delta_time_sec: 4.0,
      delta_cpu: 39.5,
      delta_mem_mb: 135.0,
      delta_threads: 20,
      label: "+4.0s | CPU_INCREASE",
      weight: 2.0,
    },
  ],
  active_path: ["node_9102_0", "node_9102_1", "node_9102_2", "node_9102_3"],
  last_updated: Date.now() / 1000,
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("PROCESSES");
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>({
    total_cpu_percent: 18.5,
    total_memory_percent: 62.4,
    total_memory_used_gb: 9.8,
    total_memory_total_gb: 16.0,
    total_processes: 42,
    suspicious_count: 0,
    developing_count: 1,
    confirmed_count: 0,
    recovered_count: 1,
    normal_count: 40,
    monitoring_interval_ms: 1000,
    timestamp: Date.now() / 1000,
  });
  const [processes, setProcesses] = useState<ProcessSummaryItem[]>(INITIAL_DEMO_PROCESSES);
  const [selectedPid, setSelectedPid] = useState<number | null>(9102);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Selected process detailed data
  const [selectedGraph, setSelectedGraph] = useState<TemporalResourceGraph | null>(INITIAL_GRAPH);
  const [selectedAnalysis, setSelectedAnalysis] = useState<PathAnalysisResult | null>(INITIAL_DEMO_PROCESSES[0].analysis || null);
  const [selectedAdaptive, setSelectedAdaptive] = useState<AdaptiveMonitoringStatus | null>(INITIAL_DEMO_PROCESSES[0].adaptive || null);
  const [selectedHistory, setSelectedHistory] = useState<ResourceSnapshot[]>([
    { pid: 9102, name: "data_aggregator_leak.exe", timestamp: Date.now() / 1000 - 15, cpu_percent: 6.0, memory_rss_mb: 60.0, memory_percent: 1.0, thread_count: 6, status: "running", is_simulated: true },
    { pid: 9102, name: "data_aggregator_leak.exe", timestamp: Date.now() / 1000 - 10, cpu_percent: 12.0, memory_rss_mb: 110.0, memory_percent: 1.8, thread_count: 6, status: "running", is_simulated: true },
    { pid: 9102, name: "data_aggregator_leak.exe", timestamp: Date.now() / 1000 - 5, cpu_percent: 18.5, memory_rss_mb: 175.0, memory_percent: 2.7, thread_count: 16, status: "running", is_simulated: true },
    { pid: 9102, name: "data_aggregator_leak.exe", timestamp: Date.now() / 1000, cpu_percent: 58.0, memory_rss_mb: 310.0, memory_percent: 4.8, thread_count: 36, status: "running", is_simulated: true },
  ]);

  // Injector modal state
  const [isInjectorOpen, setIsInjectorOpen] = useState<boolean>(false);
  const [injectorPid, setInjectorPid] = useState<number | null>(null);
  const [injectorName, setInjectorName] = useState<string>("");

  const loadProcessDetail = useCallback(async (pid: number) => {
    try {
      const detail = await fetchProcessDetail(pid);
      if (detail) {
        setSelectedGraph(detail.graph);
        setSelectedAnalysis(detail.analysis);
        setSelectedAdaptive(detail.adaptive_status);
        setSelectedHistory(detail.telemetry_history);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [metrics, procList] = await Promise.all([
        fetchSystemMetrics(),
        fetchProcesses(40),
      ]);
      if (metrics) {
        setSystemMetrics(metrics);
        setIsConnected(true);
      }
      if (procList && procList.length > 0) {
        setProcesses(procList);
        setIsConnected(true);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useEffect(() => {
    refreshData();
    socketManager.connect();

    const unsubscribe = socketManager.subscribe((data) => {
      setIsConnected(true);
      if (data.system_metrics) {
        setSystemMetrics(data.system_metrics);
      }
      if (data.processes && data.processes.length > 0) {
        setProcesses(data.processes);
      }
      if (data.selected_process) {
        setSelectedGraph(data.selected_process.graph);
        setSelectedAnalysis(data.selected_process.analysis);
        setSelectedAdaptive(data.selected_process.adaptive);
        setSelectedHistory(data.selected_process.history);
      }
    });

    const interval = setInterval(() => {
      refreshData();
      if (selectedPid) {
        loadProcessDetail(selectedPid);
      }
    }, 1800);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshData, selectedPid, loadProcessDetail]);

  const handleSelectPid = async (pid: number) => {
    setSelectedPid(pid);
    socketManager.setFocusedPid(pid);
    await loadProcessDetail(pid);
    try {
      await selectProcessFocus(pid);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenInjector = (pid: number, name: string) => {
    setInjectorPid(pid);
    setInjectorName(name);
    setIsInjectorOpen(true);
  };

  const handleResetProcess = async (pid: number) => {
    try {
      await resetProcess(pid);
      await refreshData();
      if (selectedPid) {
        await loadProcessDetail(selectedPid);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedProcessItem = processes.find((p) => p.snapshot.pid === selectedPid);
  const selectedName = selectedProcessItem?.snapshot.name || "data_aggregator_leak.exe";

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Banner Header */}
      <header className="h-16 bg-slate-900/90 border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-lg shadow-cyan-900/40">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-wider text-white">
                CRASHSHIELD X
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                PATENT SYSTEM v1.0
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
                title={isConnected ? "Live Telemetry Active" : "Connecting..."}
              />
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Resource-Transition Graph Based Adaptive Process Instability Detection & Closed-Loop Preventive Monitoring
            </p>
          </div>
        </div>

        {/* Real-time System Metrics Bar */}
        {systemMetrics && (
          <div className="hidden lg:flex items-center gap-4 bg-slate-950/80 px-4 py-1.5 rounded-xl border border-slate-800/80 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400">CPU:</span>
              <span className="text-white font-bold">{systemMetrics.total_cpu_percent}%</span>
            </div>
            <div className="w-px h-4 bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span className="text-slate-400">RAM:</span>
              <span className="text-white font-bold">{systemMetrics.total_memory_percent}%</span>
              <span className="text-[10px] text-slate-500">
                ({systemMetrics.total_memory_used_gb}G / {systemMetrics.total_memory_total_gb}G)
              </span>
            </div>
            <div className="w-px h-4 bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400">Procs:</span>
              <span className="text-white font-bold">{systemMetrics.total_processes}</span>
            </div>
            {systemMetrics.developing_count > 0 && (
              <>
                <div className="w-px h-4 bg-slate-800" />
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-700 animate-pulse font-sans font-bold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  <span>{systemMetrics.developing_count} Developing Instability</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Stress Injector Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenInjector(selectedPid || 9102, selectedName)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-cyan-950/50"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Inject Stress Workload</span>
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 p-3 flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1.5 block">
              Patent Subsystem Navigation
            </span>

            {[
              { id: "PROCESSES", label: "7.1 Process Monitor", icon: Activity },
              { id: "GRAPH", label: "7.4 Temporal Graph", icon: GitBranch },
              { id: "ANALYZER", label: "7.5 Path Analyzer", icon: TrendingUp },
              { id: "ADAPTIVE", label: "7.7 Closed-Loop AMC", icon: Sliders },
              { id: "TELEMETRY", label: "7.12 Telemetry Charts", icon: LineChart },
              { id: "VALIDATION", label: "Section 8 Validation Lab", icon: FlaskConical },
              { id: "ARCHIVE", label: "7.13 Event History", icon: Archive },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-600/30 to-blue-600/20 text-cyan-300 border border-cyan-500/50 shadow-md font-bold"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Focused Process Widget in Sidebar */}
          {selectedPid && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1 font-mono text-[11px]">
                <span>Focused Process:</span>
                <span className="text-cyan-400 font-bold">PID {selectedPid}</span>
              </div>
              <p className="font-bold text-white truncate">{selectedName}</p>
              {selectedAnalysis && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-sans">State:</span>
                  <span
                    className={`font-bold font-mono ${
                      selectedAnalysis.state === "Confirmed"
                        ? "text-rose-400"
                        : selectedAnalysis.state === "Developing"
                        ? "text-orange-400"
                        : selectedAnalysis.state === "Suspicious"
                        ? "text-amber-400"
                        : selectedAnalysis.state === "Recovered"
                        ? "text-cyan-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {selectedAnalysis.state}
                  </span>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Content View Area */}
        <main className="flex-1 p-4 overflow-hidden">
          {activeTab === "PROCESSES" && (
            <ProcessTable
              processes={processes}
              selectedPid={selectedPid}
              onSelectPid={handleSelectPid}
              onOpenInjector={handleOpenInjector}
              onResetProcess={handleResetProcess}
            />
          )}

          {activeTab === "GRAPH" && (
            <ResourceGraph
              graph={selectedGraph}
              processName={selectedName}
              pid={selectedPid}
            />
          )}

          {activeTab === "ANALYZER" && (
            <PathAnalyzer
              analysis={selectedAnalysis}
              processName={selectedName}
              pid={selectedPid}
            />
          )}

          {activeTab === "ADAPTIVE" && (
            <AdaptiveController
              adaptive={selectedAdaptive}
              processName={selectedName}
              pid={selectedPid}
            />
          )}

          {activeTab === "TELEMETRY" && (
            <TelemetryCharts
              history={selectedHistory}
              processName={selectedName}
              pid={selectedPid}
            />
          )}

          {activeTab === "VALIDATION" && (
            <ValidationLab onSelectFocusedPid={handleSelectPid} />
          )}

          {activeTab === "ARCHIVE" && <HistoryArchive />}
        </main>
      </div>

      {/* Stress / Workload Injector Dialog */}
      <WorkloadInjectorModal
        isOpen={isInjectorOpen}
        onClose={() => setIsInjectorOpen(false)}
        initialPid={injectorPid}
        initialName={injectorName}
        onSuccess={(pid) => handleSelectPid(pid)}
      />
    </div>
  );
};

export default App;
