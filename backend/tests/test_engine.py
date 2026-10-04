import pytest
import time
from backend.app.core.models import (
    ResourceSnapshot,
    EventType,
    InstabilityState,
    RiskLevel
)
from backend.app.core.event_engine import ResourceEventEngine
from backend.app.core.graph_engine import TemporalGraphEngine
from backend.app.core.instability_analyzer import InstabilityPathAnalyzer
from backend.app.core.adaptive_controller import AdaptiveMonitoringController
from backend.app.core.scenario_runner import ScenarioRunner

def test_event_engine_cpu_spike():
    engine = ResourceEventEngine(cpu_increase_threshold=15.0, cpu_spike_threshold=40.0)
    pid = 1001
    
    # Baseline
    snap1 = ResourceSnapshot(pid=pid, name="test.exe", timestamp=100.0, cpu_percent=5.0, memory_rss_mb=50.0, thread_count=4)
    events1 = engine.process_snapshot(snap1)
    assert len(events1) == 0

    # CPU Spike (+75%)
    snap2 = ResourceSnapshot(pid=pid, name="test.exe", timestamp=101.0, cpu_percent=80.0, memory_rss_mb=52.0, thread_count=4)
    events2 = engine.process_snapshot(snap2)
    assert len(events2) >= 1
    assert any(e.event_type == EventType.CPU_SPIKE for e in events2)

def test_event_engine_memory_leak_and_recovery():
    engine = ResourceEventEngine(mem_increase_threshold_mb=20.0)
    pid = 1002
    
    # Step 1: Baseline
    engine.process_snapshot(ResourceSnapshot(pid=pid, name="app.exe", timestamp=100.0, cpu_percent=5.0, memory_rss_mb=50.0, thread_count=4))
    
    # Step 2: Memory increase (+60MB)
    events = engine.process_snapshot(ResourceSnapshot(pid=pid, name="app.exe", timestamp=101.0, cpu_percent=5.0, memory_rss_mb=110.0, thread_count=4))
    assert any(e.event_type in [EventType.MEM_INCREASE, EventType.MEM_LEAK_TREND] for e in events)

    # Step 3: Return to normal (Recovery)
    rec_events = engine.process_snapshot(ResourceSnapshot(pid=pid, name="app.exe", timestamp=102.0, cpu_percent=5.0, memory_rss_mb=50.0, thread_count=4))
    assert any(e.event_type == EventType.RECOVERY for e in rec_events)

def test_temporal_graph_construction():
    graph_engine = TemporalGraphEngine()
    pid = 2001
    name = "worker.exe"
    
    snap1 = ResourceSnapshot(pid=pid, name=name, timestamp=100.0, cpu_percent=5.0, memory_rss_mb=50.0, thread_count=4)
    graph = graph_engine.add_transition(snap1, [], InstabilityState.NORMAL)
    assert len(graph.nodes) >= 1

    snap2 = ResourceSnapshot(pid=pid, name=name, timestamp=102.0, cpu_percent=75.0, memory_rss_mb=55.0, thread_count=4)
    graph = graph_engine.add_transition(snap2, [], InstabilityState.SUSPICIOUS)
    assert len(graph.nodes) >= 2
    assert len(graph.edges) >= 1
    assert graph.edges[-1].source == graph.nodes[-2].id
    assert graph.edges[-1].target == graph.nodes[-1].id

def test_closed_loop_adaptive_controller():
    controller = AdaptiveMonitoringController(base_interval_sec=3.0, accelerated_interval_sec=1.0, burst_interval_sec=0.25)
    pid = 3001
    name = "service.exe"
    snap = ResourceSnapshot(pid=pid, name=name, timestamp=100.0, cpu_percent=5.0, memory_rss_mb=50.0, thread_count=4)

    # 1. Normal state -> 3.0s Standard
    status = controller.get_or_create_status(pid, name)
    assert status.sampling_mode == "STANDARD"
    assert status.current_interval_sec == 3.0

    # 2. Suspicious state -> 1.0s Accelerated
    from backend.app.core.models import PathAnalysisResult
    ana_suspicious = PathAnalysisResult(
        pid=pid, process_name=name, state=InstabilityState.SUSPICIOUS,
        risk_level=RiskLevel.MODERATE, health_index=80.0, instability_score=20.0,
        matched_pattern="CPU Spike", path_sequence=["CPU_SPIKE"], persistence_count=0,
        anomaly_duration_sec=1.0, is_temporary=False, is_confirmed=False,
        diagnostic_summary="", recommended_action=""
    )
    status2 = controller.update_adaptive_state(snap, ana_suspicious)
    assert status2.sampling_mode == "ACCELERATED"
    assert status2.current_interval_sec == 1.0
    assert status2.confirmation_status == "VERIFYING"

    # 3. Developing state -> 0.25s Burst
    ana_dev = PathAnalysisResult(
        pid=pid, process_name=name, state=InstabilityState.DEVELOPING,
        risk_level=RiskLevel.HIGH, health_index=55.0, instability_score=45.0,
        matched_pattern="Multi-Resource Escalation", path_sequence=["MEM_INC", "THREAD_INC"], persistence_count=0,
        anomaly_duration_sec=2.0, is_temporary=False, is_confirmed=False,
        diagnostic_summary="", recommended_action=""
    )
    status3 = controller.update_adaptive_state(snap, ana_dev)
    assert status3.sampling_mode == "BURST"
    assert status3.current_interval_sec == 0.25

def test_all_patent_section_8_scenarios():
    """Verify all 4 Section 8 patent test conditions execute successfully."""
    # Test 1: Temporary CPU Increase
    res1 = ScenarioRunner.execute_validation_test("scenario_1")
    assert res1.passed is True
    assert res1.result_state in ["Temporary", "Recovered"]

    # Test 2: Developing Abnormal Behaviour
    res2 = ScenarioRunner.execute_validation_test("scenario_2")
    assert res2.passed is True
    assert res2.result_state == "Developing"

    # Test 3: Recovery Condition
    res3 = ScenarioRunner.execute_validation_test("scenario_3")
    assert res3.passed is True
    assert res3.result_state == "Recovered"

    # Test 4: Continuing Abnormal Behaviour
    res4 = ScenarioRunner.execute_validation_test("scenario_4")
    assert res4.passed is True
    assert res4.result_state == "Confirmed"
