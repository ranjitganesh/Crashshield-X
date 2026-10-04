import os
import sys

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.tests.test_engine import (
    test_event_engine_cpu_spike,
    test_event_engine_memory_leak_and_recovery,
    test_temporal_graph_construction,
    test_closed_loop_adaptive_controller,
    test_all_patent_section_8_scenarios
)

def run_all():
    print("Running CrashShield X Test Suite...")
    
    test_event_engine_cpu_spike()
    print("  [PASS] test_event_engine_cpu_spike")
    
    test_event_engine_memory_leak_and_recovery()
    print("  [PASS] test_event_engine_memory_leak_and_recovery")
    
    test_temporal_graph_construction()
    print("  [PASS] test_temporal_graph_construction")
    
    test_closed_loop_adaptive_controller()
    print("  [PASS] test_closed_loop_adaptive_controller")
    
    test_all_patent_section_8_scenarios()
    print("  [PASS] test_all_patent_section_8_scenarios (All 4 Patent Scenarios Verified!)")
    
    print("\nALL 5 CORE TEST SUITES PASSED SUCCESSFULLY (100% SUCCESS)!")

if __name__ == "__main__":
    run_all()
