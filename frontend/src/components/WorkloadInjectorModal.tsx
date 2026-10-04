import React, { useState } from "react";
import { injectWorkload } from "../services/api";
import { Zap, X, Cpu, HardDrive, Layers } from "lucide-react";

interface WorkloadInjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPid?: number | null;
  initialName?: string;
  onSuccess: (pid: number) => void;
}

export const WorkloadInjectorModal: React.FC<WorkloadInjectorModalProps> = ({
  isOpen,
  onClose,
  initialPid,
  initialName,
  onSuccess,
}) => {
  const [pid, setPid] = useState<number>(initialPid || 8080);
  const [name, setName] = useState<string>(initialName || "worker_simulation.exe");
  const [cpu, setCpu] = useState<number>(85.0);
  const [mem, setMem] = useState<number>(450.0);
  const [threads, setThreads] = useState<number>(48);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await injectWorkload({
        pid,
        name,
        cpu_percent: cpu,
        memory_rss_mb: mem,
        thread_count: threads,
      });
      onSuccess(pid);
      onClose();
    } catch (err) {
      console.error("Failed to inject workload:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPreset = (preset: "CPU_SPIKE" | "MEM_LEAK" | "THREAD_EXPLOSION" | "NORMAL") => {
    if (preset === "CPU_SPIKE") {
      setCpu(92.0);
      setMem(80.0);
      setThreads(6);
    } else if (preset === "MEM_LEAK") {
      setCpu(25.0);
      setMem(650.0);
      setThreads(12);
    } else if (preset === "THREAD_EXPLOSION") {
      setCpu(45.0);
      setMem(180.0);
      setThreads(95);
    } else {
      setCpu(4.5);
      setMem(50.0);
      setThreads(4);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Interactive Anomaly Workload Injector</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Quick Stress Presets:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPreset("CPU_SPIKE")}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium"
            >
              🔥 92% CPU Spike
            </button>
            <button
              type="button"
              onClick={() => setPreset("MEM_LEAK")}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium"
            >
              💧 650MB Memory Leak
            </button>
            <button
              type="button"
              onClick={() => setPreset("THREAD_EXPLOSION")}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium"
            >
              ⚡ 95 Thread Explosion
            </button>
            <button
              type="button"
              onClick={() => setPreset("NORMAL")}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-left font-medium"
            >
              🌱 Normalize Baseline
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Target PID</label>
              <input
                type="number"
                value={pid}
                onChange={(e) => setPid(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Process Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 font-medium mb-1">
              <span className="flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU Load (%)
              </span>
              <span className="font-mono text-cyan-300 font-bold">{cpu}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={cpu}
              onChange={(e) => setCpu(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 font-medium mb-1">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-purple-400" /> Memory RSS (MB)
              </span>
              <span className="font-mono text-purple-300 font-bold">{mem} MB</span>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={mem}
              onChange={(e) => setMem(Number(e.target.value))}
              className="w-full accent-purple-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 font-medium mb-1">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> Thread Count
              </span>
              <span className="font-mono text-emerald-300 font-bold">{threads}</span>
            </div>
            <input
              type="range"
              min="1"
              max="150"
              step="1"
              value={threads}
              onChange={(e) => setThreads(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition shadow-lg shadow-cyan-950/50"
            >
              {isSubmitting ? "Injecting..." : "Inject Stress Telemetry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
