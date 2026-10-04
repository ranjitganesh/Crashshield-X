export type EventType =
  | "CPU_INCREASE"
  | "CPU_SPIKE"
  | "CPU_NORMAL"
  | "MEM_INCREASE"
  | "MEM_LEAK_TREND"
  | "MEM_NORMAL"
  | "THREAD_INCREASE"
  | "THREAD_BURST"
  | "THREAD_NORMAL"
  | "PERSISTENCE"
  | "RECOVERY";

export type InstabilityState = "Normal" | "Suspicious" | "Developing" | "Confirmed" | "Recovered";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface ResourceSnapshot {
  pid: number;
  name: string;
  timestamp: number;
  cpu_percent: number;
  memory_rss_mb: number;
  memory_percent: number;
  thread_count: number;
  handle_count?: number;
  io_read_kb?: number;
  io_write_kb?: number;
  status: string;
  is_simulated: boolean;
}

export interface ResourceEvent {
  event_id: string;
  pid: number;
  process_name: string;
  timestamp: number;
  event_type: EventType;
  delta_cpu: number;
  delta_mem_mb: number;
  delta_threads: number;
  current_cpu: number;
  current_mem_mb: number;
  current_threads: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  description: string;
}

export interface GraphNode {
  id: string;
  label: string;
  timestamp: number;
  state: InstabilityState;
  event_type?: EventType | null;
  cpu_percent: number;
  memory_rss_mb: number;
  thread_count: number;
  description: string;
  is_active: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  transition_type: string;
  delta_time_sec: number;
  delta_cpu: number;
  delta_mem_mb: number;
  delta_threads: number;
  label: string;
  weight: number;
}

export interface TemporalResourceGraph {
  pid: number;
  process_name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  active_path: string[];
  last_updated: number;
}

export interface PathAnalysisResult {
  pid: number;
  process_name: string;
  state: InstabilityState;
  risk_level: RiskLevel;
  health_index: number;
  instability_score: number;
  matched_pattern: string;
  path_sequence: string[];
  persistence_count: number;
  anomaly_duration_sec: number;
  is_temporary: boolean;
  is_confirmed: boolean;
  diagnostic_summary: string;
  recommended_action: string;
}

export interface AdaptiveMonitoringStatus {
  pid: number;
  process_name: string;
  base_interval_sec: number;
  current_interval_sec: number;
  accelerated_interval_sec: number;
  burst_interval_sec: number;
  sampling_mode: "STANDARD" | "ACCELERATED" | "BURST";
  reobservation_window: number;
  reobservation_count: number;
  confirmation_status: string;
  trigger_reason: string;
}

export interface SystemMetrics {
  total_cpu_percent: number;
  total_memory_percent: number;
  total_memory_used_gb: number;
  total_memory_total_gb: number;
  total_processes: number;
  suspicious_count: number;
  developing_count: number;
  confirmed_count: number;
  recovered_count: number;
  normal_count: number;
  monitoring_interval_ms: number;
  timestamp: number;
}

export interface ProcessSummaryItem {
  snapshot: ResourceSnapshot;
  analysis?: PathAnalysisResult;
  state?: PathAnalysisResult;
  adaptive?: AdaptiveMonitoringStatus;
}

export interface ValidationScenarioResult {
  test_id: string;
  test_name: string;
  condition: string;
  cpu_usage_avg: number;
  memory_usage_peak_mb: number;
  thread_count_peak: number;
  monitoring_rate_hz: string;
  result_state: string;
  expected_state: string;
  passed: boolean;
  duration_sec: number;
  events_generated: string[];
  transition_path: string[];
  notes: string;
}
