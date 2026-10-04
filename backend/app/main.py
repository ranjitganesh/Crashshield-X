import asyncio
import time
import logging
from typing import Dict, List, Optional, Any, Tuple
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from .core.models import (
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
    from .core.monitor import ProcessMonitor
    from .core.event_engine import ResourceEventEngine
    from .core.graph_engine import TemporalGraphEngine
    from .core.instability_analyzer import InstabilityPathAnalyzer
    from .core.adaptive_controller import AdaptiveMonitoringController
    from .core.scenario_runner import ScenarioRunner
    from .core.storage import DiagnosticStorage
except (ImportError, ValueError):
    from core.models import (
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
    from core.monitor import ProcessMonitor
    from core.event_engine import ResourceEventEngine
    from core.graph_engine import TemporalGraphEngine
    from core.instability_analyzer import InstabilityPathAnalyzer
    from core.adaptive_controller import AdaptiveMonitoringController
    from core.scenario_runner import ScenarioRunner
    from core.storage import DiagnosticStorage

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("crashshield.main")

# Initialize Singleton Subsystems
monitor = ProcessMonitor()
event_engine = ResourceEventEngine()
graph_engine = TemporalGraphEngine()
path_analyzer = InstabilityPathAnalyzer()
adaptive_controller = AdaptiveMonitoringController()
storage = DiagnosticStorage()

# Validation test results cache
scenario_results_cache: Dict[str, ValidationScenarioResult] = {}
# Active WebSocket connections
active_connections: List[WebSocket] = []

# Background monitoring loop control
is_monitoring_active = True
target_selected_pid: Optional[int] = None

# Track cached states per process
cached_analyses: Dict[int, PathAnalysisResult] = {}
cached_adaptive: Dict[int, AdaptiveMonitoringStatus] = {}

def execute_pipeline_for_process(snap: ResourceSnapshot) -> Tuple[List[ResourceEvent], TemporalResourceGraph, PathAnalysisResult, AdaptiveMonitoringStatus]:
    # 1. Event Detection
    events = event_engine.process_snapshot(snap)
    for ev in events:
        storage.record_event(ev)

    # 2. Get Graph
    graph = graph_engine.get_or_create_graph(snap.pid, snap.name)

    # 3. Path Analysis
    analysis = path_analyzer.analyze_path(snap, events, graph)
    cached_analyses[snap.pid] = analysis

    # 4. Add Transition Node & Edge to Graph
    graph = graph_engine.add_transition(snap, events, analysis.state)

    # 5. Adaptive Closed-Loop Controller
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

async def monitoring_background_worker():
    """
    Background continuous monitoring engine.
    Samples processes at regular intervals and dynamically accelerates sampling for suspicious processes.
    """
    logger.info("Starting CrashShield X Continuous Monitoring Worker...")
    while is_monitoring_active:
        try:
            # 1. Sample processes
            snapshots = monitor.sample_all_processes(limit=35)
            state_counts = {"Normal": 0, "Suspicious": 0, "Developing": 0, "Confirmed": 0, "Recovered": 0}

            # 2. Process each snapshot through the CrashShield X pipeline
            for snap in snapshots:
                events, graph, analysis, adaptive_status = execute_pipeline_for_process(snap)
                state_counts[analysis.state.value] = state_counts.get(analysis.state.value, 0) + 1

            # 3. Compute System Metrics
            sys_metrics = monitor.get_system_metrics(state_counts)

            # 4. Broadcast to WebSockets
            if active_connections:
                payload = {
                    "type": "TELEMETRY_TICK",
                    "timestamp": time.time(),
                    "system_metrics": sys_metrics.model_dump(),
                    "processes": [
                        {
                            "snapshot": snap.model_dump(),
                            "state": cached_analyses.get(snap.pid, PathAnalysisResult(
                                pid=snap.pid, process_name=snap.name, state=InstabilityState.NORMAL,
                                risk_level="LOW", health_index=100.0, instability_score=0.0,
                                matched_pattern="Baseline", path_sequence=[], persistence_count=0,
                                anomaly_duration_sec=0.0, is_temporary=False, is_confirmed=False,
                                diagnostic_summary="", recommended_action=""
                            )).model_dump(),
                            "adaptive": cached_adaptive.get(snap.pid, AdaptiveMonitoringStatus(pid=snap.pid, process_name=snap.name)).model_dump()
                        }
                        for snap in snapshots[:25]
                    ]
                }

                # Send selected process detail if specified
                if target_selected_pid is not None:
                    sel_graph = graph_engine.get_graph(target_selected_pid)
                    sel_analysis = cached_analyses.get(target_selected_pid)
                    sel_adaptive = cached_adaptive.get(target_selected_pid)
                    sel_history = monitor.get_process_history(target_selected_pid)
                    if sel_graph and sel_analysis and sel_adaptive:
                        payload["selected_process"] = {
                            "pid": target_selected_pid,
                            "graph": sel_graph.model_dump(),
                            "analysis": sel_analysis.model_dump(),
                            "adaptive": sel_adaptive.model_dump(),
                            "history": [h.model_dump() for h in sel_history[-30:]]
                        }

                dead_conns = []
                for ws in active_connections:
                    try:
                        await ws.send_json(payload)
                    except Exception:
                        dead_conns.append(ws)
                for dc in dead_conns:
                    if dc in active_connections:
                        active_connections.remove(dc)

        except Exception as e:
            logger.error(f"Error in background monitoring loop: {e}", exc_info=True)

        await asyncio.sleep(1.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize 4 validation test cases on startup
    for spec in ScenarioRunner.get_scenario_definitions():
        res = ScenarioRunner.execute_validation_test(spec["id"])
        scenario_results_cache[spec["id"]] = res

    # Register initial simulated demo processes
    demo_snaps = ScenarioRunner.generate_scenario_steps("scenario_2")
    for s in demo_snaps[:2]:
        monitor.register_simulated_process(s)
        execute_pipeline_for_process(s)

    worker_task = asyncio.create_task(monitoring_background_worker())
    yield
    worker_task.cancel()

app = FastAPI(
    title="CrashShield X: Resource-Transition Graph Monitoring System",
    description="Backend API for Resource-Transition Graph Based Adaptive Process Instability Detection and Closed-Loop Preventive Monitoring System",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- REST Endpoints -----------------

@app.get("/api/system/metrics", response_model=SystemMetrics)
def get_system_metrics():
    state_counts = {}
    for a in cached_analyses.values():
        state_counts[a.state.value] = state_counts.get(a.state.value, 0) + 1
    return monitor.get_system_metrics(state_counts)

@app.get("/api/processes")
def get_processes(limit: int = 40):
    snapshots = monitor.sample_all_processes(limit=limit)
    res = []
    for s in snapshots:
        analysis = cached_analyses.get(s.pid)
        adaptive = cached_adaptive.get(s.pid)
        res.append({
            "snapshot": s.model_dump(),
            "analysis": analysis.model_dump() if analysis else None,
            "adaptive": adaptive.model_dump() if adaptive else None
        })
    return res

@app.get("/api/processes/{pid}", response_model=ProcessDetail)
def get_process_detail(pid: int):
    history = monitor.get_process_history(pid)
    if not history:
        raise HTTPException(status_code=404, detail=f"Process with PID {pid} not found.")

    latest_snap = history[-1]
    graph = graph_engine.get_or_create_graph(pid, latest_snap.name)
    analysis = cached_analyses.get(pid) or path_analyzer.analyze_path(latest_snap, [], graph)
    adaptive = cached_adaptive.get(pid) or adaptive_controller.get_or_create_status(pid, latest_snap.name)
    events = storage.get_events(pid=pid, limit=20)

    return ProcessDetail(
        snapshot=latest_snap,
        events=events,
        graph=graph,
        analysis=analysis,
        adaptive_status=adaptive,
        telemetry_history=history[-30:]
    )

@app.get("/api/processes/{pid}/graph", response_model=TemporalResourceGraph)
def get_process_graph(pid: int):
    graph = graph_engine.get_graph(pid)
    if not graph:
        raise HTTPException(status_code=404, detail=f"Graph for PID {pid} not found.")
    return graph

@app.get("/api/processes/{pid}/analysis", response_model=PathAnalysisResult)
def get_process_analysis(pid: int):
    analysis = cached_analyses.get(pid)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Analysis for PID {pid} not found.")
    return analysis

@app.get("/api/events", response_model=List[ResourceEvent])
def get_events(pid: Optional[int] = None, limit: int = 100):
    return storage.get_events(pid=pid, limit=limit)

@app.get("/api/audit-logs")
def get_audit_logs(limit: int = 100):
    return storage.get_audit_logs(limit=limit)

@app.get("/api/events/export/csv")
def export_events_csv():
    csv_data = storage.export_events_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=crashshield_events.csv"}
    )

@app.get("/api/events/export/json")
def export_events_json():
    # Gather all process details for export
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
    return Response(
        content=json_data,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=crashshield_diagnostic_report.json"}
    )

# ----------------- Patent Section 8 Validation Endpoints -----------------

@app.get("/api/scenarios")
def get_scenarios():
    return ScenarioRunner.get_scenario_definitions()

@app.get("/api/scenarios/results")
def get_scenario_results():
    return list(scenario_results_cache.values())

@app.post("/api/scenarios/run/{scenario_id}", response_model=ValidationScenarioResult)
async def run_scenario(scenario_id: str):
    # Execute full validation test
    result = ScenarioRunner.execute_validation_test(scenario_id)
    scenario_results_cache[scenario_id] = result

    # Also register the scenario steps into the live monitor for real-time visual streaming
    steps = ScenarioRunner.generate_scenario_steps(scenario_id)
    for snap in steps:
        monitor.register_simulated_process(snap)
        execute_pipeline_for_process(snap)

    global target_selected_pid
    target_selected_pid = steps[0].pid

    return result

class WorkloadInjectRequest(BaseModel):
    pid: int
    name: str
    cpu_percent: float
    memory_rss_mb: float
    thread_count: int

@app.post("/api/workload/inject")
def inject_custom_workload(req: WorkloadInjectRequest):
    snap = ResourceSnapshot(
        pid=req.pid,
        name=req.name,
        timestamp=time.time(),
        cpu_percent=req.cpu_percent,
        memory_rss_mb=req.memory_rss_mb,
        memory_percent=round((req.memory_rss_mb / 16384) * 100, 1),
        thread_count=req.thread_count,
        is_simulated=True
    )
    monitor.register_simulated_process(snap)
    events, graph, analysis, adaptive = execute_pipeline_for_process(snap)
    
    global target_selected_pid
    target_selected_pid = req.pid

    return {
        "status": "injected",
        "snapshot": snap.model_dump(),
        "events_detected": len(events),
        "state": analysis.state.value,
        "adaptive_mode": adaptive.sampling_mode
    }

@app.post("/api/processes/{pid}/select")
def select_process_focus(pid: int):
    global target_selected_pid
    target_selected_pid = pid
    return {"status": "focused", "pid": pid}

@app.post("/api/processes/{pid}/reset")
def reset_process(pid: int):
    event_engine.reset_process(pid)
    graph_engine.reset_graph(pid)
    path_analyzer.reset_process(pid)
    adaptive_controller.reset_process(pid)
    cached_analyses.pop(pid, None)
    cached_adaptive.pop(pid, None)
    monitor.remove_simulated_process(pid)
    return {"status": "reset", "pid": pid}

# ----------------- WebSocket Live Stream -----------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    logger.info(f"WebSocket client connected. Total clients: {len(active_connections)}")
    try:
        while True:
            data = await websocket.receive_json()
            # Handle client commands like focusing a specific process
            if data.get("action") == "SELECT_PID":
                global target_selected_pid
                target_selected_pid = data.get("pid")
                logger.info(f"Client requested focus on PID: {target_selected_pid}")
            elif data.get("action") == "PING":
                await websocket.send_json({"type": "PONG", "timestamp": time.time()})
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(active_connections)}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)
