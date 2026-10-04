import React, { useState, useMemo } from "react";
import { TemporalResourceGraph, GraphNode, GraphEdge } from "../types";
import { GitBranch, Clock, Cpu, HardDrive, Layers, Info, ArrowRight, Zap } from "lucide-react";

interface ResourceGraphProps {
  graph?: TemporalResourceGraph | null;
  processName?: string;
  pid?: number | null;
}

export const ResourceGraph: React.FC<ResourceGraphProps> = ({ graph, processName, pid }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];

  // Compute 2D layout coordinates for nodes sequentially along a temporal path
  const layoutNodes = useMemo(() => {
    if (!nodes.length) return [];
    const width = 850;
    const height = 360;
    const paddingX = 80;
    const paddingY = 60;

    const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(nodes.length * 1.8))));
    const rows = Math.ceil(nodes.length / cols);

    return nodes.map((node, index) => {
      // Snake-like grid layout to display clear temporal sequence
      const row = Math.floor(index / cols);
      const colInRow = index % cols;
      const isReverseRow = row % 2 === 1;
      const col = isReverseRow ? cols - 1 - colInRow : colInRow;

      const x = cols > 1 ? paddingX + (col * (width - 2 * paddingX)) / (cols - 1) : width / 2;
      const y = rows > 1 ? paddingY + (row * (height - 2 * paddingY)) / (rows - 1) : height / 2;

      return {
        ...node,
        x,
        y,
      };
    });
  }, [nodes]);

  const getNodeColor = (state: string, isActive: boolean) => {
    switch (state) {
      case "Confirmed":
        return { fill: "#e11d48", stroke: "#fb7185", glow: "rgba(225, 29, 72, 0.6)" };
      case "Developing":
        return { fill: "#ea580c", stroke: "#fb923c", glow: "rgba(234, 88, 12, 0.6)" };
      case "Suspicious":
        return { fill: "#d97706", stroke: "#fbbf24", glow: "rgba(217, 119, 6, 0.6)" };
      case "Recovered":
        return { fill: "#0891b2", stroke: "#38bdf8", glow: "rgba(8, 145, 178, 0.6)" };
      default:
        return { fill: "#059669", stroke: "#34d399", glow: "rgba(5, 150, 105, 0.6)" };
    }
  };

  if (!graph || !nodes.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-900/90 rounded-xl border border-slate-800">
        <GitBranch className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <h3 className="text-lg font-semibold text-slate-300">No Temporal Graph Selected</h3>
        <p className="text-sm text-slate-500 max-w-md mt-1">
          Select a process from the Process Table or execute a scenario to inspect its live Temporal Resource-Transition Graph.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Graph Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">
            7.4 Temporal Resource-Transition Graph (TRTG)
          </h2>
          <span className="ml-2 px-2.5 py-0.5 text-xs rounded bg-slate-800 text-cyan-300 font-mono border border-slate-700">
            PID {pid}: {processName}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
            <span className="text-slate-400">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
            <span className="text-slate-400">Suspicious</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 shadow-sm" />
            <span className="text-slate-400">Developing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm animate-pulse" />
            <span className="text-slate-400">Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-sm" />
            <span className="text-slate-400">Recovered</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative flex-1 bg-slate-950/80 overflow-hidden flex items-center justify-center p-4">
        {/* Subtle grid background */}
        <svg
          viewBox="0 0 850 380"
          className="w-full h-full max-h-[420px] select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="14"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="8"
              markerHeight="6"
              refX="14"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
            </marker>
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render directed edges */}
          {edges.map((edge) => {
            const src = layoutNodes.find((n) => n.id === edge.source);
            const tgt = layoutNodes.find((n) => n.id === edge.target);
            if (!src || !tgt) return null;

            const isTargetActive = tgt.is_active;
            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y + tgt.y) / 2;

            return (
              <g key={edge.id}>
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isTargetActive ? "#38bdf8" : "#475569"}
                  strokeWidth={isTargetActive ? 2.5 : 1.5}
                  strokeDasharray={edge.transition_type === "TIMED_SAMPLE" ? "4 4" : "none"}
                  markerEnd={isTargetActive ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                  className="transition-all duration-300"
                />
                {/* Edge transition delta badge */}
                <rect
                  x={midX - 32}
                  y={midY - 10}
                  width="64"
                  height="20"
                  rx="4"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1"
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  +{edge.delta_time_sec.toFixed(1)}s
                </text>
              </g>
            );
          })}

          {/* Render graph nodes */}
          {layoutNodes.map((node) => {
            const colors = getNodeColor(node.state, node.is_active);
            const isSelected = selectedNode?.id === node.id;

            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer transition-transform duration-200 hover:scale-110"
                transform={`translate(${node.x}, ${node.y})`}
              >
                {/* Active node pulsating outer ring */}
                {node.is_active && (
                  <circle
                    r="26"
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                )}

                {/* Node outer shell */}
                <circle
                  r={isSelected ? "22" : "18"}
                  fill={colors.fill}
                  stroke={isSelected ? "#ffffff" : colors.stroke}
                  strokeWidth={isSelected ? 3 : 2}
                  filter={node.is_active ? "url(#nodeGlow)" : undefined}
                />

                {/* Event or State icon abbreviation */}
                <text
                  textAnchor="middle"
                  dy="4"
                  fill="#ffffff"
                  fontSize={isSelected ? "11" : "9"}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {node.event_type
                    ? node.event_type.slice(0, 3)
                    : node.state.slice(0, 3).toUpperCase()}
                </text>

                {/* Bottom Node Title */}
                <text
                  y="28"
                  textAnchor="middle"
                  fill={node.is_active ? "#38bdf8" : "#cbd5e1"}
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight={node.is_active ? "bold" : "normal"}
                >
                  {node.event_type ? node.event_type : node.state}
                </text>

                {/* Metrics Subtitle */}
                <text
                  y="40"
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  {node.cpu_percent.toFixed(0)}% | {node.memory_rss_mb.toFixed(0)}MB
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute bottom-3 right-3 bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs shadow-2xl backdrop-blur-md w-72">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Node Inspector</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">State:</span>
                <span className="font-bold text-cyan-400">{selectedNode.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Event:</span>
                <span className="text-amber-400">{selectedNode.event_type || "None"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">CPU Usage:</span>
                <span>{selectedNode.cpu_percent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Memory RSS:</span>
                <span>{selectedNode.memory_rss_mb.toFixed(1)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Threads:</span>
                <span>{selectedNode.thread_count}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-sans text-slate-400">
                {selectedNode.description || "Baseline sample record."}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Path Sequence Ribbon */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs font-mono">
        <span className="text-slate-500 font-sans font-semibold flex items-center gap-1 shrink-0">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          Active Path Walk:
        </span>
        {graph.active_path.map((nodeId, idx) => {
          const n = nodes.find((item) => item.id === nodeId);
          if (!n) return null;
          return (
            <React.Fragment key={nodeId}>
              {idx > 0 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
              <span
                onClick={() => setSelectedNode(n)}
                className={`px-2 py-0.5 rounded cursor-pointer transition shrink-0 ${
                  n.is_active
                    ? "bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {n.event_type || n.state}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
