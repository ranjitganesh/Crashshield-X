import time
from typing import List, Dict, Tuple

from .models import (
    ResourceSnapshot,
    ResourceEvent,
    EventType,
    InstabilityState,
    RiskLevel,
    PathAnalysisResult,
    TemporalResourceGraph
)

class InstabilityPathAnalyzer:
    """
    Section 7.5 & 7.6: Instability Path Analyzer and Process State Module
    Examines the time-ordered path of resource events in the Temporal Resource-Transition Graph.
    Evaluates multi-resource correlations, duration, persistence, and recovery transitions to determine:
    - Process State (Normal, Suspicious, Developing, Confirmed, Recovered)
    - Risk Level (LOW, MODERATE, HIGH, CRITICAL)
    - Health Index (0 - 100%)
    - Instability Score (0 - 100%)
    - Actionable Diagnostic Root-Cause and Preventive Recommendations
    """

    def __init__(self):
        # pid -> sequence of recent EventType strings
        self._event_sequences: Dict[int, List[str]] = {}
        # pid -> time when abnormal state first started
        self._anomaly_start_times: Dict[int, float] = {}

    def analyze_path(
        self,
        snapshot: ResourceSnapshot,
        events: List[ResourceEvent],
        graph: TemporalResourceGraph
    ) -> PathAnalysisResult:
        pid = snapshot.pid
        if pid not in self._event_sequences:
            self._event_sequences[pid] = []

        # Update event sequence history
        for ev in events:
            self._event_sequences[pid].append(ev.event_type.value)
        if len(self._event_sequences[pid]) > 20:
            self._event_sequences[pid] = self._event_sequences[pid][-20:]

        seq = self._event_sequences[pid]

        # Extract recent event types from current events and past 8 steps
        recent_events = [ev.event_type for ev in events]
        recent_seq_tail = seq[-8:] if seq else []

        # Count occurrences
        persistence_count = sum(1 for e in seq[-10:] if e == EventType.PERSISTENCE.value)
        has_recovery = EventType.RECOVERY in recent_events or (seq and seq[-1] == EventType.RECOVERY.value)
        has_cpu_spike = any(e in [EventType.CPU_SPIKE.value, EventType.CPU_INCREASE.value] for e in recent_seq_tail)
        has_mem_growth = any(e in [EventType.MEM_INCREASE.value, EventType.MEM_LEAK_TREND.value] for e in recent_seq_tail)
        has_thread_growth = any(e in [EventType.THREAD_INCREASE.value, EventType.THREAD_BURST.value] for e in recent_seq_tail)
        has_persistence = EventType.PERSISTENCE in recent_events or persistence_count > 0

        # State evaluation
        state = InstabilityState.NORMAL
        matched_pattern = "Standard Baseline"
        is_temporary = False
        is_confirmed = False
        diagnostic_summary = "Process operating within baseline resource envelopes."
        recommended_action = "Maintain standard 3.0s polling rate."

        # Case 1: Recovery detected
        if has_recovery and not (has_mem_growth and snapshot.memory_rss_mb > 500):
            state = InstabilityState.RECOVERED
            matched_pattern = "Anomalous Path → Recovery Transition"
            is_temporary = True
            diagnostic_summary = "Process resource metrics stabilized and successfully returned to nominal baseline."
            recommended_action = "Restore standard polling frequency; mark alert as resolved."
            self._anomaly_start_times.pop(pid, None)

        # Case 2: Confirmed Instability (Sustained repeated persistence across 3+ re-observation windows or extreme runaway)
        elif persistence_count >= 3 or (has_persistence and persistence_count >= 2 and (snapshot.cpu_percent >= 85.0 or snapshot.memory_rss_mb >= 500.0)):
            state = InstabilityState.CONFIRMED
            is_confirmed = True
            matched_pattern = "Mem Increase → Thread Burst → CPU Escalation → Persistent Runaway"
            diagnostic_summary = "Critical multi-resource runaway confirmed across consecutive re-observation cycles. High probability of memory leak, thread exhaustion, or deadlock."
            recommended_action = "Execute preventive process throttling, capture forensic memory dump, and dispatch high-priority alert."

        # Case 3: Developing Abnormal Behavior (Multi-resource escalation in progress)
        elif (has_mem_growth and has_thread_growth) or (has_mem_growth and has_cpu_spike) or (has_thread_growth and has_cpu_spike) or has_persistence:
            state = InstabilityState.DEVELOPING
            matched_pattern = "Correlated Multi-Resource Growth (Developing Instability)"
            diagnostic_summary = "Progressive cross-resource escalation observed (Memory + Thread / CPU drift). Potential resource leak or thread contention in progress."
            recommended_action = "Initiate Closed-Loop Burst Sampling (250ms); gather handle & page-fault telemetry."

        # Case 4: Suspicious (Single resource spike or initial abnormal delta)
        elif has_cpu_spike or has_mem_growth or has_thread_growth or snapshot.cpu_percent > 65.0:
            state = InstabilityState.SUSPICIOUS
            matched_pattern = "Isolated Resource Spike / Deviation"
            diagnostic_summary = "Unusual single-vector resource elevation detected. Monitoring for possible persistence or transient recovery."
            recommended_action = "Accelerate sampling rate to 1.0s to confirm or reject transient condition."

        # Case 5: Normal
        else:
            state = InstabilityState.NORMAL
            matched_pattern = "Stable Nominal Operation"
            diagnostic_summary = "All CPU, memory, and thread metrics adhere to normal operational baseline."
            recommended_action = "Standard baseline monitoring active."
            self._anomaly_start_times.pop(pid, None)

        # Handle anomaly duration tracking
        now = time.time()
        if state in [InstabilityState.SUSPICIOUS, InstabilityState.DEVELOPING, InstabilityState.CONFIRMED]:
            if pid not in self._anomaly_start_times:
                self._anomaly_start_times[pid] = now
            anomaly_duration = round(now - self._anomaly_start_times[pid], 1)
        else:
            anomaly_duration = 0.0

        # Calculate Health Index & Instability Score
        # Health index starts at 100 and degrades based on resource pressure & instability state
        cpu_penalty = min(35.0, (snapshot.cpu_percent / 100.0) * 35.0)
        mem_penalty = min(35.0, (snapshot.memory_rss_mb / 800.0) * 35.0)
        thread_penalty = min(15.0, (snapshot.thread_count / 150.0) * 15.0)

        state_penalty = {
            InstabilityState.NORMAL: 0.0,
            InstabilityState.RECOVERED: 5.0,
            InstabilityState.SUSPICIOUS: 20.0,
            InstabilityState.DEVELOPING: 45.0,
            InstabilityState.CONFIRMED: 75.0
        }.get(state, 0.0)

        health_index = max(5.0, min(100.0, 100.0 - (cpu_penalty * 0.4 + mem_penalty * 0.3 + thread_penalty * 0.2 + state_penalty)))
        instability_score = round(100.0 - health_index, 1)

        # Risk level determination
        if state == InstabilityState.CONFIRMED or instability_score >= 70.0:
            risk_level = RiskLevel.CRITICAL
        elif state == InstabilityState.DEVELOPING or instability_score >= 45.0:
            risk_level = RiskLevel.HIGH
        elif state == InstabilityState.SUSPICIOUS or instability_score >= 25.0:
            risk_level = RiskLevel.MODERATE
        else:
            risk_level = RiskLevel.LOW

        return PathAnalysisResult(
            pid=pid,
            process_name=snapshot.name,
            state=state,
            risk_level=risk_level,
            health_index=round(health_index, 1),
            instability_score=instability_score,
            matched_pattern=matched_pattern,
            path_sequence=list(seq),
            persistence_count=persistence_count,
            anomaly_duration_sec=anomaly_duration,
            is_temporary=is_temporary,
            is_confirmed=is_confirmed,
            diagnostic_summary=diagnostic_summary,
            recommended_action=recommended_action
        )

    def reset_process(self, pid: int):
        self._event_sequences.pop(pid, None)
        self._anomaly_start_times.pop(pid, None)
