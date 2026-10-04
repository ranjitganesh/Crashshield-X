import os
import sys
import time
import json
import urllib.parse
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler
import threading

# Force UTF-8 on Windows
os.environ["PYTHONUTF8"] = "1"
os.environ["PYTHONIOENCODING"] = "utf-8"

if sys.platform == "win32":
    try:
        if sys.stdout.encoding != 'utf-8':
            sys.stdout.reconfigure(encoding='utf-8')
        if sys.stderr.encoding != 'utf-8':
            sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure backend directory and project root are on sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.core.models import (
    ResourceSnapshot,
    ResourceEvent,
    TemporalResourceGraph,
    PathAnalysisResult,
    AdaptiveMonitoringStatus,
    ProcessDetail,
    SystemMetrics,
    ValidationScenarioResult,
    InstabilityState
)
from app.core.monitor import ProcessMonitor
from app.core.event_engine import ResourceEventEngine
from app.core.graph_engine import TemporalGraphEngine
from app.core.instability_analyzer import InstabilityPathAnalyzer
from app.core.adaptive_controller import AdaptiveMonitoringController
from app.core.scenario_runner import ScenarioRunner
from app.core.storage import DiagnosticStorage

# Singleton Subsystems
monitor = ProcessMonitor()
event_engine = ResourceEventEngine()
graph_engine = TemporalGraphEngine()
path_analyzer = InstabilityPathAnalyzer()
adaptive_controller = AdaptiveMonitoringController()
storage = DiagnosticStorage()

scenario_results_cache = {}
cached_analyses = {}
cached_adaptive = {}
target_selected_pid = None

def execute_pipeline(snap: ResourceSnapshot):
    events = event_engine.process_snapshot(snap)
    for ev in events:
        storage.record_event(ev)

    graph = graph_engine.get_or_create_graph(snap.pid, snap.name)
    analysis = path_analyzer.analyze_path(snap, events, graph)
    cached_analyses[snap.pid] = analysis

    graph = graph_engine.add_transition(snap, events, analysis.state)
    adaptive_status = adaptive_controller.update_adaptive_state(snap, analysis)
    cached_adaptive[snap.pid] = adaptive_status

    if events:
        storage.record_audit(
            pid=snap.pid,
            name=snap.name,
            event_desc=f"{events[0].event_type.value}: {events[0].description}",
            state=analysis.state.value,
            risk=analysis.risk_level.value,
            details={"cpu": snap.cpu_percent, "mem": snap.memory_rss_mb, "threads": snap.thread_count}
        )
    return events, graph, analysis, adaptive_status

# Initialize scenarios and initial simulation procs
for spec in ScenarioRunner.get_scenario_definitions():
    res = ScenarioRunner.execute_validation_test(spec["id"])
    scenario_results_cache[spec["id"]] = res

demo_snaps = ScenarioRunner.generate_scenario_steps("scenario_2")
for s in demo_snaps:
    monitor.register_simulated_process(s)
    execute_pipeline(s)
target_selected_pid = demo_snaps[0].pid

# Background monitoring thread
def background_sampling_loop():
    while True:
        try:
            snapshots = monitor.sample_all_processes(limit=35)
            for snap in snapshots:
                execute_pipeline(snap)
        except Exception as e:
            pass
        time.sleep(1.2)

bg_thread = threading.Thread(target=background_sampling_loop, daemon=True)
bg_thread.start()

class CrashShieldApiHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        try:
            if path == "/" or path == "/api" or path == "/api/health":
                self._send_json({"status": "healthy", "system": "CrashShield X Patent Engine"})

            elif path == "/api/system/metrics":
                state_counts = {}
                for a in cached_analyses.values():
                    state_counts[a.state.value] = state_counts.get(a.state.value, 0) + 1
                metrics = monitor.get_system_metrics(state_counts)
                self._send_json(metrics.model_dump())

            elif path == "/api/processes":
                limit = int(query.get("limit", [40])[0])
                snapshots = monitor.sample_all_processes(limit=limit)
                res = []
                for s in snapshots:
                    if s.pid in cached_analyses and s.pid in cached_adaptive:
                        analysis = cached_analyses[s.pid]
                        adaptive = cached_adaptive[s.pid]
                    else:
                        events, graph, analysis, adaptive = execute_pipeline(s)
                    res.append({
                        "snapshot": s.model_dump(),
                        "analysis": analysis.model_dump(),
                        "state": analysis.model_dump(),
                        "adaptive": adaptive.model_dump()
                    })
                self._send_json(res)

            elif path.startswith("/api/processes/") and path.endswith("/graph"):
                parts = path.split("/")
                pid = int(parts[3])
                graph = graph_engine.get_graph(pid)
                if graph:
                    self._send_json(graph.model_dump())
                else:
                    self._send_error_json(404, "Graph not found")

            elif path.startswith("/api/processes/") and path.endswith("/analysis"):
                parts = path.split("/")
                pid = int(parts[3])
                analysis = cached_analyses.get(pid)
                if analysis:
                    self._send_json(analysis.model_dump())
                else:
                    self._send_error_json(404, "Analysis not found")

            elif path.startswith("/api/processes/"):
                parts = path.split("/")
                pid = int(parts[3])
                history = monitor.get_process_history(pid)
                if history:
                    latest = history[-1]
                    graph = graph_engine.get_or_create_graph(pid, latest.name)
                    analysis = cached_analyses.get(pid) or path_analyzer.analyze_path(latest, [], graph)
                    adaptive = cached_adaptive.get(pid) or adaptive_controller.get_or_create_status(pid, latest.name)
                    events = storage.get_events(pid=pid, limit=20)
                    detail = ProcessDetail(
                        snapshot=latest,
                        events=events,
                        graph=graph,
                        analysis=analysis,
                        adaptive_status=adaptive,
                        telemetry_history=history[-30:]
                    )
                    self._send_json(detail.model_dump())
                else:
                    self._send_error_json(404, "Process not found")

            elif path == "/api/events":
                pid = int(query.get("pid", [0])[0]) if "pid" in query else None
                limit = int(query.get("limit", [100])[0])
                events = storage.get_events(pid=pid, limit=limit)
                self._send_json([e.model_dump() for e in events])

            elif path == "/api/audit-logs":
                logs = storage.get_audit_logs(limit=100)
                self._send_json(logs)

            elif path == "/api/scenarios":
                self._send_json(ScenarioRunner.get_scenario_definitions())

            elif path == "/api/scenarios/results":
                self._send_json([r.model_dump() for r in scenario_results_cache.values()])

            elif path == "/api/events/export/csv":
                csv_data = storage.export_events_csv()
                self.send_response(200)
                self.send_header("Content-Type", "text/csv")
                self.send_header("Content-Disposition", "attachment; filename=crashshield_events.csv")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(csv_data.encode("utf-8"))

            elif path == "/api/events/export/json":
                all_details = []
                for pid in list(cached_analyses.keys())[:15]:
                    hist = monitor.get_process_history(pid)
                    if hist:
                        latest = hist[-1]
                        all_details.append({
                            "pid": pid,
                            "name": latest.name,
                            "analysis": cached_analyses.get(pid).model_dump() if cached_analyses.get(pid) else None,
                            "history": [h.model_dump() for h in hist[-10:]]
                        })
                json_data = storage.export_diagnostic_report_json(all_details)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Disposition", "attachment; filename=crashshield_diagnostic.json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json_data.encode("utf-8"))

            else:
                self._send_error_json(404, "Endpoint not found")
        except Exception as e:
            self._send_error_json(500, str(e))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            content_len = int(self.headers.get('Content-Length', 0))
            body_bytes = self.rfile.read(content_len) if content_len > 0 else b"{}"
            body = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}

            if path.startswith("/api/scenarios/run/"):
                scenario_id = path.split("/")[-1]
                res = ScenarioRunner.execute_validation_test(scenario_id)
                scenario_results_cache[scenario_id] = res

                # Stream steps to monitor
                steps = ScenarioRunner.generate_scenario_steps(scenario_id)
                for snap in steps:
                    monitor.register_simulated_process(snap)
                    execute_pipeline(snap)

                global target_selected_pid
                target_selected_pid = steps[0].pid
                self._send_json(res.model_dump())

            elif path == "/api/workload/inject":
                snap = ResourceSnapshot(
                    pid=body.get("pid", 8080),
                    name=body.get("name", "worker_simulation.exe"),
                    timestamp=time.time(),
                    cpu_percent=float(body.get("cpu_percent", 75.0)),
                    memory_rss_mb=float(body.get("memory_rss_mb", 350.0)),
                    memory_percent=round((float(body.get("memory_rss_mb", 350.0)) / 16384) * 100, 1),
                    thread_count=int(body.get("thread_count", 32)),
                    is_simulated=True
                )
                monitor.register_simulated_process(snap)
                events, graph, analysis, adaptive = execute_pipeline(snap)
                target_selected_pid = snap.pid
                self._send_json({
                    "status": "injected",
                    "snapshot": snap.model_dump(),
                    "events_detected": len(events),
                    "state": analysis.state.value,
                    "adaptive_mode": adaptive.sampling_mode
                })

            elif path.startswith("/api/processes/") and path.endswith("/select"):
                pid = int(path.split("/")[3])
                target_selected_pid = pid
                self._send_json({"status": "focused", "pid": pid})

            elif path.startswith("/api/processes/") and path.endswith("/reset"):
                pid = int(path.split("/")[3])
                event_engine.reset_process(pid)
                graph_engine.reset_graph(pid)
                path_analyzer.reset_process(pid)
                adaptive_controller.reset_process(pid)
                cached_analyses.pop(pid, None)
                cached_adaptive.pop(pid, None)
                monitor.remove_simulated_process(pid)
                self._send_json({"status": "reset", "pid": pid})

            else:
                self._send_error_json(404, "Endpoint not found")
        except Exception as e:
            self._send_error_json(500, str(e))

    def _send_json(self, data):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def _send_error_json(self, status_code, message):
        payload = json.dumps({"error": message, "status": status_code}).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        # Concise logging
        return

def run_server(port=8000):
    print("=" * 79, flush=True)
    print("  CRASHSHIELD X - Process Monitoring & Instability Detection Engine", flush=True)
    print(f"  Backend Server active and listening on http://localhost:{port}", flush=True)
    print(f"  API Health Check: http://localhost:{port}/api/system/metrics", flush=True)
    print("=" * 79, flush=True)
    httpd = ThreadingHTTPServer(("0.0.0.0", port), CrashShieldApiHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
