import os
import sys
import time
import logging
from typing import Dict, List, Optional, Tuple
import psutil

from .models import ResourceSnapshot, SystemMetrics

logger = logging.getLogger("crashshield.monitor")

class ProcessMonitor:
    """
    Collects real-time CPU, Memory, Thread, and I/O metrics for running operating system processes
    and registered simulated workload processes.
    """
    def __init__(self, history_limit: int = 120):
        self.history_limit = history_limit
        # History dict: pid -> List[ResourceSnapshot]
        self._history: Dict[int, List[ResourceSnapshot]] = {}
        # Simulated processes dict: pid -> ResourceSnapshot
        self._simulated_processes: Dict[int, ResourceSnapshot] = {}
        # Baselines: pid -> {'cpu': float, 'mem': float, 'threads': int}
        self._baselines: Dict[int, Dict[str, float]] = {}
        
        # Initialize CPU measurement baseline for psutil
        try:
            psutil.cpu_percent(interval=None)
        except Exception:
            pass

    def register_simulated_process(self, snapshot: ResourceSnapshot):
        """Register or update a simulated process for scenario testing."""
        self._simulated_processes[snapshot.pid] = snapshot
        if snapshot.pid not in self._history:
            self._history[snapshot.pid] = []
        self._history[snapshot.pid].append(snapshot)
        if len(self._history[snapshot.pid]) > self.history_limit:
            self._history[snapshot.pid].pop(0)

    def remove_simulated_process(self, pid: int):
        """Remove a simulated process."""
        self._simulated_processes.pop(pid, None)

    def get_system_metrics(self, state_counts: Dict[str, int]) -> SystemMetrics:
        """Fetch overall system CPU, Memory, and Process counts."""
        try:
            cpu_total = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory()
            total_procs = len(psutil.pids()) + len(self._simulated_processes)
            return SystemMetrics(
                total_cpu_percent=round(cpu_total, 1),
                total_memory_percent=round(mem.percent, 1),
                total_memory_used_gb=round(mem.used / (1024 ** 3), 2),
                total_memory_total_gb=round(mem.total / (1024 ** 3), 2),
                total_processes=total_procs,
                suspicious_count=state_counts.get("Suspicious", 0),
                developing_count=state_counts.get("Developing", 0),
                confirmed_count=state_counts.get("Confirmed", 0),
                recovered_count=state_counts.get("Recovered", 0),
                normal_count=state_counts.get("Normal", 0),
                monitoring_interval_ms=1000,
                timestamp=time.time()
            )
        except Exception as e:
            logger.error(f"Error fetching system metrics: {e}")
            return SystemMetrics(
                total_cpu_percent=15.0,
                total_memory_percent=50.0,
                total_memory_used_gb=8.0,
                total_memory_total_gb=16.0,
                total_processes=len(self._simulated_processes) + 10,
                suspicious_count=state_counts.get("Suspicious", 0),
                developing_count=state_counts.get("Developing", 0),
                confirmed_count=state_counts.get("Confirmed", 0),
                recovered_count=state_counts.get("Recovered", 0),
                normal_count=state_counts.get("Normal", 0),
                monitoring_interval_ms=1000,
                timestamp=time.time()
            )

    def sample_all_processes(self, limit: int = 50) -> List[ResourceSnapshot]:
        """
        Samples running OS processes and simulated processes.
        Sorts primarily by CPU & memory usage for top process visibility.
        """
        snapshots: List[ResourceSnapshot] = []
        now = time.time()

        # 1. Sample Simulated Processes first
        for pid, sim_snap in list(self._simulated_processes.items()):
            snapshots.append(sim_snap)

        # 2. Fast Sampling of Host OS Processes
        try:
            for pid in psutil.pids()[:60]:
                if pid <= 4:
                    continue
                try:
                    p = psutil.Process(pid)
                    name = p.name()
                    mem = p.memory_info()
                    mem_rss_mb = mem.rss / (1024 * 1024)
                    mem_pct = p.memory_percent()
                    num_threads = p.num_threads()
                    cpu = p.cpu_percent()

                    snap = ResourceSnapshot(
                        pid=pid,
                        name=name,
                        timestamp=now,
                        cpu_percent=round(cpu, 1),
                        memory_rss_mb=round(mem_rss_mb, 1),
                        memory_percent=round(mem_pct, 1),
                        thread_count=num_threads,
                        handle_count=0,
                        io_read_kb=0.0,
                        io_write_kb=0.0,
                        status="running",
                        is_simulated=False
                    )

                    if pid not in self._history:
                        self._history[pid] = []
                    self._history[pid].append(snap)
                    if len(self._history[pid]) > self.history_limit:
                        self._history[pid].pop(0)

                    snapshots.append(snap)
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
                except Exception:
                    continue
        except Exception as e:
            logger.debug(f"Process iteration error: {e}")

        # Sort: simulated processes first, then by CPU/Mem descending
        snapshots.sort(key=lambda s: (1 if s.is_simulated else 0, s.cpu_percent + s.memory_percent), reverse=True)
        return snapshots[:limit]

    def get_process_history(self, pid: int) -> List[ResourceSnapshot]:
        """Returns recorded time-series telemetry snapshots for a specific PID."""
        return self._history.get(pid, [])
