import time
import uuid
from typing import Dict, List, Optional, Tuple
from collections import deque

from .models import ResourceSnapshot, ResourceEvent, EventType

class ResourceEventEngine:
    """
    Section 7.3: Resource Event Engine
    Detects important changes in process CPU, memory, and thread activity.
    Converts raw resource changes into discrete semantic events:
    - CPU Increase / Spike / Normal
    - Memory Increase / Leak Trend / Normal
    - Thread Increase / Burst / Normal
    - Persistence (consecutive sustained abnormal readings)
    - Recovery (return to baseline)
    """

    def __init__(
        self,
        cpu_increase_threshold: float = 15.0,  # +15% CPU delta
        cpu_spike_threshold: float = 40.0,     # +40% CPU delta or >80% total
        mem_increase_threshold_mb: float = 20.0, # +20MB delta
        mem_percent_threshold: float = 10.0,   # +10% RAM delta
        thread_increase_threshold: int = 5,    # +5 threads
        persistence_window: int = 3            # >= 3 abnormal observations
    ):
        self.cpu_inc_thresh = cpu_increase_threshold
        self.cpu_spike_thresh = cpu_spike_threshold
        self.mem_inc_thresh = mem_increase_threshold_mb
        self.mem_pct_thresh = mem_percent_threshold
        self.thread_inc_thresh = thread_increase_threshold
        self.persistence_window = persistence_window

        # Process sliding baselines and previous snapshots
        # pid -> deque of ResourceSnapshot (window of 10)
        self._sliding_windows: Dict[int, deque] = {}
        # pid -> previous ResourceSnapshot
        self._prev_snapshots: Dict[int, ResourceSnapshot] = {}
        # pid -> consecutive abnormal observation counter
        self._abnormal_counters: Dict[int, int] = {}
        # pid -> was previously in abnormal state
        self._was_abnormal: Dict[int, bool] = {}

    def process_snapshot(self, snapshot: ResourceSnapshot) -> List[ResourceEvent]:
        """
        Evaluates a new process snapshot against previous values & sliding baseline.
        Generates corresponding ResourceEvents.
        """
        pid = snapshot.pid
        events: List[ResourceEvent] = []

        if pid not in self._sliding_windows:
            self._sliding_windows[pid] = deque(maxlen=10)
            self._abnormal_counters[pid] = 0
            self._was_abnormal[pid] = False

        window = self._sliding_windows[pid]
        prev = self._prev_snapshots.get(pid)

        # First observation for this PID: establish baseline
        if prev is None:
            self._prev_snapshots[pid] = snapshot
            window.append(snapshot)
            return events

        # Calculate deltas against previous immediate observation
        delta_cpu = snapshot.cpu_percent - prev.cpu_percent
        delta_mem_mb = snapshot.memory_rss_mb - prev.memory_rss_mb
        delta_threads = snapshot.thread_count - prev.thread_count

        # Calculate average baseline from sliding window
        avg_cpu = sum(s.cpu_percent for s in window) / len(window) if window else snapshot.cpu_percent
        avg_mem = sum(s.memory_rss_mb for s in window) / len(window) if window else snapshot.memory_rss_mb
        avg_threads = sum(s.thread_count for s in window) / len(window) if window else snapshot.thread_count

        is_cpu_abnormal = False
        is_mem_abnormal = False
        is_thread_abnormal = False

        # 1. CPU Event Detection
        if delta_cpu >= self.cpu_spike_thresh or snapshot.cpu_percent >= 80.0:
            is_cpu_abnormal = True
            events.append(ResourceEvent(
                event_id=str(uuid.uuid4())[:8],
                pid=pid,
                process_name=snapshot.name,
                timestamp=snapshot.timestamp,
                event_type=EventType.CPU_SPIKE,
                delta_cpu=round(delta_cpu, 1),
                delta_mem_mb=round(delta_mem_mb, 1),
                delta_threads=delta_threads,
                current_cpu=snapshot.cpu_percent,
                current_mem_mb=snapshot.memory_rss_mb,
                current_threads=snapshot.thread_count,
                severity="WARNING" if snapshot.cpu_percent < 90 else "CRITICAL",
                description=f"Sharp CPU surge: {snapshot.cpu_percent:.1f}% (delta: +{delta_cpu:.1f}%)"
            ))
        elif delta_cpu >= self.cpu_inc_thresh:
            is_cpu_abnormal = True
            events.append(ResourceEvent(
                event_id=str(uuid.uuid4())[:8],
                pid=pid,
                process_name=snapshot.name,
                timestamp=snapshot.timestamp,
                event_type=EventType.CPU_INCREASE,
                delta_cpu=round(delta_cpu, 1),
                delta_mem_mb=round(delta_mem_mb, 1),
                delta_threads=delta_threads,
                current_cpu=snapshot.cpu_percent,
                current_mem_mb=snapshot.memory_rss_mb,
                current_threads=snapshot.thread_count,
                severity="INFO",
                description=f"CPU increase detected: {snapshot.cpu_percent:.1f}% (delta: +{delta_cpu:.1f}%)"
            ))

        # 2. Memory Event Detection
        if delta_mem_mb >= self.mem_inc_thresh * 2 or (len(window) >= 4 and all(s.memory_rss_mb < snapshot.memory_rss_mb for s in list(window)[-3:])):
            is_mem_abnormal = True
            events.append(ResourceEvent(
                event_id=str(uuid.uuid4())[:8],
                pid=pid,
                process_name=snapshot.name,
                timestamp=snapshot.timestamp,
                event_type=EventType.MEM_LEAK_TREND if delta_mem_mb < self.mem_inc_thresh * 2 else EventType.MEM_INCREASE,
                delta_cpu=round(delta_cpu, 1),
                delta_mem_mb=round(delta_mem_mb, 1),
                delta_threads=delta_threads,
                current_cpu=snapshot.cpu_percent,
                current_mem_mb=snapshot.memory_rss_mb,
                current_threads=snapshot.thread_count,
                severity="WARNING",
                description=f"Memory monotonic growth / leak pattern: {snapshot.memory_rss_mb:.1f}MB (delta: +{delta_mem_mb:.1f}MB)"
            ))
        elif delta_mem_mb >= self.mem_inc_thresh:
            is_mem_abnormal = True
            events.append(ResourceEvent(
                event_id=str(uuid.uuid4())[:8],
                pid=pid,
                process_name=snapshot.name,
                timestamp=snapshot.timestamp,
                event_type=EventType.MEM_INCREASE,
                delta_cpu=round(delta_cpu, 1),
                delta_mem_mb=round(delta_mem_mb, 1),
                delta_threads=delta_threads,
                current_cpu=snapshot.cpu_percent,
                current_mem_mb=snapshot.memory_rss_mb,
                current_threads=snapshot.thread_count,
                severity="INFO",
                description=f"Memory increase detected: {snapshot.memory_rss_mb:.1f}MB (delta: +{delta_mem_mb:.1f}MB)"
            ))

        # 3. Thread Event Detection
        if delta_threads >= self.thread_inc_thresh * 3 or snapshot.thread_count > 100:
            is_thread_abnormal = True
            events.append(ResourceEvent(
                event_id=str(uuid.uuid4())[:8],
                pid=pid,
                process_name=snapshot.name,
                timestamp=snapshot.timestamp,
                event_type=EventType.THREAD_BURST,
                delta_cpu=round(delta_cpu, 1),
                delta_mem_mb=round(delta_mem_mb, 1),
                delta_threads=delta_threads,
                current_cpu=snapshot.cpu_percent,
                current_mem_mb=snapshot.memory_rss_mb,
                current_threads=snapshot.thread_count,
                severity="WARNING",
                description=f"Thread burst explosion: {snapshot.thread_count} threads (delta: +{delta_threads})"
            ))
        elif delta_threads >= self.thread_inc_thresh:
            is_thread_abnormal = True
            events.append(ResourceEvent(
                event_id=str(uuid.uuid4())[:8],
                pid=pid,
                process_name=snapshot.name,
                timestamp=snapshot.timestamp,
                event_type=EventType.THREAD_INCREASE,
                delta_cpu=round(delta_cpu, 1),
                delta_mem_mb=round(delta_mem_mb, 1),
                delta_threads=delta_threads,
                current_cpu=snapshot.cpu_percent,
                current_mem_mb=snapshot.memory_rss_mb,
                current_threads=snapshot.thread_count,
                severity="INFO",
                description=f"Thread count increased: {snapshot.thread_count} threads (delta: +{delta_threads})"
            ))

        # 4. Persistence and Recovery Logic
        is_currently_abnormal = is_cpu_abnormal or is_mem_abnormal or is_thread_abnormal or snapshot.cpu_percent > 70.0 or snapshot.memory_rss_mb > 500.0

        if is_currently_abnormal:
            self._abnormal_counters[pid] += 1
            self._was_abnormal[pid] = True
            if self._abnormal_counters[pid] >= self.persistence_window:
                events.append(ResourceEvent(
                    event_id=str(uuid.uuid4())[:8],
                    pid=pid,
                    process_name=snapshot.name,
                    timestamp=snapshot.timestamp,
                    event_type=EventType.PERSISTENCE,
                    delta_cpu=round(delta_cpu, 1),
                    delta_mem_mb=round(delta_mem_mb, 1),
                    delta_threads=delta_threads,
                    current_cpu=snapshot.cpu_percent,
                    current_mem_mb=snapshot.memory_rss_mb,
                    current_threads=snapshot.thread_count,
                    severity="CRITICAL",
                    description=f"Abnormal resource consumption sustained over {self._abnormal_counters[pid]} consecutive observation cycles"
                ))
        else:
            # Check if this is a Recovery event
            if self._was_abnormal[pid]:
                events.append(ResourceEvent(
                    event_id=str(uuid.uuid4())[:8],
                    pid=pid,
                    process_name=snapshot.name,
                    timestamp=snapshot.timestamp,
                    event_type=EventType.RECOVERY,
                    delta_cpu=round(delta_cpu, 1),
                    delta_mem_mb=round(delta_mem_mb, 1),
                    delta_threads=delta_threads,
                    current_cpu=snapshot.cpu_percent,
                    current_mem_mb=snapshot.memory_rss_mb,
                    current_threads=snapshot.thread_count,
                    severity="INFO",
                    description=f"Process resource parameters normalized back to baseline ({snapshot.cpu_percent:.1f}% CPU, {snapshot.memory_rss_mb:.1f}MB, {snapshot.thread_count} threads)"
                ))
                self._was_abnormal[pid] = False
            self._abnormal_counters[pid] = 0

        # Update tracking references
        self._prev_snapshots[pid] = snapshot
        window.append(snapshot)

        return events

    def reset_process(self, pid: int):
        """Reset state tracking for a specific PID."""
        self._sliding_windows.pop(pid, None)
        self._prev_snapshots.pop(pid, None)
        self._abnormal_counters.pop(pid, None)
        self._was_abnormal.pop(pid, None)
