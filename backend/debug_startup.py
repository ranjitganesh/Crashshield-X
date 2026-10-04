import sys
import os

print("[1] Python starts", flush=True)
import uvicorn
print("[2] Uvicorn imported", flush=True)
import fastapi
print("[3] FastAPI imported", flush=True)
import psutil
print("[4] psutil imported", flush=True)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.core.models import ResourceSnapshot
print("[5] Models imported", flush=True)
from app.core.monitor import ProcessMonitor
print("[6] Monitor imported", flush=True)
from app.core.event_engine import ResourceEventEngine
print("[7] EventEngine imported", flush=True)
from app.core.graph_engine import TemporalGraphEngine
print("[8] GraphEngine imported", flush=True)
from app.core.instability_analyzer import InstabilityPathAnalyzer
print("[9] Analyzer imported", flush=True)
from app.core.adaptive_controller import AdaptiveMonitoringController
print("[10] Adaptive imported", flush=True)
from app.core.scenario_runner import ScenarioRunner
print("[11] ScenarioRunner imported", flush=True)
from app.core.storage import DiagnosticStorage
print("[12] Storage imported", flush=True)
from app.main import app
print("[13] App imported successfully!", flush=True)
