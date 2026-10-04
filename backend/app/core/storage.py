import time
import json
import csv
import io
from typing import List, Dict, Optional, Any
from .models import ResourceEvent, ProcessDetail, PathAnalysisResult

class DiagnosticStorage:
    """
    Section 7.10 & 7.13: Diagnostic and Logging Module & System History Archive
    Records detected events, state transitions, forensic snapshots, and produces exportable audit reports.
    """

    def __init__(self, max_event_history: int = 500):
        self.max_event_history = max_event_history
        self._events: List[ResourceEvent] = []
        self._audit_logs: List[Dict[str, Any]] = []

    def record_event(self, event: ResourceEvent):
        """Stores a detected resource event."""
        self._events.insert(0, event)
        if len(self._events) > self.max_event_history:
            self._events.pop()

    def record_audit(self, pid: int, name: str, event_desc: str, state: str, risk: str, details: Dict[str, Any] = None):
        """Logs an audit entry with state, risk, and telemetry snapshot."""
        entry = {
            "timestamp": time.time(),
            "iso_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            "pid": pid,
            "process_name": name,
            "event_desc": event_desc,
            "state": state,
            "risk_level": risk,
            "details": details or {}
        }
        self._audit_logs.insert(0, entry)
        if len(self._audit_logs) > self.max_event_history:
            self._audit_logs.pop()

    def get_events(self, pid: Optional[int] = None, limit: int = 100) -> List[ResourceEvent]:
        if pid is not None:
            return [e for e in self._events if e.pid == pid][:limit]
        return self._events[:limit]

    def get_audit_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        return self._audit_logs[:limit]

    def export_events_csv(self) -> str:
        """Exports recorded events to CSV string."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Event ID", "Timestamp", "PID", "Process Name", "Event Type",
            "Delta CPU (%)", "Delta Mem (MB)", "Delta Threads",
            "Current CPU (%)", "Current Mem (MB)", "Current Threads",
            "Severity", "Description"
        ])
        for e in self._events:
            writer.writerow([
                e.event_id,
                time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(e.timestamp)),
                e.pid,
                e.process_name,
                e.event_type.value,
                e.delta_cpu,
                e.delta_mem_mb,
                e.delta_threads,
                e.current_cpu,
                e.current_mem_mb,
                e.current_threads,
                e.severity,
                e.description
            ])
        return output.getvalue()

    def export_diagnostic_report_json(self, process_details: List[Dict[str, Any]]) -> str:
        """Exports comprehensive JSON diagnostic archive."""
        report = {
            "system": "CrashShield X - Resource-Transition Graph Diagnostic Engine",
            "report_generated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            "total_events_logged": len(self._events),
            "recent_events": [e.model_dump() for e in self._events[:50]],
            "audit_trail": self._audit_logs[:50],
            "monitored_processes": process_details
        }
        return json.dumps(report, indent=2)
