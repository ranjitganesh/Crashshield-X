from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
import time

class EventType(str, Enum):
    CPU_INCREASE = "CPU_INCREASE"
    CPU_SPIKE = "CPU_SPIKE"
    CPU_NORMAL = "CPU_NORMAL"
    MEM_INCREASE = "MEM_INCREASE"
    MEM_LEAK_TREND = "MEM_LEAK_TREND"
    MEM_NORMAL = "MEM_NORMAL"
    THREAD_INCREASE = "THREAD_INCREASE"
    THREAD_BURST = "THREAD_BURST"
    THREAD_NORMAL = "THREAD_NORMAL"
    PERSISTENCE = "PERSISTENCE"
    RECOVERY = "RECOVERY"

class InstabilityState(str, Enum):
    NORMAL = "Normal"
    SUSPICIOUS = "Suspicious"
    DEVELOPING = "Developing"
    CONFIRMED = "Confirmed"
    RECOVERED = "Recovered"

class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ResourceSnapshot(BaseModel):
    pid: int
    name: str
    timestamp: float = Field(default_factory=time.time)
    cpu_percent: float = 0.0
    memory_rss_mb: float = 0.0
    memory_percent: float = 0.0
    thread_count: int = 1
    handle_count: Optional[int] = 0
    io_read_kb: Optional[float] = 0.0
    io_write_kb: Optional[float] = 0.0
    status: str = "running"
    is_simulated: bool = False

class ResourceEvent(BaseModel):
    event_id: str
    pid: int
    process_name: str
    timestamp: float = Field(default_factory=time.time)
    event_type: EventType
    delta_cpu: float = 0.0
    delta_mem_mb: float = 0.0
    delta_threads: int = 0
    current_cpu: float = 0.0
    current_mem_mb: float = 0.0
    current_threads: int = 0
    severity: str = "INFO" # INFO, WARNING, CRITICAL
    description: str = ""

class GraphNode(BaseModel):
    id: str
    label: str
    timestamp: float
    state: InstabilityState
    event_type: Optional[EventType] = None
    cpu_percent: float
    memory_rss_mb: float
    thread_count: int
    description: str = ""
    is_active: bool = False

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    transition_type: str
    delta_time_sec: float
    delta_cpu: float
    delta_mem_mb: float
    delta_threads: int
    label: str = ""
    weight: float = 1.0

class TemporalResourceGraph(BaseModel):
    pid: int
    process_name: str
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    active_path: List[str] = []
    last_updated: float = Field(default_factory=time.time)

class PathAnalysisResult(BaseModel):
    pid: int
    process_name: str
    state: InstabilityState
    risk_level: RiskLevel
    health_index: float # 0 to 100
    instability_score: float # 0 to 100
    matched_pattern: str
    path_sequence: List[str]
    persistence_count: int
    anomaly_duration_sec: float
    is_temporary: bool
    is_confirmed: bool
    diagnostic_summary: str
    recommended_action: str

class AdaptiveMonitoringStatus(BaseModel):
    pid: int
    process_name: str
    base_interval_sec: float = 3.0
    current_interval_sec: float = 3.0
    accelerated_interval_sec: float = 1.0
    burst_interval_sec: float = 0.25
    sampling_mode: str = "STANDARD" # STANDARD, ACCELERATED, BURST
    reobservation_window: int = 5
    reobservation_count: int = 0
    confirmation_status: str = "NORMAL" # NORMAL, VERIFYING, CONFIRMED, REJECTED
    trigger_reason: str = "Normal baseline monitoring"

class ProcessDetail(BaseModel):
    snapshot: ResourceSnapshot
    events: List[ResourceEvent] = []
    graph: TemporalResourceGraph
    analysis: PathAnalysisResult
    adaptive_status: AdaptiveMonitoringStatus
    telemetry_history: List[ResourceSnapshot] = []

class SystemMetrics(BaseModel):
    total_cpu_percent: float
    total_memory_percent: float
    total_memory_used_gb: float
    total_memory_total_gb: float
    total_processes: int
    suspicious_count: int
    developing_count: int
    confirmed_count: int
    recovered_count: int
    normal_count: int
    monitoring_interval_ms: int
    timestamp: float = Field(default_factory=time.time)

class ValidationScenarioResult(BaseModel):
    test_id: str
    test_name: str
    condition: str
    cpu_usage_avg: float
    memory_usage_peak_mb: float
    thread_count_peak: int
    monitoring_rate_hz: str
    result_state: str # Temporary, Developing, Recovered, Confirmed
    expected_state: str
    passed: bool
    duration_sec: float
    events_generated: List[str]
    transition_path: List[str]
    notes: str
